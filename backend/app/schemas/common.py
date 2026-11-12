from pydantic import BaseModel, ConfigDict


class OrmModel(BaseModel):
    """Base schema that can serialize SQLAlchemy models directly."""

    model_config = ConfigDict(from_attributes=True)
