"""Dependencies shared across routers."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.authentication.security import decode_access_token
from app.database import get_db
from app.models.user import User
from app.utils.errors import APIError

bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    """Resolve the authenticated user from the Bearer access token.

    Raises 401 with a stable code so the frontend's axios interceptor
    can trigger a silent refresh.
    """
    if credentials is None:
        raise APIError("UNAUTHORIZED", "Missing bearer token", 401)

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise APIError("UNAUTHORIZED", "Invalid or expired access token", 401)

    user = db.get(User, user_id)
    if user is None:
        raise APIError("UNAUTHORIZED", "Account no longer exists", 401)

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_admin(user: CurrentUser) -> User:
    """Require an authenticated user with the admin flag."""
    if not user.is_admin:
        raise APIError("FORBIDDEN", "Admin access required.", 403)
    return user


AdminUser = Annotated[User, Depends(get_current_admin)]
