from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.database import get_db
from app.models import DailyMetrics, User
from app.schemas import DailyMetricsCreate, DailyMetricsUpdate, DailyMetricsResponse, MoodSubmit, HydrationUpdate
from app.api.auth import get_current_user
from app.core.health_score import calculate_data_confidence

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/today", response_model=DailyMetricsResponse)
async def get_today_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    result = await db.execute(
        select(DailyMetrics).where(
            and_(DailyMetrics.user_id == current_user.id, DailyMetrics.date == today)
        )
    )
    metrics = result.scalar_one_or_none()
    if not metrics:
        metrics = DailyMetrics(user_id=current_user.id, date=today)
        db.add(metrics)
        await db.flush()
    return metrics


@router.post("/mood", response_model=DailyMetricsResponse)
async def submit_mood(
    body: MoodSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    result = await db.execute(
        select(DailyMetrics).where(
            and_(DailyMetrics.user_id == current_user.id, DailyMetrics.date == today)
        )
    )
    metrics = result.scalar_one_or_none()
    if not metrics:
        metrics = DailyMetrics(user_id=current_user.id, date=today)
        db.add(metrics)

    metrics.mood_score = body.mood_score
    if body.energy_level:
        metrics.energy_level = body.energy_level
    if body.stress_level:
        metrics.stress_level = body.stress_level

    # Recalculate confidence
    metrics.data_confidence_score = calculate_data_confidence(metrics, bool(current_user.google_fit_token))
    await db.flush()
    return metrics


@router.post("/hydration", response_model=DailyMetricsResponse)
async def update_hydration(
    body: HydrationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    result = await db.execute(
        select(DailyMetrics).where(
            and_(DailyMetrics.user_id == current_user.id, DailyMetrics.date == today)
        )
    )
    metrics = result.scalar_one_or_none()
    if not metrics:
        metrics = DailyMetrics(user_id=current_user.id, date=today)
        db.add(metrics)

    metrics.hydration_cups = min(body.cups, 20)
    metrics.data_confidence_score = calculate_data_confidence(metrics, bool(current_user.google_fit_token))
    await db.flush()
    return metrics


@router.post("/hydration/add")
async def add_hydration_cup(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Tap-to-add one cup."""
    today = date.today()
    result = await db.execute(
        select(DailyMetrics).where(
            and_(DailyMetrics.user_id == current_user.id, DailyMetrics.date == today)
        )
    )
    metrics = result.scalar_one_or_none()
    if not metrics:
        metrics = DailyMetrics(user_id=current_user.id, date=today)
        db.add(metrics)

    metrics.hydration_cups = min((metrics.hydration_cups or 0) + 1, 20)
    await db.flush()
    return {"hydration_cups": metrics.hydration_cups}


@router.patch("/today")
async def update_today_metrics(
    body: DailyMetricsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    result = await db.execute(
        select(DailyMetrics).where(
            and_(DailyMetrics.user_id == current_user.id, DailyMetrics.date == today)
        )
    )
    metrics = result.scalar_one_or_none()
    if not metrics:
        metrics = DailyMetrics(user_id=current_user.id, date=today)
        db.add(metrics)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(metrics, field, value)

    metrics.data_confidence_score = calculate_data_confidence(metrics, bool(current_user.google_fit_token))
    await db.flush()
    return metrics


@router.get("/history", response_model=List[DailyMetricsResponse])
async def get_metrics_history(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Pro gate for > 7 days
    if days > 7 and current_user.plan == "free":
        days = 7

    cutoff = date.today() - timedelta(days=days)
    result = await db.execute(
        select(DailyMetrics).where(
            and_(DailyMetrics.user_id == current_user.id, DailyMetrics.date >= cutoff)
        ).order_by(desc(DailyMetrics.date))
    )
    return result.scalars().all()
