import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session

from database import get_db
from models import Event, Patient
from auth import get_current_patient

router = APIRouter(prefix="/events", tags=["Events"])
IST = timezone(timedelta(hours=5, minutes=30))


def create_event(db: Session, patient_id: str, event_type: str, message: str, severity: str = "info", parsed_data: dict = None, **kwargs):
    """Helper to create an event record."""
    if parsed_data is None:
        parsed_data = {}

    event = Event(
        patient_id=patient_id,
        event_type=event_type,
        message=message,
        severity=severity,
        parsed_data=json.dumps(parsed_data),
        carbon_saved_kg=0.0,
        plastic_saved_g=0.0,
        timestamp=datetime.now(IST),
    )
    db.add(event)
    db.commit()
    return event


@router.get("/list")
def list_events(
    limit: int = Query(50, ge=1, le=200),
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    events = (
        db.query(Event)
        .filter(Event.patient_id == patient.patient_id)
        .order_by(Event.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "message": e.message,
            "severity": e.severity,
            "timestamp": str(e.timestamp) if e.timestamp else None,
        }
        for e in events
    ]

@router.post("/log")
def log_event_api(
    event_data: dict = Body(...),
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Log an event from frontend."""
    return create_event(
        db=db,
        patient_id=patient.patient_id,
        event_type=event_data.get("event_type", "info"),
        message=event_data.get("message", ""),
        severity=event_data.get("severity", "info"),
        parsed_data=event_data.get("parsed_data", {})
    )

@router.get("/recent")
def recent_events(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Get last 5 events for dashboard display."""
    events = (
        db.query(Event)
        .filter(Event.patient_id == patient.patient_id)
        .order_by(Event.timestamp.desc())
        .limit(5)
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "message": e.message,
            "severity": e.severity,
            "timestamp": str(e.timestamp) if e.timestamp else None,
        }
        for e in events
    ]
