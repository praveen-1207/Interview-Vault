from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.models.models import Interview, Company, Round, Question, User, Analytics
from app.schemas.schemas import InterviewCreate, InterviewUpdate, InterviewOut
from app.authentication.auth import get_current_user

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


def _to_out(interview: Interview) -> dict:
    return {
        "id": interview.id,
        "user_id": interview.user_id,
        "company_name": interview.company.company_name,
        "role": interview.role,
        "interview_type": interview.interview_type,
        "date": interview.date,
        "status": interview.status,
        "confidence": interview.confidence,
        "notes": interview.notes,
        "created_at": interview.created_at,
        "rounds": interview.rounds,
    }


def _get_or_create_company(db: Session, name: str) -> Company:
    company = db.query(Company).filter(Company.company_name.ilike(name.strip())).first()
    if not company:
        company = Company(company_name=name.strip())
        db.add(company)
        db.commit()
        db.refresh(company)
    return company


def _sync_analytics(db: Session, user_id: str):
    """Recompute the analytics summary row for a user after any interview change."""
    interviews = db.query(Interview).filter(Interview.user_id == user_id).all()
    analytics = db.query(Analytics).filter(Analytics.user_id == user_id).first()
    if not analytics:
        analytics = Analytics(user_id=user_id)
        db.add(analytics)
    analytics.total_interviews = len(interviews)
    analytics.selected = sum(1 for i in interviews if i.status == "selected")
    analytics.waiting = sum(1 for i in interviews if i.status == "waiting")
    analytics.rejected = sum(1 for i in interviews if i.status == "rejected")
    analytics.pending = sum(1 for i in interviews if i.status == "pending")
    db.commit()


@router.post("", response_model=InterviewOut, status_code=201)
def create_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = _get_or_create_company(db, payload.company_name)

    interview = Interview(
        user_id=current_user.id,
        company_id=company.id,
        role=payload.role,
        interview_type=payload.interview_type,
        date=payload.date,
        status=payload.status or "pending",
        confidence=payload.confidence or 5,
        notes=payload.notes,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    for r in payload.rounds or []:
        round_obj = Round(
            interview_id=interview.id,
            round_name=r.round_name,
            round_result=r.round_result,
            order_index=r.order_index or 0,
        )
        db.add(round_obj)
        db.commit()
        db.refresh(round_obj)

        for q in r.questions or []:
            db.add(Question(
                round_id=round_obj.id,
                question=q.question,
                user_answer=q.user_answer,
                topic=q.topic,
                difficulty=q.difficulty,
            ))
        db.commit()

    db.refresh(interview)
    _sync_analytics(db, current_user.id)
    return _to_out(interview)


@router.get("", response_model=List[InterviewOut])
def list_interviews(
    status_filter: Optional[str] = Query(None, alias="status"),
    company: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Interview)
        .options(joinedload(Interview.rounds).joinedload(Round.questions), joinedload(Interview.company))
        .filter(Interview.user_id == current_user.id)
    )
    if status_filter:
        query = query.filter(Interview.status == status_filter)
    if company:
        query = query.join(Company).filter(Company.company_name.ilike(f"%{company}%"))

    interviews = query.order_by(Interview.created_at.desc()).all()
    return [_to_out(i) for i in interviews]


@router.get("/{interview_id}", response_model=InterviewOut)
def get_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = (
        db.query(Interview)
        .options(joinedload(Interview.rounds).joinedload(Round.questions), joinedload(Interview.company))
        .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return _to_out(interview)


@router.put("/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: str,
    payload: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id, Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if payload.company_name:
        interview.company = _get_or_create_company(db, payload.company_name)
    for field in ["role", "interview_type", "date", "status", "confidence", "notes"]:
        value = getattr(payload, field)
        if value is not None:
            setattr(interview, field, value)

    db.commit()
    db.refresh(interview)
    _sync_analytics(db, current_user.id)
    return _to_out(interview)


@router.delete("/{interview_id}", status_code=204)
def delete_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id, Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    db.delete(interview)
    db.commit()
    _sync_analytics(db, current_user.id)
    return None


@router.post("/{interview_id}/rounds", response_model=InterviewOut, status_code=201)
def add_round(
    interview_id: str,
    round_name: str,
    round_result: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id, Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    db.add(Round(interview_id=interview.id, round_name=round_name, round_result=round_result))
    db.commit()
    db.refresh(interview)
    return _to_out(interview)
