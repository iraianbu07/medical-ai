from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Device, Patient
from auth import get_current_patient

router = APIRouter(prefix="/devices", tags=["Devices"])
IST = timezone(timedelta(hours=5, minutes=30))

DEFAULT_DEVICES = [
    {"name": "MAX30102", "device_type": "Pulse Oximeter", "status": "Connected", "battery_level": "Strong", "latency_ms": 23},
    {"name": "DS18B20", "device_type": "Temperature Sensor", "status": "Connected", "battery_level": "Good", "latency_ms": 15},
    {"name": "Flex Sensor", "device_type": "Respiratory Monitor", "status": "Active", "battery_level": "Strong", "latency_ms": 18},
]


def ensure_default_devices(patient_id: str, db: Session):
    """Auto-seed default devices if patient has none."""
    existing = db.query(Device).filter(Device.patient_id == patient_id).count()
    if existing == 0:
        for d in DEFAULT_DEVICES:
            device = Device(
                patient_id=patient_id,
                name=d["name"],
                device_type=d["device_type"],
                status=d["status"],
                battery_level=d["battery_level"],
                latency_ms=d["latency_ms"],
                last_seen=datetime.now(IST),
            )
            db.add(device)
        db.commit()


class DeviceCreate(BaseModel):
    name: str
    device_type: str = "sensor"


class DeviceStatusUpdate(BaseModel):
    status: Optional[str] = None
    battery_level: Optional[str] = None
    latency_ms: Optional[int] = None


@router.get("/list")
def list_devices(patient: Patient = Depends(get_current_patient), db: Session = Depends(get_db)):
    ensure_default_devices(patient.patient_id, db)
    devices = db.query(Device).filter(Device.patient_id == patient.patient_id).order_by(Device.id).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "device_type": d.device_type,
            "status": d.status,
            "battery_level": d.battery_level,
            "latency_ms": d.latency_ms,
            "last_seen": str(d.last_seen) if d.last_seen else None,
        }
        for d in devices
    ]


@router.post("/add")
def add_device(data: DeviceCreate, patient: Patient = Depends(get_current_patient), db: Session = Depends(get_db)):
    device = Device(
        patient_id=patient.patient_id,
        name=data.name,
        device_type=data.device_type,
        status="Connected",
        battery_level="Strong",
        latency_ms=20,
        last_seen=datetime.now(IST),
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return {"id": device.id, "name": device.name, "status": device.status}


@router.put("/{device_id}/status")
def update_device_status(device_id: int, data: DeviceStatusUpdate,
                          patient: Patient = Depends(get_current_patient), db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id, Device.patient_id == patient.patient_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if data.status is not None:
        device.status = data.status
    if data.battery_level is not None:
        device.battery_level = data.battery_level
    if data.latency_ms is not None:
        device.latency_ms = data.latency_ms
    device.last_seen = datetime.now(IST)
    db.commit()
    return {"id": device.id, "name": device.name, "status": device.status}


@router.delete("/{device_id}")
def delete_device(device_id: int, patient: Patient = Depends(get_current_patient), db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id, Device.patient_id == patient.patient_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"message": "Device removed"}
