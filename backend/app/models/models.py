"""
SQLAlchemy ORM models mapping directly to the database schema:
Users, Companies, Interviews, Rounds, Questions, Analytics.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, ForeignKey, DateTime, Text, Enum
)
from sqlalchemy.orm import relationship
from app.database.connection import Base


def gen_uuid():
    return str(uuid.uuid4())


class InterviewStatus(str, enum.Enum):
    selected = "selected"
    waiting = "waiting"
    rejected = "rejected"
    pending = "pending"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=gen_uuid)
    company_name = Column(String, unique=True, nullable=False, index=True)

    interviews = relationship("Interview", back_populates="company")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    interview_type = Column(String, nullable=True)  # Onsite / Remote / Telephonic
    date = Column(DateTime, nullable=True)
    status = Column(String, default=InterviewStatus.pending.value)
    confidence = Column(Integer, default=5)  # 1-10 self rating
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="interviews")
    company = relationship("Company", back_populates="interviews")
    rounds = relationship("Round", back_populates="interview", cascade="all, delete-orphan")


class Round(Base):
    __tablename__ = "rounds"

    id = Column(String, primary_key=True, default=gen_uuid)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False, index=True)
    round_name = Column(String, nullable=False)
    round_result = Column(String, nullable=True)  # Passed / Failed / Pending
    order_index = Column(Integer, default=0)

    interview = relationship("Interview", back_populates="rounds")
    questions = relationship("Question", back_populates="round", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=gen_uuid)
    round_id = Column(String, ForeignKey("rounds.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    user_answer = Column(Text, nullable=True)
    ai_correct_answer = Column(Text, nullable=True)
    ai_improved_answer = Column(Text, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    ai_missing_points = Column(Text, nullable=True)
    topic = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)  # Easy / Medium / Hard
    created_at = Column(DateTime, default=datetime.utcnow)

    round = relationship("Round", back_populates="questions")


class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    total_interviews = Column(Integer, default=0)
    selected = Column(Integer, default=0)
    waiting = Column(Integer, default=0)
    rejected = Column(Integer, default=0)
    pending = Column(Integer, default=0)
