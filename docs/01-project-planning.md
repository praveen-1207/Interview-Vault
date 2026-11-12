# PHASE 1 — Project Planning

## 1. Why we build it

Interview feedback is the highest-leverage learning material for job seekers, yet it
lives in chat windows, notes apps, and memory. InterviewVault captures it in one place,
and uses Gemini to turn a raw "question + your answer" into a structured learning
document (correct answer, better response, explanation, missing points).

**Business value:** a real product with auth, data ownership, and AI augmentation —
not a CRUD demo. This is exactly what startups ship.

## 2. Architecture decision

- **Frontend (Vercel):** React + TypeScript + Vite, Tailwind, TanStack Query for
  server state, React Hook Form + Zod for forms, Chart.js for analytics.
- **Backend (Render/Railway):** FastAPI (async), SQLAlchemy 2.0, Pydantic v2,
  JWT (access + refresh), bcrypt, Gemini REST API.
- **Database (Supabase Postgres):** relational schema, JSONB not needed — data is
  deeply relational (Interview → Rounds → Questions).

Why FastAPI over Django/Express? Async performance, automatic OpenAPI docs,
Pydantic validation, first-class typing. It matches the user's skills (Python).

```
Browser (React SPA)
      │  HTTPS + Bearer JWT
      ▼
  FastAPI (REST /api/v1)
      │
      ├── Postgres (Supabase)
      └── Google Gemini (server-side only, key never shipped)
```

Key rule: **Gemini is only called from the backend.** The API key never reaches the
browser. Gemini only ever receives the user's own question + answer — never scraped
content.

## 3. Feature breakdown

Core (MVP):
1. Auth: register / login / logout / refresh token / me
2. Interviews: CRUD (company, role, date, status)
3. Rounds: nested under an interview (Technical, HR, Manager)
4. Questions: nested under a round (question, user answer, ai answer)
5. AI analysis per question (5-part output stored in DB)
6. Dashboard analytics (counts, monthly activity, company distribution, success %)
7. Question library (search / filter by company, tech, round, date / sort)

Advanced (optional): resume upload → question generation, voice assistant, n8n
automation, PDF export.

## 4. Development roadmap

| # | Phase | Deliverable | Days |
|---|-------|-------------|------|
| 1 | Planning | This doc + schema + API spec | 1 |
| 2 | Design | Figma-style page specs + component tree | 1 |
| 3 | Backend + DB | Models, migrations, CRUD, auth | 4 |
| 4 | AI service | Gemini integration + parsing + error handling | 2 |
| 5 | Frontend core | Setup, routing, auth UI, forms | 5 |
| 6 | Frontend features | Interview CRUD, question library, dashboard charts | 5 |
| 7 | Polish + testing | Validation, empty states, error states, tests | 3 |
| 8 | Deploy | Vercel + Render + Supabase, env config | 1 |

## 5. Database planning

Tables (final, with indexes & constraints — see `05-database-design.md`):

- `users` — id, name, email (unique), password_hash, created_at
- `companies` — id, name (unique) — normalized so analytics group cleanly
- `interviews` — id, user_id (FK), company_id (FK), role, date, status, created_at
- `rounds` — id, interview_id (FK), name
- `questions` — id, round_id (FK), question, user_answer, ai_answer (TEXT, markdown with fixed section headings), created_at
- `analytics` — id, user_id (FK), total/selected/waiting/rejected (denormalized snapshot)

Status enum: `waiting | selected | rejected` (+ `offer` considered part of selected).

## 6. API planning

Base path: `/api/v1`. All except auth + docs require `Authorization: Bearer <access>`.

```
POST /auth/register            → 201 user
POST /auth/login               → 200 {access, refresh, user}
POST /auth/refresh             → 200 {access, refresh}
POST /auth/logout              → 204 (revoke refresh)
GET  /auth/me                  → 200 user

GET    /companies              → list (for autocomplete)
POST   /companies              → create

GET    /interviews             → list (filters: status, company, date range)
POST   /interviews             → create (with rounds + questions nested)
GET    /interviews/{id}        → detail incl. rounds & questions
PUT    /interviews/{id}        → update
DELETE /interviews/{id}        → 204

POST   /interviews/{id}/rounds             → create round
PUT    /rounds/{id}                        → update round
DELETE /rounds/{id}                        → 204

POST   /rounds/{id}/questions              → create question
POST   /questions/{id}/analyze             → run Gemini, store result
PUT    /questions/{id}                     → update
DELETE /questions/{id}                     → 204

GET    /analytics/summary                  → totals + success %
GET    /analytics/monthly                  → activity per month
GET    /analytics/companies                → distribution
GET    /questions/search?q=&status=...     → library search/filter/sort
```

Error format (consistent):
```json
{ "detail": { "code": "VALIDATION_ERROR", "message": "email is required" } }
```

## 7. Common mistakes (planning stage)

1. Putting Gemini calls on the frontend → key leaks. We keep it server-side.
2. Storing `ai_answer` as loose text → we use markdown with fixed `##` section
   headings so the frontend can split it into structured cards at render time.
3. Not indexing `interviews.user_id` and `questions.round_id` → slow queries later.
4. Using a UUID vs int PK inconsistently → we standardize on UUIDs for public IDs.
5. No refresh-token rotation → short access tokens + rotating refresh.
6. Letting users delete companies still referenced by interviews → soft handling.

## 8. Improvements (post-MVP)

- Team workspaces, interview templates, spaced-repetition review queue
- Advanced analytics (per-company success rate trend, tag-based question clusters)
- RSS/email digest, n8n nightly summary report, OpenTelemetry + Sentry
