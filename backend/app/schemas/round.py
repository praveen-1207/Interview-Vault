from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import OrmModel
from app.schemas.question import QuestionOut


class RoundOut(OrmModel):
    id: str
    interview_id: str
    name: str
    created_at: datetime
    questions: list[QuestionOut] = []


class RoundCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class RoundUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
