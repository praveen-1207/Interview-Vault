-- InterviewVault: community sharing migration
-- Idempotent and additive. Existing rows become private drafts.

BEGIN;

-- ---------- users ----------
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_username varchar(120);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_public_username
    ON users (lower(public_username))
    WHERE public_username IS NOT NULL;

-- ---------- interviews ----------
ALTER TABLE interviews ALTER COLUMN date DROP NOT NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS experience_description text;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS difficulty varchar(20);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_mode varchar(30);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS publication_status varchar(20) NOT NULL DEFAULT 'draft';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS publish_consent boolean NOT NULL DEFAULT false;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS public_identity varchar(20) NOT NULL DEFAULT 'anonymous';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS ix_interviews_publication_status ON interviews (publication_status);
CREATE INDEX IF NOT EXISTS ix_interviews_difficulty ON interviews (difficulty);

-- Existing experiences stay private until the owner explicitly submits them.
UPDATE interviews SET publication_status = 'draft' WHERE publication_status IS NULL;

-- ---------- questions ----------
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category varchar(30) NOT NULL DEFAULT 'other';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS order_index integer;

-- ---------- answers (private practice answers) ----------
CREATE TABLE IF NOT EXISTS answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_answers_user_question UNIQUE (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS ix_answers_user_id ON answers (user_id);
CREATE INDEX IF NOT EXISTS ix_answers_question_id ON answers (question_id);

-- ---------- ai_evaluations (counted quota + stored feedback) ----------
CREATE TABLE IF NOT EXISTS ai_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_id uuid REFERENCES answers(id) ON DELETE CASCADE,
    score integer,
    feedback text NOT NULL,
    model varchar(80),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_eval_user_interview_question UNIQUE (user_id, interview_id, question_id),
    CONSTRAINT ck_ai_eval_score CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);
CREATE INDEX IF NOT EXISTS ix_ai_evaluations_user_id ON ai_evaluations (user_id);
CREATE INDEX IF NOT EXISTS ix_ai_evaluations_interview_id ON ai_evaluations (interview_id);
CREATE INDEX IF NOT EXISTS ix_ai_evaluations_question_id ON ai_evaluations (question_id);

-- ---------- saved_experiences ----------
CREATE TABLE IF NOT EXISTS saved_experiences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_saved_user_interview UNIQUE (user_id, interview_id)
);
CREATE INDEX IF NOT EXISTS ix_saved_experiences_user_id ON saved_experiences (user_id);
CREATE INDEX IF NOT EXISTS ix_saved_experiences_interview_id ON saved_experiences (interview_id);

-- ---------- defense in depth ----------
-- The backend connects as the Postgres owner and is authoritative. RLS with no
-- policies means any accidental anon-key access returns nothing.
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_experiences ENABLE ROW LEVEL SECURITY;

COMMIT;
