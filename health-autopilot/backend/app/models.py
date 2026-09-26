from sqlalchemy import Column, String, Integer, Float, Boolean, Date, Time, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime, date, time
import uuid


class Base(DeclarativeBase):
    pass


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String(100))
    age = Column(Integer)
    gender = Column(String(50))
    primary_goal = Column(String(100))
    timezone = Column(String(100), default="UTC")
    theme_preference = Column(String(50), default="midnight")
    notification_preferences = Column(JSON, default={})
    onboarding_completed = Column(Boolean, default=False)
    consent_given = Column(Boolean, default=False)
    streak_days = Column(Integer, default=0)
    plan = Column(String(20), default="free")
    location_lat = Column(Float)
    location_lon = Column(Float)
    google_fit_token = Column(Text)
    stripe_customer_id = Column(String(100))
    push_subscription = Column(JSON)
    privacy_mode = Column(Boolean, default=False)
    privacy_mode_until = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    metrics = relationship("DailyMetrics", back_populates="user", cascade="all, delete-orphan")
    flags = relationship("BehaviorFlag", back_populates="user", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="refresh_tokens")


class DailyMetrics(Base):
    __tablename__ = "daily_metrics"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    steps = Column(Integer)
    steps_imputed = Column(Boolean, default=False)
    sleep_hours = Column(Float)
    sleep_inferred = Column(Boolean, default=False)
    sleep_start_time = Column(Time)
    sleep_end_time = Column(Time)
    screen_time_minutes = Column(Integer)
    calories_estimated = Column(Integer)
    mood_score = Column(Integer)   # 1-5
    energy_level = Column(Integer) # 1-5
    stress_level = Column(Integer) # 1-5
    hydration_cups = Column(Integer, default=0)
    data_confidence_score = Column(Float)
    weather_condition = Column(String(50))
    temperature_celsius = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="metrics")


class BehaviorFlag(Base):
    __tablename__ = "behavior_flags"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    flag_type = Column(String(100), nullable=False)
    severity = Column(Integer, nullable=False)  # 1, 2, 3
    active = Column(Boolean, default=True)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    times_escalated = Column(Integer, default=0)
    flag_metadata = Column(JSON, default={})

    user = relationship("User", back_populates="flags")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    action = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    confidence = Column(Float, default=0.75)
    priority = Column(Integer, default=1)
    category = Column(String(50))
    accepted = Column(Boolean)
    snoozed_until = Column(DateTime)
    dismissed = Column(Boolean, default=False)
    times_shown = Column(Integer, default=0)
    weather_influenced = Column(Boolean, default=False)
    weather_condition = Column(String(50))
    outcome_measured = Column(Boolean, default=False)
    outcome_improved = Column(Boolean)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recommendations")


class HealthScoreHistory(Base):
    __tablename__ = "health_score_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    score = Column(Integer, nullable=False)
    score_breakdown = Column(JSON)
    predicted_tomorrow = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    description = Column(Text)
    parsed_data = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    achievement_type = Column(String(100), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    seen = Column(Boolean, default=False)

    user = relationship("User", back_populates="achievements")


class WeeklyInsight(Base):
    __tablename__ = "weekly_insights"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    week_start = Column(Date, nullable=False)
    summary_text = Column(Text)
    top_win = Column(Text)
    top_risk = Column(Text)
    score_change = Column(Integer)
    generated_at = Column(DateTime, default=datetime.utcnow)
