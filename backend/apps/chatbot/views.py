from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import ChatHistory
from .llm_service import get_gemini_response
from .rag_engine import get_user_context


class ChatView(APIView):
    """Send a message and get AI response."""
    
    def post(self, request):
        message = request.data.get('message', '').strip()
        
        if not message:
            return Response(
                {'error': 'Message is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        # Save user message
        ChatHistory.objects.create(
            user=user, role='user', message=message
        )
        
        # Get user context for RAG
        user_context = get_user_context(user)
        
        # Get conversation history
        history = ChatHistory.objects.filter(
            user=user
        ).order_by('-created_at')[:20]
        
        chat_history = [
            {'role': msg.role, 'message': msg.message}
            for msg in reversed(list(history))
        ]
        
        # Get AI response
        ai_response = get_gemini_response(
            user_message=message,
            user_context=user_context,
            chat_history=chat_history
        )
        
        # Save AI response
        ChatHistory.objects.create(
            user=user, role='assistant', message=ai_response
        )
        
        return Response({
            'message': ai_response,
            'role': 'assistant',
        })


class ChatHistoryView(APIView):
    """Get chat history."""
    
    def get(self, request):
        messages = ChatHistory.objects.filter(
            user=request.user
        ).order_by('-created_at')[:50]
        
        return Response([
            {
                'id': msg.id,
                'role': msg.role,
                'message': msg.message,
                'created_at': msg.created_at.isoformat(),
            }
            for msg in reversed(list(messages))
        ])
    
    def delete(self, request):
        """Clear chat history."""
        ChatHistory.objects.filter(user=request.user).delete()
        return Response({'status': 'Chat history cleared.'})
