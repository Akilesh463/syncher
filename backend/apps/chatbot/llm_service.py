"""
LLM Service for SYNCHER - Google Gemini Integration.
Provides AI-powered conversational health assistance.
"""
import google.generativeai as genai
from django.conf import settings

# System prompt for the AI health assistant
SYSTEM_PROMPT = """You are SYNCHER AI, a friendly and knowledgeable women's health assistant.
You specialize in menstrual cycle health, hormonal wellness, and lifestyle optimization.

IMPORTANT GUIDELINES:
1. You are NOT a doctor. Always clarify that your advice is informational, not medical diagnosis.
2. Be warm, empathetic, and supportive in your responses.
3. Use the user's cycle data (provided as context) to personalize your responses.
4. When discussing health concerns, recommend consulting a healthcare provider for serious issues.
5. Focus on: cycle patterns, symptoms, lifestyle tips, hormonal phases, nutrition, exercise.
6. Keep responses concise but helpful (2-4 paragraphs max).
7. Use emojis sparingly to be friendly but professional.
8. If asked about things outside women's health, politely redirect to your expertise area.

When user health data is provided, use it to give personalized insights.
"""


def get_gemini_response(user_message, user_context="", chat_history=None):
    """
    Get a response from Google Gemini AI.
    
    Args:
        user_message: The user's question or message
        user_context: Structured user health data for personalization
        chat_history: List of previous messages [{'role': 'user'/'model', 'parts': ['...']}]
    
    Returns:
        str: AI response text
    """
    api_key = settings.GEMINI_API_KEY
    
    if not api_key:
        return (
            "I'm currently unable to connect to my AI backend. "
            "Please set the GEMINI_API_KEY environment variable. "
            "You can get a free API key from https://aistudio.google.com/apikey"
        )
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build the full prompt
        full_prompt = SYSTEM_PROMPT
        
        if user_context:
            full_prompt += f"\n\nUSER'S HEALTH DATA:\n{user_context}\n"
        
        full_prompt += f"\n\nUser's message: {user_message}"
        
        # Build conversation history for context
        history = []
        if chat_history:
            for msg in chat_history[-10:]:  # Last 10 messages for context
                role = 'user' if msg['role'] == 'user' else 'model'
                history.append({
                    'role': role,
                    'parts': [msg['message']]
                })
        
        if history:
            chat = model.start_chat(history=history)
            response = chat.send_message(full_prompt)
        else:
            response = model.generate_content(full_prompt)
        
        return response.text
    
    except Exception as e:
        return (
            f"I encountered an issue processing your request. "
            f"Please check your Gemini API key configuration. "
            f"Error: {str(e)}"
        )
