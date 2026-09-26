from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from app.database import get_db
from app.models import UserAchievement, User
from app.schemas import AchievementResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/achievements", tags=["achievements"])

ACHIEVEMENT_META = {
    "streak_3": {
        "title": "3-Day Streak",
        "description": "Accepted at least one recommendation 3 days in a row.",
        "icon": "🔥",
        "rarity": "common"
    },
    "week_warrior": {
        "title": "Week Warrior",
        "description": "Maintained a 7-day streak. A full week of conscious health decisions.",
        "icon": "⚡",
        "rarity": "uncommon"
    },
    "fortnight_focus": {
        "title": "Fortnight Focus",
        "description": "14 consecutive days. Your habits are becoming automatic.",
        "icon": "🏆",
        "rarity": "rare"
    },
    "month_master": {
        "title": "Month Master",
        "description": "30-day streak. You've unlocked the full power of Autopilot OS.",
        "icon": "💎",
        "rarity": "legendary"
    },
    "first_checkin": {
        "title": "First Check-in",
        "description": "Completed your first daily mood check-in.",
        "icon": "✅",
        "rarity": "common"
    },
    "voice_pioneer": {
        "title": "Voice Pioneer",
        "description": "Logged your first voice event.",
        "icon": "🎙️",
        "rarity": "common"
    },
}


@router.get("/", response_model=List[dict])
async def get_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == current_user.id)
        .order_by(UserAchievement.unlocked_at.desc())
    )
    achievements = result.scalars().all()

    return [
        {
            "id": a.id,
            "achievement_type": a.achievement_type,
            "unlocked_at": a.unlocked_at.isoformat(),
            "seen": a.seen,
            **ACHIEVEMENT_META.get(a.achievement_type, {"title": a.achievement_type, "icon": "🏅", "rarity": "common"})
        }
        for a in achievements
    ]


@router.patch("/mark-seen")
async def mark_achievements_seen(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(UserAchievement).where(
            and_(UserAchievement.user_id == current_user.id, UserAchievement.seen == False)
        )
    )
    for a in result.scalars().all():
        a.seen = True
    await db.flush()
    return {"status": "marked"}
