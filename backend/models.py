from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from database import Base

IST = timezone(timedelta(hours=5, minutes=30))


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), default="Patient")
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    conditions = Column(String(500), nullable=True)  # comma-separated
    risk_level = Column(String(20), default="Low")
    created_at = Column(DateTime, default=lambda: datetime.now(IST))


class Vital(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"), nullable=False, index=True)
    heart_rate = Column(Float, nullable=False)
    spo2 = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    respiratory_rate = Column(Float, nullable=False)
    systolic_bp = Column(Float, nullable=False)
    diastolic_bp = Column(Float, nullable=False)
    vgi = Column(Float, nullable=True)
    risk_category = Column(String(50), nullable=True)
    estimated_hours_to_deterioration = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(IST))


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    device_type = Column(String(50), default="sensor")
    status = Column(String(30), default="Connected")
    battery_level = Column(String(20), default="Strong")
    latency_ms = Column(Integer, default=23)
    last_seen = Column(DateTime, default=lambda: datetime.now(IST))


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # vital_submitted, alert, risk_change, email_sent
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="info")  # info, warning, critical
    parsed_data = Column(Text, nullable=True)  # Store JSON as string
    carbon_saved_kg = Column(Float, default=0.0)
    plastic_saved_g = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(IST))
