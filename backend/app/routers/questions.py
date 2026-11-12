from fastapi import APIRouter, status

from app.authentication.deps import CurrentUser, DbSession
from app.schemas.question import (
    QuestionAnalyzeResponse,
    QuestionCreate,
    QuestionOut,
    QuestionUpdate,
)
from app.services import interview_service, question_service

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("/search", response_model=list[QuestionOut])
def search_questions(
    db: DbSession,
    user: CurrentUser,
    q: str | None = None,
    company: str | None = None,
    role: str | None = None,
    round_name: str | None = None,
    difficulty: str | None = None,
    status: str | None = None,
    category: str | None = None,
    sort: str = "newest",
):
    return question_service.search_questions(
        db,
        user.id,
        q=q,
        company=company,
        role=role,
        round_name=round_name,
        difficulty=difficulty,
        status=status,
        category=category,
        sort=sort,
    )


@router.post("/{question_id}/analyze", response_model=QuestionAnalyzeResponse)
async def analyze(question_id: str, db: DbSession, user: CurrentUser):
    question = await question_service.run_ai_analysis(db, user.id, question_id)
    return QuestionAnalyzeResponse(question=question)


@router.put("/{question_id}", response_model=QuestionOut)
def update_question(question_id: str, payload: QuestionUpdate, db: DbSession, user: CurrentUser):
    return interview_service.update_question(
        db,
        user.id,
        question_id,
        question=payload.question,
        user_answer=payload.user_answer,
        category=payload.category,
        difficulty=payload.difficulty,
        order_index=payload.order_index,
    )


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: str, db: DbSession, user: CurrentUser):
    interview_service.delete_question(db, user.id, question_id)
