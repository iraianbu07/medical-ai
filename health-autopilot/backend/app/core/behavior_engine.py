"""
Behavior Detection Engine — runs nightly via Celery beat.
Implements all 8 detection rules from the spec.
"""
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
import structlog
import statistics

from app.models import DailyMetrics, BehaviorFlag, User

logger = structlog.get_logger()


class BehaviorDetectionEngine:

    async def run_for_user(self, user_id: str, db: AsyncSession) -> List[Dict]:
        """Run all 8 detection rules for a user. Returns list of new/updated flags."""
        # Fetch last 10 days of metrics
        metrics = await self._get_recent_metrics(user_id, db, days=10)
        if not metrics:
            return []

        flags_to_upsert = []
        today = date.today()

        # Run each rule
        flags_to_upsert.extend(await self._rule_sleep_debt(user_id, metrics, db))
        flags_to_upsert.extend(await self._rule_low_activity(user_id, metrics, db))
        flags_to_upsert.extend(await self._rule_late_night_usage(user_id, metrics, db))
        flags_to_upsert.extend(await self._rule_irregular_routine(user_id, metrics, db))
        flags_to_upsert.extend(await self._rule_recovery_needed(user_id, metrics, db))
        flags_to_upsert.extend(await self._rule_chronic_stress(user_id, metrics, db))
        flags_to_upsert.extend(await self._rule_dehydration_risk(user_id, metrics, db))

        # Auto-resolve stale flags (not triggered for 3 days)
        await self._auto_resolve_stale(user_id, db, triggered_types=[f["flag_type"] for f in flags_to_upsert])

        return flags_to_upsert

    async def _get_recent_metrics(self, user_id: str, db: AsyncSession, days: int = 10) -> List[DailyMetrics]:
        cutoff = date.today() - timedelta(days=days)
        result = await db.execute(
            select(DailyMetrics)
            .where(and_(DailyMetrics.user_id == user_id, DailyMetrics.date >= cutoff))
            .order_by(desc(DailyMetrics.date))
        )
        return result.scalars().all()

    async def _upsert_flag(self, user_id: str, flag_type: str, severity: int,
                           db: AsyncSession, metadata: Optional[Dict] = None) -> Dict:
        """Create or escalate an existing flag."""
        result = await db.execute(
            select(BehaviorFlag)
            .where(and_(
                BehaviorFlag.user_id == user_id,
                BehaviorFlag.flag_type == flag_type,
                BehaviorFlag.active == True
            ))
        )
        existing = result.scalar_one_or_none()

        if existing:
            if existing.severity != severity:
                existing.severity = severity
                existing.times_escalated += 1
            return {"flag_type": flag_type, "severity": severity, "action": "updated"}
        else:
            flag = BehaviorFlag(
                user_id=user_id,
                flag_type=flag_type,
                severity=severity,
                flag_metadata=metadata or {}
            )
            db.add(flag)
            await db.flush()
            return {"flag_type": flag_type, "severity": severity, "action": "created"}

    async def _auto_resolve_stale(self, user_id: str, db: AsyncSession, triggered_types: List[str]):
        """Auto-resolve flags not triggered in last 3 days."""
        result = await db.execute(
            select(BehaviorFlag)
            .where(and_(
                BehaviorFlag.user_id == user_id,
                BehaviorFlag.active == True,
                BehaviorFlag.flag_type.notin_(triggered_types)
            ))
        )
        stale_flags = result.scalars().all()
        cutoff = datetime.utcnow() - timedelta(days=3)
        for flag in stale_flags:
            if flag.detected_at < cutoff:
                flag.active = False
                flag.resolved_at = datetime.utcnow()

    # ── Rule 1: Sleep Debt ──────────────────────────────────────────────────────
    async def _rule_sleep_debt(self, user_id: str, metrics: List[DailyMetrics], db: AsyncSession) -> List[Dict]:
        last5 = [m for m in metrics if m.sleep_hours is not None][:5]
        if len(last5) < 2:
            return []

        under6 = sum(1 for m in last5 if m.sleep_hours < 6.0)
        last2_consecutive = all(m.sleep_hours < 5.0 for m in last5[:2])

        if last2_consecutive:
            return [await self._upsert_flag(user_id, "sleep_debt", 3, db, {"trigger": "2_consecutive_under5"})]
        elif under6 >= 3:
            return [await self._upsert_flag(user_id, "sleep_debt", 2, db, {"trigger": "3_of_5_under6"})]
        return []

    # ── Rule 2: Low Activity ────────────────────────────────────────────────────
    async def _rule_low_activity(self, user_id: str, metrics: List[DailyMetrics], db: AsyncSession) -> List[Dict]:
        last7 = [m for m in metrics if m.steps is not None][:7]
        if len(last7) < 3:
            return []

        under1500_consec = sum(1 for m in last7[:3] if m.steps < 1500)
        under3000_of7 = sum(1 for m in last7 if m.steps < 3000)

        if under1500_consec >= 3:
            return [await self._upsert_flag(user_id, "low_activity", 2, db, {"trigger": "3_consecutive_under1500"})]
        elif under3000_of7 >= 4:
            return [await self._upsert_flag(user_id, "low_activity", 1, db, {"trigger": "4_of_7_under3000"})]
        return []

    # ── Rule 3: Late Night Usage ────────────────────────────────────────────────
    async def _rule_late_night_usage(self, user_id: str, metrics: List[DailyMetrics], db: AsyncSession) -> List[Dict]:
        # Proxy: screen_time > 60 min total AND sleep_start_time after 22:00
        last5 = [m for m in metrics if m.screen_time_minutes is not None][:5]
        late_nights = 0
        for m in last5:
            if m.screen_time_minutes and m.screen_time_minutes > 60:
                if m.sleep_start_time and m.sleep_start_time.hour >= 22:
                    late_nights += 1
        if late_nights >= 3:
            return [await self._upsert_flag(user_id, "late_night_usage", 2, db)]
        return []

    # ── Rule 4: Irregular Routine ───────────────────────────────────────────────
    async def _rule_irregular_routine(self, user_id: str, metrics: List[DailyMetrics], db: AsyncSession) -> List[Dict]:
        last5 = [m for m in metrics if m.sleep_start_time is not None][:5]
        if len(last5) < 5:
            return []

        start_minutes = [m.sleep_start_time.hour * 60 + m.sleep_start_time.minute for m in last5]
        # Handle midnight crossing: if hour < 6, add 24*60
        adjusted = [m if m > 360 else m + 1440 for m in start_minutes]
        try:
            std = statistics.stdev(adjusted)
        except statistics.StatisticsError:
            return []

        if std > 120:  # > 2 hours standard deviation
            return [await self._upsert_flag(user_id, "irregular_routine", 1, db, {"sleep_start_std_mins": round(std)})]
        return []

    # ── Rule 5: Recovery Needed ─────────────────────────────────────────────────
    async def _rule_recovery_needed(self, user_id: str, metrics: List[DailyMetrics], db: AsyncSession) -> List[Dict]:
        last2 = metrics[:2]
        if len(last2) < 2:
            return []
        low_mood = all(m.mood_score is not None and m.mood_score <= 2 for m in last2)
        low_steps = all(m.steps is not None and m.steps < 2000 for m in last2)
        if low_mood and low_steps:
            return [await self._upsert_flag(user_id, "recovery_needed", 3, db)]
        return []

    # ── Rule 6: Chronic Stress ──────────────────────────────────────────────────
    async def _rule_chronic_stress(self, user_id: str, metrics: List[DailyMetrics], db: AsyncSession) -> List[Dict]:
        stress_metrics = [m for m in metrics if m.stress_level is not None]
        last3 = stress_metrics[:3]
        last2 = stress_metrics[:2]

        if len(last2) >= 2 and all(m.stress_level == 5 for m in last2):
            return [await self._upsert_flag(user_id, "chronic_stress", 3, db)]
        elif len(last3) >= 3 and all(m.stress_level >= 4 for m in last3):
            return [await self._upsert_flag(user_id, "chronic_stress", 2, db)]
        return []

    # ── Rule 7: Dehydration Risk ────────────────────────────────────────────────
    async def _rule_dehydration_risk(self, user_id: str, metrics: List[DailyMetrics], db: AsyncSession) -> List[Dict]:
        last3 = metrics[:3]
        if len(last3) < 3:
            return []
        under4 = sum(1 for m in last3 if m.hydration_cups < 4)
        if under4 >= 3:
            return [await self._upsert_flag(user_id, "dehydration_risk", 1, db)]
        return []


behavior_engine = BehaviorDetectionEngine()
