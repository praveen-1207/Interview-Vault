"""Password hashing and token helpers.

Access tokens:  short-lived JWTs, stateless, signed with the app secret.
Refresh tokens: random 256-bit strings, stored hashed in DB (rotation + revocation).
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """Return the user id if the token is a valid, unexpired access token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload.get("sub")


def new_refresh_token() -> str:
    """Generate the opaque refresh token we hand to the client."""
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    """Deterministic hash stored in DB — the raw refresh token is never persisted."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
