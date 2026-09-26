from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models import Event, User, DailyMetrics
from app.schemas import VoiceEventCreate, EventResponse
from app.api.auth import get_current_user
from app.core.nlp_parser import parse_voice_input
from datetime import date
from typing import List

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/voice", response_model=EventResponse)
async def log_voice_event(
    body: VoiceEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Parse the voice transcript
    parsed = parse_voice_input(body.transcript)

    event = Event(
        user_id=current_user.id,
        event_type=parsed["event_type"],
        description=parsed["description"],
        parsed_data=parsed["parsed_data"],
    )
    db.add(event)

    # Apply metric updates if any
    updates = parsed.get("updates", {})
    if updates:
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

        if "hydration_increment" in updates:
            metrics.hydration_cups = min((metrics.hydration_cups or 0) + updates["hydration_increment"], 20)
        if "steps_increment" in updates:
            metrics.steps = (metrics.steps or 0) + updates["steps_increment"]
        if "calories_increment" in updates:
            metrics.calories_estimated = (metrics.calories_estimated or 0) + updates["calories_increment"]
        if "stress_level" in updates:
            metrics.stress_level = updates["stress_level"]
        if "energy_level" in updates:
            metrics.energy_level = updates["energy_level"]
        if "mood_score" in updates:
            metrics.mood_score = updates["mood_score"]
        if "sleep_hours" in updates:
            metrics.sleep_hours = updates["sleep_hours"]

    await db.flush()
    return event


@router.get("/", response_model=List[EventResponse])
async def get_events(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import desc
    result = await db.execute(
        select(Event)
        .where(Event.user_id == current_user.id)
        .order_by(desc(Event.timestamp))
        .limit(limit)
    )
    return result.scalars().all()
