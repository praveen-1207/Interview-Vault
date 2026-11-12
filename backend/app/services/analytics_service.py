"""Dashboard analytics, aggregated per user from the interviews table."""

from calendar import month_abbr
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai_evaluation import AIEvaluation
from app.models.company import Company
from app.models.interview import Interview, InterviewStatus, PublicationStatus
from app.models.saved_experience import SavedExperience


def summary(db: Session, user_id: str) -> dict:
    base = select(Interview).where(Interview.user_id == user_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    selected = db.scalar(
        select(func.count())
        .select_from(base.where(Interview.status == InterviewStatus.selected).subquery())
    ) or 0
    waiting = db.scalar(
        select(func.count())
        .select_from(
            base.where(
                Interview.status.in_(
                    [InterviewStatus.waiting, InterviewStatus.in_progress]
                )
            ).subquery()
        )
    ) or 0
    rejected = db.scalar(
        select(func.count())
        .select_from(base.where(Interview.status == InterviewStatus.rejected).subquery())
    ) or 0

    approved = db.scalar(
        select(func.count())
        .select_from(
            base.where(
                Interview.publication_status == PublicationStatus.approved.value
            ).subquery()
        )
    ) or 0
    pending = db.scalar(
        select(func.count())
        .select_from(
            base.where(
                Interview.publication_status == PublicationStatus.pending_review.value
            ).subquery()
        )
    ) or 0
    rejected_submissions = db.scalar(
        select(func.count())
        .select_from(
            base.where(
                Interview.publication_status == PublicationStatus.rejected.value
            ).subquery()
        )
    ) or 0
    evaluations_used = (
        db.scalar(
            select(func.count())
            .select_from(AIEvaluation)
            .where(AIEvaluation.user_id == user_id)
        )
        or 0
    )
    saved_count = (
        db.scalar(
            select(func.count())
            .select_from(SavedExperience)
            .where(SavedExperience.user_id == user_id)
        )
        or 0
    )

    recent = list(
        db.scalars(
            select(Interview)
            .where(Interview.user_id == user_id)
            .order_by(Interview.created_at.desc())
            .limit(5)
        )
    )

    return {
        "total": total,
        "selected": selected,
        "waiting": waiting,
        "rejected": rejected,
        "success_rate": round(selected / total * 100, 1) if total else 0.0,
        "experiences_total": total,
        "approved": approved,
        "pending": pending,
        "rejected_submissions": rejected_submissions,
        "evaluations_used": evaluations_used,
        "evaluation_limit": settings.max_ai_evaluations_per_interview,
        "saved_count": saved_count,
        "recent": recent,
    }


def monthly(db: Session, user_id: str) -> list[dict]:
    """Per-month interview activity for the last 12 months (zero-filled)."""
    rows = db.execute(
        select(Interview.date, Interview.status).where(Interview.user_id == user_id)
    ).all()

    now = datetime.now()
    counts: dict[str, dict[str, int]] = {}
    for offset in range(11, -1, -1):
        year = now.year
        month = now.month - offset
        while month <= 0:
            month += 12
            year -= 1
        key = _month_key(year, month)
        counts[key] = {"total": 0, "selected": 0, "rejected": 0}

    for interview_date, status in rows:
        if interview_date is None:
            continue
        key = _month_key(interview_date.year, interview_date.month)
        if key in counts:
            counts[key]["total"] += 1
            if status == InterviewStatus.selected:
                counts[key]["selected"] += 1
            elif status == InterviewStatus.rejected:
                counts[key]["rejected"] += 1

    return [
        {"month": _month_label(key), **counts[key]}
        for key in sorted(counts.keys())
    ]


def companies(db: Session, user_id: str) -> list[dict]:
    rows = db.execute(
        select(Company.name, func.count(Interview.id))
        .join(Interview, Interview.company_id == Company.id)
        .where(Interview.user_id == user_id)
        .group_by(Company.name)
        .order_by(func.count(Interview.id).desc())
    ).all()
    return [{"company": name, "count": count} for name, count in rows]


def _month_key(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def _month_label(key: str) -> str:
    year, month = key.split("-")
    return f"{month_abbr[int(month)]} {year}"
