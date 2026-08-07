"""
Pydantic schemas — define the shape of API request/response bodies,
separate from the DB models so we control exactly what's exposed.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    bio: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Question ----------
class QuestionCreate(BaseModel):
    question: str
    user_answer: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None


class QuestionUpdate(BaseModel):
    question: Optional[str] = None
    user_answer: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None


class QuestionOut(BaseModel):
    id: str
    round_id: str
    question: str
    user_answer: Optional[str]
    ai_correct_answer: Optional[str]
    ai_improved_answer: Optional[str]
    ai_explanation: Optional[str]
    ai_missing_points: Optional[str]
    topic: Optional[str]
    difficulty: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Round ----------
class RoundCreate(BaseModel):
    round_name: str
    round_result: Optional[str] = None
    order_index: Optional[int] = 0
    questions: Optional[List[QuestionCreate]] = []


class RoundOut(BaseModel):
    id: str
    interview_id: str
    round_name: str
    round_result: Optional[str]
    order_index: int
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True


# ---------- Interview ----------
class InterviewCreate(BaseModel):
    company_name: str
    role: str
    interview_type: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = "pending"
    confidence: Optional[int] = 5
    notes: Optional[str] = None
    rounds: Optional[List[RoundCreate]] = []


class InterviewUpdate(BaseModel):
    company_name: Optional[str] = None
    role: Optional[str] = None
    interview_type: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = None
    confidence: Optional[int] = None
    notes: Optional[str] = None


class InterviewOut(BaseModel):
    id: str
    user_id: str
    company_name: str
    role: str
    interview_type: Optional[str]
    date: Optional[datetime]
    status: str
    confidence: int
    notes: Optional[str]
    created_at: datetime
    rounds: List[RoundOut] = []

    class Config:
        from_attributes = True


# ---------- AI ----------
class AIGenerateRequest(BaseModel):
    question: str
    user_answer: str


class AIGenerateResponse(BaseModel):
    correct_answer: str
    improved_answer: str
    explanation: str
    missing_points: str
    is_correct: bool = True
    verdict: str = "Your answer is correct"


# ---------- Analytics ----------
class AnalyticsOut(BaseModel):
    total_interviews: int
    selected: int
    waiting: int
    rejected: int
    pending: int
    avg_confidence: float
    company_distribution: dict
    monthly_activity: dict
