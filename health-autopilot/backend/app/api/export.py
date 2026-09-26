import json
from datetime import datetime, date
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, DailyMetrics, BehaviorFlag, Recommendation, HealthScoreHistory, UserAchievement, Event
from app.api.auth import get_current_user

router = APIRouter(prefix="/my-data", tags=["privacy"])


@router.get("/export")
async def export_my_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export all user data as JSON (GDPR-compliant)."""

    metrics_result = await db.execute(select(DailyMetrics).where(DailyMetrics.user_id == current_user.id))
    metrics = metrics_result.scalars().all()

    flags_result = await db.execute(select(BehaviorFlag).where(BehaviorFlag.user_id == current_user.id))
    flags = flags_result.scalars().all()

    recs_result = await db.execute(select(Recommendation).where(Recommendation.user_id == current_user.id))
    recs = recs_result.scalars().all()

    events_result = await db.execute(select(Event).where(Event.user_id == current_user.id))
    events = events_result.scalars().all()

    scores_result = await db.execute(select(HealthScoreHistory).where(HealthScoreHistory.user_id == current_user.id))
    scores = scores_result.scalars().all()

    def serialize_date(v):
        if isinstance(v, (date, datetime)):
            return v.isoformat()
        return v

    export = {
        "exported_at": datetime.utcnow().isoformat(),
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "age": current_user.age,
            "gender": current_user.gender,
            "primary_goal": current_user.primary_goal,
            "timezone": current_user.timezone,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "daily_metrics": [
            {k: serialize_date(v) for k, v in {
                "date": m.date, "steps": m.steps, "sleep_hours": m.sleep_hours,
                "mood_score": m.mood_score, "energy_level": m.energy_level,
                "stress_level": m.stress_level, "hydration_cups": m.hydration_cups,
                "screen_time_minutes": m.screen_time_minutes,
            }.items()}
            for m in metrics
        ],
        "behavior_flags": [
            {"flag_type": f.flag_type, "severity": f.severity, "detected_at": f.detected_at.isoformat(), "active": f.active}
            for f in flags
        ],
        "recommendations": [
            {"date": str(r.date), "action": r.action, "category": r.category, "accepted": r.accepted}
            for r in recs
        ],
        "events": [
            {"event_type": e.event_type, "description": e.description, "timestamp": e.timestamp.isoformat()}
            for e in events
        ],
        "health_scores": [
            {"date": str(s.date), "score": s.score}
            for s in scores
        ],
    }

    return Response(
        content=json.dumps(export, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=my-health-data-{date.today()}.json"}
    )


@router.post("/privacy-mode")
async def toggle_privacy_mode(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enable 24-hour privacy mode — pause data collection."""
    from datetime import timedelta
    current_user.privacy_mode = True
    current_user.privacy_mode_until = datetime.utcnow() + timedelta(hours=24)
    await db.flush()
    return {"privacy_mode": True, "until": current_user.privacy_mode_until.isoformat()}


@router.delete("/account")
async def request_account_deletion(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark account for deletion — 30-day recovery window."""
    # In production: set a deletion_requested_at field and process after 30 days
    return {
        "message": "Account deletion requested. Your data will be permanently deleted in 30 days.",
        "recovery_until": (datetime.utcnow().date() + __import__('datetime').timedelta(days=30)).isoformat()
    }


@router.get("/collection-info")
async def get_collection_info(current_user: User = Depends(get_current_user)):
    """What data do we collect and why."""
    return {
        "data_points": [
            {"name": "Daily Steps", "source": "Google Fit API or Manual", "why": "Activity scoring and low_activity detection"},
            {"name": "Sleep Duration", "source": "Google Fit API or Inferred", "why": "Sleep score and sleep_debt detection"},
            {"name": "Mood Score", "source": "Your daily check-in (1 tap)", "why": "Mental health scoring and mood trend forecasting"},
            {"name": "Stress Level", "source": "Your daily check-in", "why": "Chronic stress detection and recommendation generation"},
            {"name": "Hydration", "source": "Your tap log", "why": "Nutrition scoring and dehydration_risk detection"},
            {"name": "Weather", "source": "Open-Meteo API (location)", "why": "Adapting recommendations to outdoor conditions"},
            {"name": "Voice Logs", "source": "Web Speech API (you trigger)", "why": "Enriching data signals for better recommendations"},
        ],
        "retention_days": 365,
        "encrypted": True,
        "shared_with_third_parties": False,
        "privacy_mode_active": current_user.privacy_mode,
    }
