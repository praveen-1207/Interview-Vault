from fastapi import APIRouter, Query, status

from app.authentication.deps import CurrentUser, DbSession
from app.config import settings
from app.schemas.community import (
    AIEvaluationOut,
    AIUsageOut,
    AnswerIn,
    AnswerOut,
    CommunityListResponse,
    CommunityQuestionListResponse,
    EvaluateIn,
    EvaluateOut,
    PublicExperienceDetail,
    SavedExperienceOut,
)
from app.schemas.company import CompanyOut
from app.services import ai_evaluation_service, community_service
from app.utils.rate_limit import check_rate_limit

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/questions", response_model=CommunityQuestionListResponse)
def list_community_questions(
    db: DbSession,
    q: str | None = None,
    company: str | None = None,
    role: str | None = None,
    interview_type: str | None = None,
    round_name: str | None = None,
    category: str | None = None,
    difficulty: str | None = None,
    sort: str = "newest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=settings.community_page_size, ge=1, le=50),
):
    return community_service.list_community_questions(
        db,
        q=q,
        company=company,
        role=role,
        interview_type=interview_type,
        round_name=round_name,
        category=category,
        difficulty=difficulty,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/experiences", response_model=CommunityListResponse)
def list_experiences(
    db: DbSession,
    q: str | None = None,
    company: str | None = None,
    role: str | None = None,
    difficulty: str | None = None,
    category: str | None = None,
    sort: str = "newest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=settings.community_page_size, ge=1, le=50),
):
    return community_service.list_experiences(
        db,
        q=q,
        company=company,
        role=role,
        difficulty=difficulty,
        category=category,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/experiences/{interview_id}", response_model=PublicExperienceDetail)
def get_experience(interview_id: str, db: DbSession):
    return community_service.get_experience(db, interview_id)


@router.get("/companies", response_model=list[CompanyOut])
def list_companies(db: DbSession):
    return community_service.list_public_companies(db)


@router.post("/experiences/{interview_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def save_experience(interview_id: str, db: DbSession, user: CurrentUser):
    community_service.save_experience(db, user.id, interview_id)


@router.delete("/experiences/{interview_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def unsave_experience(interview_id: str, db: DbSession, user: CurrentUser):
    community_service.unsave_experience(db, user.id, interview_id)


@router.get("/saved", response_model=list[SavedExperienceOut])
def list_saved(db: DbSession, user: CurrentUser):
    return community_service.list_saved(db, user.id)


@router.get(
    "/experiences/{interview_id}/questions/{question_id}/answer",
    response_model=AnswerOut,
)
def get_answer(interview_id: str, question_id: str, db: DbSession, user: CurrentUser):
    return ai_evaluation_service.get_answer(db, user.id, interview_id, question_id)


@router.put(
    "/experiences/{interview_id}/questions/{question_id}/answer",
    response_model=AnswerOut,
)
def save_answer(
    interview_id: str,
    question_id: str,
    payload: AnswerIn,
    db: DbSession,
    user: CurrentUser,
):
    return ai_evaluation_service.upsert_answer(
        db, user.id, interview_id, question_id, payload.answer_text
    )


@router.post(
    "/experiences/{interview_id}/questions/{question_id}/evaluate",
    response_model=EvaluateOut,
)
async def evaluate_answer(
    interview_id: str,
    question_id: str,
    payload: EvaluateIn,
    db: DbSession,
    user: CurrentUser,
):
    check_rate_limit(user.id)
    evaluation, used, limit, remaining = await ai_evaluation_service.evaluate_question(
        db,
        user.id,
        interview_id,
        question_id,
        answer_text=payload.answer_text,
    )
    return {
        "evaluation": evaluation,
        "used": used,
        "limit": limit,
        "remaining": remaining,
    }


@router.get(
    "/experiences/{interview_id}/questions/{question_id}/evaluation",
    response_model=AIEvaluationOut,
)
def get_evaluation(interview_id: str, question_id: str, db: DbSession, user: CurrentUser):
    return ai_evaluation_service.get_evaluation(db, user.id, interview_id, question_id)


@router.get("/experiences/{interview_id}/ai-usage", response_model=AIUsageOut)
def get_ai_usage(interview_id: str, db: DbSession, user: CurrentUser):
    return ai_evaluation_service.get_usage(db, user.id, interview_id)
