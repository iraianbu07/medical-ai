from datetime import datetime, date, time
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field, validator
import uuid


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(None, max_length=100)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds

class RefreshRequest(BaseModel):
    refresh_token: str


# ─── User Schemas ──────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=13, le=120)
    gender: Optional[str] = None
    primary_goal: Optional[str] = None
    timezone: str = "UTC"
    theme_preference: str = "midnight"

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=13, le=120)
    gender: Optional[str] = None
    primary_goal: Optional[str] = None
    timezone: Optional[str] = None
    theme_preference: Optional[str] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None

class UserResponse(UserBase):
    id: str
    onboarding_completed: bool
    streak_days: int
    plan: str
    created_at: datetime
    class Config:
        from_attributes = True

class UserPreferencesUpdate(BaseModel):
    theme_preference: Optional[str] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    timezone: Optional[str] = None


# ─── Daily Metrics Schemas ─────────────────────────────────────────────────────

class DailyMetricsCreate(BaseModel):
    date: date
    steps: Optional[int] = Field(None, ge=0)
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    sleep_start_time: Optional[time] = None
    sleep_end_time: Optional[time] = None
    screen_time_minutes: Optional[int] = Field(None, ge=0)
    calories_estimated: Optional[int] = Field(None, ge=0)
    mood_score: Optional[int] = Field(None, ge=1, le=5)
    energy_level: Optional[int] = Field(None, ge=1, le=5)
    stress_level: Optional[int] = Field(None, ge=1, le=5)
    hydration_cups: Optional[int] = Field(None, ge=0, le=20)

class DailyMetricsUpdate(BaseModel):
    steps: Optional[int] = Field(None, ge=0)
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    sleep_start_time: Optional[time] = None
    sleep_end_time: Optional[time] = None
    screen_time_minutes: Optional[int] = Field(None, ge=0)
    mood_score: Optional[int] = Field(None, ge=1, le=5)
    energy_level: Optional[int] = Field(None, ge=1, le=5)
    stress_level: Optional[int] = Field(None, ge=1, le=5)
    hydration_cups: Optional[int] = Field(None, ge=0, le=20)

class DailyMetricsResponse(BaseModel):
    id: str
    user_id: str
    date: date
    steps: Optional[int]
    sleep_hours: Optional[float]
    sleep_inferred: bool
    sleep_start_time: Optional[time]
    sleep_end_time: Optional[time]
    screen_time_minutes: Optional[int]
    calories_estimated: Optional[int]
    mood_score: Optional[int]
    energy_level: Optional[int]
    stress_level: Optional[int]
    hydration_cups: int
    data_confidence_score: Optional[float]
    weather_condition: Optional[str]
    temperature_celsius: Optional[float]
    class Config:
        from_attributes = True

class MoodSubmit(BaseModel):
    mood_score: int = Field(ge=1, le=5)
    energy_level: Optional[int] = Field(None, ge=1, le=5)
    stress_level: Optional[int] = Field(None, ge=1, le=5)

class HydrationUpdate(BaseModel):
    cups: int = Field(ge=0, le=20)


# ─── Recommendation Schemas ────────────────────────────────────────────────────

class RecommendationResponse(BaseModel):
    id: str
    date: date
    action: str
    reason: str
    confidence: float
    priority: int
    category: Optional[str]
    accepted: Optional[bool]
    snoozed_until: Optional[datetime]
    dismissed: bool
    times_shown: int
    weather_influenced: bool
    weather_condition: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class RecommendationAction(BaseModel):
    action: str  # "accept" | "snooze" | "dismiss" | "not_relevant"


# ─── Behavior Flag Schemas ─────────────────────────────────────────────────────

class BehaviorFlagResponse(BaseModel):
    id: str
    flag_type: str
    severity: int
    active: bool
    detected_at: datetime
    times_escalated: int
    class Config:
        from_attributes = True


# ─── Health Score Schemas ──────────────────────────────────────────────────────

class HealthScoreResponse(BaseModel):
    date: date
    score: int
    score_breakdown: Optional[Dict[str, Any]]
    delta_yesterday: Optional[int]
    predicted_tomorrow: Optional[int]
    class Config:
        from_attributes = True


# ─── Prediction Schemas ────────────────────────────────────────────────────────

class PredictionsResponse(BaseModel):
    fatigue_risk: Optional[float]
    productivity_window: Optional[str]
    predicted_mood_tomorrow: Optional[float]
    predicted_score_tomorrow: Optional[int]
    confidence: str  # "HIGH" | "LOW" | "ESTIMATED"
    sources: int


# ─── Event / Voice Schemas ─────────────────────────────────────────────────────

class VoiceEventCreate(BaseModel):
    transcript: str = Field(min_length=1, max_length=1000)
    parsed_data: Optional[Dict[str, Any]] = None

class EventResponse(BaseModel):
    id: str
    event_type: str
    description: Optional[str]
    parsed_data: Optional[Dict[str, Any]]
    timestamp: datetime
    class Config:
        from_attributes = True


# ─── Achievement Schemas ───────────────────────────────────────────────────────

class AchievementResponse(BaseModel):
    id: str
    achievement_type: str
    unlocked_at: datetime
    seen: bool
    class Config:
        from_attributes = True


# ─── Weekly Insight Schemas ────────────────────────────────────────────────────

class WeeklyInsightResponse(BaseModel):
    id: str
    week_start: date
    summary_text: Optional[str]
    top_win: Optional[str]
    top_risk: Optional[str]
    score_change: Optional[int]
    generated_at: datetime
    class Config:
        from_attributes = True


# ─── Push Notification Schemas ─────────────────────────────────────────────────

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: Dict[str, str]


# ─── Dashboard Summary ─────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    user: UserResponse
    today_metrics: Optional[DailyMetricsResponse]
    health_score: Optional[HealthScoreResponse]
    recommendations: List[RecommendationResponse]
    active_flags: List[BehaviorFlagResponse]
    predictions: Optional[PredictionsResponse]
    narrative: str
    streak_days: int
    unseen_achievements: List[AchievementResponse]
