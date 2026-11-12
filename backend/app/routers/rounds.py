from fastapi import APIRouter, status

from app.authentication.deps import CurrentUser, DbSession
from app.schemas.question import QuestionCreate, QuestionOut
from app.schemas.round import RoundOut, RoundUpdate
from app.services import interview_service

router = APIRouter(prefix="/rounds", tags=["rounds"])


@router.post("/{round_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(round_id: str, payload: QuestionCreate, db: DbSession, user: CurrentUser):
    return interview_service.create_question(
        db,
        user.id,
        round_id,
        question=payload.question,
        user_answer=payload.user_answer,
        category=payload.category,
        difficulty=payload.difficulty,
        order_index=payload.order_index,
    )


@router.put("/{round_id}", response_model=RoundOut)
def update_round(round_id: str, payload: RoundUpdate, db: DbSession, user: CurrentUser):
    return interview_service.update_round(db, user.id, round_id, payload.name)


@router.delete("/{round_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_round(round_id: str, db: DbSession, user: CurrentUser):
    interview_service.delete_round(db, user.id, round_id)
