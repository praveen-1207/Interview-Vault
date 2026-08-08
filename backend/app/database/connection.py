"""
Database connection setup using SQLAlchemy.

Defaults to local SQLite so the project runs with zero external setup.
To use Postgres/Supabase in production, just set DATABASE_URL in .env,
e.g. postgresql://user:password@host:5432/dbname
"""
import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Reads the connection string from the environment. Defaults to a local
# SQLite file (`interviewvault.db`) so the project runs with zero setup;
# set DATABASE_URL in .env to point at Postgres/Supabase in production.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./interviewvault.db")

# SQLite needs this connect_arg; Postgres does not.
# (SQLite allows only one thread to use a connection at a time, and FastAPI
# runs handler code on multiple threads — this flag lets them share safely.)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# `engine` — the single connection pool to the database. Every session below
# borrows connections from this one place, so we never create raw connections.
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# `SessionLocal` — a session factory. Each call `SessionLocal()` opens a new
# DB session (a "unit of work") that the request uses and then closes.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# `Base` — the declarative base every ORM model inherits from. SQLAlchemy
# discovers all tables by looking at classes that subclass this Base.
Base = declarative_base()


# ---- Lightweight migrations --------------------------------------------
# `create_all` only creates tables that DON'T exist — it never adds columns to
# tables that already exist. So when we add a new column to a model, databases
# created by an older version of the app would be missing it and every query
# would fail. `_ensure_column` patches exactly that: it checks the live table
# schema and runs `ALTER TABLE ... ADD COLUMN` for any missing column. It is a
# no-op on Postgres when the column already exists (`IF NOT EXISTS`), and on
# SQLite we guard with the inspector so we never try to add a duplicate column.

# Columns that must exist on the `users` table regardless of which schema
# version created the database.
_USER_COLUMNS = [
    ("occupation", "VARCHAR"),
    ("target_role", "VARCHAR"),
    ("location", "VARCHAR"),
    ("linkedin", "VARCHAR"),
    ("github", "VARCHAR"),
]

# Columns added for the follow-up reminder system on the `interviews` table.
_INTERVIEW_COLUMNS = [
    ("status_updated_at", "DATETIME"),
    ("interview_completed_at", "DATETIME"),
    ("next_reminder_at", "DATETIME"),
    ("last_reminder_at", "DATETIME"),
    ("reminder_count", "INTEGER DEFAULT 0"),
    ("reminder_snoozed_until", "DATETIME"),
]

# Columns added on the `analytics` table for the new status lifecycle.
_ANALYTICS_COLUMNS = [
    ("awaiting_result", "INTEGER DEFAULT 0"),
    ("next_round", "INTEGER DEFAULT 0"),
    ("no_response", "INTEGER DEFAULT 0"),
]


def _ensure_columns(conn, table: str, columns):
    """Add any missing columns to `table` inside an open transaction."""
    existing = {col["name"] for col in inspect(engine).get_columns(table)}
    for name, col_type in columns:
        if name not in existing:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {col_type}"))


def run_migrations():
    """Ensure every table column the app expects actually exists.

    Called once at startup (see main.py, right after `create_all`). Inspects
    the live tables and adds any missing columns. Existing rows simply get
    NULL/0 for the new columns until the user fills them in.

    Also normalises legacy interview statuses to their canonical lifecycle
    values (backward-compatible data migration):
    - pending / waiting -> AWAITING_RESULT
    - selected          -> SELECTED
    - rejected          -> REJECTED
    and back-fills `interview_completed_at` from the interview date so the
    reminder schedule has a reference point for legacy rows.
    """
    with engine.begin() as conn:
        _ensure_columns(conn, "users", _USER_COLUMNS)
        _ensure_columns(conn, "interviews", _INTERVIEW_COLUMNS)
        _ensure_columns(conn, "analytics", _ANALYTICS_COLUMNS)

        # Backward-compatible status normalisation for existing rows.
        conn.execute(text(
            "UPDATE interviews SET status = 'AWAITING_RESULT' "
            "WHERE status IN ('pending', 'waiting')"
        ))
        conn.execute(text(
            "UPDATE interviews SET status = 'SELECTED' WHERE status = 'selected'"
        ))
        conn.execute(text(
            "UPDATE interviews SET status = 'REJECTED' WHERE status = 'rejected'"
        ))
        # Give legacy AWAITING_RESULT rows a reminder reference date.
        conn.execute(text(
            "UPDATE interviews SET interview_completed_at = date "
            "WHERE status = 'AWAITING_RESULT' "
            "AND interview_completed_at IS NULL AND date IS NOT NULL"
        ))


def get_db():
    """FastAPI dependency that yields a DB session and closes it after the request.

    Declared as `db: Session = Depends(get_db)` on every endpoint. FastAPI
    calls this before the handler runs, injects the yielded session into the
    route, and the `finally` block guarantees the session is always closed —
    even if the handler raises an exception — so no connections leak.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
