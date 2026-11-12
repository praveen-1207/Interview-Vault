from app.schemas.common import OrmModel
from app.schemas.interview import InterviewOut


class AnalyticsSummary(OrmModel):
    total: int
    selected: int
    waiting: int
    rejected: int
    success_rate: float
    experiences_total: int = 0
    approved: int = 0
    pending: int = 0
    rejected_submissions: int = 0
    evaluations_used: int = 0
    evaluation_limit: int = 5
    saved_count: int = 0
    recent: list[InterviewOut]


class MonthlyActivity(OrmModel):
    month: str
    total: int
    selected: int
    rejected: int


class CompanyDistribution(OrmModel):
    company: str
    count: int
