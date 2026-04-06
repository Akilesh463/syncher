from datetime import date, timedelta
from django.db.models import Avg, StdDev
from .models import CycleLog, DailyLog


def get_cycle_stats(user):
    """Calculate cycle statistics for a user."""
    cycles = CycleLog.objects.filter(
        user=user, is_predicted=False, cycle_length__isnull=False
    )
    
    if not cycles.exists():
        return {
            'avg_cycle_length': 28,
            'cycle_std_dev': 0,
            'avg_period_length': 5,
            'total_cycles': 0,
            'regularity_score': 50,
        }
    
    stats = cycles.aggregate(
        avg_cycle=Avg('cycle_length'),
        std_cycle=StdDev('cycle_length'),
        avg_period=Avg('period_length'),
    )
    
    avg_cycle = round(stats['avg_cycle'] or 28)
    std_dev = round(stats['std_cycle'] or 0, 1)
    avg_period = round(stats['avg_period'] or 5)
    total = cycles.count()
    
    # Regularity score: 100 = perfectly regular, 0 = very irregular
    if std_dev == 0:
        regularity = 100
    elif std_dev <= 1:
        regularity = 95
    elif std_dev <= 2:
        regularity = 85
    elif std_dev <= 3:
        regularity = 70
    elif std_dev <= 5:
        regularity = 50
    else:
        regularity = max(20, 100 - int(std_dev * 10))
    
    return {
        'avg_cycle_length': avg_cycle,
        'cycle_std_dev': std_dev,
        'avg_period_length': avg_period,
        'total_cycles': total,
        'regularity_score': regularity,
    }


def get_current_phase(user):
    """Determine current hormonal phase based on last period."""
    last_cycle = CycleLog.objects.filter(
        user=user, is_predicted=False
    ).first()
    
    if not last_cycle:
        return {
            'phase': 'unknown',
            'day_of_cycle': 0,
            'phase_day': 0,
            'description': 'Log your first period to see your cycle phase.',
        }
    
    today = date.today()
    cycle_day = (today - last_cycle.start_date).days + 1
    avg_cycle = last_cycle.cycle_length or 28
    period_len = last_cycle.period_length or 5
    
    # Determine phase
    if cycle_day <= period_len:
        phase = 'menstrual'
        phase_day = cycle_day
        desc = 'Menstrual Phase — Rest and recovery. Focus on gentle activities.'
    elif cycle_day <= 13:
        phase = 'follicular'
        phase_day = cycle_day - period_len
        desc = 'Follicular Phase — Rising energy. Great time for new projects and workouts.'
    elif cycle_day <= 16:
        phase = 'ovulation'
        phase_day = cycle_day - 13
        desc = 'Ovulation Phase — Peak energy and confidence. Ideal for social activities.'
    else:
        phase = 'luteal'
        phase_day = cycle_day - 16
        desc = 'Luteal Phase — Winding down. Focus on self-care and lighter exercise.'
    
    return {
        'phase': phase,
        'day_of_cycle': cycle_day,
        'phase_day': phase_day,
        'total_cycle_length': avg_cycle,
        'description': desc,
    }


def get_next_period_info(user):
    """Calculate next period prediction and countdown."""
    stats = get_cycle_stats(user)
    last_cycle = CycleLog.objects.filter(
        user=user, is_predicted=False
    ).first()
    
    if not last_cycle:
        return {
            'next_period_date': None,
            'days_until': None,
            'ovulation_date': None,
            'fertile_window_start': None,
            'fertile_window_end': None,
        }
    
    avg_length = stats['avg_cycle_length']
    next_period = last_cycle.start_date + timedelta(days=avg_length)
    today = date.today()
    days_until = (next_period - today).days
    
    # Ovulation typically 14 days before next period
    ovulation = next_period - timedelta(days=14)
    fertile_start = ovulation - timedelta(days=5)
    fertile_end = ovulation + timedelta(days=1)
    
    return {
        'next_period_date': next_period.isoformat(),
        'days_until': max(0, days_until),
        'ovulation_date': ovulation.isoformat(),
        'fertile_window_start': fertile_start.isoformat(),
        'fertile_window_end': fertile_end.isoformat(),
    }
