"""Authentication business logic: register, login, refresh rotation, logout,
profile updates, password change."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.authentication.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)
from app.config import settings
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    AuthPayload,
    ChangePasswordIn,
    LoginIn,
    RefreshIn,
    RegisterIn,
    UpdateProfileIn,
)
from app.utils.errors import APIError


def _issue_tokens(db: Session, user: User) -> AuthPayload:
    """Issue a fresh access token + store a hashed, rotating refresh token."""
    access_token = create_access_token(str(user.id))
    refresh_token = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return AuthPayload(access_token=access_token, refresh_token=refresh_token, user=user)


def _apply_admin_flag(user: User) -> None:
    """Promote configured ADMIN_EMAILS accounts on register/login."""
    if user.email.lower() in settings.admin_email_set:
        user.is_admin = True


def register(db: Session, payload: RegisterIn) -> AuthPayload:
    existing = db.scalar(select(User).where(User.email.ilike(payload.email)))
    if existing is not None:
        raise APIError("EMAIL_TAKEN", "An account with this email already exists.", 409)

    user = User(
        name=payload.name.strip(),
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
    )
    _apply_admin_flag(user)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_tokens(db, user)


def login(db: Session, payload: LoginIn) -> AuthPayload:
    user = db.scalar(select(User).where(User.email.ilike(payload.email)))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise APIError("INVALID_CREDENTIALS", "Incorrect email or password.", 401)
    _apply_admin_flag(user)
    db.commit()
    db.refresh(user)
    return _issue_tokens(db, user)


def refresh(db: Session, payload: RefreshIn) -> AuthPayload:
    """Rotate the refresh token: validate, revoke the old one, issue a new pair."""
    presented_hash = hash_token(payload.refresh_token)
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == presented_hash))

    if record is None or record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise APIError("INVALID_REFRESH", "Refresh token is invalid or expired.", 401)

    user = db.get(User, record.user_id)
    if user is None:
        raise APIError("INVALID_REFRESH", "Account no longer exists.", 401)

    db.delete(record)
    db.flush()
    return _issue_tokens(db, user)


def logout(db: Session, user: User) -> None:
    """Revoke every refresh token for the user (safe with rotation)."""
    for record in db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id)):
        db.delete(record)
    db.commit()


def update_profile(db: Session, user: User, payload: UpdateProfileIn) -> User:
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.public_username is not None:
        cleaned = payload.public_username.strip()
        if cleaned:
            taken = db.scalar(
                select(User.id).where(
                    func.lower(User.public_username) == cleaned.lower(),
                    User.id != user.id,
                )
            )
            if taken is not None:
                raise APIError(
                    "USERNAME_TAKEN", "That public username is already taken.", 409
                )
        user.public_username = cleaned or None
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise APIError(
            "USERNAME_TAKEN", "That public username is already taken.", 409
        ) from None
    db.refresh(user)
    return user


def change_password(db: Session, user: User, payload: ChangePasswordIn) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise APIError("WRONG_PASSWORD", "Current password is incorrect.", 400)
    user.password_hash = hash_password(payload.new_password)
    db.commit()
