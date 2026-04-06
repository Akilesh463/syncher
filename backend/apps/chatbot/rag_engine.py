"""
RAG Engine for SYNCHER.
Retrieves relevant user health data to provide context for AI responses.
"""
from datetime import date, timedelta
from apps.tracker.models import CycleLog, DailyLog
from apps.tracker.services import get_cycle_stats, get_current_phase, get_next_period_info
from apps.predictions.ml_engine import extract_symptom_features


def get_user_context(user):
    """
    Build a comprehensive context string from user's health data
    for the AI assistant to use in responses.
    """
    context_parts = []
    
    # Profile info
    profile = getattr(user, 'profile', None)
    if profile:
        context_parts.append(
            f"User Profile: Age calculated from DOB: {user.date_of_birth or 'not provided'}, "
            f"Avg cycle length: {profile.avg_cycle_length} days, "
            f"Avg period length: {profile.avg_period_length} days, "
            f"Activity level: {profile.activity_level}"
        )
    
    # Cycle statistics
    stats = get_cycle_stats(user)
    context_parts.append(
        f"Cycle Stats: {stats['total_cycles']} cycles tracked, "
        f"Avg length: {stats['avg_cycle_length']} days, "
        f"Variation: ±{stats['cycle_std_dev']} days, "
        f"Regularity score: {stats['regularity_score']}/100"
    )
    
    # Current phase
    phase = get_current_phase(user)
    context_parts.append(
        f"Current Phase: {phase['phase']} (Day {phase['day_of_cycle']} of cycle)"
    )
    
    # Next period prediction
    prediction = get_next_period_info(user)
    if prediction['next_period_date']:
        context_parts.append(
            f"Next Period: Predicted {prediction['next_period_date']} "
            f"({prediction['days_until']} days away), "
            f"Ovulation: {prediction['ovulation_date']}"
        )
    
    # Recent symptoms
    symptom_data = extract_symptom_features(user)
    context_parts.append(
        f"Recent Symptom Averages (30 days): "
        f"Pain: {symptom_data['avg_pain']}/5, "
        f"Stress: {symptom_data['avg_stress']}/5, "
        f"Sleep: {symptom_data['avg_sleep']}h, "
        f"Exercise: {symptom_data['avg_exercise']}min"
    )
    
    # Recent daily logs
    recent_logs = DailyLog.objects.filter(
        user=user
    ).order_by('-date')[:5]
    
    if recent_logs:
        log_strs = []
        for log in recent_logs:
            log_strs.append(
                f"  {log.date}: mood={log.mood}, pain={log.pain_level}, "
                f"flow={log.flow_intensity}, stress={log.stress_level}, "
                f"sleep={log.sleep_hours}h"
            )
        context_parts.append("Recent Daily Logs:\n" + "\n".join(log_strs))
    
    return "\n".join(context_parts)
