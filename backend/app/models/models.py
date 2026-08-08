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
    """Generate a random UUID string to use as a primary key.

    Used as the `default` for every id column so new rows get a unique
    string primary key automatically without extra code at insert time.
    """
    return str(uuid.uuid4())


class InterviewStatus(str, enum.Enum):
    """Lifecycle statuses for an interview.

    Defined as a `str, enum.Enum` so each member is BOTH a real Python
    string AND an enum value. That means `InterviewStatus.awaiting_result == "AWAITING_RESULT"`
    is True, which lets us store `status` directly as a string column while
    still enjoying autocomplete + typo-safety in code.

    New lifecycle (canonical, uppercase):
    - `applied`              → application submitted.
    - `shortlisted`          → shortlisted by the company.
    - `interview_scheduled`  → interview date has been fixed.
    - `interview_completed`  → interview happened.
    - `awaiting_result`      → waiting for the company's decision (the
                               reminder system tracks this).
    - `selected`             → got the offer.
    - `rejected`             → did not move forward.
    - `next_round`           → moved to the next round (status is "in
                               progress", not a final result).
    - `no_response`          → NO final result after a long wait. This is
                               NOT the same as rejected.

    Legacy values (`pending`, `waiting`) are still valid members so old
    database rows keep working after the upgrade.
    """
    applied = "APPLIED"
    shortlisted = "SHORTLISTED"
    interview_scheduled = "INTERVIEW_SCHEDULED"
    interview_completed = "INTERVIEW_COMPLETED"
    awaiting_result = "AWAITING_RESULT"
    selected = "SELECTED"
    rejected = "REJECTED"
    next_round = "NEXT_ROUND"
    no_response = "NO_RESPONSE"
    # Legacy aliases (kept so existing rows aren't broken).
    pending = "pending"
    waiting = "waiting"


# The statuses that participate in the follow-up reminder flow. Anything else
# (final outcomes, still-in-progress stages, legacy values) is not tracked.
REMINDER_TRACKED_STATUSES = {InterviewStatus.awaiting_result.value}


def normalize_status(value: str) -> str:
    """Map a user-supplied status to its canonical stored value.

    Frontends may send either the new canonical value (e.g. "AWAITING_RESULT")
    or a legacy lowercase value ("pending"/"waiting"). This maps legacy values
    to their canonical equivalent so new code can rely on one spelling while
    old data keeps working.
    """
    if not value:
        return InterviewStatus.awaiting_result.value
    mapping = {
        "pending": InterviewStatus.awaiting_result.value,
        "waiting": InterviewStatus.awaiting_result.value,
        "selected": InterviewStatus.selected.value,
        "rejected": InterviewStatus.rejected.value,
        "applied": InterviewStatus.applied.value,
        "shortlisted": InterviewStatus.shortlisted.value,
        "interview_scheduled": InterviewStatus.interview_scheduled.value,
        "interview_completed": InterviewStatus.interview_completed.value,
        "awaiting_result": InterviewStatus.awaiting_result.value,
        "next_round": InterviewStatus.next_round.value,
        "no_response": InterviewStatus.no_response.value,
    }
    return mapping.get(value.strip().lower(), InterviewStatus.awaiting_result.value)


class User(Base):
    """The `users` table: who is using the app.

    Stores basic profile info plus the bcrypt password hash. The `interviews`
    relationship means deleting a user wipes out all of their interviews too
    (cascade). One user has many interviews.

    Profile fields beyond name/email are optional and captured in Settings:
    - `occupation`   → what the user currently is (Student / Fresher /
                       Working Professional / Job Seeker). The signup form
                       does not ask this, so it starts empty until set.
    - `target_role`  → the role they are preparing for (e.g. "Software
                       Engineer"), useful for tailoring prep.
    - `location`     → city/country, shown on the profile.
    - `linkedin` / `github` → external profile links recruiters look at.
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    occupation = Column(String, nullable=True)   # Student / Fresher / Working Professional / Job Seeker
    target_role = Column(String, nullable=True)  # e.g. "Software Engineer"
    location = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")


class Company(Base):
    """The `companies` table: a shared list of company names.

    Names are unique, so every user's interview pointing at "Google" links to
    the same Company row. This makes the analytics "company distribution"
    grouping accurate without string matching.
    """
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=gen_uuid)
    company_name = Column(String, unique=True, nullable=False, index=True)

    interviews = relationship("Interview", back_populates="company")


class Interview(Base):
    """The `interviews` table: one row per interview the user logs.

    Belongs to one User and one Company, and contains the headline details
    (role, date, status, self-rated confidence, notes). A single interview
    owns many `rounds`, and deleting an interview cascades to delete them.

    The reminder-tracking fields power the follow-up status reminder system:
    - `status_updated_at`      → when the status was last changed.
    - `interview_completed_at` → actual completion date used as the reference
                                 for reminder scheduling (falls back to `date`).
    - `next_reminder_at`       → when the next follow-up reminder is due.
    - `last_reminder_at`       → when the last reminder was sent.
    - `reminder_count`         → how many reminders have been sent.
    - `reminder_snoozed_until` → "Tell me later" snooze timestamp.
    """
    __tablename__ = "interviews"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    interview_type = Column(String, nullable=True)  # Onsite / Remote / Telephonic
    date = Column(DateTime, nullable=True)
    status = Column(String, default=InterviewStatus.awaiting_result.value)
    confidence = Column(Integer, default=5)  # 1-10 self rating
    notes = Column(Text, nullable=True)
    # Follow-up reminder fields
    status_updated_at = Column(DateTime, nullable=True)
    interview_completed_at = Column(DateTime, nullable=True)
    next_reminder_at = Column(DateTime, nullable=True)
    last_reminder_at = Column(DateTime, nullable=True)
    reminder_count = Column(Integer, default=0)
    reminder_snoozed_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="interviews")
    company = relationship("Company", back_populates="interviews")
    rounds = relationship("Round", back_populates="interview", cascade="all, delete-orphan")


class Round(Base):
    """The `rounds` table: a stage inside an interview.

    Examples: "Technical Round 1", "HR Round". Ordered by `order_index`,
    stores optional `round_result` (Passed/Failed/Pending), and owns the
    `questions` asked during that round.
    """
    __tablename__ = "rounds"

    id = Column(String, primary_key=True, default=gen_uuid)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False, index=True)
    round_name = Column(String, nullable=False)
    round_result = Column(String, nullable=True)  # Passed / Failed / Pending
    order_index = Column(Integer, default=0)

    interview = relationship("Interview", back_populates="rounds")
    questions = relationship("Question", back_populates="round", cascade="all, delete-orphan")


class Question(Base):
    """The `questions` table: a single question that was asked.

    Holds the question text, the user's answer, optional topic/difficulty,
    and — once the "Generate" button is used — the AI feedback fields
    (ai_correct_answer, ai_improved_answer, ai_explanation, ai_missing_points).
    Each question belongs to exactly one round.
    """
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
    """The `analytics` table: pre-computed counts per user.

    One row per user (unique user id). Kept in sync by `_sync_analytics` every
    time an interview changes, so the dashboard reads fast numbers instead of
    recounting interviews on every request. `waiting`/`pending` remain as
    legacy columns for backwards compatibility (kept at 0); the new canonical
    statuses are counted in `awaiting_result`, `next_round` and `no_response`.
    """
    __tablename__ = "analytics"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    total_interviews = Column(Integer, default=0)
    selected = Column(Integer, default=0)
    waiting = Column(Integer, default=0)
    rejected = Column(Integer, default=0)
    pending = Column(Integer, default=0)
    awaiting_result = Column(Integer, default=0)
    next_round = Column(Integer, default=0)
    no_response = Column(Integer, default=0)
