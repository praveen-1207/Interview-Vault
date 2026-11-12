from pydantic import BaseModel, Field

from app.schemas.interview import InterviewOut


class AdminExperienceOut(InterviewOut):
    owner_name: str
    owner_email: str
    question_count: int = 0


class AdminListResponse(BaseModel):
    items: list[AdminExperienceOut]
    total: int


class AdminRejectIn(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)
