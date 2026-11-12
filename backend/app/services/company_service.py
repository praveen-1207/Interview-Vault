"""Company lookup / creation helpers.

Companies are a shared, normalized table so dashboard analytics can group
cleanly. get_or_create keeps autocomplete and import-by-name idempotent.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company


def list_companies(db: Session) -> list[Company]:
    return list(db.scalars(select(Company).order_by(Company.name.asc())))


def get_or_create_company(db: Session, name: str) -> Company:
    """Return the company with this name (case-insensitive), creating it if needed."""
    normalized = name.strip()
    company = db.scalar(select(Company).where(Company.name.ilike(normalized)))
    if company is None:
        company = Company(name=normalized)
        db.add(company)
        db.flush()
    return company
