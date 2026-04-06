"""
Recommendation engine for SYNCHER.
Generates personalized recommendations based on hormonal phase and user data.
"""
from apps.tracker.services import get_current_phase

# Phase-specific recommendations database
PHASE_RECOMMENDATIONS = {
    'menstrual': {
        'diet': [
            {'title': 'Iron-Rich Foods', 'description': 'Eat spinach, lentils, red meat, and dark chocolate to replenish iron lost during menstruation.', 'icon': '🥬'},
            {'title': 'Anti-Inflammatory Foods', 'description': 'Include turmeric, ginger tea, and omega-3 rich foods (salmon, walnuts) to reduce cramp severity.', 'icon': '🍵'},
            {'title': 'Stay Hydrated', 'description': 'Drink warm water and herbal teas. Avoid excessive caffeine which can worsen cramps.', 'icon': '💧'},
        ],
        'exercise': [
            {'title': 'Gentle Movement', 'description': 'Light yoga, walking, or stretching. Avoid high-intensity workouts if you feel fatigued.', 'icon': '🧘'},
            {'title': 'Restorative Yoga', 'description': "Child's pose, cat-cow, and legs-up-the-wall can relieve cramps and back pain.", 'icon': '🙆'},
        ],
        'selfcare': [
            {'title': 'Rest & Recovery', 'description': 'This is your body\'s rest phase. Prioritize sleep and minimize stress.', 'icon': '😴'},
            {'title': 'Warm Compresses', 'description': 'Use a heating pad on your lower abdomen for natural pain relief.', 'icon': '🔥'},
        ],
        'productivity': [
            {'title': 'Reflection Time', 'description': 'Good time for journaling, planning, and creative brainstorming.', 'icon': '📝'},
        ],
    },
    'follicular': {
        'diet': [
            {'title': 'Energy-Boosting Foods', 'description': 'Eat complex carbs, lean proteins, and colorful vegetables. Your metabolism is rising.', 'icon': '🥗'},
            {'title': 'Fermented Foods', 'description': 'Include yogurt, kimchi, or sauerkraut to support gut health and estrogen metabolism.', 'icon': '🥛'},
        ],
        'exercise': [
            {'title': 'High-Energy Workouts', 'description': 'Your energy is rising — great time for cardio, HIIT, and strength training.', 'icon': '🏋️'},
            {'title': 'Try Something New', 'description': 'Your body handles new movements well now. Try a new class or sport.', 'icon': '⚡'},
        ],
        'selfcare': [
            {'title': 'Social Connections', 'description': 'Rising estrogen boosts mood and sociability. Great time for social activities.', 'icon': '👯'},
        ],
        'productivity': [
            {'title': 'Start New Projects', 'description': 'Peak creativity and mental clarity. Ideal for starting new initiatives.', 'icon': '🚀'},
            {'title': 'Learning & Growth', 'description': 'Your brain is primed for learning. Great time for courses or new skills.', 'icon': '📚'},
        ],
    },
    'ovulation': {
        'diet': [
            {'title': 'Light, Nutrient-Dense Meals', 'description': 'Focus on raw vegetables, fruits, and light grains. Your metabolism peaks now.', 'icon': '🥑'},
            {'title': 'Fiber-Rich Foods', 'description': 'Support estrogen processing with leafy greens, flaxseeds, and whole grains.', 'icon': '🌾'},
        ],
        'exercise': [
            {'title': 'Peak Performance', 'description': 'You\'re at your strongest! Ideal for PR attempts, competitive sports, and challenging workouts.', 'icon': '🏆'},
        ],
        'selfcare': [
            {'title': 'Confidence Boost', 'description': 'You naturally feel most confident now. Great time for presentations and important meetings.', 'icon': '✨'},
        ],
        'productivity': [
            {'title': 'Communication Peak', 'description': 'Verbal and social skills peak. Schedule important meetings and presentations.', 'icon': '🎯'},
        ],
    },
    'luteal': {
        'diet': [
            {'title': 'Complex Carbohydrates', 'description': 'Sweet potatoes, brown rice, and quinoa help manage serotonin drops and reduce cravings.', 'icon': '🍠'},
            {'title': 'Magnesium-Rich Foods', 'description': 'Dark chocolate, nuts, and seeds can help with mood and reduce PMS symptoms.', 'icon': '🍫'},
            {'title': 'Reduce Salt & Sugar', 'description': 'Minimize processed foods to reduce bloating and water retention.', 'icon': '🚫'},
        ],
        'exercise': [
            {'title': 'Moderate Exercise', 'description': 'Switch to moderate workouts like Pilates, swimming, or slow jogging.', 'icon': '🏊'},
            {'title': 'Stress-Reducing Activities', 'description': 'Yoga and tai chi can help manage PMS-related anxiety.', 'icon': '🧘'},
        ],
        'selfcare': [
            {'title': 'Self-Care Priority', 'description': 'Your energy is declining. Honor your body\'s need for more rest and downtime.', 'icon': '🛁'},
            {'title': 'Mood Management', 'description': 'Progesterone peaks then drops — mood swings are normal. Be gentle with yourself.', 'icon': '💜'},
        ],
        'productivity': [
            {'title': 'Detail-Oriented Tasks', 'description': 'Great for editing, organizing, and completing projects. Less ideal for brainstorming.', 'icon': '📋'},
        ],
    },
}


def get_recommendations(user):
    """Get personalized recommendations based on current hormonal phase."""
    phase_info = get_current_phase(user)
    phase = phase_info.get('phase', 'unknown')
    
    if phase == 'unknown' or phase not in PHASE_RECOMMENDATIONS:
        return {
            'phase': phase,
            'phase_info': phase_info,
            'recommendations': _get_general_recommendations(),
        }
    
    recs = PHASE_RECOMMENDATIONS[phase]
    
    return {
        'phase': phase,
        'phase_info': phase_info,
        'recommendations': recs,
    }


def _get_general_recommendations():
    """General recommendations when phase is unknown."""
    return {
        'general': [
            {'title': 'Start Tracking', 'description': 'Log your daily symptoms to get personalized recommendations based on your cycle phase.', 'icon': '📊'},
            {'title': 'Stay Hydrated', 'description': 'Aim for 8 glasses of water daily for overall health.', 'icon': '💧'},
            {'title': 'Regular Sleep', 'description': 'Maintain a consistent sleep schedule of 7-9 hours.', 'icon': '😴'},
            {'title': 'Move Daily', 'description': 'At least 30 minutes of moderate exercise daily benefits hormonal health.', 'icon': '🚶'},
        ]
    }
