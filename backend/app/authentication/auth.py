"""
Authentication utilities: password hashing with bcrypt and JWT
access/refresh token creation + verification.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.models import User

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def hash_password(password: str) -> str:
    """Securely hash a plain-text password.

    Uses bcrypt with a random salt. We truncate the input to 72 bytes first
    because bcrypt silently ignores anything beyond that, which could make
    long passwords behave unexpectedly. Returns the hash as a string, ready
    to store in the `users.password_hash` column.
    """
    # bcrypt has a 72-byte input limit; truncate defensively.
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plain-text password against a stored bcrypt hash.

    Returns True if they match, False otherwise. Used by the login endpoint.
    Because bcrypt stores the salt inside the hash itself, we never need a
    separate salt value in the database.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("utf-8"))


def create_token(data: dict, expires_delta: timedelta, token_type: str = "access") -> str:
    """Build a signed JWT containing `data` plus an expiry time.

    The token claims include an `exp` (expiry timestamp) and a `type` tag
    ("access" or "refresh"). Signing with JWT_SECRET means the JWT cannot be
    tampered with by the client — if anyone edits it, signature verification
    will fail later in `decode_token`.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "type": token_type})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_access_token(user_id: str) -> str:
    """Create a short-lived access token (default 60 min) for a user."""
    return create_token({"sub": user_id}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "access")


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived refresh token (default 7 days) for a user.

    The refresh token is only ever sent to the /api/auth/refresh endpoint —
    never used to access other routes. This is what lets users stay logged in
    without re-entering their password.
    """
    return create_token({"sub": user_id}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_token(token: str) -> dict:
    """Verify a JWT's signature and expiry, then return its claims.

    Raises a 401 "Could not validate credentials" if the token is expired,
    malformed, or signed with a different secret — so the frontend bounces
    to the login page and refreshes the session.
    """
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Protected-route dependency: decodes the JWT and loads the user.

    Every router that needs the logged-in user declares this as a FastAPI
    dependency (`current_user: User = Depends(get_current_user)`). It:
    1. Rejects non-"access" tokens (refresh tokens are rejected here).
    2. Reads the user id from the "sub" claim.
    3. Loads the matching User row from the database.
    4. Returns that user, or raises 401 if any step fails.

    This single function is what guarantees ALL protected endpoints know
    "who is calling" and can filter data to that user.
    """
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
