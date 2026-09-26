"""
Decision Engine — translates behavior flags + ML predictions into ≤3 daily recommendations.
Implements the priority stack, time-bound phrasing, escalation, and weather adaptation.
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
import structlog

from app.models import BehaviorFlag, Recommendation, DailyMetrics, User

logger = structlog.get_logger()


# ─── Action Template Library ──────────────────────────────────────────────────

TEMPLATES = {
    "sleep_debt": {
        1: {
            "action": "Aim to be in bed by {bedtime} tonight — you've slept under 6 hours recently.",
            "reason": "Consistent light sleep builds cumulative fatigue. One good night resets the cycle.",
            "category": "sleep"
        },
        2: {
            "action": "Be in bed by {bedtime} — you've averaged {avg_sleep}h sleep over the last 5 nights.",
            "reason": "At this level of sleep debt, your cognitive performance and mood are measurably impaired.",
            "category": "sleep"
        },
        3: {
            "action": "PRIORITY: Be in bed no later than {bedtime} tonight. Your predicted fatigue risk tomorrow is HIGH.",
            "reason": "Two consecutive nights under 5 hours is clinically significant. Fatigue is compounding.",
            "category": "sleep"
        },
        "escalated": {
            "action": "⚠ Still not enough sleep. Protect tonight: phone off at {bedtime}, lights dim by 9 PM.",
            "reason": "This recommendation has appeared {times_shown} times. Your body is signaling a real deficit.",
            "category": "sleep"
        }
    },
    "low_activity": {
        1: {
            "action": "Take a {duration}-minute {activity_type} before {deadline} today.",
            "reason": "You've logged under 3,000 steps on {days_count} of the last 7 days.",
            "category": "movement"
        },
        2: {
            "action": "Get moving — even a {duration}-minute walk matters. Under 1,500 steps 3 days running.",
            "reason": "Extended inactivity increases inflammation and mood instability. Any movement counts.",
            "category": "movement"
        },
        "escalated": {
            "action": "Movement is critical now. Set a 10-minute walk alarm for {deadline}.",
            "reason": "Low activity ignored for {times_shown} days. Your body is in sedentary stress.",
            "category": "movement"
        }
    },
    "chronic_stress": {
        2: {
            "action": "Do 10 minutes of box breathing tonight before sleep.",
            "reason": "Your stress has averaged {avg_stress}/5 for the last 3 days. This is compounding.",
            "category": "mental"
        },
        3: {
            "action": "URGENT: 10 min box breathing right now, then phone-free until morning.",
            "reason": "Maximum stress (5/5) two days straight. Your nervous system needs active recovery.",
            "category": "mental"
        },
        "escalated": {
            "action": "Try the 5-4-3-2-1 grounding technique tonight — stress pattern hasn't improved.",
            "reason": "Same stress pattern for {times_shown} days. Switching technique to break the cycle.",
            "category": "mental"
        }
    },
    "dehydration_risk": {
        1: {
            "action": "Drink {cups_needed} more glasses of water before 8 PM today.",
            "reason": "You've averaged under 4 cups daily for the past 3 days.",
            "category": "nutrition"
        },
        "escalated": {
            "action": "Keep a full water bottle visible right now — you haven't hit 4 cups in days.",
            "reason": "Mild dehydration degrades focus, energy, and mood measurably.",
            "category": "nutrition"
        }
    },
    "recovery_needed": {
        3: {
            "action": "Protect today: no intense obligations, gentle movement only, sleep before 10 PM.",
            "reason": "Low mood and minimal activity for 2 days signals your system needs genuine rest.",
            "category": "mental"
        }
    },
    "late_night_usage": {
        2: {
            "action": "Phone screen off by 9:45 PM tonight — blue light after 10 PM is cutting your sleep.",
            "reason": "Late screen use has correlated with your poor sleep nights 3 out of the last 5.",
            "category": "screen"
        }
    },
    "irregular_routine": {
        1: {
            "action": "Pick a target bedtime and stick to it ± 30 minutes for the next 3 nights.",
            "reason": "Your sleep schedule varies by over 2 hours. Irregular sleep impairs recovery quality.",
            "category": "sleep"
        }
    },
    "high_fatigue_risk": {
        "action": "Prioritize rest today — predicted fatigue risk is {risk_pct}%.",
        "reason": "ML model signals high fatigue risk based on your recent sleep, activity, and stress patterns.",
        "category": "general"
    },
    "mood_decline": {
        "action": "Take 5 minutes for something that made you smile recently. Mood forecast for tomorrow is low.",
        "reason": "Trend analysis predicts mood dropping to {predicted_mood:.1f}/5 tomorrow if pattern continues.",
        "category": "mental"
    }
}

ACTIVITY_BY_WEATHER = {
    "clear": ("walk", "outside"),
    "cloudy": ("walk", "outside"),
    "partly_cloudy": ("walk", "outside"),
    "rain": ("home workout or stretching", "indoors"),
    "snow": ("indoor yoga or calisthenics", "indoors"),
    "storm": ("indoor yoga", "indoors"),
    "fog": ("indoor stretching", "indoors"),
}


class DecisionEngine:

    async def generate_recommendations(
        self,
        user_id: str,
        db: AsyncSession,
        predictions: Optional[Dict] = None,
        weather: Optional[Dict] = None,
        user: Optional[User] = None
    ) -> List[Dict]:
        """Generate ≤3 recommendations for today."""

        today = date.today()

        # Fetch active flags sorted by severity desc
        flags_result = await db.execute(
            select(BehaviorFlag)
            .where(and_(BehaviorFlag.user_id == user_id, BehaviorFlag.active == True))
            .order_by(desc(BehaviorFlag.severity))
        )
        flags: List[BehaviorFlag] = flags_result.scalars().all()

        # Fetch today's existing recommendations (avoid duplicates)
        existing_result = await db.execute(
            select(Recommendation)
            .where(and_(Recommendation.user_id == user_id, Recommendation.date == today))
        )
        existing = existing_result.scalars().all()
        if existing:
            return [self._rec_to_dict(r) for r in existing]

        # Fetch recent metrics for context
        metrics = await self._get_recent_metrics(user_id, db)

        recommendations = []
        priority_queue = []

        # ── Priority 1: Severity 3 flags ──
        for flag in [f for f in flags if f.severity == 3]:
            rec = self._flag_to_recommendation(flag, metrics, weather, predictions, user)
            if rec:
                priority_queue.append((1, rec))

        # ── Priority 2: ML risk signals ──
        if predictions:
            if predictions.get("fatigue_risk", 0) > 0.7:
                priority_queue.append((2, self._build_fatigue_rec(predictions)))
            if predictions.get("predicted_mood_tomorrow", 5) < 2.5:
                priority_queue.append((2, self._build_mood_rec(predictions)))

        # ── Priority 3: Severity 2 flags ──
        for flag in [f for f in flags if f.severity == 2]:
            rec = self._flag_to_recommendation(flag, metrics, weather, predictions, user)
            if rec:
                priority_queue.append((3, rec))

        # ── Priority 4: Primary goal ──
        if user and user.primary_goal:
            goal_rec = self._build_goal_rec(user.primary_goal, metrics, weather)
            if goal_rec:
                priority_queue.append((4, goal_rec))

        # ── Priority 5: Severity 1 flags ──
        for flag in [f for f in flags if f.severity == 1]:
            rec = self._flag_to_recommendation(flag, metrics, weather, predictions, user)
            if rec:
                priority_queue.append((5, rec))

        # Sort by priority, deduplicate categories, take top 3
        priority_queue.sort(key=lambda x: x[0])
        seen_categories = set()
        for _, rec in priority_queue:
            if len(recommendations) >= 3:
                break
            cat = rec.get("category", "general")
            if cat not in seen_categories:
                seen_categories.add(cat)
                recommendations.append(rec)

        # Persist to DB
        db_recs = []
        for i, rec_data in enumerate(recommendations):
            rec = Recommendation(
                user_id=user_id,
                date=today,
                action=rec_data["action"],
                reason=rec_data["reason"],
                confidence=rec_data.get("confidence", 0.75),
                priority=i + 1,
                category=rec_data.get("category"),
                weather_influenced=rec_data.get("weather_influenced", False),
                weather_condition=rec_data.get("weather_condition"),
            )
            db.add(rec)
            db_recs.append(rec)

        await db.flush()
        return [self._rec_to_dict(r) for r in db_recs]

    def _flag_to_recommendation(self, flag: BehaviorFlag, metrics: List[DailyMetrics],
                                 weather: Optional[Dict], predictions: Optional[Dict],
                                 user: Optional[User]) -> Optional[Dict]:
        flag_type = flag.flag_type
        severity = flag.severity
        times_shown = flag.times_escalated

        # Context variables
        current_hour = datetime.now().hour
        bedtime = "10:30 PM" if current_hour < 18 else "10:00 PM"
        avg_sleep = round(
            sum(m.sleep_hours or 7 for m in metrics[:5]) / max(len(metrics[:5]), 1), 1
        )
        avg_stress = round(
            sum(m.stress_level or 3 for m in metrics[:3] if m.stress_level) / max(
                len([m for m in metrics[:3] if m.stress_level]), 1), 1
        )
        today_hydration = metrics[0].hydration_cups if metrics else 0
        cups_needed = max(4 - today_hydration, 1)

        # Weather context for activity
        w_condition = (weather or {}).get("condition", "clear")
        activity_type, location = ACTIVITY_BY_WEATHER.get(w_condition, ("walk", "outside"))
        weather_influenced = w_condition in ("rain", "snow", "storm")
        deadline = "6 PM" if current_hour < 16 else "7 PM"
        duration = "20"

        templates = TEMPLATES.get(flag_type, {})
        if not templates:
            return None

        # Check if escalation needed
        if times_shown >= 3 and "escalated" in templates:
            tmpl = templates["escalated"]
        elif severity in templates:
            tmpl = templates[severity]
        else:
            return None

        try:
            action = tmpl["action"].format(
                bedtime=bedtime, avg_sleep=avg_sleep, avg_stress=avg_stress,
                cups_needed=cups_needed, duration=duration, activity_type=activity_type,
                deadline=deadline, times_shown=times_shown + 1, days_count=4,
                location=location
            )
            reason = tmpl["reason"].format(
                bedtime=bedtime, avg_sleep=avg_sleep, avg_stress=avg_stress,
                cups_needed=cups_needed, duration=duration, activity_type=activity_type,
                deadline=deadline, times_shown=times_shown + 1, days_count=4
            )
        except KeyError:
            action = tmpl["action"]
            reason = tmpl["reason"]

        return {
            "action": action,
            "reason": reason,
            "category": tmpl.get("category", "general"),
            "confidence": max(0.5, 0.9 - (times_shown * 0.05)),
            "weather_influenced": weather_influenced,
            "weather_condition": w_condition if weather_influenced else None,
        }

    def _build_fatigue_rec(self, predictions: Dict) -> Dict:
        risk = predictions.get("fatigue_risk", 0.7)
        tmpl = TEMPLATES["high_fatigue_risk"]
        return {
            "action": tmpl["action"].format(risk_pct=int(risk * 100)),
            "reason": tmpl["reason"],
            "category": tmpl["category"],
            "confidence": risk,
        }

    def _build_mood_rec(self, predictions: Dict) -> Dict:
        predicted = predictions.get("predicted_mood_tomorrow", 2.0)
        tmpl = TEMPLATES["mood_decline"]
        return {
            "action": tmpl["action"],
            "reason": tmpl["reason"].format(predicted_mood=predicted),
            "category": tmpl["category"],
            "confidence": 0.7,
        }

    def _build_goal_rec(self, goal: str, metrics: List[DailyMetrics], weather: Optional[Dict]) -> Optional[Dict]:
        w_condition = (weather or {}).get("condition", "clear")
        activity_type, _ = ACTIVITY_BY_WEATHER.get(w_condition, ("walk", "outside"))

        goal_templates = {
            "lose_weight": {
                "action": f"Fit in a 20-min {activity_type} before dinner — metabolism boost for your goal.",
                "reason": "Consistent moderate exercise is the highest-ROI activity for weight management.",
                "category": "movement"
            },
            "improve_sleep": {
                "action": "No caffeine after 2 PM today and phone off by 9:30 PM.",
                "reason": "Caffeine half-life and blue light are the two top sleep quality disruptors.",
                "category": "sleep"
            },
            "reduce_stress": {
                "action": "Schedule 10 minutes of stillness today — no screens, no tasks.",
                "reason": "Brief stillness periods reset cortisol levels and improve stress resilience.",
                "category": "mental"
            },
            "build_fitness": {
                "action": f"20-min {activity_type} today — consistent beats intense.",
                "reason": "Daily movement, even light, builds the aerobic base that makes fitness sustainable.",
                "category": "movement"
            },
            "boost_energy": {
                "action": "Try a 10-min walk after lunch — it's the highest-ROI energy habit.",
                "reason": "Post-meal walks reduce the glucose spike that causes afternoon energy crashes.",
                "category": "movement"
            }
        }
        return goal_templates.get(goal)

    async def _get_recent_metrics(self, user_id: str, db: AsyncSession) -> List[DailyMetrics]:
        from sqlalchemy import desc as sa_desc
        result = await db.execute(
            select(DailyMetrics)
            .where(DailyMetrics.user_id == user_id)
            .order_by(sa_desc(DailyMetrics.date))
            .limit(10)
        )
        return result.scalars().all()

    def _rec_to_dict(self, r: Recommendation) -> Dict:
        return {
            "id": r.id,
            "date": r.date,
            "action": r.action,
            "reason": r.reason,
            "confidence": r.confidence,
            "priority": r.priority,
            "category": r.category,
            "accepted": r.accepted,
            "snoozed_until": r.snoozed_until,
            "dismissed": r.dismissed,
            "times_shown": r.times_shown,
            "weather_influenced": r.weather_influenced,
            "weather_condition": r.weather_condition,
            "created_at": r.created_at,
        }


decision_engine = DecisionEngine()
