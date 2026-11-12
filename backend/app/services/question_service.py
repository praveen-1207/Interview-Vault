"""Question library search and AI analysis."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.interview import Interview, InterviewStatus
from app.models.question import Question
from app.models.round import Round
from app.services import ai_evaluation_service
from app.utils.errors import APIError


def search_questions(
    db: Session,
    user_id: str,
    *,
    q: str | None = None,
    company: str | None = None,
    role: str | None = None,
    round_name: str | None = None,
    difficulty: str | None = None,
    status: str | None = None,
    category: str | None = None,
    sort: str = "newest",
) -> list[Question]:
    stmt = (
        select(Question)
        .join(Round, Question.round_id == Round.id)
        .join(Interview, Round.interview_id == Interview.id)
        .join(Interview.company)
        .where(Interview.user_id == user_id)
    )

    if q:
        stmt = stmt.where(Question.question.ilike(f"%{q}%"))
    if company:
        stmt = stmt.where(Company.name.ilike(f"%{company}%"))
    if role:
        stmt = stmt.where(Interview.role.ilike(f"%{role}%"))
    if round_name:
        stmt = stmt.where(Round.name.ilike(f"%{round_name}%"))
    if difficulty:
        stmt = stmt.where(Interview.difficulty == difficulty)
    if status:
        try:
            status_enum = InterviewStatus(status)
        except ValueError:
            raise APIError("VALIDATION_ERROR", f"Invalid status: {status}", 422)
        stmt = stmt.where(Interview.status == status_enum)
    if category:
        stmt = stmt.where(Question.category == category)

    stmt = stmt.order_by(
        Question.created_at.desc() if sort == "newest" else Question.created_at.asc()
    )
    return list(db.scalars(stmt))


async def run_ai_analysis(db: Session, user_id: str, question_id: str) -> Question:
    """Run Gemini on a question the user owns and persist the markdown result.

    Uses the same per-interview quota as the community practice flow.
    """
    question, interview_id = ai_evaluation_service.get_owned_question_context(
        db, user_id, question_id
    )
    evaluation, _used, _limit, _remaining = await ai_evaluation_service.evaluate_question(
        db,
        user_id,
        interview_id,
        question_id,
        answer_text=question.user_answer or "",
        legacy_owner=True,
    )
    question.ai_answer = evaluation.feedback
    db.commit()
    db.refresh(question)
    return question
