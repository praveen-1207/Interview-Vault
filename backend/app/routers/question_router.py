from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.models.models import Question, Round, Interview, Company, User
from app.schemas.schemas import QuestionCreate, QuestionUpdate, QuestionOut
from app.authentication.auth import get_current_user

router = APIRouter(prefix="/api/questions", tags=["Questions"])


def _owned_question(db: Session, question_id: str, user_id: str) -> Question:
    q = (
        db.query(Question)
        .join(Round)
        .join(Interview)
        .filter(Question.id == question_id, Interview.user_id == user_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


@router.post("/round/{round_id}", response_model=QuestionOut, status_code=201)
def add_question(
    round_id: str,
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    round_obj = (
        db.query(Round).join(Interview)
        .filter(Round.id == round_id, Interview.user_id == current_user.id)
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    question = Question(round_id=round_id, **payload.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("", response_model=List[QuestionOut])
def search_questions(
    search: Optional[str] = None,
    company: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    round_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Question Library: search + filter across all of the user's stored questions."""
    query = (
        db.query(Question)
        .join(Round)
        .join(Interview)
        .join(Company)
        .filter(Interview.user_id == current_user.id)
    )
    if search:
        query = query.filter(Question.question.ilike(f"%{search}%"))
    if company:
        query = query.filter(Company.company_name.ilike(f"%{company}%"))
    if topic:
        query = query.filter(Question.topic.ilike(f"%{topic}%"))
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if round_name:
        query = query.filter(Round.round_name.ilike(f"%{round_name}%"))

    return query.order_by(Question.created_at.desc()).all()


@router.put("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: str,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = _owned_question(db, question_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = _owned_question(db, question_id, current_user.id)
    db.delete(question)
    db.commit()
    return None
