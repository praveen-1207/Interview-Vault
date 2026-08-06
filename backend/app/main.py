import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.database.connection import engine, Base
from app.routers import auth_router, interview_router, question_router, ai_router, analytics_router, user_router

load_dotenv()

# Auto-creates any tables that don't exist yet — safe to leave in even if
# you already ran migrations/001_initial_schema.sql in the Supabase SQL editor,
# since it only creates tables that are missing.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InterviewVault API",
    description="AI-powered Personal Interview Experience Management Platform",
    version="1.0.0",
)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(interview_router.router)
app.include_router(question_router.router)
app.include_router(ai_router.router)
app.include_router(analytics_router.router)
app.include_router(user_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "InterviewVault API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
