from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import OrmModel
from app.schemas.company import CompanyOut
from app.schemas.question import QuestionCategory


class PublicQuestionOut(OrmModel):
    id: str
    question: str
    category: QuestionCategory = "other"
    difficulty: str | None = None
    order_index: int | None = None


class PublicRoundOut(OrmModel):
    id: str
    name: str
    questions: list[PublicQuestionOut] = []


class PublicExperienceOut(OrmModel):
    id: str
    company: CompanyOut
    role: str
    interview_type: str
    interview_mode: str | None = None
    question_count: int = 0
    rounds_count: int = 0
    published_at: datetime | None = None
    created_at: datetime


class PublicExperienceDetail(PublicExperienceOut):
    rounds: list[PublicRoundOut] = []


class CommunityListResponse(BaseModel):
    items: list[PublicExperienceOut]
    total: int
    page: int
    page_size: int


class CommunityQuestionOut(BaseModel):
    id: str
    company_name: str
    role: str
    interview_type: str
    interview_mode: str | None
    round_name: str
    question: str
    category: QuestionCategory
    difficulty: str | None
    created_at: datetime


class CommunityQuestionListResponse(BaseModel):
    items: list[CommunityQuestionOut]
    total: int
    page: int
    page_size: int


class SavedExperienceOut(OrmModel):
    id: str
    interview: PublicExperienceOut
    created_at: datetime


class AnswerIn(BaseModel):
    answer_text: str = Field(min_length=1, max_length=20000)


class AnswerOut(OrmModel):
    id: str
    question_id: str
    answer_text: str
    created_at: datetime
    updated_at: datetime


class EvaluateIn(BaseModel):
    answer_text: str = Field(min_length=1, max_length=20000)


class AIEvaluationOut(OrmModel):
    id: str
    interview_id: str
    question_id: str
    answer_id: str | None = None
    score: int | None = None
    feedback: str
    model: str | None = None
    created_at: datetime


class EvaluateOut(BaseModel):
    evaluation: AIEvaluationOut
    used: int
    limit: int
    remaining: int


class AIUsageOut(BaseModel):
    used: int
    limit: int
    remaining: int
