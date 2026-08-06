from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.models import User
from app.routers.question_router import _owned_question
from app.schemas.schemas import AIGenerateRequest, AIGenerateResponse
from app.authentication.auth import get_current_user
from app.services.ai_service import generate_ai_feedback

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/generate", response_model=AIGenerateResponse)
def generate(
    payload: AIGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """Stateless AI generation — does not persist. Used for quick previews."""
    result = generate_ai_feedback(payload.question, payload.user_answer)
    return result


@router.post("/generate/{question_id}", response_model=AIGenerateResponse)
def generate_and_save(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate AI feedback for a stored question and persist it to that question row."""
    question = _owned_question(db, question_id, current_user.id)
    result = generate_ai_feedback(question.question, question.user_answer or "")

    question.ai_correct_answer = result["correct_answer"]
    question.ai_improved_answer = result["improved_answer"]
    question.ai_explanation = result["explanation"]
    question.ai_missing_points = result["missing_points"]
    db.commit()

    return result
