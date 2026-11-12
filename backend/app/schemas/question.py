from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import OrmModel

QuestionCategory = Literal[
    "technical", "coding", "hr", "aptitude", "system_design", "behavioral", "other"
]
QuestionDifficulty = Literal["easy", "medium", "hard"]


class QuestionOut(OrmModel):
    id: str
    round_id: str
    question: str
    user_answer: str
    ai_answer: str | None
    category: QuestionCategory = "other"
    difficulty: QuestionDifficulty | None = None
    order_index: int | None = None
    company_name: str | None = None
    role: str | None = None
    round_name: str | None = None
    difficulty: QuestionDifficulty | None = None
    interview_mode: str | None = None
    publication_status: str | None = None
    created_at: datetime


class QuestionCreate(BaseModel):
    question: str = Field(min_length=1)
    user_answer: str = Field(default="", max_length=20000)
    category: QuestionCategory = "other"
    difficulty: QuestionDifficulty | None = None
    order_index: int | None = None


class QuestionUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=1)
    user_answer: str | None = Field(default=None, max_length=20000)
    category: QuestionCategory | None = None
    difficulty: str | None = None
    order_index: int | None = None


class QuestionAnalyzeResponse(BaseModel):
    question: QuestionOut
