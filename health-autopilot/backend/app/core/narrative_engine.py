"""
NLG (Natural Language Generation) engine for daily health narratives.
Pure Python template logic — no external LLM required.
"""
from datetime import datetime, date
from typing import Optional, List, Dict
from app.models import DailyMetrics, BehaviorFlag, HealthScoreHistory
import structlog

logger = structlog.get_logger()


def generate_daily_narrative(
    user_name: Optional[str],
    score: Optional[int],
    delta: Optional[int],
    metrics: Optional[DailyMetrics],
    flags: List[BehaviorFlag],
    predictions: Optional[Dict],
    confidence: str,
) -> str:
    """
    Generate a 2-3 sentence plain-English daily brief.
    Prioritizes the most critical signal in the first sentence.
    """
    name = user_name or "there"
    hour = datetime.now().hour
    greeting_time = "morning" if hour < 12 else ("afternoon" if hour < 17 else "evening")

    sentences = []

    # ── Sentence 1: Highest-priority signal ──
    critical_flags = [f for f in flags if f.severity == 3]
    high_flags = [f for f in flags if f.severity == 2]

    if critical_flags:
        flag = critical_flags[0]
        sentences.append(_critical_flag_sentence(flag, metrics))
    elif score is not None and score < 40:
        sentences.append(
            f"Your health signals are in the low range today — recovery should be the priority, not performance."
        )
    elif metrics and metrics.mood_score and metrics.mood_score <= 2:
        sentences.append(
            "Today looks emotionally heavy. Low mood two days in a row is your system signaling it needs care."
        )
    elif metrics and metrics.sleep_hours and metrics.sleep_hours < 5.5:
        sentences.append(
            f"You're running on {metrics.sleep_hours:.1f} hours — fatigue will compound unless tonight is protected."
        )
    elif score is not None and score >= 80:
        sentences.append(
            f"Strong signals across the board — you're in peak range today. This is a good day to push slightly further."
        )
    else:
        sentences.append(
            f"Your health baseline is stable today. Small consistent actions are what compound into results."
        )

    # ── Sentence 2: Supporting context ──
    if predictions:
        fatigue_risk = predictions.get("fatigue_risk", 0)
        pred_mood = predictions.get("predicted_mood_tomorrow")
        pred_score = predictions.get("predicted_score_tomorrow")

        if fatigue_risk > 0.75:
            sentences.append(
                f"Fatigue risk tomorrow is predicted at {int(fatigue_risk * 100)}% — prioritize sleep above everything else tonight."
            )
        elif pred_mood and pred_mood < 2.5:
            sentences.append(
                f"Mood trend analysis forecasts a low day tomorrow — proactive rest and stress reduction today can change that."
            )
        elif pred_score and delta:
            if delta > 0:
                sentences.append(
                    f"Your score improved +{delta} from yesterday. Tomorrow is projected at {pred_score}/100 if tonight's habits hold."
                )
            elif delta < 0:
                sentences.append(
                    f"Score dropped {abs(delta)} points from yesterday. Tomorrow can recover to {pred_score}/100 with the right actions tonight."
                )

    # ── Sentence 3: Motivational or actionable close ──
    if high_flags and len(sentences) < 3:
        flag = high_flags[0]
        sentences.append(_flag_close_sentence(flag))
    elif metrics and len(sentences) < 3:
        if metrics.steps and metrics.steps > 8000:
            sentences.append("Great movement today — your body is working for you.")
        elif metrics.hydration_cups and metrics.hydration_cups >= 6:
            sentences.append("Hydration is solid today — keep that up through the evening.")
        elif confidence == "LOW_CONFIDENCE":
            sentences.append(
                "Data confidence is low today — logging your mood takes 5 seconds and improves every recommendation."
            )

    # Fallback: always return at least 2 sentences
    if len(sentences) < 2:
        sentences.append("Your autopilot is watching your patterns. Each day adds precision to tomorrow's actions.")

    return " ".join(sentences[:3])


def _critical_flag_sentence(flag: BehaviorFlag, metrics: Optional[DailyMetrics]) -> str:
    flag_sentences = {
        "sleep_debt": "Critical sleep debt is active — your body is accumulating a deficit that compounds cognitive performance and emotional resilience.",
        "recovery_needed": "Your mood and energy readings signal a genuine need for recovery today — this isn't optional, it's physiological.",
        "chronic_stress": "Stress readings at maximum for two consecutive days — your nervous system is in overdrive and needs active intervention.",
    }
    return flag_sentences.get(flag.flag_type, f"A critical health pattern ({flag.flag_type.replace('_', ' ')}) needs your attention today.")


def _flag_close_sentence(flag: BehaviorFlag) -> str:
    flag_closes = {
        "sleep_debt": "Protect tonight's sleep like an appointment — it's the highest-leverage action available.",
        "low_activity": "Ten minutes of movement is infinitely more than zero — find your window today.",
        "dehydration_risk": "Place a water bottle somewhere visible right now.",
        "chronic_stress": "Even one breathing exercise tonight can interrupt the cortisol cycle.",
        "late_night_usage": "Phone off earlier tonight — your future self will thank you at 7 AM.",
        "irregular_routine": "A consistent bedtime is the single most impactful sleep change you can make.",
    }
    return flag_closes.get(flag.flag_type, "Small, consistent actions today change tomorrow's readings.")


def get_confidence_label(confidence_score: float, sources: int) -> str:
    if confidence_score >= 0.7:
        return f"High confidence · {sources} source{'s' if sources != 1 else ''}"
    elif confidence_score >= 0.4:
        return f"Moderate confidence · {sources} source{'s' if sources != 1 else ''}"
    else:
        return "Low confidence · estimated"
