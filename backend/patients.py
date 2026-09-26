from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from database import get_db
from models import Patient
from auth import get_current_patient

router = APIRouter(prefix="/patients", tags=["Patients"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    conditions: Optional[str] = None
    risk_level: Optional[str] = None


class PatientOut(BaseModel):
    patient_id: str
    name: str | None
    age: int | None
    gender: str | None
    conditions: str | None
    risk_level: str | None
    created_at: str | None

    class Config:
        from_attributes = True


@router.get("/profile")
def get_profile(patient: Patient = Depends(get_current_patient)):
    return {
        "patient_id": patient.patient_id,
        "name": patient.name or "Patient",
        "age": patient.age,
        "gender": patient.gender,
        "conditions": patient.conditions,
        "risk_level": patient.risk_level or "Low",
        "created_at": str(patient.created_at) if patient.created_at else None,
    }


@router.put("/profile")
def update_profile(data: ProfileUpdate, patient: Patient = Depends(get_current_patient), db: Session = Depends(get_db)):
    if data.name is not None:
        patient.name = data.name
    if data.age is not None:
        patient.age = data.age
    if data.gender is not None:
        patient.gender = data.gender
    if data.conditions is not None:
        patient.conditions = data.conditions
    if data.risk_level is not None:
        patient.risk_level = data.risk_level
    db.commit()
    db.refresh(patient)
    return {
        "patient_id": patient.patient_id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "conditions": patient.conditions,
        "risk_level": patient.risk_level,
    }


@router.get("/list")
def list_patients(db: Session = Depends(get_db), _: Patient = Depends(get_current_patient)):
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()
    result = []
    for p in patients:
        # Get latest vital for each patient
        from models import Vital
        latest_vital = db.query(Vital).filter(Vital.patient_id == p.patient_id).order_by(Vital.timestamp.desc()).first()
        result.append({
            "patient_id": p.patient_id,
            "name": p.name or "Patient",
            "age": p.age,
            "gender": p.gender,
            "conditions": p.conditions,
            "risk_level": p.risk_level or "Low",
            "created_at": str(p.created_at) if p.created_at else None,
            "latest_vgi": latest_vital.vgi if latest_vital else None,
            "latest_category": latest_vital.risk_category if latest_vital else None,
            "last_reading": str(latest_vital.timestamp) if latest_vital else None,
        })
    return result
