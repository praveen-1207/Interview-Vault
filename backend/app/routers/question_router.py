from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database.connection import get_db, fetch_one
from app.models.models import gen_uuid, parse_dt, serialize_payload
from app.schemas.schemas import QuestionCreate, QuestionUpdate, QuestionOut
from app.authentication.auth import get_current_user

router = APIRouter(prefix="/api/questions", tags=["Questions"])


def _owned_question(supabase: Client, question_id: str, user_id: str) -> dict:
    """Fetch a question and make sure it belongs to the given user.

    A question is linked to a Round which is linked to an Interview which
    belongs to a User. We fetch the question, then its round, then the
    interview to confirm ownership. If any hop is missing (either it doesn't
    exist or it's someone else's), we raise a 404 so the caller never learns
    that another user's question exists.
    """
    question = fetch_one(
        supabase.table("questions")
        .select("*")
        .eq("id", question_id)
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    round_row = fetch_one(
        supabase.table("rounds")
        .select("interview_id")
        .eq("id", question.get("round_id"))
    )
    if not round_row:
        raise HTTPException(status_code=404, detail="Question not found")
    interview = fetch_one(
        supabase.table("interviews")
        .select("user_id")
        .eq("id", round_row.get("interview_id"))
    )
    if not interview or interview.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


def _question_out(question: dict) -> QuestionOut:
    """Build a QuestionOut from a row dict, parsing `created_at`."""
    q = dict(question)
    q["created_at"] = parse_dt(q.get("created_at"))
    return QuestionOut.model_validate(q)


@router.post("/round/{round_id}", response_model=QuestionOut, status_code=201)
def add_question(
    round_id: str,
    payload: QuestionCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add a question directly to a specific round of the user's interview.

    First verifies the round belongs to the user (join through Interview),
    then inserts the question into that round. Returns the created question.
    Used by the Interview Detail page when clicking "Add Question" on a round.
    """
    round_row = fetch_one(
        supabase.table("rounds")
        .select("interview_id")
        .eq("id", round_id)
    )
    if not round_row:
        raise HTTPException(status_code=404, detail="Round not found")
    interview = fetch_one(
        supabase.table("interviews")
        .select("user_id")
        .eq("id", round_row.get("interview_id"))
    )
    if not interview or interview.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Round not found")

    question = (
        supabase.table("questions")
        .insert(serialize_payload(
            {
                "id": gen_uuid(),
                "round_id": round_id,
                "created_at": datetime.now(timezone.utc),
                **payload.model_dump(),
            }
        ))
        .execute()
        .data[0]
    )
    return _question_out(question)


@router.get("", response_model=List[QuestionOut])
def search_questions(
    search: Optional[str] = None,
    company: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    round_name: Optional[str] = None,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Question Library: search + filter across all of the user's stored questions.

    All of the filter arguments are optional. When provided they narrow the
    results, e.g.:
    - `search`     → question text contains this word
    - `company`    → company name contains this text
    - `topic`      → topic contains this text
    - `difficulty` → exactly Easy / Medium / Hard
    - `round_name` → round name contains this text

    Queries are always scoped to the current user: we fetch that user's
    interviews (with company + rounds + questions embedded) and filter in
    Python, so users only ever see their own questions.
    """
    interviews = (
        supabase.table("interviews")
        .select("*, companies(company_name), rounds(*, questions(*))")
        .eq("user_id", current_user["id"])
        .execute()
        .data
    )

    results = []
    for iv in interviews:
        company_name = (iv.get("companies") or {}).get("company_name", "")
        if company and company.lower() not in company_name.lower():
            continue
        for r in iv.get("rounds") or []:
            if round_name and round_name.lower() not in (r.get("round_name") or "").lower():
                continue
            for q in r.get("questions") or []:
                if search and search.lower() not in (q.get("question") or "").lower():
                    continue
                if topic and topic.lower() not in (q.get("topic") or "").lower():
                    continue
                if difficulty and q.get("difficulty") != difficulty:
                    continue
                results.append(q)

    results.sort(key=lambda q: (q.get("created_at") or ""), reverse=True)
    return [_question_out(q) for q in results]


@router.put("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: str,
    payload: QuestionUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Edit a stored question (text, answer, topic, difficulty).

    `exclude_unset=True` means only the fields the frontend actually sent are
    overwritten; everything else stays untouched. Runs after ownership check
    via `_owned_question`. Returns the updated question.
    """
    _owned_question(supabase, question_id, current_user["id"])
    updated = (
        supabase.table("questions")
        .update(payload.model_dump(exclude_unset=True))
        .eq("id", question_id)
        .execute()
        .data[0]
    )
    return _question_out(updated)


@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Permanently delete one of the user's questions.

    Verifies ownership first, then removes the row. Returns 204 (no body)
    when successful. Called by the trash icon on each question.
    """
    _owned_question(supabase, question_id, current_user["id"])
    supabase.table("questions").delete().eq("id", question_id).execute()
    return None
