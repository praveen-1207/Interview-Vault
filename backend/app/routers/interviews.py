from fastapi import APIRouter, status

from app.authentication.deps import CurrentUser, DbSession
from app.schemas.interview import (
    InterviewAnswerEvaluationIn,
    InterviewAnswerEvaluationOut,
    InterviewCreate,
    InterviewDetail,
    InterviewExperienceCreate,
    InterviewOut,
    InterviewSubmitIn,
    InterviewUpdate,
)
from app.schemas.round import RoundCreate, RoundOut
from app.services import interview_service

router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.get("", response_model=list[InterviewOut])
def list_interviews(
    db: DbSession,
    user: CurrentUser,
    status: str | None = None,
    company: str | None = None,
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
):
    return interview_service.list_interviews(
        db, user.id, status=status, company=company, q=q, date_from=date_from, date_to=date_to
    )


@router.post("", response_model=InterviewOut, status_code=status.HTTP_201_CREATED)
def create_interview(payload: InterviewCreate, db: DbSession, user: CurrentUser):
    return interview_service.create_interview(db, user.id, payload)


@router.post("/experience", response_model=InterviewDetail, status_code=status.HTTP_201_CREATED)
def create_interview_experience(
    payload: InterviewExperienceCreate, db: DbSession, user: CurrentUser
):
    return interview_service.create_interview_experience(db, user.id, payload)


@router.post(
    "/evaluate-answer",
    response_model=InterviewAnswerEvaluationOut,
)
async def evaluate_experience_answer(
    payload: InterviewAnswerEvaluationIn, user: CurrentUser
):
    return await interview_service.evaluate_experience_answer(user.id, payload)


@router.get("/{interview_id}", response_model=InterviewDetail)
def get_interview(interview_id: str, db: DbSession, user: CurrentUser):
    return interview_service.get_interview(db, user.id, interview_id)


@router.put("/{interview_id}", response_model=InterviewOut)
def update_interview(interview_id: str, payload: InterviewUpdate, db: DbSession, user: CurrentUser):
    return interview_service.update_interview(db, user.id, interview_id, payload)


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(interview_id: str, db: DbSession, user: CurrentUser):
    interview_service.delete_interview(db, user.id, interview_id)


@router.post("/{interview_id}/rounds", response_model=RoundOut, status_code=status.HTTP_201_CREATED)
def create_round(interview_id: str, payload: RoundCreate, db: DbSession, user: CurrentUser):
    return interview_service.create_round(db, user.id, interview_id, payload.name)


@router.post("/{interview_id}/submit", response_model=InterviewOut)
def submit_interview(
    interview_id: str, payload: InterviewSubmitIn, db: DbSession, user: CurrentUser
):
    return interview_service.submit_interview(db, user.id, interview_id, payload)


@router.post("/{interview_id}/withdraw", response_model=InterviewOut)
def withdraw_interview(interview_id: str, db: DbSession, user: CurrentUser):
    return interview_service.withdraw_interview(db, user.id, interview_id)
