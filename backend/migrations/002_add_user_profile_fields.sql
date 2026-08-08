-- ============================================================
-- InterviewVault — Migration 002: User profile fields
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
--
-- Adds the career + social profile fields used by the Settings page:
--   occupation, target_role, location, linkedin, github.
--
-- Postgres supports "ADD COLUMN IF NOT EXISTS", so this is safe to re-run.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_role VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github VARCHAR;

-- ============================================================
-- Done. Existing rows get NULL for the new fields; the user can
-- fill them in from the Settings page.
-- ============================================================
