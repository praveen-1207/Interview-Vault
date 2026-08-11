import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import auth_router, interview_router, question_router, ai_router, analytics_router, user_router

load_dotenv()

# The database schema lives in Supabase (run `backend/migrations/*.sql` in the
# Supabase SQL Editor). No create_all, no migration runner — the app talks to
# the existing tables via the Supabase REST client.

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
    """Simple root endpoint — proves the API is alive.

    Returns a fixed JSON banner naming the service. Used as a quick sanity
    check (e.g. open http://localhost:8000/ in a browser to confirm the
    backend is running before touching any real endpoints.
    """
    return {"status": "ok", "service": "InterviewVault API"}


@app.get("/health")
def health():
    """Health-check endpoint for uptime monitoring / load balancers.

    Unlike `/`, this deliberately contains NO business logic — it just says
    the process is up. Hosting providers (Render, Railway, etc.) poll this
    URL periodically to decide whether to restart the service, so it must
    never do database work that could slow it down.
    """
    return {"status": "healthy"}
