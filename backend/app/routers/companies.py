from fastapi import APIRouter, status

from app.authentication.deps import CurrentUser, DbSession
from app.schemas.company import CompanyCreate, CompanyOut
from app.services import company_service

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyOut])
def list_companies(db: DbSession, _user: CurrentUser):
    return company_service.list_companies(db)


@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(payload: CompanyCreate, db: DbSession, _user: CurrentUser):
    return company_service.get_or_create_company(db, payload.name)
