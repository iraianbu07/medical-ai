from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
import structlog

from app.database import get_db
from app.models import User, DailyMetrics, BehaviorFlag, Recommendation, HealthScoreHistory, UserAchievement
from app.schemas import DashboardResponse, UserResponse, UserUpdate, UserPreferencesUpdate
from app.api.auth import get_current_user
from app.core.health_score import calculate_health_score, calculate_data_confidence
from app.core.decision_engine import decision_engine
from app.core.narrative_engine import generate_daily_narrative, get_confidence_label
from app.core.weather_client import get_weather_cached

router = APIRouter(prefix="/users", tags=["users"])
logger = structlog.get_logger()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.flush()
    return current_user


@router.patch("/preferences")
async def update_preferences(
    body: UserPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if body.theme_preference:
        current_user.theme_preference = body.theme_preference
    if body.notification_preferences is not None:
        current_user.notification_preferences = body.notification_preferences
    if body.timezone:
        current_user.timezone = body.timezone
    await db.flush()
    return {"status": "updated"}


@router.patch("/onboarding-complete")
async def complete_onboarding(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.onboarding_completed = True
    if body.get("primary_goal"):
        current_user.primary_goal = body["primary_goal"]
    if body.get("age"):
        current_user.age = body["age"]
    if body.get("location_lat") and body.get("location_lon"):
        current_user.location_lat = body["location_lat"]
        current_user.location_lon = body["location_lon"]
    if body.get("theme_preference"):
        current_user.theme_preference = body["theme_preference"]
    current_user.consent_given = True
    await db.flush()
    return {"status": "onboarding_complete"}


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    yesterday = today - timedelta(days=1)

    # Today's metrics
    metrics_result = await db.execute(
        select(DailyMetrics).where(
            and_(DailyMetrics.user_id == current_user.id, DailyMetrics.date == today)
        )
    )
    today_metrics = metrics_result.scalar_one_or_none()

    # If no metrics today, create a placeholder
    if not today_metrics:
        today_metrics = DailyMetrics(user_id=current_user.id, date=today)
        db.add(today_metrics)
        await db.flush()

    # Calculate health score
    score_val, breakdown = calculate_health_score(today_metrics)

    # Yesterday's score for delta
    yesterday_score_result = await db.execute(
        select(HealthScoreHistory).where(
            and_(HealthScoreHistory.user_id == current_user.id, HealthScoreHistory.date == yesterday)
        )
    )
    yesterday_score = yesterday_score_result.scalar_one_or_none()
    delta = score_val - yesterday_score.score if yesterday_score else None

    # Upsert today's score
    score_history_result = await db.execute(
        select(HealthScoreHistory).where(
            and_(HealthScoreHistory.user_id == current_user.id, HealthScoreHistory.date == today)
        )
    )
    score_history = score_history_result.scalar_one_or_none()
    if score_history:
        score_history.score = score_val
        score_history.score_breakdown = breakdown
    else:
        score_history = HealthScoreHistory(
            user_id=current_user.id,
            date=today,
            score=score_val,
            score_breakdown=breakdown
        )
        db.add(score_history)

    # Active behavior flags
    flags_result = await db.execute(
        select(BehaviorFlag).where(
            and_(BehaviorFlag.user_id == current_user.id, BehaviorFlag.active == True)
        ).order_by(desc(BehaviorFlag.severity))
    )
    active_flags = flags_result.scalars().all()

    # Weather
    weather = None
    if current_user.location_lat and current_user.location_lon:
        try:
            from app.core.redis_client import redis_client
            weather = await get_weather_cached(
                current_user.location_lat, current_user.location_lon, redis_client
            )
        except Exception:
            pass

    # Predictions from Redis cache
    predictions = await _get_cached_predictions(current_user.id)

    # Recommendations
    recs = await decision_engine.generate_recommendations(
        current_user.id, db, predictions, weather, current_user
    )

    # Narrative
    confidence_score = calculate_data_confidence(today_metrics, bool(current_user.google_fit_token))
    narrative = generate_daily_narrative(
        user_name=current_user.name,
        score=score_val,
        delta=delta,
        metrics=today_metrics,
        flags=active_flags,
        predictions=predictions,
        confidence="HIGH_CONFIDENCE" if confidence_score >= 0.7 else "LOW_CONFIDENCE"
    )

    # Unseen achievements
    unseen_result = await db.execute(
        select(UserAchievement).where(
            and_(UserAchievement.user_id == current_user.id, UserAchievement.seen == False)
        )
    )
    unseen_achievements = unseen_result.scalars().all()

    # Build predictions schema
    sources = sum([
        1 if today_metrics.steps else 0,
        1 if today_metrics.mood_score else 0,
        1 if today_metrics.sleep_hours else 0,
        1 if weather else 0,
    ])
    predictions_response = None
    if predictions:
        predictions_response = {
            "fatigue_risk": predictions.get("fatigue_risk"),
            "productivity_window": predictions.get("productivity_window"),
            "predicted_mood_tomorrow": predictions.get("predicted_mood_tomorrow"),
            "predicted_score_tomorrow": predictions.get("predicted_score_tomorrow"),
            "confidence": "HIGH" if confidence_score >= 0.7 else "LOW",
            "sources": sources,
        }

    await db.commit()

    return {
        "user": current_user,
        "today_metrics": today_metrics,
        "health_score": {
            "date": today,
            "score": score_val,
            "score_breakdown": breakdown,
            "delta_yesterday": delta,
            "predicted_tomorrow": predictions.get("predicted_score_tomorrow") if predictions else None,
        },
        "recommendations": recs,
        "active_flags": active_flags,
        "predictions": predictions_response,
        "narrative": narrative,
        "streak_days": current_user.streak_days,
        "unseen_achievements": unseen_achievements,
    }


async def _get_cached_predictions(user_id: str) -> Optional[dict]:
    """Fetch pre-computed ML predictions from Redis."""
    try:
        import json
        from app.core.redis_client import redis_client
        cached = await redis_client.get(f"predictions:{user_id}")
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    return None
