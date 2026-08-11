from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from supabase import Client

from app.database.connection import get_db, fetch_one
from app.models.models import gen_uuid, parse_dt, serialize_payload
from app.schemas.schemas import UserCreate, UserLogin, Token, UserOut
from app.authentication.auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _user_out(row: dict) -> UserOut:
    """Build a UserOut from a `users` row dict, parsing `created_at`."""
    row = dict(row)
    row["created_at"] = parse_dt(row.get("created_at"))
    return UserOut.model_validate(row)


@router.post("/register", response_model=Token, status_code=201)
def register(payload: UserCreate, supabase: Client = Depends(get_db)):
    """Create a new user account and log them in immediately.

    1. Rejects the request with 409 if the email is already registered.
    2. Hashes the password with bcrypt (never store plain text!).
    3. Saves the user, then seeds an empty Analytics row for them.
    4. Hands back a Token: an access JWT + refresh JWT + the user object.

    The frontend stores this token and user in localStorage to stay logged in.
    """
    existing = fetch_one(
        supabase.table("users")
        .select("id")
        .eq("email", payload.email)
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = gen_uuid()
    user_row = {
        "id": user_id,
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }
    inserted = supabase.table("users").insert(serialize_payload(user_row)).execute().data[0]

    # Seed analytics row for the new user
    supabase.table("analytics").insert(
        {
            "id": gen_uuid(),
            "user_id": user_id,
            "total_interviews": 0,
            "selected": 0,
            "waiting": 0,
            "rejected": 0,
            "pending": 0,
            "awaiting_result": 0,
            "next_round": 0,
            "no_response": 0,
        }
    ).execute()

    return Token(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
        user=_user_out(inserted),
    )


@router.post("/login", response_model=Token)
def login(payload: UserLogin, supabase: Client = Depends(get_db)):
    """Log in an existing user.

    Looks up the user by email, verifies the plain-text password against the
    stored bcrypt hash, then returns fresh access + refresh tokens along with
    the user object. Returns a generic 401 on wrong email OR wrong password so
    attackers can't tell which one failed.
    """
    row = fetch_one(
        supabase.table("users")
        .select("*")
        .eq("email", payload.email)
    )
    if not row or not verify_password(payload.password, row.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return Token(
        access_token=create_access_token(row["id"]),
        refresh_token=create_refresh_token(row["id"]),
        user=_user_out(row),
    )


@router.post("/refresh", response_model=Token)
def refresh(refresh_token: str, supabase: Client = Depends(get_db)):
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
    row = fetch_one(
        supabase.table("users")
        .select("*")
        .eq("id", payload.get("sub"))
    )
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return Token(
        access_token=create_access_token(row["id"]),
        refresh_token=create_refresh_token(row["id"]),
        user=_user_out(row),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    """Return the profile of the currently logged-in user.

    `get_current_user` already decoded the JWT and loaded the user from the
    database, so we just hand it straight back. Useful for re-fetching the
    profile if the app is refreshed mid-session.
    """
    return current_user
