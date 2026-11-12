"""AI answer evaluation with a strict per-user / per-interview quota.

Quota rules (enforced here, never in the UI):
- Max N successful evaluations per user per interview (env configurable).
- One counted evaluation per (user, interview, question); retries return the
  stored evaluation instead of calling Gemini again.
- Failed Gemini calls never insert a row, so they do not consume a slot.
- A Postgres advisory lock serialises the final check+insert, and a unique
  constraint is the last-resort guard against concurrent quota bypass.
"""

from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai.gemini import analyze_question
from app.config import settings
from app.models.ai_evaluation import AIEvaluation
from app.models.answer import Answer
from app.models.interview import Interview, PublicationStatus
from app.models.question import Question
from app.models.round import Round
from app.utils.errors import APIError


def _limit() -> int:
    return settings.max_ai_evaluations_per_interview


def _usage(db: Session, user_id: str, interview_id: str) -> tuple[int, int, int]:
    used = (
        db.scalar(
            select(func.count())
            .select_from(AIEvaluation)
            .where(
                AIEvaluation.user_id == user_id,
                AIEvaluation.interview_id == interview_id,
            )
        )
        or 0
    )
    limit = _limit()
    return used, limit, max(0, limit - used)


def _find_evaluation(
    db: Session, user_id: str, interview_id: str, question_id: str
) -> AIEvaluation | None:
    return db.scalar(
        select(AIEvaluation).where(
            AIEvaluation.user_id == user_id,
            AIEvaluation.interview_id == interview_id,
            AIEvaluation.question_id == question_id,
        )
    )


def get_usage(db: Session, user_id: str, interview_id: str) -> dict:
    used, limit, remaining = _usage(db, user_id, interview_id)
    return {"used": used, "limit": limit, "remaining": remaining}


def get_evaluation(
    db: Session, user_id: str, interview_id: str, question_id: str
) -> AIEvaluation:
    evaluation = _find_evaluation(db, user_id, interview_id, question_id)
    if evaluation is None:
        raise APIError("EVALUATION_NOT_FOUND", "No AI evaluation exists yet.", 404)
    return evaluation


def _get_public_interview(db: Session, interview_id: str) -> Interview:
    interview = db.get(Interview, interview_id)
    if interview is None or interview.publication_status != PublicationStatus.approved.value:
        raise APIError("EXPERIENCE_NOT_FOUND", "Interview experience not found.", 404)
    return interview


def _get_question_in_interview(
    db: Session, interview_id: str, question_id: str
) -> Question:
    question = db.scalar(
        select(Question)
        .join(Round, Question.round_id == Round.id)
        .where(Question.id == question_id, Round.interview_id == interview_id)
    )
    if question is None:
        raise APIError("QUESTION_NOT_FOUND", "Question not found in this experience.", 404)
    return question


def _check_input_length(question_text: str, answer_text: str) -> None:
    if len(question_text) > settings.max_ai_input_chars:
        raise APIError("INPUT_TOO_LONG", "Question is too long for AI evaluation.", 422)
    if len(answer_text) > settings.max_ai_input_chars:
        raise APIError("INPUT_TOO_LONG", "Answer is too long for AI evaluation.", 422)


def get_answer(
    db: Session, user_id: str, interview_id: str, question_id: str
) -> Answer:
    _get_public_interview(db, interview_id)
    _get_question_in_interview(db, interview_id, question_id)
    answer = db.scalar(
        select(Answer).where(Answer.user_id == user_id, Answer.question_id == question_id)
    )
    if answer is None:
        raise APIError("ANSWER_NOT_FOUND", "No saved answer for this question yet.", 404)
    return answer


def upsert_answer(
    db: Session, user_id: str, interview_id: str, question_id: str, answer_text: str
) -> Answer:
    _get_public_interview(db, interview_id)
    _get_question_in_interview(db, interview_id, question_id)
    if len(answer_text) > settings.max_ai_input_chars:
        raise APIError("INPUT_TOO_LONG", "Answer is too long.", 422)

    answer = db.scalar(
        select(Answer).where(Answer.user_id == user_id, Answer.question_id == question_id)
    )
    if answer is None:
        answer = Answer(user_id=user_id, question_id=question_id, answer_text=answer_text)
        db.add(answer)
    else:
        answer.answer_text = answer_text
    db.commit()
    db.refresh(answer)
    return answer


async def evaluate_question(
    db: Session,
    user_id: str,
    interview_id: str,
    question_id: str,
    answer_text: str | None = None,
    *,
    legacy_owner: bool = False,
) -> tuple[AIEvaluation, int, int, int]:
    """Evaluate an answer and consume one quota slot on success.

    Returns (evaluation, used, limit, remaining).
    """
    if not legacy_owner:
        _get_public_interview(db, interview_id)
    question = _get_question_in_interview(db, interview_id, question_id)

    text_to_evaluate = answer_text if answer_text is not None else (question.user_answer or "")
    _check_input_length(question.question, text_to_evaluate)

    answer: Answer | None = None
    if not legacy_owner:
        answer = upsert_answer(db, user_id, interview_id, question_id, text_to_evaluate)

    existing = _find_evaluation(db, user_id, interview_id, question_id)
    if existing is not None:
        used, limit, remaining = _usage(db, user_id, interview_id)
        return existing, used, limit, remaining

    used, limit, remaining = _usage(db, user_id, interview_id)
    if used >= limit:
        raise APIError(
            "AI_QUOTA_EXCEEDED",
            "You have reached the maximum of "
            f"{limit} AI evaluations for this interview experience. "
            "You can continue practising questions without AI evaluation.",
            429,
            extra={"used": used, "limit": limit, "remaining": 0},
        )

    # Gemini call happens before reserving a slot so failures never consume one.
    score, feedback, model = await analyze_question(question.question, text_to_evaluate)

    lock_key = f"{user_id}:{interview_id}"
    try:
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": lock_key})

        # Re-check under the lock: another request may have finished first.
        existing = _find_evaluation(db, user_id, interview_id, question_id)
        if existing is not None:
            db.rollback()
            used, limit, remaining = _usage(db, user_id, interview_id)
            return existing, used, limit, remaining

        used, limit, remaining = _usage(db, user_id, interview_id)
        if used >= limit:
            db.rollback()
            raise APIError(
                "AI_QUOTA_EXCEEDED",
                "You have reached the maximum of "
                f"{limit} AI evaluations for this interview experience. "
                "You can continue practising questions without AI evaluation.",
                429,
                extra={"used": used, "limit": limit, "remaining": 0},
            )

        evaluation = AIEvaluation(
            user_id=user_id,
            interview_id=interview_id,
            question_id=question_id,
            answer_id=answer.id if answer else None,
            score=score,
            feedback=feedback,
            model=model,
        )
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)
    except IntegrityError:
        db.rollback()
        existing = _find_evaluation(db, user_id, interview_id, question_id)
        if existing is not None:
            used, limit, remaining = _usage(db, user_id, interview_id)
            return existing, used, limit, remaining
        raise APIError("AI_EVALUATION_FAILED", "Could not record AI evaluation.", 500) from None

    used, limit, remaining = _usage(db, user_id, interview_id)
    return evaluation, used, limit, remaining


def get_owned_question_context(
    db: Session, user_id: str, question_id: str
) -> tuple[Question, str]:
    """Return a question plus its interview id, scoped to the owner."""
    row = db.execute(
        select(Question, Round.interview_id)
        .join(Round, Question.round_id == Round.id)
        .join(Interview, Round.interview_id == Interview.id)
        .where(Question.id == question_id, Interview.user_id == user_id)
    ).first()
    if row is None:
        raise APIError("QUESTION_NOT_FOUND", "Question not found.", 404)
    question, interview_id = row
    return question, interview_id
