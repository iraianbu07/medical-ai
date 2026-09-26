"""
Celery app configuration and task definitions.
"""
from celery import Celery
from app.config import settings

celery_app = Celery(
    "autopilot",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.celery_app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.celery_app.tasks.nightly_behavior_detection": {"queue": "nightly"},
        "app.celery_app.tasks.nightly_feedback_loop": {"queue": "nightly"},
        "app.celery_app.tasks.weekly_digest_generation": {"queue": "nightly"},
        "app.celery_app.tasks.ml_retrain": {"queue": "nightly"},
        "app.celery_app.tasks.send_push_notification": {"queue": "default"},
    },
    beat_schedule={
        "nightly-behavior-detection": {
            "task": "app.celery_app.tasks.nightly_behavior_detection",
            "schedule": 60 * 60 * 24,  # Every 24 hours at midnight
            "args": [],
            "options": {"queue": "nightly"},
        },
        "nightly-feedback-loop": {
            "task": "app.celery_app.tasks.nightly_feedback_loop",
            "schedule": 60 * 60 * 24,
            "options": {"queue": "nightly"},
        },
        "weekly-digest-sunday": {
            "task": "app.celery_app.tasks.weekly_digest_generation",
            "schedule": 60 * 60 * 24 * 7,
            "options": {"queue": "nightly"},
        },
        "ml-retrain-weekly": {
            "task": "app.celery_app.tasks.ml_retrain",
            "schedule": 60 * 60 * 24 * 7,
            "options": {"queue": "nightly"},
        },
    },
)
