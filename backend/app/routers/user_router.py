from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.models import User
from app.schemas.schemas import UserOut, UserUpdate
from app.authentication.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the logged-in user's profile (name and/or bio).

    `exclude_unset=True` means only the fields sent by the frontend are
    applied. The settings page sends `{ name, bio }` and we simply write them
    back onto the current user row, then return the updated user object.
    """
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
