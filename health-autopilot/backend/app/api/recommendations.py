from datetime import datetime, date, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.database import get_db
from app.models import Recommendation, User
from app.schemas import RecommendationResponse, RecommendationAction
from app.api.auth import get_current_user

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/today", response_model=List[RecommendationResponse])
async def get_today_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    limit = 1 if current_user.plan == "free" else 3

    result = await db.execute(
        select(Recommendation).where(
            and_(
                Recommendation.user_id == current_user.id,
                Recommendation.date == today,
                Recommendation.dismissed == False
            )
        ).order_by(Recommendation.priority).limit(limit)
    )
    return result.scalars().all()


@router.get("/history", response_model=List[RecommendationResponse])
async def get_recommendation_history(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff = date.today() - timedelta(days=days)
    result = await db.execute(
        select(Recommendation).where(
            and_(
                Recommendation.user_id == current_user.id,
                Recommendation.date >= cutoff
            )
        ).order_by(desc(Recommendation.date), Recommendation.priority)
    )
    return result.scalars().all()


@router.patch("/{rec_id}/action")
async def act_on_recommendation(
    rec_id: str,
    body: RecommendationAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Recommendation).where(
            and_(Recommendation.id == rec_id, Recommendation.user_id == current_user.id)
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if body.action == "accept":
        rec.accepted = True
    elif body.action == "snooze":
        rec.snoozed_until = datetime.utcnow() + timedelta(hours=2)
    elif body.action == "dismiss":
        rec.dismissed = True
    elif body.action == "not_relevant":
        rec.dismissed = True
        # Signal to decision engine: log as negative feedback
        # This will be picked up by feedback_loop on next run

    await db.flush()
    return {"status": "updated", "action": body.action}


@router.get("/adherence")
async def get_adherence_rate(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff = date.today() - timedelta(days=days)
    result = await db.execute(
        select(Recommendation).where(
            and_(
                Recommendation.user_id == current_user.id,
                Recommendation.date >= cutoff,
                Recommendation.accepted.isnot(None)
            )
        )
    )
    recs = result.scalars().all()

    if not recs:
        return {"rate": 0, "accepted": 0, "total": 0}

    accepted = sum(1 for r in recs if r.accepted)
    return {
        "rate": round(accepted / len(recs) * 100, 1),
        "accepted": accepted,
        "total": len(recs)
    }
