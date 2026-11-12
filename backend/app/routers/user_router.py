from fastapi import APIRouter, Depends
from supabase import Client

from app.database.connection import get_db
from app.models.models import parse_dt
from app.schemas.schemas import UserOut, UserUpdate
from app.authentication.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])


def _user_out(row: dict) -> UserOut:
    """Build a UserOut from a `users` row dict, parsing `created_at`."""
    row = dict(row)
    row["created_at"] = parse_dt(row.get("created_at"))
    return UserOut.model_validate(row)


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update the logged-in user's profile (name and/or bio).

    `exclude_unset=True` means only the fields sent by the frontend are
    applied. The settings page sends `{ name, bio }` and we simply write them
    back onto the current user row, then return the updated user object.
    """
    updated = (
        supabase.table("users")
        .update(payload.model_dump(exclude_unset=True))
        .eq("id", current_user["id"])
        .execute()
        .data[0]
    )
    return _user_out(updated)
