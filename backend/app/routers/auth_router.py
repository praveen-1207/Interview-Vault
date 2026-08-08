from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.models import User, Analytics
from app.schemas.schemas import UserCreate, UserLogin, Token, UserOut
from app.authentication.auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """Create a new user account and log them in immediately.

    1. Rejects the request with 409 if the email is already registered.
    2. Hashes the password with bcrypt (never store plain text!).
    3. Saves the user, then seeds an empty Analytics row for them.
    4. Hands back a Token: an access JWT + refresh JWT + the user object.

    The frontend stores this token and user in localStorage to stay logged in.
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed analytics row for the new user
    db.add(Analytics(user_id=user.id))
    db.commit()

    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Log in an existing user.

    Looks up the user by email, verifies the plain-text password against the
    stored bcrypt hash, then returns fresh access + refresh tokens along with
    the user object. Returns a generic 401 on wrong email OR wrong password so
    attackers can't tell which one failed.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=Token)
def refresh(refresh_token: str, db: Session = Depends(get_db)):
    """Exchange an expiring/short-lived access token for a fresh pair.

    The frontend calls this automatically when an API request returns 401.
    It validates the refresh token, makes sure it is really a "refresh" type
    token (not an access token), loads the user, and mints a brand-new
    access token + refresh token so the user stays logged in without
    re-entering their password.
    """
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently logged-in user.

    `get_current_user` already decoded the JWT and loaded the user from the
    database, so we just hand it straight back. Useful for re-fetching the
    profile if the app is refreshed mid-session.
    """
    return current_user
