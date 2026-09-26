"""
Seed script — generates 14 days of realistic demo data for demo@autopilot.os
Deliberately includes patterns that trigger all 8 behavior rules.
Run: python scripts/seed.py
"""
import sys
import os
import asyncio
import uuid
from datetime import date, datetime, timedelta, time
import random

sys.path.insert(0, "/app")

from app.database import AsyncSessionLocal, engine
from app.models import (
    Base, User, DailyMetrics, BehaviorFlag, Recommendation,
    HealthScoreHistory, UserAchievement, WeeklyInsight
)
from app.core.security import hash_password
from app.core.health_score import calculate_health_score


DEMO_EMAIL = "demo@autopilot.os"
DEMO_PASSWORD = "Demo1234!"
DEMO_NAME = "Alex"


# 14-day data pattern — deliberately triggers behavior rules
# (day 0 = today, day 1 = yesterday, ...)
DAILY_PATTERNS = [
    # (steps, sleep_h, sleep_start_h, mood, energy, stress, hydration, screen_min)
    (4200,  7.2,  22,  4, 4, 2, 7,  80),   # Day 0 (today) — good
    (2800,  5.8,  23,  3, 3, 3, 5,  110),  # Day 1
    (1400,  5.3,  23,  2, 2, 4, 3,  140),  # Day 2 — triggers low_activity + stress
    (900,   4.8,  24,  2, 2, 5, 2,  150),  # Day 3 — triggers sleep_debt sev3 + recovery_needed
    (1200,  5.1,  23,  2, 2, 5, 3,  130),  # Day 4 — chronic_stress sev3
    (2100,  6.1,  22,  3, 3, 4, 4,  120),  # Day 5
    (3500,  6.4,  22,  3, 3, 3, 4,  100),  # Day 6
    (5200,  7.0,  21,  4, 4, 2, 6,  70),   # Day 7 — streak day
    (6800,  7.5,  21,  4, 5, 2, 7,  60),   # Day 8
    (4100,  6.8,  22,  3, 3, 3, 5,  90),   # Day 9
    (3200,  6.2,  23,  3, 3, 3, 4,  100),  # Day 10
    (2000,  5.5,  23,  2, 2, 4, 3,  130),  # Day 11
    (1800,  5.8,  23,  3, 2, 4, 3,  140),  # Day 12 — dehydration_risk (3+ days under 4 cups)
    (2500,  6.0,  22,  3, 3, 3, 3,  120),  # Day 13
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── Create or get demo user ──
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.email == DEMO_EMAIL))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                name=DEMO_NAME,
                age=28,
                gender="other",
                primary_goal="reduce_stress",
                timezone="Asia/Kolkata",
                theme_preference="midnight",
                onboarding_completed=True,
                consent_given=True,
                streak_days=0,
                plan="pro",  # Give demo user Pro access
                location_lat=12.9716,
                location_lon=77.5946,  # Bangalore
            )
            db.add(user)
            await db.flush()
            print(f"✅ Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        else:
            print(f"ℹ️  Demo user already exists: {DEMO_EMAIL}")

        today = date.today()

        # ── Generate 14 days of metrics ──
        for day_offset, pattern in enumerate(DAILY_PATTERNS):
            steps, sleep_h, sleep_start_h, mood, energy, stress, hydration, screen_min = pattern
            target_date = today - timedelta(days=day_offset)

            # Check if already exists
            existing = await db.execute(
                select(DailyMetrics).where(
                    DailyMetrics.user_id == user.id,
                    DailyMetrics.date == target_date
                )
            )
            if existing.scalar_one_or_none():
                continue

            # Add some randomness
            steps += random.randint(-200, 200)
            sleep_h += random.uniform(-0.2, 0.2)
            sleep_h = max(3.5, min(9.5, sleep_h))

            # Sleep start/end times
            sleep_start = time(sleep_start_h % 24, random.randint(0, 59))
            sleep_end_h = (sleep_start_h + int(sleep_h)) % 24
            sleep_end = time(sleep_end_h, random.randint(0, 59))

            m = DailyMetrics(
                id=str(uuid.uuid4()),
                user_id=user.id,
                date=target_date,
                steps=max(0, steps),
                sleep_hours=round(sleep_h, 1),
                sleep_start_time=sleep_start,
                sleep_end_time=sleep_end,
                sleep_inferred=False,
                screen_time_minutes=screen_min,
                mood_score=mood,
                energy_level=energy,
                stress_level=stress,
                hydration_cups=hydration,
                calories_estimated=random.randint(1600, 2400),
                weather_condition="clear" if day_offset % 3 != 0 else "rain",
                temperature_celsius=round(random.uniform(22, 34), 1),
                data_confidence_score=0.75,
                steps_imputed=False,
            )
            db.add(m)

        await db.flush()
        print(f"✅ Generated 14 days of metrics")

        # ── Calculate and store health scores ──
        metrics_result = await db.execute(
            select(DailyMetrics).where(DailyMetrics.user_id == user.id)
        )
        all_metrics = metrics_result.scalars().all()

        for m in all_metrics:
            score_val, breakdown = calculate_health_score(m)
            existing_score = await db.execute(
                select(HealthScoreHistory).where(
                    HealthScoreHistory.user_id == user.id,
                    HealthScoreHistory.date == m.date
                )
            )
            if not existing_score.scalar_one_or_none():
                score = HealthScoreHistory(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    date=m.date,
                    score=score_val,
                    score_breakdown=breakdown,
                )
                db.add(score)

        await db.flush()
        print(f"✅ Calculated health scores")

        # ── Create behavior flags (matching the patterns above) ──
        flags_to_create = [
            ("sleep_debt", 3, "2_consecutive_under5"),
            ("low_activity", 2, "3_consecutive_under1500"),
            ("chronic_stress", 3, "stress5_2consecutive"),
            ("dehydration_risk", 1, "3_of_3_under4cups"),
            ("recovery_needed", 3, "low_mood_and_steps"),
        ]

        for flag_type, severity, trigger in flags_to_create:
            existing_flag = await db.execute(
                select(BehaviorFlag).where(
                    BehaviorFlag.user_id == user.id,
                    BehaviorFlag.flag_type == flag_type,
                    BehaviorFlag.active == True
                )
            )
            if not existing_flag.scalar_one_or_none():
                flag = BehaviorFlag(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    flag_type=flag_type,
                    severity=severity,
                    active=True,
                    times_escalated=0,
                    flag_metadata={"trigger": trigger}
                )
                db.add(flag)

        await db.flush()
        print(f"✅ Created behavior flags")

        # ── Create sample recommendations ──
        sample_recs = [
            {
                "action": "Be in bed by 10:00 PM tonight — you've slept under 5 hours 2 days running.",
                "reason": "Two consecutive nights under 5 hours is clinically significant. Fatigue is compounding.",
                "category": "sleep", "priority": 1, "confidence": 0.92,
            },
            {
                "action": "URGENT: 10 min box breathing right now, then phone-free until morning.",
                "reason": "Maximum stress (5/5) two days straight. Your nervous system needs active recovery.",
                "category": "mental", "priority": 2, "confidence": 0.88,
            },
            {
                "action": "Drink 2 more glasses of water before 8 PM today.",
                "reason": "You've averaged under 4 cups daily for the past 3 days.",
                "category": "nutrition", "priority": 3, "confidence": 0.80,
            },
        ]

        for rec_data in sample_recs:
            existing_rec = await db.execute(
                select(Recommendation).where(
                    Recommendation.user_id == user.id,
                    Recommendation.date == today,
                    Recommendation.category == rec_data["category"]
                )
            )
            if not existing_rec.scalar_one_or_none():
                rec = Recommendation(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    date=today,
                    **rec_data,
                    weather_influenced=False,
                )
                db.add(rec)

        await db.flush()
        print(f"✅ Created sample recommendations")

        # ── Create achievements ──
        achievements = [
            ("streak_3", today - timedelta(days=5)),
        ]
        for ach_type, unlocked_at in achievements:
            existing_ach = await db.execute(
                select(UserAchievement).where(
                    UserAchievement.user_id == user.id,
                    UserAchievement.achievement_type == ach_type
                )
            )
            if not existing_ach.scalar_one_or_none():
                ach = UserAchievement(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    achievement_type=ach_type,
                    unlocked_at=datetime.combine(unlocked_at, datetime.min.time()),
                    seen=False,
                )
                db.add(ach)

        # Set streak days
        user.streak_days = 3

        await db.commit()
        print(f"✅ Seed complete!")
        print(f"\n{'='*50}")
        print(f"Demo Login:")
        print(f"  Email:    {DEMO_EMAIL}")
        print(f"  Password: {DEMO_PASSWORD}")
        print(f"  Plan:     Pro")
        print(f"{'='*50}\n")


if __name__ == "__main__":
    asyncio.run(seed())
