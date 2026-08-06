from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.models.models import Interview, Analytics, User, Company
from app.schemas.schemas import AnalyticsOut
from app.authentication.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
        waiting=analytics.waiting if analytics else 0,
        rejected=analytics.rejected if analytics else 0,
        pending=analytics.pending if analytics else 0,
        avg_confidence=round(avg_confidence, 1),
        company_distribution=dict(company_distribution),
        monthly_activity=dict(monthly_activity),
    )
