"""Public community feed and saved-experience logic.

Only interviews with publication_status == 'approved' are ever returned here.
Public response schemas deliberately omit answers, AI feedback and owner PII.
"""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.interview import Interview, PublicationStatus
from app.models.question import Question
from app.models.round import Round
from app.models.saved_experience import SavedExperience
from app.utils.errors import APIError


def list_experiences(
    db: Session,
    *,
    q: str | None = None,
    company: str | None = None,
    role: str | None = None,
    difficulty: str | None = None,
    category: str | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 20,
) -> dict:
    base = (
        select(Interview)
        .join(Company, Interview.company_id == Company.id)
        .where(Interview.publication_status == PublicationStatus.approved.value)
    )

    if q:
        like = f"%{q}%"
        base = base.where(
            or_(
                Interview.role.ilike(like),
                Company.name.ilike(like),
                Interview.experience_description.ilike(like),
            )
        )
    if company:
        base = base.where(Company.name.ilike(f"%{company}%"))
    if role:
        base = base.where(Interview.role.ilike(f"%{role}%"))
    if difficulty:
        base = base.where(Interview.difficulty == difficulty)
    if category:
        base = base.where(
            Interview.rounds.any(Round.questions.any(Question.category == category))
        )

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    order = (
        (Interview.published_at.desc().nullslast(), Interview.created_at.desc())
        if sort != "oldest"
        else (Interview.published_at.asc().nullsfirst(), Interview.created_at.asc())
    )
    items = list(
        db.scalars(base.order_by(*order).offset((page - 1) * page_size).limit(page_size))
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_experience(db: Session, interview_id: str) -> Interview:
    interview = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.publication_status == PublicationStatus.approved.value,
        )
    )
    if interview is None:
        raise APIError("EXPERIENCE_NOT_FOUND", "Interview experience not found.", 404)
    return interview


def save_experience(db: Session, user_id: str, interview_id: str) -> SavedExperience:
    get_experience(db, interview_id)
    existing = db.scalar(
        select(SavedExperience).where(
            SavedExperience.user_id == user_id,
            SavedExperience.interview_id == interview_id,
        )
    )
    if existing is not None:
        return existing
    saved = SavedExperience(user_id=user_id, interview_id=interview_id)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


def unsave_experience(db: Session, user_id: str, interview_id: str) -> None:
    saved = db.scalar(
        select(SavedExperience).where(
            SavedExperience.user_id == user_id,
            SavedExperience.interview_id == interview_id,
        )
    )
    if saved is not None:
        db.delete(saved)
        db.commit()


def list_saved(db: Session, user_id: str) -> list[SavedExperience]:
    return list(
        db.scalars(
            select(SavedExperience)
            .join(Interview, SavedExperience.interview_id == Interview.id)
            .where(
                SavedExperience.user_id == user_id,
                Interview.publication_status == PublicationStatus.approved.value,
            )
            .order_by(SavedExperience.created_at.desc())
        )
    )


def is_saved(db: Session, user_id: str, interview_id: str) -> bool:
    return (
        db.scalar(
            select(SavedExperience.id).where(
                SavedExperience.user_id == user_id,
                SavedExperience.interview_id == interview_id,
            )
        )
        is not None
    )


def list_public_companies(db: Session) -> list[Company]:
    return list(
        db.scalars(
            select(Company)
            .join(Interview, Interview.company_id == Company.id)
            .join(Round, Round.interview_id == Interview.id)
            .join(Question, Question.round_id == Round.id)
            .distinct()
            .order_by(Company.name.asc())
        )
    )


def list_community_questions(
    db: Session,
    *,
    q: str | None = None,
    company: str | None = None,
    role: str | None = None,
    interview_type: str | None = None,
    round_name: str | None = None,
    category: str | None = None,
    difficulty: str | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 20,
) -> dict:
    stmt = (
        select(Question)
        .join(Round, Question.round_id == Round.id)
        .join(Interview, Round.interview_id == Interview.id)
        .join(Company, Interview.company_id == Company.id)
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Question.question.ilike(like),
                Question.category.ilike(like),
                Round.name.ilike(like),
                Interview.role.ilike(like),
                Company.name.ilike(like),
            )
        )
    if company:
        stmt = stmt.where(Company.name.ilike(f"%{company}%"))
    if role:
        stmt = stmt.where(Interview.role.ilike(f"%{role}%"))
    if interview_type:
        if interview_type not in {"technical", "hr", "coding", "managerial", "other"}:
            raise APIError("VALIDATION_ERROR", f"Invalid interview type: {interview_type}", 422)
        stmt = stmt.where(Interview.interview_type == interview_type)
    if round_name:
        stmt = stmt.where(Round.name.ilike(f"%{round_name}%"))
    if category:
        if category not in {
            "technical", "coding", "hr", "aptitude", "system_design", "behavioral", "other"
        }:
            raise APIError("VALIDATION_ERROR", f"Invalid question category: {category}", 422)
        stmt = stmt.where(Question.category == category)
    if difficulty:
        if difficulty not in {"easy", "medium", "hard"}:
            raise APIError("VALIDATION_ERROR", f"Invalid question difficulty: {difficulty}", 422)
        stmt = stmt.where(Question.difficulty == difficulty)
    if sort not in {"newest", "oldest"}:
        raise APIError("VALIDATION_ERROR", f"Invalid sort order: {sort}", 422)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    ordering = Question.created_at.asc() if sort == "oldest" else Question.created_at.desc()
    items = list(
        db.scalars(
            stmt.order_by(ordering, Question.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}
