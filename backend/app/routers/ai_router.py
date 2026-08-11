from fastapi import APIRouter, Depends
from supabase import Client

from app.database.connection import get_db
from app.routers.question_router import _owned_question
from app.schemas.schemas import (
    AIGenerateRequest, AIGenerateResponse,
    AIConfidenceRequest, AIConfidenceResponse,
)
from app.authentication.auth import get_current_user
from app.services.ai_service import generate_ai_feedback, generate_confidence_score

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/generate", response_model=AIGenerateResponse)
def generate(
    payload: AIGenerateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stateless AI generation — does not persist. Used for quick previews.

    Takes a question + the user's answer, sends them to Gemini via
    `generate_ai_feedback`, and returns the AI's feedback immediately.
    Nothing is saved to the database. This powers the "Check answer with AI"
    button you see while typing a question.
    """
    result = generate_ai_feedback(payload.question, payload.user_answer)
    return result


@router.post("/generate/{question_id}", response_model=AIGenerateResponse)
def generate_and_save(
    question_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate AI feedback for a stored question and persist it to that question row.

    Used by the Interview Detail page "Generate" button. Unlike the stateless
    endpoint, this:
    1. Loads the question (verifying ownership).
    2. Calls Gemini with the question's text and the user's saved answer.
    3. Saves the result (correct answer, improved answer, explanation,
       missing points) onto the question row so it is shown instantly next time.
    Returns the AI feedback plus a truthy verdict field.
    """
    question = _owned_question(supabase, question_id, current_user["id"])
    result = generate_ai_feedback(question["question"], question.get("user_answer") or "")

    supabase.table("questions").update(
        {
            "ai_correct_answer": result["correct_answer"],
            "ai_improved_answer": result["improved_answer"],
            "ai_explanation": result["explanation"],
            "ai_missing_points": result["missing_points"],
        }
    ).eq("id", question_id).execute()

    return result


@router.post("/confidence", response_model=AIConfidenceResponse)
def generate_confidence(
    payload: AIConfidenceRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stateless confidence scoring — takes all three inputs explicitly.

    The caller passes the question, the candidate's answer, AND the expected
    answer. Gemini returns a 0-10 confidence score plus level, reason,
    strengths, weaknesses and an improvement tip. Nothing is saved. Useful
    when the frontend already has the correct answer handy (e.g. after a
    "Generate" call) and wants a quick score.
    """
    result = generate_confidence_score(
        payload.question, payload.user_answer, payload.correct_answer
    )
    return result


@router.post("/confidence/{question_id}", response_model=AIConfidenceResponse)
def generate_confidence_for_question(
    question_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Score a stored question's answer confidence using its saved AI feedback.

    Used by the Interview Detail page "Check Confidence" button. It:
    1. Loads the question (verifying ownership).
    2. Uses the question text + the user's saved answer + the stored
       `ai_correct_answer` as the expected/correct answer.
    3. Calls Gemini's confidence scorer and returns the result.

    The confidence LEVEL is always decided by the AI model itself using the
    CONFIDENCE_SYSTEM_PROMPT rubric — the backend never hard-codes it.
    """
    question = _owned_question(supabase, question_id, current_user["id"])
    result = generate_confidence_score(
        question["question"],
        question.get("user_answer") or "",
        question.get("ai_correct_answer") or "",
    )
    return result
