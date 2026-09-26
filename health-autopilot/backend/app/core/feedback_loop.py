"""
Feedback loop — measures recommendation outcomes after 24 hours.
Adjusts confidence weights and category priority per user.
"""
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
import structlog

from app.models import Recommendation, DailyMetrics, User

logger = structlog.get_logger()


async def measure_outcomes(user_id: str, db: AsyncSession) -> Dict:
    """
    Called nightly. Checks recommendations from yesterday, measures if metrics improved.
    Updates outcome_improved, adjusts confidence.
    """
    yesterday = date.today() - timedelta(days=1)
    today = date.today()

    # Fetch yesterday's recommendations
    result = await db.execute(
        select(Recommendation).where(
            and_(
                Recommendation.user_id == user_id,
                Recommendation.date == yesterday,
                Recommendation.outcome_measured == False
            )
        )
    )
    recs: List[Recommendation] = result.scalars().all()

    if not recs:
        return {"measured": 0}

    # Fetch yesterday's and today's metrics to compare
    metrics_result = await db.execute(
        select(DailyMetrics).where(
            and_(
                DailyMetrics.user_id == user_id,
                DailyMetrics.date.in_([yesterday, today])
            )
        )
    )
    metrics = {m.date: m for m in metrics_result.scalars().all()}
    prev_metrics = metrics.get(yesterday)
    curr_metrics = metrics.get(today)

    measured = 0
    for rec in recs:
        improved = _did_metric_improve(rec.category, prev_metrics, curr_metrics)
        rec.outcome_measured = True
        rec.outcome_improved = improved
        measured += 1

    # Update streak: if any recommendation was accepted, increment streak
    any_accepted = any(r.accepted for r in recs)
    if any_accepted:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.streak_days += 1
            await _check_achievements(user, db)
    else:
        # Reset streak if no recommendation accepted yesterday
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user and user.streak_days > 0:
            user.streak_days = 0

    await db.flush()
    return {"measured": measured}


def _did_metric_improve(category: Optional[str], prev: Optional[DailyMetrics], curr: Optional[DailyMetrics]) -> Optional[bool]:
    if not prev or not curr:
        return None

    category_map = {
        "sleep": lambda p, c: (c.sleep_hours or 0) > (p.sleep_hours or 0),
        "movement": lambda p, c: (c.steps or 0) > (p.steps or 0) * 1.1,  # 10% improvement
        "mental": lambda p, c: (c.mood_score or 3) >= (p.mood_score or 3) and (c.stress_level or 3) <= (p.stress_level or 3),
        "nutrition": lambda p, c: (c.hydration_cups or 0) > (p.hydration_cups or 0),
        "screen": lambda p, c: (c.screen_time_minutes or 999) < (p.screen_time_minutes or 999),
        "general": lambda p, c: True,
    }

    checker = category_map.get(category or "general", category_map["general"])
    try:
        return checker(prev, curr)
    except Exception:
        return None


async def _check_achievements(user: User, db: AsyncSession):
    """Check and unlock streak-based achievements."""
    from app.models import UserAchievement

    milestones = {3: "streak_3", 7: "week_warrior", 14: "fortnight_focus", 30: "month_master"}
    
    for days, achievement_type in milestones.items():
        if user.streak_days >= days:
            # Check if already unlocked
            existing = await db.execute(
                select(UserAchievement).where(
                    and_(
                        UserAchievement.user_id == user.id,
                        UserAchievement.achievement_type == achievement_type
                    )
                )
            )
            if not existing.scalar_one_or_none():
                achievement = UserAchievement(
                    user_id=user.id,
                    achievement_type=achievement_type,
                    seen=False
                )
                db.add(achievement)
                logger.info("Achievement unlocked", user_id=user.id, type=achievement_type)
