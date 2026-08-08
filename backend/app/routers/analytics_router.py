from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.models.models import Interview, Analytics, User, Company
from app.schemas.schemas import AnalyticsOut
from app.authentication.auth import get_current_user
from app.services.reminder_service import count_interviews_needing_status_update

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the analytics summary used by the Dashboard & AI Analysis pages.

    It combines two things:
    1. The pre-computed counts stored in the `analytics` row (selected,
       rejected, awaiting_result, next_round, no_response) that
       `_sync_analytics` keeps up to date.
    2. Live calculations over the user's interviews: average confidence,
       how many interviews per company, and how many per month.

    `needs_attention` is computed from the reminder service so the dashboard
    can show "N interviews need an update" without duplicating date logic.
    Everything is scoped to `current_user.id` so each user only sees their own.
    """
    interviews = (
        db.query(Interview)
        .options(joinedload(Interview.company))
        .filter(Interview.user_id == current_user.id)
        .all()
    )
    analytics = db.query(Analytics).filter(Analytics.user_id == current_user.id).first()

    avg_confidence = (
        sum(i.confidence for i in interviews) / len(interviews) if interviews else 0
    )

    company_distribution = defaultdict(int)
    monthly_activity = defaultdict(int)
    for i in interviews:
        company_distribution[i.company.company_name] += 1
        if i.date:
            key = i.date.strftime("%Y-%m")
            monthly_activity[key] += 1

    return AnalyticsOut(
        total_interviews=analytics.total_interviews if analytics else 0,
        selected=analytics.selected if analytics else 0,
        waiting=0,
        rejected=analytics.rejected if analytics else 0,
        pending=0,
        awaiting_result=analytics.awaiting_result if analytics else 0,
        next_round=analytics.next_round if analytics else 0,
        no_response=analytics.no_response if analytics else 0,
        needs_attention=count_interviews_needing_status_update(db, current_user.id),
        avg_confidence=round(avg_confidence, 1),
        company_distribution=dict(company_distribution),
        monthly_activity=dict(monthly_activity),
    )
