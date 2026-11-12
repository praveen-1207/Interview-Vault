from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import OrmModel


class UserOut(OrmModel):
    id: str
    name: str
    email: EmailStr
    is_admin: bool = False
    public_username: str | None = None
    created_at: datetime


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class UpdateProfileIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    public_username: str | None = Field(default=None, max_length=120)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthPayload(TokenPair):
    """What /auth/register and /auth/login return — matches the frontend AuthPayload."""

    user: UserOut
