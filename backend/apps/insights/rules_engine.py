"""
Rule-based risk detection engine for SYNCHER.
Analyzes user data patterns to generate health insights and warnings.
"""
from datetime import date, timedelta
from django.db.models import Avg, StdDev, Count
from apps.tracker.models import CycleLog, DailyLog
from apps.tracker.services import get_cycle_stats, get_current_phase
from .models import Insight


def generate_insights(user):
    """Generate all insights for a user. Returns list of insight dicts."""
    insights = []
    
    insights.extend(_check_cycle_irregularity(user))
    insights.extend(_check_pain_patterns(user))
    insights.extend(_check_flow_patterns(user))
    insights.extend(_check_mood_patterns(user))
    insights.extend(_check_lifestyle_impact(user))
    
    # Save to database
    for insight_data in insights:
        Insight.objects.get_or_create(
            user=user,
            title=insight_data['title'],
            defaults={
                'description': insight_data['description'],
                'severity': insight_data['severity'],
                'category': insight_data['category'],
            }
        )
    
    return insights


def _check_cycle_irregularity(user):
    """Detect irregular cycle patterns."""
    insights = []
    stats = get_cycle_stats(user)
    
    if stats['total_cycles'] < 3:
        return insights
    
    std_dev = stats['cycle_std_dev']
    
    if std_dev > 7:
        insights.append({
            'title': 'Significant Cycle Irregularity Detected',
            'description': (
                f'Your cycle length varies by ±{std_dev} days. '
                'Highly irregular cycles may indicate hormonal imbalances. '
                'Consider consulting a healthcare provider. '
                'This could be related to PCOS, thyroid issues, or stress.'
            ),
            'severity': 'alert',
            'category': 'risk',
        })
    elif std_dev > 4:
        insights.append({
            'title': 'Moderately Irregular Cycles',
            'description': (
                f'Your cycle length varies by ±{std_dev} days. '
                'Some variation is normal, but tracking consistently '
                'will help identify patterns. Stress, diet, and sleep '
                'can all impact cycle regularity.'
            ),
            'severity': 'warning',
            'category': 'cycle',
        })
    elif std_dev <= 2 and stats['total_cycles'] >= 4:
        insights.append({
            'title': 'Very Regular Cycles ✨',
            'description': (
                f'Your cycles are very consistent (±{std_dev} days). '
                'This is a great sign of hormonal balance!'
            ),
            'severity': 'info',
            'category': 'cycle',
        })
    
    # Check for unusually long or short cycles
    cycles = CycleLog.objects.filter(
        user=user, is_predicted=False, cycle_length__isnull=False
    ).order_by('-start_date')[:3]
    
    for cycle in cycles:
        if cycle.cycle_length and cycle.cycle_length > 38:
            insights.append({
                'title': 'Long Cycle Detected',
                'description': (
                    f'Your cycle starting {cycle.start_date} was {cycle.cycle_length} days. '
                    'Cycles over 38 days may indicate anovulation or hormonal changes.'
                ),
                'severity': 'warning',
                'category': 'cycle',
            })
        elif cycle.cycle_length and cycle.cycle_length < 21:
            insights.append({
                'title': 'Short Cycle Detected',
                'description': (
                    f'Your cycle starting {cycle.start_date} was {cycle.cycle_length} days. '
                    'Cycles under 21 days are considered short and may warrant medical attention.'
                ),
                'severity': 'warning',
                'category': 'cycle',
            })
    
    return insights


def _check_pain_patterns(user):
    """Analyze pain level patterns."""
    insights = []
    
    logs = DailyLog.objects.filter(user=user).order_by('-date')[:30]
    if not logs.exists():
        return insights
    
    pain_logs = [l for l in logs if l.pain_level > 0]
    
    if not pain_logs:
        return insights
    
    avg_pain = sum(l.pain_level for l in pain_logs) / len(pain_logs)
    high_pain_days = [l for l in pain_logs if l.pain_level >= 4]
    
    if len(high_pain_days) >= 5:
        insights.append({
            'title': 'Frequent Severe Pain',
            'description': (
                f'You reported high pain ({len(high_pain_days)} days in the last month). '
                'Persistent severe menstrual pain may indicate conditions like '
                'endometriosis or fibroids. Please consult a healthcare provider.'
            ),
            'severity': 'alert',
            'category': 'pain',
        })
    elif avg_pain >= 3:
        insights.append({
            'title': 'Elevated Pain Levels',
            'description': (
                f'Your average pain level is {avg_pain:.1f}/5. '
                'Consider tracking pain triggers — diet, sleep, and stress '
                'can all influence pain intensity.'
            ),
            'severity': 'warning',
            'category': 'pain',
        })
    
    return insights


def _check_flow_patterns(user):
    """Analyze flow intensity patterns."""
    insights = []
    
    logs = DailyLog.objects.filter(
        user=user, flow_intensity='heavy'
    ).order_by('-date')[:30]
    
    heavy_days = logs.count()
    
    if heavy_days >= 7:
        insights.append({
            'title': 'Prolonged Heavy Flow',
            'description': (
                f'You logged heavy flow for {heavy_days} days recently. '
                'Heavy or prolonged periods can lead to iron deficiency anemia. '
                'Consider iron-rich foods and consult your doctor.'
            ),
            'severity': 'alert',
            'category': 'risk',
        })
    
    return insights


def _check_mood_patterns(user):
    """Analyze mood patterns and correlations."""
    insights = []
    
    logs = DailyLog.objects.filter(user=user).order_by('-date')[:30]
    if logs.count() < 7:
        return insights
    
    negative_moods = ['low', 'irritated', 'anxious', 'sad']
    neg_count = sum(1 for l in logs if l.mood in negative_moods)
    total = logs.count()
    
    if total > 0 and neg_count / total > 0.6:
        insights.append({
            'title': 'Mood Pattern Notice',
            'description': (
                f'You\'ve reported low mood {neg_count} out of {total} recent days. '
                'Mood changes can be cycle-related (especially luteal phase). '
                'Regular exercise, sleep, and stress management can help.'
            ),
            'severity': 'warning',
            'category': 'mood',
        })
    
    return insights


def _check_lifestyle_impact(user):
    """Analyze lifestyle factors and their impact."""
    insights = []
    
    logs = DailyLog.objects.filter(user=user).order_by('-date')[:14]
    if logs.count() < 7:
        return insights
    
    # Check sleep
    sleep_logs = [l for l in logs if l.sleep_hours and l.sleep_hours > 0]
    if sleep_logs:
        avg_sleep = sum(l.sleep_hours for l in sleep_logs) / len(sleep_logs)
        if avg_sleep < 6:
            insights.append({
                'title': 'Low Sleep Average',
                'description': (
                    f'Your average sleep is {avg_sleep:.1f} hours/night. '
                    'Sleep deprivation can disrupt hormonal balance and '
                    'worsen menstrual symptoms. Aim for 7-9 hours.'
                ),
                'severity': 'warning',
                'category': 'lifestyle',
            })
    
    # Check stress
    stress_logs = [l for l in logs if l.stress_level > 0]
    if stress_logs:
        avg_stress = sum(l.stress_level for l in stress_logs) / len(stress_logs)
        if avg_stress >= 3.5:
            insights.append({
                'title': 'High Stress Levels Detected',
                'description': (
                    f'Your average stress level is {avg_stress:.1f}/5. '
                    'Chronic stress can delay your period and worsen PMS symptoms. '
                    'Try meditation, deep breathing, or gentle yoga.'
                ),
                'severity': 'warning',
                'category': 'lifestyle',
            })
    
    return insights
