from datetime import date as DateType
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.interview import InterviewStatus, PublicationStatus
from app.schemas.common import OrmModel
from app.schemas.company import CompanyOut
from app.schemas.round import RoundOut

Difficulty = Literal["easy", "medium", "hard"]
InterviewMode = Literal["online", "offline", "phone", "video"]
InterviewType = Literal["technical", "hr", "coding", "managerial", "other"]
PublicIdentity = Literal["anonymous", "username"]


class InterviewOut(OrmModel):
    id: str
    user_id: str
    company: CompanyOut
    role: str
    interview_type: InterviewType = "other"
    date: DateType | None
    status: InterviewStatus
    experience_description: str | None = None
    difficulty: Difficulty | None = None
    interview_mode: InterviewMode | None = None
    publication_status: PublicationStatus
    publish_consent: bool
    public_identity: PublicIdentity
    rejection_reason: str | None = None
    reviewed_at: datetime | None = None
    published_at: datetime | None = None
    updated_at: datetime | None = None
    created_at: datetime


class InterviewDetail(InterviewOut):
    rounds: list[RoundOut]


class InterviewCreate(BaseModel):
    """The frontend sends either an existing company_id or a company_name."""

    company_id: str | None = None
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=255)
    interview_type: InterviewType = "other"
    date: DateType | None = None
    status: InterviewStatus = InterviewStatus.waiting
    experience_description: str | None = Field(default=None, max_length=5000)
    difficulty: Difficulty | None = None
    interview_mode: InterviewMode | None = None
    publish_consent: bool = False
    public_identity: PublicIdentity = "anonymous"


class InterviewUpdate(BaseModel):
    company_id: str | None = None
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: str | None = Field(default=None, min_length=1, max_length=255)
    interview_type: InterviewType | None = None
    date: DateType | None = None
    status: InterviewStatus | None = None
    experience_description: str | None = Field(default=None, max_length=5000)
    difficulty: Difficulty | None = None
    interview_mode: InterviewMode | None = None
    publish_consent: bool | None = None
    public_identity: PublicIdentity | None = None


class InterviewSubmitIn(BaseModel):
    """Explicit consent to publish an experience for community review."""

    publish_consent: bool = True
    public_identity: PublicIdentity = "anonymous"
    experience_description: str | None = Field(default=None, max_length=5000)
    difficulty: Difficulty | None = None
    interview_mode: InterviewMode | None = None


class InterviewExperienceQuestionIn(BaseModel):
    round_name: str = Field(min_length=1, max_length=120)
    question: str = Field(min_length=1, max_length=20000)
    user_answer: str = Field(default="", max_length=20000)
    category: Literal[
        "technical", "coding", "hr", "aptitude", "system_design", "behavioral", "other"
    ] = "other"
    difficulty: Difficulty | None = None
    ai_score: int | None = Field(default=None, ge=0, le=100)
    ai_feedback: str | None = Field(default=None, max_length=20000)
    ai_model: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def validate_evaluation(self):
        if self.ai_feedback is not None and not self.user_answer.strip():
            raise ValueError("An evaluated question must include the answer that was evaluated.")
        if self.ai_feedback is None and (self.ai_score is not None or self.ai_model is not None):
            raise ValueError("AI score and model require evaluation feedback.")
        return self


class InterviewExperienceCreate(BaseModel):
    submission_key: UUID
    company_name: str | None = Field(default=None, max_length=255)
    role: str = Field(min_length=1, max_length=255)
    interview_type: InterviewType
    date: DateType | None = None
    interview_mode: InterviewMode | None = None
    status: InterviewStatus
    experience_description: str | None = Field(default=None, max_length=5000)
    questions: list[InterviewExperienceQuestionIn] = Field(min_length=1, max_length=100)


class InterviewAnswerEvaluationIn(BaseModel):
    question: str = Field(min_length=1, max_length=20000)
    answer: str = Field(min_length=1, max_length=20000)


class InterviewAnswerEvaluationOut(BaseModel):
    score: int | None
    feedback: str
    model: str
