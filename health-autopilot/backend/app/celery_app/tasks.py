"""
Celery task definitions — all nightly background jobs.
"""
import asyncio
from datetime import date, datetime, timedelta
from typing import List
from app.celery_app.celery import celery_app
import structlog

logger = structlog.get_logger()


def run_async(coro):
    """Run async coroutine in sync Celery task context."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.celery_app.tasks.nightly_behavior_detection", bind=True, max_retries=3)
def nightly_behavior_detection(self):
    """Run behavior detection engine for all users."""
    logger.info("Starting nightly behavior detection")
    run_async(_run_behavior_detection())
    logger.info("Nightly behavior detection complete")


async def _run_behavior_detection():
    from app.database import AsyncSessionLocal
    from app.models import User
    from app.core.behavior_engine import behavior_engine
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.onboarding_completed == True))
        users: List[User] = result.scalars().all()

        for user in users:
            try:
                await behavior_engine.run_for_user(user.id, db)
            except Exception as e:
                logger.error("Behavior detection failed for user", user_id=user.id, error=str(e))

        await db.commit()


@celery_app.task(name="app.celery_app.tasks.nightly_feedback_loop", bind=True, max_retries=3)
def nightly_feedback_loop(self):
    """Measure recommendation outcomes and update streaks."""
    logger.info("Starting nightly feedback loop")
    run_async(_run_feedback_loop())
    logger.info("Feedback loop complete")


async def _run_feedback_loop():
    from app.database import AsyncSessionLocal
    from app.models import User
    from app.core.feedback_loop import measure_outcomes
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.onboarding_completed == True))
        users: List[User] = result.scalars().all()

        for user in users:
            try:
                await measure_outcomes(user.id, db)
            except Exception as e:
                logger.error("Feedback loop failed for user", user_id=user.id, error=str(e))

        await db.commit()


@celery_app.task(name="app.celery_app.tasks.weekly_digest_generation", bind=True)
def weekly_digest_generation(self):
    """Generate weekly AI digest every Sunday night."""
    logger.info("Generating weekly digests")
    run_async(_generate_weekly_digests())


async def _generate_weekly_digests():
    from app.database import AsyncSessionLocal
    from app.models import User, WeeklyInsight, HealthScoreHistory, Recommendation
    from sqlalchemy import select, and_, desc
    from sqlalchemy.ext.asyncio import AsyncSession

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.onboarding_completed == True))
        users: List[User] = result.scalars().all()

        today = date.today()
        week_start = today - timedelta(days=7)

        for user in users:
            try:
                # Fetch last week's scores
                scores_result = await db.execute(
                    select(HealthScoreHistory).where(
                        and_(
                            HealthScoreHistory.user_id == user.id,
                            HealthScoreHistory.date >= week_start,
                            HealthScoreHistory.date <= today
                        )
                    )
                )
                scores = scores_result.scalars().all()

                if not scores:
                    continue

                avg_score = round(sum(s.score for s in scores) / len(scores))
                min_score = min(s.score for s in scores)
                max_score = max(s.score for s in scores)

                # Previous week for comparison
                prev_week_start = week_start - timedelta(days=7)
                prev_result = await db.execute(
                    select(HealthScoreHistory).where(
                        and_(
                            HealthScoreHistory.user_id == user.id,
                            HealthScoreHistory.date >= prev_week_start,
                            HealthScoreHistory.date < week_start
                        )
                    )
                )
                prev_scores = prev_result.scalars().all()
                prev_avg = round(sum(s.score for s in prev_scores) / len(prev_scores)) if prev_scores else avg_score
                score_change = avg_score - prev_avg

                # Accepted recs this week
                recs_result = await db.execute(
                    select(Recommendation).where(
                        and_(
                            Recommendation.user_id == user.id,
                            Recommendation.date >= week_start,
                            Recommendation.accepted == True
                        )
                    )
                )
                accepted_recs = recs_result.scalars().all()

                top_win = None
                if accepted_recs:
                    top_win = f"Followed {len(accepted_recs)} recommendation{'s' if len(accepted_recs) > 1 else ''} this week"
                elif max_score > 75:
                    top_win = f"Reached a peak health score of {max_score}/100 this week"

                top_risk = None
                if min_score < 40:
                    top_risk = f"Score dipped to {min_score}/100 — consider reviewing your sleep and activity patterns"
                elif score_change < -5:
                    top_risk = f"Score dropped {abs(score_change)} pts from last week — fatigue or stress likely contributor"

                summary = f"This week you averaged {avg_score}/100 across {len(scores)} tracked day{'s' if len(scores) > 1 else ''}. "
                if score_change >= 0:
                    summary += f"That's {score_change} points better than last week — consistent progress."
                else:
                    summary += f"Score dipped {abs(score_change)} pts from last week. Small adjustments to sleep and movement will recover the trend."

                insight = WeeklyInsight(
                    user_id=user.id,
                    week_start=week_start,
                    summary_text=summary,
                    top_win=top_win,
                    top_risk=top_risk,
                    score_change=score_change,
                )
                db.add(insight)

            except Exception as e:
                logger.error("Weekly digest failed", user_id=user.id, error=str(e))

        await db.commit()


@celery_app.task(name="app.celery_app.tasks.ml_retrain", bind=True)
def ml_retrain(self):
    """Retrain ML models weekly from accumulated data."""
    logger.info("Starting ML model retraining")
    run_async(_retrain_models())
    logger.info("ML retraining complete")


async def _retrain_models():
    try:
        import sys
        sys.path.insert(0, "/ml")
        from trainer import train_all_models
        train_all_models()
    except Exception as e:
        logger.error("ML retrain failed", error=str(e))


@celery_app.task(name="app.celery_app.tasks.send_push_notification")
def send_push_notification(user_id: str, title: str, body: str, url: str = "/dashboard"):
    """Send Web Push notification to a user."""
    run_async(_send_push(user_id, title, body, url))


async def _send_push(user_id: str, title: str, body: str, url: str):
    from app.database import AsyncSessionLocal
    from app.models import User
    from sqlalchemy import select
    import json

    if not __import__('app.config', fromlist=['settings']).settings.VAPID_PRIVATE_KEY:
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.push_subscription:
            return

        try:
            from pywebpush import webpush, WebPushException
            from app.config import settings

            webpush(
                subscription_info=user.push_subscription,
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"},
            )
        except Exception as e:
            logger.warning("Push notification failed", user_id=user_id, error=str(e))
