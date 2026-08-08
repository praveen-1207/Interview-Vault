"""
Pydantic schemas — define the shape of API request/response bodies,
separate from the DB models so we control exactly what's exposed.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class UserCreate(BaseModel):
    """Request body for POST /api/auth/register (creating an account).

    Enforces validation BEFORE the request reaches the database:
    - name must be 2-100 characters long.
    - email must be a well-formed address (validated by EmailStr).
    - password must be at least 6 characters.
    Note: `password` lives ONLY here — it is never exposed in any response
    schema, so the plain-text password can never leak out of the API.
    """
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    """Request body for POST /api/auth/login (signing in).

    Only two fields: email + password. No name needed because the account
    already exists. Both fields are required; a missing one fails validation
    with a 422 before the login logic ever runs.
    """
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Safe view of a user sent back to the frontend.

    Deliberately EXCLUDES the `password_hash` column — this is the whole
    reason we use a separate schema from the DB model. `from_attributes = True`
    lets FastAPI build this straight from a SQLAlchemy `User` object, and the
    frontend only ever sees the profile fields: id/name/email/bio, the career
    fields (occupation, target_role, location) and the social links
    (linkedin, github), plus created_at.
    """
    id: str
    name: str
    email: EmailStr
    bio: Optional[str] = None
    occupation: Optional[str] = None
    target_role: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Request body for PUT /api/users/me (editing the profile).

    All fields are optional because this is a PARTIAL update — the frontend
    may send only `name`, only `bio`, or any combination. The router pairs
    this with `exclude_unset=True` so untouched fields keep their values.
    """
    name: Optional[str] = None
    bio: Optional[str] = None
    occupation: Optional[str] = None
    target_role: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None


class Token(BaseModel):
    """The auth payload returned after register/login/refresh.

    Contains the two JWTs the frontend stores (access = short-lived bearer
    token, refresh = long-lived token used to mint new access tokens) plus
    the full `UserOut` so the UI can render the profile immediately without
    a second API call.
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Question ----------
class QuestionCreate(BaseModel):
    """Request body when creating a new question.

    Only `question` (the text) is required. `user_answer`, `topic` and
    `difficulty` are optional metadata attached to the question. Used by
    both `add_question` (round-level) and `add_question_to_interview`.
    """
    question: str
    user_answer: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None


class QuestionUpdate(BaseModel):
    """Request body for PUT /api/questions/{id} (editing a question).

    Same fields as `QuestionCreate` but every one is optional — a partial
    update that only overwrites whichever fields the frontend sends
    (`exclude_unset=True` in the router).
    """
    question: Optional[str] = None
    user_answer: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None


class QuestionOut(BaseModel):
    """Safe view of a question returned to the frontend.

    Includes the read-only AI feedback fields (`ai_correct_answer`,
    `ai_improved_answer`, `ai_explanation`, `ai_missing_points`) which are
    NULL until the "Generate" button is pressed. `from_attributes = True`
    allows direct construction from a SQLAlchemy `Question` row.
    """
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
    """Request body when adding a round to an interview.

    `round_name` is required (e.g. "Technical Round 1"). `round_result`
    stores whether it was Passed/Failed/Pending, `order_index` controls
    display order, and `questions` lets the client create a round WITH its
    questions already attached in one call (used by the Add Interview form).
    """
    round_name: str
    round_result: Optional[str] = None
    order_index: Optional[int] = 0
    questions: Optional[List[QuestionCreate]] = []


class RoundOut(BaseModel):
    """Safe view of a round, including every question inside it.

    Returned nested inside `InterviewOut`, so a single interview response
    contains the whole tree: interview → rounds → questions. `from_attributes`
    maps directly from the SQLAlchemy `Round` model.
    """
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
    """Request body for POST /api/interviews (creating an interview).

    Only `company_name` and `role` are required. Everything else (type,
    date, status, confidence, notes) has sensible defaults, and `rounds`
    lets the client attach a whole round structure (with questions) in the
    same request — this is what the "Add New Interview" form sends.
    """
    company_name: str
    role: str
    interview_type: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = "pending"
    confidence: Optional[int] = 5
    notes: Optional[str] = None
    rounds: Optional[List[RoundCreate]] = []


class InterviewUpdate(BaseModel):
    """Request body for PUT /api/interviews/{id} (editing an interview).

    All fields optional for partial updates. Note there is NO `rounds` here —
    rounds are managed through their own endpoints (`POST .../rounds`), so
    editing an interview only touches the headline fields. Updating `status`
    also (re)initializes the follow-up reminder schedule.
    """
    company_name: Optional[str] = None
    role: Optional[str] = None
    interview_type: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = None
    confidence: Optional[int] = None
    notes: Optional[str] = None


class InterviewOut(BaseModel):
    """Safe view of an interview returned to the frontend.

    `company_name` is denormalised here (even though the DB stores a
    `company_id` foreign key) so the frontend never has to join two tables.
    Includes the full nested `rounds` → `questions` tree for one-shot display,
    plus the reminder-tracking fields used by the status reminder system.
    """
    id: str
    user_id: str
    company_name: str
    role: str
    interview_type: Optional[str]
    date: Optional[datetime]
    status: str
    confidence: int
    notes: Optional[str]
    status_updated_at: Optional[datetime] = None
    interview_completed_at: Optional[datetime] = None
    next_reminder_at: Optional[datetime] = None
    last_reminder_at: Optional[datetime] = None
    reminder_count: int = 0
    reminder_snoozed_until: Optional[datetime] = None
    days_waiting: int = 0
    reminder_type: str = "FOLLOW_UP"
    created_at: datetime
    rounds: List[RoundOut] = []

    class Config:
        from_attributes = True


# ---------- Interview Status Updates ----------
class StatusUpdateRequest(BaseModel):
    """Body for PATCH /api/interviews/{id}/status.

    `status` can be any lifecycle value (SELECTED, REJECTED, NEXT_ROUND,
    NO_RESPONSE, AWAITING_RESULT, ...). For NEXT_ROUND, `next_round` carries
    the optional label for the new round (e.g. "Technical Round 2"); a
    default is used when omitted.
    """
    status: str
    next_round: Optional[str] = None


class StatusUpdateResponse(BaseModel):
    """Confirmation returned after a status update."""
    ok: bool = True
    interview: InterviewOut


# ---------- AI ----------
class AIGenerateRequest(BaseModel):
    """Request body for the stateless AI endpoint.

    Just the raw question text and the user's typed answer. This schema has
    no `question_id` because the stateless variant does NOT touch the
    database — it exists purely for the inline "Check answer with AI" button.
    """
    question: str
    user_answer: str


class AIConfidenceRequest(BaseModel):
    """Request body for scoring how confidently a candidate answered a question.

    The scoring needs THREE inputs so the model can compare the candidate's
    answer against a real reference:
    - `question`        → the interview question itself.
    - `user_answer`     → the candidate's actual answer.
    - `correct_answer`  → the expected/correct answer (in this app it comes
      from the already-working Gemini `generate_ai_feedback` result).
    The confidence LEVEL is decided by the AI model itself, never hard-coded
    on the backend.
    """
    question: str
    user_answer: str
    correct_answer: str


class AIConfidenceResponse(BaseModel):
    """The confidence-scoring result returned to the frontend.

    `confidence_score` is an integer 0-10 clamped server-side. Everything
    else (level, reason, strengths, weaknesses, improvement) is produced by
    Gemini following the CONFIDENCE_SYSTEM_PROMPT rubric.
    """
    confidence_score: int
    confidence_level: str
    reason: str
    strengths: List[str]
    weaknesses: List[str]
    improvement: str


class AIGenerateResponse(BaseModel):
    """The structured feedback Gemini returns (also the API response shape).

    Matches the JSON contract the SYSTEM_PROMPT forces the model to produce:
    an ideal `correct_answer`, an `improved_answer` based on the user's own
    attempt, an `explanation`, a bullet-style `missing_points` list, a
    boolean `is_correct`, and a human-readable `verdict`.
    """
    correct_answer: str
    improved_answer: str
    explanation: str
    missing_points: str
    is_correct: bool = True
    verdict: str = "Your answer is correct"


# ---------- Analytics ----------
class AnalyticsOut(BaseModel):
    """Response shape for GET /api/analytics (Dashboard & AI Analysis).

    Combines the pre-computed counts (total/selected/rejected, plus the new
    awaiting_result / next_round / no_response) with live-computed
    `avg_confidence`, `company_distribution` (company → interview count) and
    `monthly_activity` (YYYY-MM → count). `dict` values let the frontend
    render charts without knowing the keys.
    """
    total_interviews: int
    selected: int
    waiting: int
    rejected: int
    pending: int
    awaiting_result: int = 0
    next_round: int = 0
    no_response: int = 0
    needs_attention: int = 0
    avg_confidence: float
    company_distribution: dict
    monthly_activity: dict
