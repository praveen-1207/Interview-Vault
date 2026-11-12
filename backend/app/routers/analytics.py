from fastapi import APIRouter

from app.authentication.deps import CurrentUser, DbSession
from app.schemas.analytics import AnalyticsSummary, CompanyDistribution, MonthlyActivity
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(db: DbSession, user: CurrentUser):
    return analytics_service.summary(db, user.id)


@router.get("/monthly", response_model=list[MonthlyActivity])
def get_monthly(db: DbSession, user: CurrentUser):
    return analytics_service.monthly(db, user.id)


@router.get("/companies", response_model=list[CompanyDistribution])
def get_companies(db: DbSession, user: CurrentUser):
    return analytics_service.companies(db, user.id)
