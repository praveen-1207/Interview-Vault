from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.database.connection import get_db, fetch_one
from app.models.models import (
    gen_uuid, parse_dt, serialize_payload, normalize_status, REMINDER_TRACKED_STATUSES,
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
    mark_tracked_status,
    clear_reminder_schedule,
    snooze_reminder,
    schedule_next_reminder,
)

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])

# Columns that can be safely filtered/computed for the interview payloads.
_INTERVIEW_SELECT = "*, companies(company_name), rounds(*, questions(*))"

# Actual writable columns on the `interviews` table (excludes embedded joins).
_INTERVIEW_COLUMNS = {
    "id", "user_id", "company_id", "role", "interview_type", "date", "status",
    "confidence", "notes", "status_updated_at", "interview_completed_at",
    "next_reminder_at", "last_reminder_at", "reminder_count",
    "reminder_snoozed_until", "created_at",
}


def _interview_payload(row: dict) -> dict:
    """Return only the writable `interviews` columns from a row dict.

    PostgREST embedded joins (`companies`, `rounds`) are fine to READ but must
    never be sent back in an `update()` call, otherwise the API rejects the
    payload with "column does not exist". This filters them out, then
    serializes any datetimes to ISO strings for the JSON encoder.
    """
    return serialize_payload({k: v for k, v in row.items() if k in _INTERVIEW_COLUMNS})


def _to_out(interview: dict) -> dict:
    """Convert a Supabase interview row (with embedded company/rounds) into the
    response shape the frontend expects.

    PostgREST returns nested resources under their table names: the company
    object under `companies` and the round list under `rounds` (each round
    carrying its own `questions` list). This helper also computes the
    reminder-tracking fields and `days_waiting` / `reminder_type`.
    """
    company = interview.get("companies") or {}
    return {
        "id": interview["id"],
        "user_id": interview["user_id"],
        "company_name": company.get("company_name", ""),
        "role": interview.get("role"),
        "interview_type": interview.get("interview_type"),
        "date": interview.get("date"),
        "status": interview.get("status"),
        "confidence": interview.get("confidence"),
        "notes": interview.get("notes"),
        "status_updated_at": interview.get("status_updated_at"),
        "interview_completed_at": interview.get("interview_completed_at"),
        "next_reminder_at": interview.get("next_reminder_at"),
        "last_reminder_at": interview.get("last_reminder_at"),
        "reminder_count": interview.get("reminder_count") or 0,
        "reminder_snoozed_until": interview.get("reminder_snoozed_until"),
        "created_at": interview.get("created_at"),
        "rounds": interview.get("rounds") or [],
        "days_waiting": days_waiting(interview),
        "reminder_type": reminder_type(interview),
    }


def _get_or_create_company(supabase: Client, name: str) -> dict:
    """Find a company by name (case-insensitive) or create it if new.

    Companies are shared across users, so instead of storing a raw string on
    every interview we look it up in the `companies` table. If it doesn't
    exist yet, we insert it and return the new row. This keeps the company
    names consistent and makes the analytics grouped-by-company easy.
    """
    company = fetch_one(
        supabase.table("companies")
        .select("*")
        .ilike("company_name", name)
    )
    if not company:
        inserted = (
            supabase.table("companies")
            .insert({"id": gen_uuid(), "company_name": name})
            .execute()
            .data
        )
        return inserted[0]
    return company


def _sync_analytics(supabase: Client, user_id: str):
    """Recompute the pre-computed Analytics row for one user.

    We keep a single Analytics row per user (created at signup) with simple
    counts. Any time an interview is created, updated or deleted, call this
    to keep the numbers in sync. It only counts interviews that belong to
    the user. The legacy `waiting`/`pending` columns are kept at zero; the
    new canonical statuses are counted in `awaiting_result`, `next_round`
    and `no_response`.
    """
    interviews = (
        supabase.table("interviews")
        .select("status")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    statuses = [normalize_status(i.get("status")) for i in interviews]
    counts = {
        "total_interviews": len(statuses),
        "selected": statuses.count("SELECTED"),
        "rejected": statuses.count("REJECTED"),
        "awaiting_result": statuses.count("AWAITING_RESULT"),
        "next_round": statuses.count("NEXT_ROUND"),
        "no_response": statuses.count("NO_RESPONSE"),
        "waiting": 0,
        "pending": 0,
    }
    existing = fetch_one(
        supabase.table("analytics")
        .select("id")
        .eq("user_id", user_id)
    )
    if existing:
        supabase.table("analytics").update(counts).eq("user_id", user_id).execute()
    else:
        supabase.table("analytics").insert(
            {"id": gen_uuid(), "user_id": user_id, **counts}
        ).execute()


def _get_owned_interview(supabase: Client, interview_id: str, user_id: str) -> dict:
    """Fetch an interview by id and make sure it belongs to the current user.

    Raises 404 (not 403) so the caller can't tell whether the interview exists
    when it belongs to someone else. Returns the row with company + rounds +
    questions embedded in a single PostgREST query.
    """
    interview = fetch_one(
        supabase.table("interviews")
        .select(_INTERVIEW_SELECT)
        .eq("id", interview_id)
        .eq("user_id", user_id)
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def _apply_status(
    supabase: Client,
    interview: dict,
    new_status: str,
    next_round: Optional[str] = None,
) -> dict:
    """Apply a status change and adjust the reminder schedule accordingly.

    - Tracked statuses (AWAITING_RESULT / legacy pending+waiting) initialize
      the reminder schedule (completion date + first reminder at +3 days).
    - NEXT_ROUND creates a new round (default "Round N") and stops reminders
      for the current interview — the user is still in the process.
    - Final statuses (SELECTED, REJECTED, NO_RESPONSE) clear reminders.
    - Legacy lowercase statuses are normalized to their canonical value.

    Persists the change and returns the refreshed interview dict.
    """
    canonical = normalize_status(new_status)
    interview["status"] = canonical
    interview["status_updated_at"] = datetime.now(timezone.utc)

    if canonical in REMINDER_TRACKED_STATUSES:
        mark_tracked_status(interview)
    elif canonical == "NEXT_ROUND":
        round_count = len(interview.get("rounds") or [])
        round_name = next_round or f"Round {round_count + 1}"
        supabase.table("rounds").insert(
            {
                "id": gen_uuid(),
                "interview_id": interview["id"],
                "round_name": round_name,
                "round_result": "Pending",
                "order_index": round_count,
            }
        ).execute()
        clear_reminder_schedule(interview)
    else:
        clear_reminder_schedule(interview)

    supabase.table("interviews").update(_interview_payload(interview)).eq("id", interview["id"]).execute()
    _sync_analytics(supabase, interview["user_id"])
    return _get_owned_interview(supabase, interview["id"], interview["user_id"])


# ---------------------------------------------------------------------------
# Interview CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=List[InterviewOut])
def list_interviews(
    status: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List the current user's interviews (newest first), optionally filtered.

    - `status`  → only interviews with that status (canonical or legacy)
    - `company` → only interviews for a company whose name contains this text
    """
    data = (
        supabase.table("interviews")
        .select(_INTERVIEW_SELECT)
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
        .data
    )
    if status:
        data = [i for i in data if i.get("status") == normalize_status(status)]
    if company:
        needle = company.lower()
        data = [
            i for i in data
            if needle in (i.get("companies") or {}).get("company_name", "").lower()
        ]
    return [_to_out(i) for i in data]


@router.get("/status-updates", response_model=dict)
def interview_status_updates(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return interviews that currently need a status update from the user.

    The back-end decides what needs attention (never the browser clock). Due
    interviews are returned oldest-first; each item includes the normalized
    company/role info, `days_waiting` and which kind of reminder applies
    (FOLLOW_UP vs NO_RESPONSE). A single fetch only returns each interview
    once per reminder stage — after a fetch, the schedule advances to the
    next stage (see `schedule_next_reminder`).
    """
    due = get_interviews_needing_status_update(supabase, current_user["id"])
    now = datetime.now(timezone.utc)
    items = []
    for i in due:
        items.append({
            "id": i["id"],
            "company_name": (i.get("companies") or {}).get("company_name", ""),
            "role": i.get("role"),
            "status": i.get("status"),
            "days_waiting": days_waiting(i, now),
            "reminder_type": reminder_type(i, now),
            "interview_completed_at": i.get("interview_completed_at"),
        })
        schedule_next_reminder(i, now)
        supabase.table("interviews").update(serialize_payload(
            {
                "next_reminder_at": i.get("next_reminder_at"),
                "last_reminder_at": i.get("last_reminder_at"),
                "reminder_count": i.get("reminder_count"),
            }
        )).eq("id", i["id"]).execute()
    return {"count": len(items), "interviews": items}


@router.post("", response_model=InterviewOut, status_code=201)
def create_interview(
    payload: InterviewCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new interview with optional nested rounds + questions.

    Stores the interview against the current user, resolves/creates the
    company by name, and recursively creates any rounds/questions included in
    the payload. If the chosen status is a tracked one (AWAITING_RESULT), the
    follow-up reminder schedule is initialized immediately.
    """
    company = _get_or_create_company(supabase, payload.company_name)
    status = normalize_status(payload.status or "pending")

    interview_id = gen_uuid()
    interview = {
        "id": interview_id,
        "user_id": current_user["id"],
        "company_id": company["id"],
        "role": payload.role,
        "interview_type": payload.interview_type,
        "date": payload.date,
        "status": status,
        "confidence": payload.confidence or 5,
        "notes": payload.notes,
        "interview_completed_at": payload.date,
        "reminder_count": 0,
        "created_at": datetime.now(timezone.utc),
    }
    if status in REMINDER_TRACKED_STATUSES:
        mark_tracked_status(interview)

    supabase.table("interviews").insert(serialize_payload(interview)).execute()

    for idx, round_data in enumerate(payload.rounds):
        round_id = gen_uuid()
        supabase.table("rounds").insert(
            {
                "id": round_id,
                "interview_id": interview_id,
                "round_name": round_data.round_name,
                "round_result": round_data.round_result,
                "order_index": idx,
            }
        ).execute()
        for question_data in round_data.questions:
            supabase.table("questions").insert(serialize_payload(
                {
                    "id": gen_uuid(),
                    "round_id": round_id,
                    "created_at": datetime.now(timezone.utc),
                    "question": question_data.question,
                    "user_answer": question_data.user_answer,
                    "topic": question_data.topic,
                    "difficulty": question_data.difficulty,
                }
            )).execute()

    _sync_analytics(supabase, current_user["id"])
    return _to_out(_get_owned_interview(supabase, interview_id, current_user["id"]))


@router.get("/{interview_id}", response_model=InterviewOut)
def get_interview(
    interview_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch one interview with its full nested rounds + questions."""
    interview = _get_owned_interview(supabase, interview_id, current_user["id"])
    return _to_out(interview)


@router.put("/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: str,
    payload: InterviewUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update an interview's headline fields (partial update).

    If `status` is included, the reminder schedule is re-synced: tracked
    statuses restart the flow, final statuses clear it.
    """
    interview = _get_owned_interview(supabase, interview_id, current_user["id"])
    data = payload.model_dump(exclude_unset=True)
    if "company_name" in data:
        company = _get_or_create_company(supabase, data.pop("company_name"))
        data["company_id"] = company["id"]
    interview.update(data)
    if "status" in data:
        interview["status"] = normalize_status(data["status"])
        interview["status_updated_at"] = datetime.now(timezone.utc)
        if interview["status"] in REMINDER_TRACKED_STATUSES:
            mark_tracked_status(interview)
        else:
            clear_reminder_schedule(interview)
    supabase.table("interviews").update(_interview_payload(interview)).eq("id", interview_id).execute()
    _sync_analytics(supabase, current_user["id"])
    return _to_out(_get_owned_interview(supabase, interview_id, current_user["id"]))


@router.patch("/{interview_id}/status", response_model=StatusUpdateResponse)
def update_status(
    interview_id: str,
    payload: StatusUpdateRequest,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update an interview's status from the reminder popup / follow-up flow.

    Body: `{ "status": "SELECTED" }` or for a next round:
    `{ "status": "NEXT_ROUND", "next_round": "Technical Round 2" }`.
    Only the authenticated owner may update the interview.
    """
    interview = _get_owned_interview(supabase, interview_id, current_user["id"])
    updated = _apply_status(supabase, interview, payload.status, payload.next_round)
    return StatusUpdateResponse(interview=_to_out(updated))


@router.post("/{interview_id}/snooze-status-reminder", response_model=dict)
def snooze_status_reminder(
    interview_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """"Tell me later": delay the next reminder for this interview.

    Pushes `reminder_snoozed_until` out by the configured snooze window (3
    days). The 30-day No Response warning is NOT suppressed by a snooze.
    """
    interview = _get_owned_interview(supabase, interview_id, current_user["id"])
    snooze_reminder(interview)
    supabase.table("interviews").update(serialize_payload(
        {
            "reminder_snoozed_until": interview.get("reminder_snoozed_until"),
            "last_reminder_at": interview.get("last_reminder_at"),
        }
    )).eq("id", interview_id).execute()
    return {
        "ok": True,
        "snoozed_until": parse_dt(interview.get("reminder_snoozed_until")),
        "days_waiting": days_waiting(interview),
    }


@router.delete("/{interview_id}", status_code=204)
def delete_interview(
    interview_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete an interview and its rounds/questions (manual cascade)."""
    interview = _get_owned_interview(supabase, interview_id, current_user["id"])
    round_ids = [r["id"] for r in (interview.get("rounds") or [])]
    if round_ids:
        question_ids = [
            q["id"]
            for r in (interview.get("rounds") or [])
            for q in (r.get("questions") or [])
        ]
        if question_ids:
            supabase.table("questions").delete().in_("id", question_ids).execute()
        supabase.table("rounds").delete().in_("id", round_ids).execute()
    supabase.table("interviews").delete().eq("id", interview_id).execute()
    _sync_analytics(supabase, current_user["id"])
    return None


@router.post("/{interview_id}/questions", response_model=QuestionOut)
def add_question_to_interview(
    interview_id: str,
    payload: QuestionCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add a question directly to an interview (auto-creates a "Round 1" if needed)."""
    interview = _get_owned_interview(supabase, interview_id, current_user["id"])
    round_obj = None
    for r in interview.get("rounds") or []:
        if r.get("round_name") == "Round 1":
            round_obj = r
            break
    if not round_obj:
        inserted = (
            supabase.table("rounds")
            .insert(
                {
                    "id": gen_uuid(),
                    "interview_id": interview_id,
                    "round_name": "Round 1",
                    "round_result": "Pending",
                    "order_index": 0,
                }
            )
            .execute()
            .data
        )
        round_obj = inserted[0]

    question = (
        supabase.table("questions")
        .insert(serialize_payload(
            {
                "id": gen_uuid(),
                "round_id": round_obj["id"],
                "created_at": datetime.now(timezone.utc),
                "question": payload.question,
                "user_answer": payload.user_answer,
                "topic": payload.topic,
                "difficulty": payload.difficulty,
            }
        ))
        .execute()
        .data[0]
    )
    return question


@router.post("/{interview_id}/rounds", response_model=RoundOut)
def add_round(
    interview_id: str,
    payload: RoundCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add a new round to an interview."""
    interview = _get_owned_interview(supabase, interview_id, current_user["id"])
    round_obj = (
        supabase.table("rounds")
        .insert(
            {
                "id": gen_uuid(),
                "interview_id": interview_id,
                "round_name": payload.round_name,
                "round_result": payload.round_result or "Pending",
                "order_index": len(interview.get("rounds") or []),
            }
        )
        .execute()
        .data[0]
    )
    return round_obj


@router.get("/{interview_id}/questions", response_model=List[QuestionOut])
def list_questions(
    interview_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all questions in an interview (across all rounds).

    The `questions` table has no `interview_id` column (it links only to
    `rounds`), so we collect the interview's round ids first, then fetch
    every question belonging to those rounds.
    """
    _get_owned_interview(supabase, interview_id, current_user["id"])
    rounds = (
        supabase.table("rounds")
        .select("id")
        .eq("interview_id", interview_id)
        .execute()
        .data
    )
    round_ids = [r["id"] for r in rounds]
    if not round_ids:
        return []
    questions = (
        supabase.table("questions")
        .select("*")
        .in_("round_id", round_ids)
        .order("created_at")
        .execute()
        .data
    )
    return questions
