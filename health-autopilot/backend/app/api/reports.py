from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
import json

from app.database import get_db
from app.models import HealthScoreHistory, WeeklyInsight, User, DailyMetrics, Recommendation
from app.schemas import WeeklyInsightResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/scores", response_model=List[dict])
async def get_score_history(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if days > 7 and current_user.plan == "free":
        days = 7

    cutoff = date.today() - timedelta(days=days)
    result = await db.execute(
        select(HealthScoreHistory).where(
            and_(HealthScoreHistory.user_id == current_user.id, HealthScoreHistory.date >= cutoff)
        ).order_by(HealthScoreHistory.date)
    )
    scores = result.scalars().all()
    return [{"date": str(s.date), "score": s.score, "breakdown": s.score_breakdown} for s in scores]


@router.get("/time-machine", response_model=List[dict])
async def get_time_machine(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """30-day health timeline for the Time Machine feature."""
    if current_user.plan == "free":
        raise HTTPException(status_code=403, detail="Pro feature")

    cutoff = date.today() - timedelta(days=days)

    scores_result = await db.execute(
        select(HealthScoreHistory).where(
            and_(HealthScoreHistory.user_id == current_user.id, HealthScoreHistory.date >= cutoff)
        )
    )
    scores = {s.date: s for s in scores_result.scalars().all()}

    metrics_result = await db.execute(
        select(DailyMetrics).where(
            and_(DailyMetrics.user_id == current_user.id, DailyMetrics.date >= cutoff)
        )
    )
    metrics = {m.date: m for m in metrics_result.scalars().all()}

    recs_result = await db.execute(
        select(Recommendation).where(
            and_(Recommendation.user_id == current_user.id, Recommendation.date >= cutoff)
        )
    )
    recs_by_date = {}
    for r in recs_result.scalars().all():
        recs_by_date.setdefault(r.date, []).append(r)

    timeline = []
    for i in range(days + 1):
        d = cutoff + timedelta(days=i)
        score = scores.get(d)
        m = metrics.get(d)
        day_recs = recs_by_date.get(d, [])
        had_accepted = any(r.accepted for r in day_recs)

        timeline.append({
            "date": str(d),
            "score": score.score if score else None,
            "mood": m.mood_score if m else None,
            "steps": m.steps if m else None,
            "sleep_hours": m.sleep_hours if m else None,
            "had_accepted_recommendation": had_accepted,
        })

    return timeline


@router.get("/weekly-insight", response_model=Optional[WeeklyInsightResponse])
async def get_weekly_insight(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(WeeklyInsight)
        .where(WeeklyInsight.user_id == current_user.id)
        .order_by(desc(WeeklyInsight.generated_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/pdf")
async def export_pdf(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and stream PDF report using reportlab."""
    if current_user.plan == "free":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="PDF export is a Pro feature")

    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.graphics.shapes import Drawing, Rect
    from reportlab.graphics import renderPDF

    # Fetch data
    cutoff = date.today() - timedelta(days=30)
    scores_result = await db.execute(
        select(HealthScoreHistory).where(
            and_(HealthScoreHistory.user_id == current_user.id, HealthScoreHistory.date >= cutoff)
        ).order_by(HealthScoreHistory.date)
    )
    scores = scores_result.scalars().all()

    insight_result = await db.execute(
        select(WeeklyInsight)
        .where(WeeklyInsight.user_id == current_user.id)
        .order_by(desc(WeeklyInsight.generated_at))
        .limit(1)
    )
    insight = insight_result.scalar_one_or_none()

    # Build PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=24, textColor=colors.HexColor('#0A1628'))
    story.append(Paragraph("Health Autopilot OS — Weekly Report", title_style))
    story.append(Paragraph(f"Generated: {date.today().strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E0E0E0')))
    story.append(Spacer(1, 20))

    # Score trend table
    if scores:
        avg_score = round(sum(s.score for s in scores) / len(scores))
        story.append(Paragraph("30-Day Score Summary", styles['Heading2']))
        story.append(Paragraph(f"Average Health Score: <b>{avg_score}/100</b>", styles['Normal']))
        story.append(Spacer(1, 10))

        table_data = [["Date", "Score"]]
        for s in scores[-14:]:  # Last 14 days
            table_data.append([str(s.date), str(s.score)])

        t = Table(table_data, colWidths=[4*cm, 3*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1B6FEB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F4F8FC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        story.append(Spacer(1, 20))

    # Weekly insight
    if insight:
        story.append(Paragraph("Weekly AI Insight", styles['Heading2']))
        if insight.summary_text:
            story.append(Paragraph(insight.summary_text, styles['Normal']))
        story.append(Spacer(1, 10))
        if insight.top_win:
            story.append(Paragraph(f"✅ <b>Top Win:</b> {insight.top_win}", styles['Normal']))
        if insight.top_risk:
            story.append(Paragraph(f"⚠️ <b>Top Risk:</b> {insight.top_risk}", styles['Normal']))
        if insight.score_change is not None:
            direction = "▲" if insight.score_change >= 0 else "▼"
            story.append(Paragraph(f"Score Change: {direction} {abs(insight.score_change)} pts week-over-week", styles['Normal']))

    doc.build(story)
    buffer.seek(0)

    return Response(
        content=buffer.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=health-report-{date.today()}.pdf"}
    )
