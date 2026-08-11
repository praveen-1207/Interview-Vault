-- ============================================================
-- InterviewVault — Initial Schema Migration
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
--
-- Creates the complete schema the backend expects: users, companies,
-- interviews, rounds, questions, analytics. Includes the follow-up
-- reminder columns on `interviews` and the status-lifecycle counts on
-- `analytics` so a fresh database matches the live one exactly.
--
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR PRIMARY KEY,
    name            VARCHAR NOT NULL,
    email           VARCHAR UNIQUE NOT NULL,
    password_hash   VARCHAR NOT NULL,
    bio             TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
    id              VARCHAR PRIMARY KEY,
    company_name    VARCHAR UNIQUE NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_companies_company_name ON companies (company_name);

-- Interviews (includes follow-up reminder columns)
CREATE TABLE IF NOT EXISTS interviews (
    id                      VARCHAR PRIMARY KEY,
    user_id                 VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id              VARCHAR NOT NULL REFERENCES companies(id),
    role                    VARCHAR NOT NULL,
    interview_type          VARCHAR,
    date                    TIMESTAMP,
    status                  VARCHAR DEFAULT 'pending',
    confidence              INTEGER DEFAULT 5,
    notes                   TEXT,
    status_updated_at       TIMESTAMP,
    interview_completed_at  TIMESTAMP,
    next_reminder_at        TIMESTAMP,
    last_reminder_at        TIMESTAMP,
    reminder_count          INTEGER DEFAULT 0,
    reminder_snoozed_until  TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_interviews_user_id ON interviews (user_id);
CREATE INDEX IF NOT EXISTS ix_interviews_company_id ON interviews (company_id);

-- Rounds
CREATE TABLE IF NOT EXISTS rounds (
    id              VARCHAR PRIMARY KEY,
    interview_id    VARCHAR NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    round_name      VARCHAR NOT NULL,
    round_result    VARCHAR,
    order_index     INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_rounds_interview_id ON rounds (interview_id);

-- Questions (belongs to a round; no direct interview link)
CREATE TABLE IF NOT EXISTS questions (
    id                  VARCHAR PRIMARY KEY,
    round_id            VARCHAR NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    question            TEXT NOT NULL,
    user_answer         TEXT,
    ai_correct_answer   TEXT,
    ai_improved_answer  TEXT,
    ai_explanation      TEXT,
    ai_missing_points   TEXT,
    topic               VARCHAR,
    difficulty          VARCHAR,
    created_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_questions_round_id ON questions (round_id);

-- Analytics (one row per user, kept in sync by the backend).
-- `waiting`/`pending` are legacy columns kept at 0; the canonical status
-- lifecycle is counted in awaiting_result / next_round / no_response.
CREATE TABLE IF NOT EXISTS analytics (
    id                  VARCHAR PRIMARY KEY,
    user_id             VARCHAR UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_interviews    INTEGER DEFAULT 0,
    selected            INTEGER DEFAULT 0,
    waiting             INTEGER DEFAULT 0,
    rejected            INTEGER DEFAULT 0,
    pending             INTEGER DEFAULT 0,
    awaiting_result     INTEGER DEFAULT 0,
    next_round          INTEGER DEFAULT 0,
    no_response         INTEGER DEFAULT 0
);

-- ============================================================
-- Done. Six tables created: users, companies, interviews,
-- rounds, questions, analytics — matching the Supabase schema.
-- ============================================================
