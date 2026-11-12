from fastapi import APIRouter, status

from app.authentication.deps import CurrentUser, DbSession
from app.schemas.auth import (
    AuthPayload,
    ChangePasswordIn,
    LoginIn,
    RefreshIn,
    RegisterIn,
    UpdateProfileIn,
    UserOut,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthPayload, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: DbSession):
    return auth_service.register(db, payload)


@router.post("/login", response_model=AuthPayload)
def login(payload: LoginIn, db: DbSession):
    return auth_service.login(db, payload)


@router.post("/refresh", response_model=AuthPayload)
def refresh(payload: RefreshIn, db: DbSession):
    return auth_service.refresh(db, payload)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(db: DbSession, user: CurrentUser):
    auth_service.logout(db, user)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(payload: UpdateProfileIn, db: DbSession, user: CurrentUser):
    return auth_service.update_profile(db, user, payload)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: ChangePasswordIn, db: DbSession, user: CurrentUser):
    auth_service.change_password(db, user, payload)
