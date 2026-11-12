-- Add interview metadata and per-question difficulty without altering existing rows.
BEGIN;

ALTER TYPE interview_status ADD VALUE IF NOT EXISTS 'in_progress';

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS interview_type varchar(30) NOT NULL DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS submission_key varchar(36);

CREATE UNIQUE INDEX IF NOT EXISTS uq_interviews_user_submission_key
    ON interviews (user_id, submission_key)
    WHERE submission_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_interviews_interview_type
    ON interviews (interview_type);

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS difficulty varchar(20);

UPDATE questions AS q
SET difficulty = i.difficulty
FROM rounds AS r
JOIN interviews AS i ON i.id = r.interview_id
WHERE q.round_id = r.id
  AND q.difficulty IS NULL
  AND i.difficulty IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_questions_difficulty
    ON questions (difficulty);

COMMIT;
