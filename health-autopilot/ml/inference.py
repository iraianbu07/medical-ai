"""
ML inference — loads trained models and generates predictions.
Falls back to rule-based logic if models not yet trained.
"""
import os
import json
import numpy as np
from typing import Dict, Optional, List
import joblib
import structlog

logger = structlog.get_logger()

ARTIFACTS_DIR = os.environ.get("MODEL_ARTIFACTS_DIR", "/ml/artifacts")


def load_model(name: str):
    path = os.path.join(ARTIFACTS_DIR, f"{name}.pkl")
    if os.path.exists(path):
        try:
            return joblib.load(path)
        except Exception as e:
            logger.warning("Failed to load model", name=name, error=str(e))
    return None


def predict_all(metrics_history: List[Dict]) -> Dict:
    """
    Run all 4 predictions given a list of recent daily metrics (most recent first).
    Falls back to rule-based if models not available.
    """
    if not metrics_history:
        return _rule_based_fallback(None)

    current = metrics_history[0]

    # Feature preparation
    sleep_vals = [m.get("sleep_hours") or 7 for m in metrics_history[:3]]
    steps_vals = [m.get("steps") or 5000 for m in metrics_history[:3]]
    mood_vals = [m.get("mood_score") for m in metrics_history[:5]]

    sleep_avg3d = sum(sleep_vals) / len(sleep_vals)
    steps_avg3d = sum(steps_vals) / len(steps_vals)

    results = {}

    # ── Model 1: Fatigue Risk ──────────────────────────────────────────────
    fatigue_model = load_model("fatigue_classifier")
    if fatigue_model:
        try:
            X = np.array([[
                sleep_avg3d,
                steps_avg3d,
                current.get("screen_time_minutes") or 120,
                current.get("mood_score") or 3,
                current.get("stress_level") or 3,
            ]])
            proba = fatigue_model.predict_proba(X)[0]
            results["fatigue_risk"] = float(proba[1]) if len(proba) > 1 else float(proba[0])
        except Exception:
            results["fatigue_risk"] = _rule_fatigue(sleep_avg3d, steps_avg3d, current)
    else:
        results["fatigue_risk"] = _rule_fatigue(sleep_avg3d, steps_avg3d, current)

    # ── Model 2: Productivity Window ───────────────────────────────────────
    prod_model = load_model("productivity_predictor")
    if prod_model:
        try:
            sleep_start = current.get("sleep_start_hour") or 23
            X = np.array([[
                current.get("sleep_hours") or 7,
                sleep_start,
                current.get("mood_score") or 3,
                steps_avg3d,
            ]])
            results["productivity_window"] = prod_model.predict(X)[0]
        except Exception:
            results["productivity_window"] = _rule_productivity(current, sleep_avg3d)
    else:
        results["productivity_window"] = _rule_productivity(current, sleep_avg3d)

    # ── Model 3: Mood Forecast ─────────────────────────────────────────────
    mood_model = load_model("mood_forecaster")
    if mood_model and all(v is not None for v in mood_vals):
        try:
            # Pad to 5 lags if needed
            while len(mood_vals) < 5:
                mood_vals.append(3)
            X = np.array([[
                mood_vals[0], mood_vals[1], mood_vals[2], mood_vals[3], mood_vals[4],
                current.get("sleep_hours") or 7,
                current.get("steps") or 5000,
                current.get("stress_level") or 3,
            ]])
            predicted = float(mood_model.predict(X)[0])
            results["predicted_mood_tomorrow"] = max(1.0, min(5.0, predicted))
        except Exception:
            results["predicted_mood_tomorrow"] = _rule_mood_forecast(mood_vals)
    else:
        results["predicted_mood_tomorrow"] = _rule_mood_forecast(mood_vals)

    # ── Model 4: Score Prediction ──────────────────────────────────────────
    score_model = load_model("score_predictor")
    if score_model:
        try:
            X = np.array([[
                current.get("sleep_hours") or 7,
                current.get("steps") or 5000,
                current.get("screen_time_minutes") or 120,
                current.get("mood_score") or 3,
                current.get("energy_level") or 3,
                current.get("stress_level") or 3,
                current.get("hydration_cups") or 4,
                sleep_avg3d,
                steps_avg3d,
            ]])
            predicted = float(score_model.predict(X)[0])
            results["predicted_score_tomorrow"] = int(max(0, min(100, predicted)))
        except Exception:
            results["predicted_score_tomorrow"] = None
    else:
        results["predicted_score_tomorrow"] = None

    return results


# ── Rule-based fallbacks ───────────────────────────────────────────────────────

def _rule_fatigue(sleep_avg: float, steps_avg: float, current: Dict) -> float:
    risk = 0.0
    if sleep_avg < 5:
        risk += 0.5
    elif sleep_avg < 6:
        risk += 0.3
    if steps_avg < 2000:
        risk += 0.3
    elif steps_avg < 4000:
        risk += 0.1
    if (current.get("stress_level") or 3) >= 4:
        risk += 0.2
    return min(1.0, risk)


def _rule_productivity(current: Dict, sleep_avg: float) -> str:
    if sleep_avg >= 7 and (current.get("mood_score") or 3) >= 4:
        return "morning"
    elif (current.get("energy_level") or 3) >= 4:
        return "afternoon"
    return "evening"


def _rule_mood_forecast(mood_vals: List) -> Optional[float]:
    valid = [v for v in mood_vals if v is not None]
    if not valid:
        return None
    # Exponential moving average with decay toward 3
    ema = valid[0]
    for v in valid[1:]:
        ema = 0.7 * ema + 0.3 * v
    return round(max(1.0, min(5.0, ema * 0.9 + 3 * 0.1)), 2)


def _rule_based_fallback(current) -> Dict:
    return {
        "fatigue_risk": 0.3,
        "productivity_window": "morning",
        "predicted_mood_tomorrow": 3.0,
        "predicted_score_tomorrow": None,
    }


async def compute_and_cache_predictions(user_id: str, metrics_history: List[Dict], redis_client):
    """Run predictions and cache in Redis for 6 hours."""
    predictions = predict_all(metrics_history)
    try:
        await redis_client.setex(
            f"predictions:{user_id}",
            6 * 3600,
            json.dumps(predictions)
        )
    except Exception as e:
        logger.warning("Failed to cache predictions", error=str(e))
    return predictions
