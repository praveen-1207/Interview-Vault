"""InterviewVault FastAPI application entry point.

Run locally:  uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (registers all tables on the metadata)
from app.config import settings
from app.database import Base, engine
from app.routers import (
    admin,
    analytics,
    auth,
    community,
    companies,
    interviews,
    questions,
    rounds,
)
from app.utils.errors import register_exception_handlers


@asynccontextmanager
async def lifespan(_: FastAPI):
    # MVP bootstrap: create tables that don't exist yet.
    # For production, switch to Alembic migrations (see README).
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)

    prefix = settings.api_prefix
    app.include_router(auth.router, prefix=prefix)
    app.include_router(companies.router, prefix=prefix)
    app.include_router(interviews.router, prefix=prefix)
    app.include_router(rounds.router, prefix=prefix)
    app.include_router(questions.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(community.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)

    @app.get(f"{prefix}/health")
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
