from fastapi import APIRouter

from app.authentication.deps import AdminUser, DbSession
from app.schemas.admin import AdminExperienceOut, AdminListResponse, AdminRejectIn
from app.services import interview_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/experiences", response_model=AdminListResponse)
def list_experiences(
    db: DbSession,
    _admin: AdminUser,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    return interview_service.list_admin_experiences(
        db, status=status, page=page, page_size=page_size
    )


@router.post("/experiences/{interview_id}/approve", response_model=AdminExperienceOut)
def approve_experience(interview_id: str, db: DbSession, admin: AdminUser):
    return interview_service.approve_interview(db, admin.id, interview_id)


@router.post("/experiences/{interview_id}/reject", response_model=AdminExperienceOut)
def reject_experience(
    interview_id: str, payload: AdminRejectIn, db: DbSession, admin: AdminUser
):
    return interview_service.reject_interview(db, admin.id, interview_id, payload.reason)
