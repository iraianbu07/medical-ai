"""
Health Score Calculator — computes composite score from 4 subscores.
Sleep (30pts) + Activity (25pts) + Mental (25pts) + Nutrition (20pts) = 100 pts
"""
from typing import Optional, Dict, Tuple
from app.models import DailyMetrics


SUBSCORE_WEIGHTS = {
    "sleep": 30,
    "activity": 25,
    "mental": 25,
    "nutrition": 20,
}


def calculate_health_score(metrics: DailyMetrics) -> Tuple[int, Dict]:
    """
    Returns (total_score 0-100, breakdown dict).
    """
    sleep_score = _score_sleep(metrics)
    activity_score = _score_activity(metrics)
    mental_score = _score_mental(metrics)
    nutrition_score = _score_nutrition(metrics)

    total = int(sleep_score + activity_score + mental_score + nutrition_score)
    total = max(0, min(100, total))

    breakdown = {
        "sleep": {"score": round(sleep_score), "max": 30, "pct": round(sleep_score / 30 * 100)},
        "activity": {"score": round(activity_score), "max": 25, "pct": round(activity_score / 25 * 100)},
        "mental": {"score": round(mental_score), "max": 25, "pct": round(mental_score / 25 * 100)},
        "nutrition": {"score": round(nutrition_score), "max": 20, "pct": round(nutrition_score / 20 * 100)},
    }

    return total, breakdown


def _score_sleep(m: DailyMetrics) -> float:
    """Max 30 pts. Optimal: 7-9 hours."""
    if m.sleep_hours is None:
        return 12.0  # Estimated if no data

    h = m.sleep_hours
    if h >= 7 and h <= 9:
        base = 30.0
    elif h >= 6 and h < 7:
        base = 22.0
    elif h >= 9 and h <= 10:
        base = 26.0
    elif h >= 5 and h < 6:
        base = 14.0
    elif h > 10:
        base = 20.0  # Oversleeping also penalized
    else:
        base = 6.0  # < 5 hours

    # Penalty for inferred sleep (less reliable)
    if m.sleep_inferred:
        base *= 0.85

    return base


def _score_activity(m: DailyMetrics) -> float:
    """Max 25 pts. Optimal: 8000+ steps."""
    if m.steps is None:
        return 8.0  # Default estimate

    s = m.steps
    if s >= 10000:
        return 25.0
    elif s >= 8000:
        return 22.0
    elif s >= 6000:
        return 18.0
    elif s >= 4000:
        return 13.0
    elif s >= 2000:
        return 8.0
    elif s >= 1000:
        return 4.0
    else:
        return 1.0


def _score_mental(m: DailyMetrics) -> float:
    """Max 25 pts. Based on mood, stress, energy."""
    score = 0.0
    count = 0

    # Mood (10 pts)
    if m.mood_score:
        mood_pts = {1: 0, 2: 3, 3: 6, 4: 8.5, 5: 10}
        score += mood_pts.get(m.mood_score, 5)
        count += 1

    # Stress (inverted, 10 pts)
    if m.stress_level:
        stress_pts = {1: 10, 2: 8, 3: 6, 4: 3, 5: 0}
        score += stress_pts.get(m.stress_level, 5)
        count += 1

    # Energy (5 pts)
    if m.energy_level:
        energy_pts = {1: 0, 2: 1.5, 3: 3, 4: 4, 5: 5}
        score += energy_pts.get(m.energy_level, 2.5)
        count += 1

    if count == 0:
        return 12.0  # No mental data: neutral estimate

    # Scale to full weight if partial data
    return score * (3 / count) if count < 3 else score


def _score_nutrition(m: DailyMetrics) -> float:
    """Max 20 pts. Based on hydration and calories."""
    score = 0.0

    # Hydration (12 pts, optimal 8+ cups)
    h = m.hydration_cups or 0
    if h >= 8:
        score += 12.0
    elif h >= 6:
        score += 9.0
    elif h >= 4:
        score += 6.0
    elif h >= 2:
        score += 3.0
    else:
        score += 0.0

    # Calories (8 pts, placeholder — if no data, neutral)
    if m.calories_estimated:
        c = m.calories_estimated
        if 1500 <= c <= 2500:
            score += 8.0
        elif 1200 <= c < 1500 or 2500 < c <= 3000:
            score += 5.0
        else:
            score += 2.0
    else:
        score += 4.0  # Neutral when no calorie data

    return score


def calculate_data_confidence(metrics: DailyMetrics, google_fit_connected: bool = False) -> float:
    """
    Returns 0.0-1.0 data confidence score per spec:
    Steps from API=+0.25, Sleep from API=+0.25, Mood=+0.20, Voice=+0.15, Hydration=+0.10, Stress=+0.05
    """
    score = 0.0
    if google_fit_connected:
        if metrics.steps is not None and not metrics.steps_imputed:
            score += 0.25
        if metrics.sleep_hours is not None and not metrics.sleep_inferred:
            score += 0.25
    else:
        if metrics.steps is not None:
            score += 0.10
        if metrics.sleep_hours is not None and not metrics.sleep_inferred:
            score += 0.15

    if metrics.mood_score is not None:
        score += 0.20
    if metrics.hydration_cups and metrics.hydration_cups > 0:
        score += 0.10
    if metrics.stress_level is not None:
        score += 0.05

    return round(min(score, 1.0), 2)
