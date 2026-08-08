from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.models.models import (
    Interview, Company, Round, Question, User, Analytics,
    InterviewStatus, normalize_status, REMINDER_TRACKED_STATUSES,
)
from app.schemas.schemas import (
    InterviewCreate, InterviewUpdate, InterviewOut, QuestionCreate, QuestionOut,
    RoundOut, RoundCreate, StatusUpdateRequest, StatusUpdateResponse,
)
from app.authentication.auth import get_current_user
from app.services.reminder_service import (
    get_interviews_needing_status_update,
    days_waiting,
    reminder_type,
    is_reminder_due,
    mark_tracked_status,
    clear_reminder_schedule,
    snooze_reminder,
    schedule_next_reminder,
)

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


def _to_out(interview: Interview) -> dict:
    """Convert a database Interview object into a plain dictionary.

    The frontend should never receive the raw database object. This helper
    picks out just the fields the UI needs and also includes the nested
    rounds + questions so a single API call returns everything, plus the
    reminder-tracking fields and computed `days_waiting` / `reminder_type`.
    """
    return {
        "id": interview.id,
        "user_id": interview.user_id,
        "company_name": interview.company.company_name,
        "role": interview.role,
        "interview_type": interview.interview_type,
        "date": interview.date,
        "status": interview.status,
        "confidence": interview.confidence,
        "notes": interview.notes,
        "status_updated_at": interview.status_updated_at,
        "interview_completed_at": interview.interview_completed_at,
        "next_reminder_at": interview.next_reminder_at,
        "last_reminder_at": interview.last_reminder_at,
        "reminder_count": interview.reminder_count or 0,
        "reminder_snoozed_until": interview.reminder_snoozed_until,
        "created_at": interview.created_at,
        "rounds": interview.rounds,
        "days_waiting": days_waiting(interview),
        "reminder_type": reminder_type(interview),
    }


def _get_or_create_company(db: Session, name: str) -> Company:
    """Find a company by name (case-insensitive) or create it if new.

    Companies are shared across users, so instead of storing a raw string on
    every interview we look it up in the `companies` table. If it doesn't
    exist yet, we insert it and return the new row. This keeps the company
    names consistent and makes the analytics grouped-by-company easy.
    """
    company = (
        db.query(Company)
        .filter(Company.company_name.ilike(name))
        .first()
    )
    if not company:
        company = Company(company_name=name)
        db.add(company)
        db.flush()
    return company


def _sync_analytics(db: Session, user_id: str):
    """
    Recompute the pre-computed Analytics row for one user.

    We keep a single Analytics row per user (created at signup) with simple
    counts. Any time an interview is created, updated or deleted, call this
    to keep the numbers in sync. It only counts interviews that belong to
    the user. The legacy `waiting`/`pending` columns are kept at zero; the
    new canonical statuses are counted in `awaiting_result`, `next_round`
    and `no_response`.
    """
    analytics = db.query(Analytics).filter(Analytics.user_id == user_id).first()
    if not analytics:
        analytics = Analytics(user_id=user_id)
        db.add(analytics)
        db.flush()

    interviews = db.query(Interview).filter(Interview.user_id == user_id).all()
    analytics.total_interviews = len(interviews)
    analytics.selected = sum(1 for i in interviews if normalize_status(i.status) == InterviewStatus.selected.value)
    analytics.rejected = sum(1 for i in interviews if normalize_status(i.status) == InterviewStatus.rejected.value)
    analytics.awaiting_result = sum(1 for i in interviews if normalize_status(i.status) == InterviewStatus.awaiting_result.value)
    analytics.next_round = sum(1 for i in interviews if normalize_status(i.status) == InterviewStatus.next_round.value)
    analytics.no_response = sum(1 for i in interviews if normalize_status(i.status) == InterviewStatus.no_response.value)
    analytics.waiting = 0
    analytics.pending = 0
    db.commit()


def _get_owned_interview(db: Session, interview_id: str, user_id: str) -> Interview:
    """Fetch an interview by id and make sure it belongs to the current user.

    Raises 404 (not 403) so the caller can't tell whether the interview exists
    when it belongs to someone else.
    """
    interview = (
        db.query(Interview)
        .options(joinedload(Interview.company))
        .filter(Interview.id == interview_id, Interview.user_id == user_id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def _apply_status(
    db: Session,
    interview: Interview,
    new_status: str,
    next_round: Optional[str] = None,
):
    """Apply a status change and adjust the reminder schedule accordingly.

    - Tracked statuses (AWAITING_RESULT / legacy pending+waiting) initialize
      the reminder schedule (completion date + first reminder at +3 days).
    - NEXT_ROUND creates a new round (default "Round N") and stops reminders
      for the current interview — the user is still in the process.
    - Final statuses (SELECTED, REJECTED, NO_RESPONSE) clear reminders.
    - Legacy lowercase statuses are normalized to their canonical value.
    """
    canonical = normalize_status(new_status)
    interview.status = canonical
    interview.status_updated_at = datetime.utcnow()

    if canonical in REMINDER_TRACKED_STATUSES:
        mark_tracked_status(interview)
    elif canonical == InterviewStatus.next_round.value:
        round_name = next_round or f"Round {len(interview.rounds) + 1}"
        round_obj = Round(
            interview_id=interview.id,
            round_name=round_name,
            round_result="Pending",
            order_index=len(interview.rounds),
        )
        db.add(round_obj)
        db.flush()
        clear_reminder_schedule(interview)
    else:
        clear_reminder_schedule(interview)

    db.commit()
    db.refresh(interview)
    _sync_analytics(db, interview.user_id)


# ---------------------------------------------------------------------------
# Interview CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=List[InterviewOut])
def list_interviews(
    status: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's interviews (newest first), optionally filtered.

    - `status`  → only interviews with that status (canonical or legacy)
    - `company` → only interviews for a company whose name contains this text
    """
    q = db.query(Interview).options(joinedload(Interview.company)).filter(Interview.user_id == current_user.id)
    if status:
        q = q.filter(Interview.status == normalize_status(status))
    if company:
        q = q.filter(Interview.company.has(Company.company_name.ilike(f"%{company}%")))
    interviews = q.order_by(Interview.created_at.desc()).all()
    return [_to_out(i) for i in interviews]


@router.get("/status-updates", response_model=dict)
def interview_status_updates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return interviews that currently need a status update from the user.

    The back-end decides what needs attention (never the browser clock). Due
    interviews are returned oldest-first; each item includes the normalized
    company/role info, `days_waiting` and which kind of reminder applies
    (FOLLOW_UP vs NO_RESPONSE). A single fetch only returns each interview
    once per reminder stage — after a fetch, the schedule advances to the
    next stage (see `schedule_next_reminder`).
    """
    due = get_interviews_needing_status_update(db, current_user.id)
    now = datetime.utcnow()
    items = []
    for i in due:
        items.append({
            "id": i.id,
            "company_name": i.company.company_name,
            "role": i.role,
            "status": i.status,
            "days_waiting": days_waiting(i, now),
            "reminder_type": reminder_type(i, now),
            "interview_completed_at": i.interview_completed_at,
        })
        schedule_next_reminder(i, now)
    db.commit()
    return {"count": len(items), "interviews": items}


@router.post("", response_model=InterviewOut, status_code=201)
def create_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new interview with optional nested rounds + questions.

    Stores the interview against the current user, resolves/creates the
    company by name, and recursively creates any rounds/questions included in
    the payload. If the chosen status is a tracked one (AWAITING_RESULT), the
    follow-up reminder schedule is initialized immediately.
    """
    company = _get_or_create_company(db, payload.company_name)
    status = normalize_status(payload.status or "pending")

    interview = Interview(
        user_id=current_user.id,
        company_id=company.id,
        role=payload.role,
        interview_type=payload.interview_type,
        date=payload.date,
        status=status,
        confidence=payload.confidence,
        notes=payload.notes,
        interview_completed_at=payload.date,
    )
    db.add(interview)
    db.flush()

    if status in REMINDER_TRACKED_STATUSES:
        mark_tracked_status(interview)

    for round_data in payload.rounds:
        round_obj = Round(
            interview_id=interview.id,
            round_name=round_data.round_name,
            round_result=round_data.round_result,
            order_index=len(interview.rounds),
        )
        db.add(round_obj)
        db.flush()
        for question_data in round_data.questions:
            question = Question(
                interview_id=interview.id,
                round_id=round_obj.id,
                question=question_data.question,
                user_answer=question_data.user_answer,
                topic=question_data.topic,
                difficulty=question_data.difficulty,
            )
            db.add(question)

    db.commit()
    db.refresh(interview)
    _sync_analytics(db, current_user.id)
    return _to_out(interview)


@router.get("/{interview_id}", response_model=InterviewOut)
def get_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch one interview with its full nested rounds + questions."""
    interview = _get_owned_interview(db, interview_id, current_user.id)
    return _to_out(interview)


@router.put("/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: str,
    payload: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an interview's headline fields (partial update).

    If `status` is included, the reminder schedule is re-synced: tracked
    statuses restart the flow, final statuses clear it.
    """
    interview = _get_owned_interview(db, interview_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(interview, field, value)
    if "status" in data:
        interview.status = normalize_status(data["status"])
        interview.status_updated_at = datetime.utcnow()
        if interview.status in REMINDER_TRACKED_STATUSES:
            mark_tracked_status(interview)
        else:
            clear_reminder_schedule(interview)
    db.commit()
    db.refresh(interview)
    _sync_analytics(db, current_user.id)
    return _to_out(interview)


@router.patch("/{interview_id}/status", response_model=StatusUpdateResponse)
def update_status(
    interview_id: str,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an interview's status from the reminder popup / follow-up flow.

    Body: `{ "status": "SELECTED" }` or for a next round:
    `{ "status": "NEXT_ROUND", "next_round": "Technical Round 2" }`.
    Only the authenticated owner may update the interview.
    """
    interview = _get_owned_interview(db, interview_id, current_user.id)
    _apply_status(db, interview, payload.status, payload.next_round)
    return StatusUpdateResponse(interview=_to_out(interview))


@router.post("/{interview_id}/snooze-status-reminder", response_model=dict)
def snooze_status_reminder(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """"Tell me later": delay the next reminder for this interview.

    Pushes `reminder_snoozed_until` out by the configured snooze window (3
    days). The 30-day No Response warning is NOT suppressed by a snooze.
    """
    interview = _get_owned_interview(db, interview_id, current_user.id)
    snooze_reminder(interview)
    db.commit()
    db.refresh(interview)
    return {
        "ok": True,
        "snoozed_until": interview.reminder_snoozed_until,
        "days_waiting": days_waiting(interview),
    }


@router.delete("/{interview_id}", status_code=204)
def delete_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an interview (cascades to rounds and questions via ORM)."""
    interview = _get_owned_interview(db, interview_id, current_user.id)
    db.delete(interview)
    db.commit()
    _sync_analytics(db, current_user.id)
    return None


@router.post("/{interview_id}/questions", response_model=QuestionOut)
def add_question_to_interview(
    interview_id: str,
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a question directly to an interview (auto-creates a "Round 1" if needed)."""
    interview = _get_owned_interview(db, interview_id, current_user.id)
    round_obj = None
    for r in interview.rounds:
        if r.round_name == "Round 1":
            round_obj = r
            break
    if not round_obj:
        round_obj = Round(
            interview_id=interview.id,
            round_name="Round 1",
            round_result="Pending",
            order_index=0,
        )
        db.add(round_obj)
        db.flush()

    question = Question(
        interview_id=interview.id,
        round_id=round_obj.id,
        question=payload.question,
        user_answer=payload.user_answer,
        topic=payload.topic,
        difficulty=payload.difficulty,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.post("/{interview_id}/rounds", response_model=RoundOut)
def add_round(
    interview_id: str,
    payload: RoundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new round to an interview."""
    interview = _get_owned_interview(db, interview_id, current_user.id)
    round_obj = Round(
        interview_id=interview.id,
        round_name=payload.round_name,
        round_result=payload.round_result or "Pending",
        order_index=len(interview.rounds),
    )
    db.add(round_obj)
    db.commit()
    db.refresh(round_obj)
    return round_obj


@router.get("/{interview_id}/questions", response_model=List[QuestionOut])
def list_questions(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all questions in an interview (across all rounds)."""
    interview = _get_owned_interview(db, interview_id, current_user.id)
    questions = (
        db.query(Question)
        .filter(Question.interview_id == interview_id)
        .order_by(Question.created_at)
        .all()
    )
    return questions
