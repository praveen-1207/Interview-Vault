from pydantic import BaseModel, Field

from app.schemas.common import OrmModel


class CompanyOut(OrmModel):
    id: str
    name: str


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
