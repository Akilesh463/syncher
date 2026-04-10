"""
ML Prediction Engine for SYNCHER — v2 Ensemble.
Uses Gradient Boosting + Random Forest + Ridge with 15 features
derived from both cycle history and daily lifestyle logs.
"""
import numpy as np
from datetime import date, timedelta
import os
import joblib
import logging
from pathlib import Path

from apps.tracker.models import CycleLog, DailyLog
from apps.tracker.services import get_cycle_stats

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / 'ml_models' / 'saved'

# Feature names for clarity and debugging
FEATURE_NAMES = [
    'prev_cycle_1', 'prev_cycle_2', 'prev_cycle_3',
    'rolling_avg', 'rolling_std',
    'cycle_trend', 'min_cycle', 'max_cycle',
    'last_period_length',
    'avg_pain', 'avg_stress', 'avg_sleep', 'avg_exercise',
    'negative_mood_ratio',
    'cycle_index',
]


def _get_lifestyle_features_for_cycle(user, cycle_start, cycle_end):
    """
    Extract lifestyle features from DailyLogs during a specific cycle window.
    Returns a dict of aggregated lifestyle metrics.
    """
    logs = DailyLog.objects.filter(
        user=user,
        date__gte=cycle_start,
        date__lte=cycle_end,
    )

    if not logs.exists():
        return {
            'avg_pain': 0.0,
            'avg_stress': 0.0,
            'avg_sleep': 7.0,
            'avg_exercise': 0.0,
            'negative_mood_ratio': 0.0,
        }

    pain_levels = [l.pain_level for l in logs]
    stress_levels = [l.stress_level for l in logs]
    sleep_hours = [l.sleep_hours for l in logs if l.sleep_hours is not None]
    exercise_mins = [l.exercise_minutes for l in logs]

    negative_moods = {'low', 'irritated', 'anxious', 'sad'}
    moods = [l.mood for l in logs]
    neg_count = sum(1 for m in moods if m in negative_moods)
    neg_ratio = neg_count / len(moods) if moods else 0.0

    return {
        'avg_pain': float(np.mean(pain_levels)) if pain_levels else 0.0,
        'avg_stress': float(np.mean(stress_levels)) if stress_levels else 0.0,
        'avg_sleep': float(np.mean(sleep_hours)) if sleep_hours else 7.0,
        'avg_exercise': float(np.mean(exercise_mins)) if exercise_mins else 0.0,
        'negative_mood_ratio': round(neg_ratio, 3),
    }


def extract_features(user):
    """
    Extract 15 features per cycle from user's history.
    Returns (features_array, targets_array) or (None, None) if insufficient data.
    """
    cycles = CycleLog.objects.filter(
        user=user, is_predicted=False, cycle_length__isnull=False
    ).order_by('start_date')

    if cycles.count() < 2:
        return None, None

    cycle_list = list(cycles)
    cycle_lengths = [c.cycle_length for c in cycle_list]

    features = []
    targets = []

    for i in range(1, len(cycle_lengths)):
        # --- Cycle-based features (1-9) ---

        # Previous 3 cycle lengths (padded if needed)
        prev_lengths = cycle_lengths[max(0, i - 3):i]
        while len(prev_lengths) < 3:
            prev_lengths = [cycle_lengths[0]] + prev_lengths

        # Rolling statistics
        history = cycle_lengths[:i]
        rolling_avg = float(np.mean(history))
        rolling_std = float(np.std(history)) if len(history) > 1 else 0.0

        # Cycle trend (slope via simple linear regression on last N cycles)
        trend_window = history[-6:] if len(history) >= 2 else history
        if len(trend_window) >= 2:
            x = np.arange(len(trend_window))
            slope = float(np.polyfit(x, trend_window, 1)[0])
        else:
            slope = 0.0

        # Min/Max cycle lengths
        min_cycle = float(min(history))
        max_cycle = float(max(history))

        # Last period length
        last_period = cycle_list[i - 1].period_length or 5

        # --- Lifestyle features (10-14) ---
        cycle_start = cycle_list[i - 1].start_date
        cycle_end = cycle_list[i].start_date - timedelta(days=1)
        lifestyle = _get_lifestyle_features_for_cycle(user, cycle_start, cycle_end)

        # --- Cycle index (15) ---
        cycle_index = float(i)

        # Build the 15-feature vector
        feature_vector = (
            [float(x) for x in prev_lengths]
            + [rolling_avg, rolling_std]
            + [slope, min_cycle, max_cycle]
            + [float(last_period)]
            + [
                lifestyle['avg_pain'],
                lifestyle['avg_stress'],
                lifestyle['avg_sleep'],
                lifestyle['avg_exercise'],
                lifestyle['negative_mood_ratio'],
            ]
            + [cycle_index]
        )

        features.append(feature_vector)
        targets.append(cycle_lengths[i])

    return np.array(features), np.array(targets)


def extract_symptom_features(user):
    """Extract symptom features from daily logs (used by analytics endpoint)."""
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
    Uses trained ensemble if available, falls back to statistical prediction.
    """
    stats = get_cycle_stats(user)
    last_cycle = CycleLog.objects.filter(
        user=user, is_predicted=False
    ).order_by('-start_date').first()

    if not last_cycle:
        return None

    # Try ML ensemble prediction first
    predicted_length = None
    confidence = 0.5
    model_version = 'statistical_v1'

    ensemble_path = MODEL_DIR / f'ensemble_user_{user.id}.joblib'

    if ensemble_path.exists():
        try:
            ensemble_data = joblib.load(ensemble_path)
            features, _ = extract_features(user)

            if features is not None and len(features) > 0:
                latest_features = features[-1].reshape(1, -1)
                models = ensemble_data['models']
                weights = ensemble_data['weights']

                # Weighted ensemble prediction
                predictions = []
                for name, model in models.items():
                    pred = model.predict(latest_features)[0]
                    predictions.append(pred)

                model_names = list(models.keys())
                weighted_pred = float(np.average(predictions, weights=weights))
                predicted_length = int(round(weighted_pred))

                # Confidence from actual CV performance + data volume
                cv_score = ensemble_data.get('best_cv_score', 0.5)
                data_factor = min(1.0, stats['total_cycles'] / 12.0)
                confidence = min(0.95, max(0.3, cv_score * 0.6 + data_factor * 0.4))

                model_version = f"ensemble_v2({ensemble_data.get('best_model', 'unknown')})"

        except Exception as e:
            logger.warning(f"Ensemble prediction failed for user {user.id}: {e}")

    # Fallback: weighted average of recent cycles
    if predicted_length is None:
        cycles = CycleLog.objects.filter(
            user=user, is_predicted=False, cycle_length__isnull=False
        ).order_by('-start_date')[:6]

        if cycles.exists():
            lengths = [c.cycle_length for c in cycles]
            weights_list = list(range(len(lengths), 0, -1))
            predicted_length = int(round(
                np.average(lengths, weights=weights_list)
            ))
            confidence = min(0.8, 0.3 + (len(lengths) * 0.08))
        else:
            predicted_length = stats['avg_cycle_length']
            confidence = 0.3

    # Clamp prediction to sane range (18-60 days)
    predicted_length = max(18, min(60, predicted_length))

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
    """
    Train an ensemble of 3 models for a specific user.
    Uses Leave-One-Out CV to score each model, then saves all with weights.
    Returns dict with training results or False if insufficient data.
    """
    from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
    from sklearn.linear_model import Ridge
    from sklearn.model_selection import LeaveOneOut, cross_val_score

    features, targets = extract_features(user)

    if features is None or len(features) < 3:
        return False

    # Define ensemble candidates
    candidates = {
        'gradient_boosting': GradientBoostingRegressor(
            n_estimators=50,
            max_depth=3,
            learning_rate=0.1,
            min_samples_split=2,
            random_state=42,
        ),
        'random_forest': RandomForestRegressor(
            n_estimators=100,
            max_depth=4,
            min_samples_split=2,
            random_state=42,
        ),
        'ridge': Ridge(alpha=1.0),
    }

    # Score each model via cross-validation
    # Use LOO for small datasets, 5-fold for larger ones
    n_samples = len(features)
    if n_samples <= 10:
        cv_strategy = LeaveOneOut()
    else:
        cv_strategy = min(5, n_samples)

    model_scores = {}
    for name, model in candidates.items():
        try:
            scores = cross_val_score(
                model, features, targets,
                cv=cv_strategy,
                scoring='neg_mean_absolute_error',
            )
            # Convert negative MAE to positive (lower MAE = better)
            avg_mae = -float(np.mean(scores))
            model_scores[name] = avg_mae
        except Exception as e:
            logger.warning(f"CV failed for {name}: {e}")
            model_scores[name] = 999.0

    # Train all models on full data
    trained_models = {}
    for name, model in candidates.items():
        try:
            model.fit(features, targets)
            trained_models[name] = model
        except Exception as e:
            logger.warning(f"Training failed for {name}: {e}")

    if not trained_models:
        return False

    # Calculate ensemble weights (inverse MAE — better models get higher weight)
    maes = [model_scores.get(name, 999.0) for name in trained_models.keys()]
    if all(m > 0 for m in maes):
        inv_maes = [1.0 / m for m in maes]
        total = sum(inv_maes)
        weights = [w / total for w in inv_maes]
    else:
        weights = [1.0 / len(trained_models)] * len(trained_models)

    # Identify best single model
    best_model = min(model_scores, key=model_scores.get)
    best_mae = model_scores[best_model]

    # Convert best MAE to a 0-1 R²-like score for confidence calculation
    target_std = float(np.std(targets)) if len(targets) > 1 else 1.0
    cv_score = max(0.0, 1.0 - (best_mae / max(target_std, 1.0)))

    # Save ensemble
    os.makedirs(MODEL_DIR, exist_ok=True)
    ensemble_path = MODEL_DIR / f'ensemble_user_{user.id}.joblib'
    joblib.dump({
        'models': trained_models,
        'weights': weights,
        'model_scores': model_scores,
        'best_model': best_model,
        'best_cv_score': cv_score,
        'feature_names': FEATURE_NAMES,
        'n_samples': n_samples,
    }, ensemble_path)

    return {
        'model_scores': {k: round(v, 2) for k, v in model_scores.items()},
        'best_model': best_model,
        'best_mae': round(best_mae, 2),
        'confidence_score': round(cv_score, 2),
        'n_training_samples': n_samples,
        'ensemble_weights': {
            name: round(w, 3)
            for name, w in zip(trained_models.keys(), weights)
        },
    }
