"""
ML Prediction Engine for SYNCHER.
Provides cycle length prediction using regression models.
"""
import numpy as np
from datetime import date, timedelta
import os
import joblib
from pathlib import Path

from apps.tracker.models import CycleLog, DailyLog
from apps.tracker.services import get_cycle_stats

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / 'ml_models' / 'saved'


def extract_features(user):
    """Extract features from user's cycle history for prediction."""
    cycles = CycleLog.objects.filter(
        user=user, is_predicted=False, cycle_length__isnull=False
    ).order_by('start_date')
    
    if cycles.count() < 2:
        return None, None
    
    cycle_lengths = [c.cycle_length for c in cycles]
    
    features = []
    targets = []
    
    for i in range(1, len(cycle_lengths)):
        # Features: previous cycle lengths (up to 3), rolling avg, rolling std
        prev_lengths = cycle_lengths[max(0, i-3):i]
        while len(prev_lengths) < 3:
            prev_lengths = [cycle_lengths[0]] + prev_lengths
        
        rolling_avg = np.mean(cycle_lengths[:i])
        rolling_std = np.std(cycle_lengths[:i]) if i > 1 else 0
        
        feature_vector = prev_lengths + [rolling_avg, rolling_std]
        features.append(feature_vector)
        targets.append(cycle_lengths[i])
    
    return np.array(features), np.array(targets)


def extract_symptom_features(user):
    """Extract symptom features from daily logs."""
    logs = DailyLog.objects.filter(user=user).order_by('-date')[:30]
    
    if not logs.exists():
        return {
            'avg_pain': 0,
            'avg_stress': 0,
            'avg_sleep': 7,
            'avg_exercise': 0,
            'mood_distribution': {},
        }
    
    pain_levels = [l.pain_level for l in logs]
    stress_levels = [l.stress_level for l in logs]
    sleep_hours = [l.sleep_hours for l in logs if l.sleep_hours]
    exercise_mins = [l.exercise_minutes for l in logs]
    
    # Mood distribution
    moods = [l.mood for l in logs]
    mood_counts = {}
    for m in moods:
        mood_counts[m] = mood_counts.get(m, 0) + 1
    
    return {
        'avg_pain': round(np.mean(pain_levels), 1) if pain_levels else 0,
        'avg_stress': round(np.mean(stress_levels), 1) if stress_levels else 0,
        'avg_sleep': round(np.mean(sleep_hours), 1) if sleep_hours else 7,
        'avg_exercise': round(np.mean(exercise_mins), 1) if exercise_mins else 0,
        'mood_distribution': mood_counts,
    }


def predict_next_cycle(user):
    """
    Predict the next cycle length and dates.
    Uses trained model if available, falls back to statistical prediction.
    """
    stats = get_cycle_stats(user)
    last_cycle = CycleLog.objects.filter(
        user=user, is_predicted=False
    ).order_by('-start_date').first()
    
    if not last_cycle:
        return None
    
    # Try ML model first
    predicted_length = None
    confidence = 0.5
    model_version = 'statistical_v1'
    
    model_path = MODEL_DIR / f'model_user_{user.id}.joblib'
    global_model_path = MODEL_DIR / 'global_model.joblib'
    
    if model_path.exists():
        try:
            model = joblib.load(model_path)
            features, _ = extract_features(user)
            if features is not None and len(features) > 0:
                predicted_length = int(round(model.predict([features[-1]])[0]))
                confidence = min(0.95, 0.6 + (stats['total_cycles'] * 0.05))
                model_version = 'personalized_v1'
        except Exception:
            pass
    elif global_model_path.exists():
        try:
            model = joblib.load(global_model_path)
            features, _ = extract_features(user)
            if features is not None and len(features) > 0:
                predicted_length = int(round(model.predict([features[-1]])[0]))
                confidence = min(0.85, 0.4 + (stats['total_cycles'] * 0.04))
                model_version = 'global_v1'
        except Exception:
            pass
    
    # Fallback: weighted average of recent cycles
    if predicted_length is None:
        cycles = CycleLog.objects.filter(
            user=user, is_predicted=False, cycle_length__isnull=False
        ).order_by('-start_date')[:6]
        
        if cycles.exists():
            lengths = [c.cycle_length for c in cycles]
            # Weighted: more recent = more weight
            weights = list(range(len(lengths), 0, -1))
            predicted_length = int(round(
                np.average(lengths, weights=weights)
            ))
            confidence = min(0.8, 0.3 + (len(lengths) * 0.08))
        else:
            predicted_length = stats['avg_cycle_length']
            confidence = 0.3
    
    # Calculate dates
    next_period = last_cycle.start_date + timedelta(days=predicted_length)
    ovulation = next_period - timedelta(days=14)
    fertile_start = ovulation - timedelta(days=5)
    fertile_end = ovulation + timedelta(days=1)
    
    today = date.today()
    days_until = (next_period - today).days
    
    return {
        'predicted_cycle_length': predicted_length,
        'next_period_date': next_period.isoformat(),
        'days_until_period': max(0, days_until),
        'ovulation_date': ovulation.isoformat(),
        'fertile_window_start': fertile_start.isoformat(),
        'fertile_window_end': fertile_end.isoformat(),
        'confidence_score': round(confidence, 2),
        'model_version': model_version,
    }


def train_user_model(user):
    """Train a personalized model for a specific user."""
    from sklearn.linear_model import Ridge
    
    features, targets = extract_features(user)
    
    if features is None or len(features) < 3:
        return False
    
    model = Ridge(alpha=1.0)
    model.fit(features, targets)
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = MODEL_DIR / f'model_user_{user.id}.joblib'
    joblib.dump(model, model_path)
    
    return True
