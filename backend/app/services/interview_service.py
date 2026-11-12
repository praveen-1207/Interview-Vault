"""Interview, round, and question business logic.

Every read/write on nested resources first verifies the resource belongs to
the authenticated user — this is what prevents users from touching each
other's data (IDOR protection).
"""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai.gemini import analyze_question
from app.config import settings
from app.models.ai_evaluation import AIEvaluation
from app.models.answer import Answer
from app.models.company import Company
from app.models.interview import Interview, InterviewStatus, PublicationStatus
from app.models.question import Question
from app.models.round import Round
from app.schemas.interview import (
    InterviewAnswerEvaluationIn,
    InterviewCreate,
    InterviewExperienceCreate,
    InterviewSubmitIn,
    InterviewUpdate,
)
from app.services.company_service import get_or_create_company
from app.utils.errors import APIError
from app.utils.rate_limit import check_rate_limit


# ---------- ownership helpers ----------


def _get_interview(db: Session, user_id: str, interview_id: str) -> Interview:
    interview = db.scalar(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    if interview is None:
        raise APIError("INTERVIEW_NOT_FOUND", "Interview not found.", 404)
    return interview


def _get_round(db: Session, user_id: str, round_id: str) -> Round:
    round_ = db.scalar(
        select(Round)
        .join(Interview)
        .where(Round.id == round_id, Interview.user_id == user_id)
    )
    if round_ is None:
        raise APIError("ROUND_NOT_FOUND", "Round not found.", 404)
    return round_


def _get_question(db: Session, user_id: str, question_id: str) -> Question:
    question = db.scalar(
        select(Question)
        .join(Round)
        .join(Interview)
        .where(Question.id == question_id, Interview.user_id == user_id)
    )
    if question is None:
        raise APIError("QUESTION_NOT_FOUND", "Question not found.", 404)
    return question


# ---------- company resolution ----------


def _resolve_company(
    db: Session, *, company_id: str | None, company_name: str | None
) -> Company:
    """Pick a company from id, name, or (rename-aware) both."""
    if company_id:
        company = db.get(Company, company_id)
        if company is None:
            raise APIError("COMPANY_NOT_FOUND", "Company not found.", 404)
        if company_name and company_name.strip().lower() != company.name.strip().lower():
            return get_or_create_company(db, company_name.strip())
        return company
    if company_name:
        return get_or_create_company(db, company_name.strip())
    raise APIError("COMPANY_REQUIRED", "Provide a company name or id.", 422)


# ---------- interviews ----------


def list_interviews(
    db: Session,
    user_id: str,
    *,
    status: str | None = None,
    company: str | None = None,
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[Interview]:
    stmt = (
        select(Interview)
        .join(Interview.company)
        .where(Interview.user_id == user_id)
    )

    if status:
        try:
            status_enum = InterviewStatus(status)
        except ValueError:
            raise APIError("VALIDATION_ERROR", f"Invalid status: {status}", 422)
        stmt = stmt.where(Interview.status == status_enum)
    if company:
        stmt = stmt.where(Company.name.ilike(f"%{company}%"))
    if q:
        stmt = stmt.where(
            Interview.role.ilike(f"%{q}%") | Company.name.ilike(f"%{q}%")
        )
    if date_from:
        try:
            stmt = stmt.where(Interview.date >= datetime.fromisoformat(date_from).date())
        except ValueError:
            raise APIError("VALIDATION_ERROR", "date_from must be YYYY-MM-DD", 422)
    if date_to:
        try:
            stmt = stmt.where(Interview.date <= datetime.fromisoformat(date_to).date())
        except ValueError:
            raise APIError("VALIDATION_ERROR", "date_to must be YYYY-MM-DD", 422)

    stmt = stmt.order_by(Interview.date.desc(), Interview.created_at.desc())
    return list(db.scalars(stmt))


def create_interview(db: Session, user_id: str, payload: InterviewCreate) -> Interview:
    company = _resolve_company(db, company_id=payload.company_id, company_name=payload.company_name)
    publication_status = (
        PublicationStatus.pending_review.value
        if payload.publish_consent
        else PublicationStatus.draft.value
    )
    interview = Interview(
        user_id=user_id,
        company_id=company.id,
        role=payload.role.strip(),
        interview_type=payload.interview_type,
        date=payload.date,
        status=payload.status,
        experience_description=(payload.experience_description or "").strip() or None,
        difficulty=payload.difficulty,
        interview_mode=payload.interview_mode,
        publish_consent=payload.publish_consent,
        public_identity=payload.public_identity,
        publication_status=publication_status,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


def get_interview(db: Session, user_id: str, interview_id: str) -> Interview:
    return _get_interview(db, user_id, interview_id)


def update_interview(
    db: Session, user_id: str, interview_id: str, payload: InterviewUpdate
) -> Interview:
    interview = _get_interview(db, user_id, interview_id)

    if payload.company_id is not None or payload.company_name is not None:
        interview.company_id = _resolve_company(
            db, company_id=payload.company_id, company_name=payload.company_name
        ).id
    if payload.role is not None:
        interview.role = payload.role.strip()
    if payload.interview_type is not None:
        interview.interview_type = payload.interview_type
    if "date" in payload.model_fields_set:
        interview.date = payload.date
    if payload.status is not None:
        interview.status = payload.status
    if "experience_description" in payload.model_fields_set:
        interview.experience_description = (
            payload.experience_description.strip()
            if payload.experience_description
            else None
        )
    if "difficulty" in payload.model_fields_set:
        interview.difficulty = payload.difficulty
    if "interview_mode" in payload.model_fields_set:
        interview.interview_mode = payload.interview_mode
    if payload.public_identity is not None:
        interview.public_identity = payload.public_identity
    if payload.publish_consent is not None:
        interview.publish_consent = payload.publish_consent
        if payload.publish_consent:
            if interview.publication_status != PublicationStatus.approved.value:
                interview.publication_status = PublicationStatus.pending_review.value
                interview.rejection_reason = None
                interview.published_at = None
        else:
            interview.publication_status = PublicationStatus.draft.value
            interview.published_at = None

    db.commit()
    db.refresh(interview)
    return interview


async def evaluate_experience_answer(
    user_id: str, payload: InterviewAnswerEvaluationIn
) -> dict:
    check_rate_limit(user_id, limit=5)
    if len(payload.question) > settings.max_ai_input_chars:
        raise APIError("INPUT_TOO_LONG", "Question is too long for AI evaluation.", 422)
    if len(payload.answer) > settings.max_ai_input_chars:
        raise APIError("INPUT_TOO_LONG", "Answer is too long for AI evaluation.", 422)
    score, feedback, model = await analyze_question(payload.question, payload.answer)
    return {"score": score, "feedback": feedback, "model": model}


def create_interview_experience(
    db: Session, user_id: str, payload: InterviewExperienceCreate
) -> Interview:
    submission_key = str(payload.submission_key)
    existing = db.scalar(
        select(Interview).where(
            Interview.user_id == user_id,
            Interview.submission_key == submission_key,
        )
    )
    if existing is not None:
        return existing

    if len(payload.questions) > 100:
        raise APIError("TOO_MANY_QUESTIONS", "An interview can contain at most 100 questions.", 422)
    evaluated_count = sum(question.ai_feedback is not None for question in payload.questions)
    if evaluated_count > settings.max_ai_evaluations_per_interview:
        raise APIError(
            "AI_QUOTA_EXCEEDED",
            f"An interview can include at most {settings.max_ai_evaluations_per_interview} AI evaluations.",
            422,
        )
    if evaluated_count and any(
        question.ai_feedback is not None and not question.user_answer.strip()
        for question in payload.questions
    ):
        raise APIError("INVALID_EVALUATION", "Evaluated questions must include their answers.", 422)

    try:
        company = _resolve_company(
            db,
            company_id=None,
            company_name=(payload.company_name or "").strip() or "Company Not Specified",
        )
        interview = Interview(
            user_id=user_id,
            company_id=company.id,
            role=payload.role.strip(),
            interview_type=payload.interview_type,
            date=payload.date,
            status=payload.status,
            experience_description=(payload.experience_description or "").strip() or None,
            interview_mode=payload.interview_mode,
            publication_status=PublicationStatus.draft.value,
            publish_consent=False,
            public_identity="anonymous",
            submission_key=submission_key,
        )
        db.add(interview)
        db.flush()

        rounds_by_name: dict[str, Round] = {}
        for index, item in enumerate(payload.questions):
            round_name = item.round_name.strip()
            round_ = rounds_by_name.get(round_name)
            if round_ is None:
                round_ = Round(interview_id=interview.id, name=round_name)
                db.add(round_)
                db.flush()
                rounds_by_name[round_name] = round_

            question = Question(
                round_id=round_.id,
                question=item.question.strip(),
                user_answer=item.user_answer.strip(),
                category=item.category,
                difficulty=item.difficulty,
                order_index=index,
                ai_answer=item.ai_feedback,
            )
            db.add(question)
            db.flush()

            if item.ai_feedback is not None:
                answer = Answer(
                    user_id=user_id,
                    question_id=question.id,
                    answer_text=item.user_answer.strip(),
                )
                db.add(answer)
                db.flush()
                db.add(
                    AIEvaluation(
                        user_id=user_id,
                        interview_id=interview.id,
                        question_id=question.id,
                        answer_id=answer.id,
                        score=item.ai_score,
                        feedback=item.ai_feedback,
                        model=item.ai_model,
                    )
                )

        db.commit()
        db.refresh(interview)
        return interview
    except IntegrityError:
        db.rollback()
        duplicate = db.scalar(
            select(Interview).where(
                Interview.user_id == user_id,
                Interview.submission_key == submission_key,
            )
        )
        if duplicate is not None:
            return duplicate
        raise APIError(
            "EXPERIENCE_SAVE_FAILED",
            "Could not save this interview experience. Please try again.",
            409,
        ) from None
    except Exception:
        db.rollback()
        raise


def submit_interview(
    db: Session, user_id: str, interview_id: str, payload: InterviewSubmitIn
) -> Interview:
    interview = _get_interview(db, user_id, interview_id)
    if not payload.publish_consent:
        raise APIError(
            "CONSENT_REQUIRED",
            "You must give explicit consent before an experience can be published.",
            422,
        )
    if len(interview.rounds) == 0:
        raise APIError(
            "NO_ROUNDS",
            "Add at least one interview round before submitting for review.",
            422,
        )
    interview.publish_consent = True
    interview.public_identity = payload.public_identity
    if payload.experience_description is not None:
        interview.experience_description = payload.experience_description.strip() or None
    if payload.difficulty is not None:
        interview.difficulty = payload.difficulty
    if payload.interview_mode is not None:
        interview.interview_mode = payload.interview_mode
    interview.publication_status = PublicationStatus.pending_review.value
    interview.rejection_reason = None
    interview.reviewed_by = None
    interview.reviewed_at = None
    interview.published_at = None
    db.commit()
    db.refresh(interview)
    return interview


def withdraw_interview(db: Session, user_id: str, interview_id: str) -> Interview:
    interview = _get_interview(db, user_id, interview_id)
    interview.publication_status = PublicationStatus.draft.value
    interview.published_at = None
    db.commit()
    db.refresh(interview)
    return interview


def list_admin_experiences(
    db: Session, *, status: str | None = None, page: int = 1, page_size: int = 20
) -> dict:
    base = select(Interview)
    if status:
        try:
            PublicationStatus(status)
        except ValueError:
            raise APIError("VALIDATION_ERROR", f"Invalid publication status: {status}", 422)
        base = base.where(Interview.publication_status == status)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = list(
        db.scalars(
            base.order_by(Interview.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return {"items": items, "total": total}


def approve_interview(db: Session, admin_id: str, interview_id: str) -> Interview:
    interview = db.get(Interview, interview_id)
    if interview is None:
        raise APIError("INTERVIEW_NOT_FOUND", "Interview not found.", 404)
    interview.publication_status = PublicationStatus.approved.value
    interview.rejection_reason = None
    interview.reviewed_by = admin_id
    interview.reviewed_at = datetime.now(timezone.utc)
    interview.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interview)
    return interview


def reject_interview(db: Session, admin_id: str, interview_id: str, reason: str) -> Interview:
    interview = db.get(Interview, interview_id)
    if interview is None:
        raise APIError("INTERVIEW_NOT_FOUND", "Interview not found.", 404)
    interview.publication_status = PublicationStatus.rejected.value
    interview.rejection_reason = reason.strip()
    interview.reviewed_by = admin_id
    interview.reviewed_at = datetime.now(timezone.utc)
    interview.published_at = None
    db.commit()
    db.refresh(interview)
    return interview


def delete_interview(db: Session, user_id: str, interview_id: str) -> None:
    interview = _get_interview(db, user_id, interview_id)
    db.delete(interview)
    db.commit()


# ---------- rounds ----------


def create_round(db: Session, user_id: str, interview_id: str, name: str) -> Round:
    _get_interview(db, user_id, interview_id)
    round_ = Round(interview_id=interview_id, name=name.strip())
    db.add(round_)
    db.commit()
    db.refresh(round_)
    return round_


def update_round(db: Session, user_id: str, round_id: str, name: str) -> Round:
    round_ = _get_round(db, user_id, round_id)
    round_.name = name.strip()
    db.commit()
    db.refresh(round_)
    return round_


def delete_round(db: Session, user_id: str, round_id: str) -> None:
    round_ = _get_round(db, user_id, round_id)
    db.delete(round_)
    db.commit()


# ---------- questions ----------


def create_question(
    db: Session,
    user_id: str,
    round_id: str,
    question: str,
    user_answer: str = "",
    category: str = "other",
    difficulty: str | None = None,
    order_index: int | None = None,
) -> Question:
    _get_round(db, user_id, round_id)
    q = Question(
        round_id=round_id,
        question=question.strip(),
        user_answer=user_answer.strip(),
        category=category,
        difficulty=difficulty,
        order_index=order_index,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


def update_question(
    db: Session,
    user_id: str,
    question_id: str,
    *,
    question: str | None,
    user_answer: str | None,
    category: str | None = None,
    difficulty: str | None = None,
    order_index: int | None = None,
) -> Question:
    q = _get_question(db, user_id, question_id)
    if question is not None:
        q.question = question.strip()
    if user_answer is not None:
        q.user_answer = user_answer.strip()
    if category is not None:
        q.category = category
    if difficulty is not None:
        q.difficulty = difficulty
    if order_index is not None:
        q.order_index = order_index
    db.commit()
    db.refresh(q)
    return q


def delete_question(db: Session, user_id: str, question_id: str) -> None:
    q = _get_question(db, user_id, question_id)
    db.delete(q)
    db.commit()
