"""
NLP Parser for voice input events.
Keyword-based intent detection — no external NLP library required.
"""
from typing import Dict, Optional, Any
import re


FOOD_CALORIES = {
    "biryani": 700, "rice": 350, "pasta": 400, "burger": 550, "pizza": 650,
    "salad": 150, "sandwich": 400, "soup": 200, "chicken": 300, "fish": 250,
    "oats": 300, "eggs": 200, "protein shake": 200, "smoothie": 250,
    "apple": 80, "banana": 100, "yogurt": 150, "bread": 250, "coffee": 5,
    "tea": 5, "juice": 120, "soda": 150, "beer": 180, "wine": 125,
}

WORKOUT_KEYWORDS = {
    "run": {"category": "cardio", "calories": 350, "steps": 4000},
    "running": {"category": "cardio", "calories": 350, "steps": 4000},
    "jog": {"category": "cardio", "calories": 280, "steps": 3500},
    "walk": {"category": "light", "calories": 150, "steps": 3000},
    "walked": {"category": "light", "calories": 150, "steps": 3000},
    "gym": {"category": "strength", "calories": 400, "steps": 1500},
    "workout": {"category": "strength", "calories": 350, "steps": 1000},
    "yoga": {"category": "flexibility", "calories": 180, "steps": 500},
    "swim": {"category": "cardio", "calories": 400, "steps": 0},
    "cycling": {"category": "cardio", "calories": 450, "steps": 0},
    "bike": {"category": "cardio", "calories": 400, "steps": 0},
    "hike": {"category": "outdoor", "calories": 500, "steps": 8000},
    "dance": {"category": "cardio", "calories": 300, "steps": 3000},
    "push": {"category": "strength", "calories": 200, "steps": 0},
    "squat": {"category": "strength", "calories": 150, "steps": 0},
    "stretch": {"category": "flexibility", "calories": 80, "steps": 0},
}

STRESS_SIGNALS = ["stressed", "anxious", "overwhelmed", "exhausted", "burnout", "panic", "worried", "tense"]
TIRED_SIGNALS = ["tired", "fatigue", "sleepy", "drowsy", "sluggish", "drained", "depleted"]
HAPPY_SIGNALS = ["great", "amazing", "fantastic", "energetic", "excited", "good", "happy", "pumped"]
WATER_SIGNALS = ["water", "drank", "drink", "glass", "hydrated", "hydration", "bottle"]


def parse_voice_input(transcript: str) -> Dict[str, Any]:
    """
    Parse a voice transcript into structured health event data.
    Returns: {event_type, description, parsed_data, updates}
    """
    text = transcript.lower().strip()
    result = {
        "event_type": "voice_log",
        "description": transcript,
        "parsed_data": {"raw": transcript, "confidence": 0.6},
        "updates": {}
    }

    # ── Water / Hydration ──────────────────────────────────────────
    if any(w in text for w in WATER_SIGNALS):
        cup_match = re.search(r'(\d+)\s*(cup|glass|bottle|litre|liter)', text)
        cups = int(cup_match.group(1)) if cup_match else 1
        result["event_type"] = "hydration"
        result["parsed_data"].update({"hydration_cups": cups, "confidence": 0.9})
        result["updates"]["hydration_increment"] = cups
        result["description"] = f"Drank {cups} glass{'es' if cups > 1 else ''} of water"
        return result

    # ── Workout / Exercise ─────────────────────────────────────────
    for keyword, workout_data in WORKOUT_KEYWORDS.items():
        if keyword in text:
            duration_match = re.search(r'(\d+)\s*(min|minute|hour|hr)', text)
            duration_minutes = int(duration_match.group(1)) if duration_match else 30
            if "hour" in (duration_match.group(2) if duration_match else ""):
                duration_minutes *= 60

            calories = int(workout_data["calories"] * duration_minutes / 30)
            steps = workout_data.get("steps", 0)

            result["event_type"] = "workout"
            result["parsed_data"].update({
                "workout_type": workout_data["category"],
                "duration_minutes": duration_minutes,
                "calories_burned": calories,
                "steps_added": steps,
                "confidence": 0.85
            })
            result["updates"]["steps_increment"] = steps
            result["updates"]["calories_increment"] = calories
            result["description"] = f"{keyword.capitalize()} for {duration_minutes} min ({calories} cal)"
            return result

    # ── Food / Eating ──────────────────────────────────────────────
    ate_pattern = re.search(r'(ate|had|eaten|eat|cooked|made|ordered)\s+(.+)', text)
    if ate_pattern:
        food_text = ate_pattern.group(2)
        calories = _estimate_food_calories(food_text)
        food_type = _classify_food_type(food_text)

        result["event_type"] = "food_log"
        result["parsed_data"].update({
            "food_description": food_text,
            "calories_estimated": calories,
            "food_type": food_type,
            "confidence": 0.7
        })
        result["updates"]["calories_increment"] = calories
        result["description"] = f"Ate {food_text} (~{calories} cal)"
        return result

    # ── Stress Signals ─────────────────────────────────────────────
    if any(s in text for s in STRESS_SIGNALS):
        severity = 5 if any(w in text for w in ["overwhelmed", "panic", "burnout"]) else 4
        result["event_type"] = "stress_signal"
        result["parsed_data"].update({"stress_level": severity, "confidence": 0.8})
        result["updates"]["stress_level"] = severity
        result["description"] = f"Feeling stressed (level {severity}/5)"
        return result

    # ── Fatigue Signals ────────────────────────────────────────────
    if any(t in text for t in TIRED_SIGNALS):
        result["event_type"] = "energy_signal"
        result["parsed_data"].update({"energy_level": 2, "confidence": 0.75})
        result["updates"]["energy_level"] = 2
        result["description"] = "Feeling tired/fatigued"
        return result

    # ── Positive Signals ───────────────────────────────────────────
    if any(h in text for h in HAPPY_SIGNALS):
        result["event_type"] = "mood_signal"
        result["parsed_data"].update({"mood_score": 4, "confidence": 0.7})
        result["updates"]["mood_score"] = 4
        result["description"] = "Feeling positive/energetic"
        return result

    # ── Sleep Log ──────────────────────────────────────────────────
    sleep_match = re.search(r'slept?\s+(\d+\.?\d*)\s*h', text)
    if sleep_match:
        hours = float(sleep_match.group(1))
        result["event_type"] = "sleep_log"
        result["parsed_data"].update({"sleep_hours": hours, "confidence": 0.85})
        result["updates"]["sleep_hours"] = hours
        result["description"] = f"Slept {hours}h"
        return result

    # Fallback: generic log
    result["description"] = transcript
    return result


def _estimate_food_calories(food_text: str) -> int:
    for food, calories in FOOD_CALORIES.items():
        if food in food_text:
            return calories
    return 400  # Default estimate


def _classify_food_type(food_text: str) -> str:
    high_carb = ["rice", "pasta", "bread", "pizza", "biryani", "roti", "noodle"]
    high_protein = ["chicken", "fish", "eggs", "protein", "meat", "beef", "tofu"]
    healthy = ["salad", "vegetable", "fruit", "oats", "smoothie", "nuts"]

    for item in high_protein:
        if item in food_text:
            return "high_protein"
    for item in high_carb:
        if item in food_text:
            return "high_carb"
    for item in healthy:
        if item in food_text:
            return "healthy"
    return "mixed"
