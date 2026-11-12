"""End-to-end smoke test for the InterviewVault API.

Run from the backend/ directory with the venv active:

    .venv\\Scripts\\python.exe scripts\\smoke_test.py

Requirements:
- DATABASE_URL set in backend/.env (local Postgres or Supabase)
- Server not required: this exercises the app in-process via FastAPI TestClient.
- GEMINI_API_KEY is optional; the AI step is skipped if it is not configured.

Prints PASS/FAIL/SKIP per step and exits non-zero on failure.
"""

import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

RESULTS: list[tuple[str, bool | None, str]] = []


def record(name: str, ok: bool | None, detail: str = "") -> None:
    RESULTS.append((name, ok, detail))
    status = "PASS" if ok else ("SKIP" if ok is None else "FAIL")
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    email = f"smoke.{uuid.uuid4().hex[:10]}@example.com"
    password = "secret123"

    with TestClient(app) as client:
        # 1. Register
        r = client.post("/api/v1/auth/register",
                        json={"name": "Smoke Tester", "email": email, "password": password})
        record("register", r.status_code == 201, r.text[:120])
        if r.status_code != 201:
            return 1
        payload = r.json()
        access = payload["access_token"]
        refresh = payload["refresh_token"]
        headers = {"Authorization": f"Bearer {access}"}

        # 2. me
        r = client.get("/api/v1/auth/me", headers=headers)
        record("auth/me", r.status_code == 200 and r.json()["email"] == email)

        # 3. create interview (company auto-created)
        r = client.post("/api/v1/interviews",
                        json={"company_name": "Google", "role": "Frontend Intern",
                              "date": "2026-08-05", "status": "waiting"},
                        headers=headers)
        record("create interview", r.status_code == 201, r.text[:120])
        interview_id = r.json()["id"]

        # 4. add round
        r = client.post(f"/api/v1/interviews/{interview_id}/rounds",
                        json={"name": "Technical Round"}, headers=headers)
        record("create round", r.status_code == 201, r.text[:120])
        round_id = r.json()["id"]

        # 5. add question
        r = client.post(f"/api/v1/rounds/{round_id}/questions",
                        json={"question": "Explain closures in JavaScript",
                              "user_answer": "A closure is a function that remembers its scope."},
                        headers=headers)
        record("create question", r.status_code == 201, r.text[:120])
        question_id = r.json()["id"]

        # 6. AI analysis (optional)
        r = client.post(f"/api/v1/questions/{question_id}/analyze", headers=headers)
        if r.status_code == 503:
            record("ai analysis", None, "GEMINI_API_KEY not set — skipped")
        else:
            ok = r.status_code == 200 and bool(r.json().get("question", {}).get("ai_answer"))
            record("ai analysis", ok, r.text[:120])

        # 7. interview detail (nested rounds + questions)
        r = client.get(f"/api/v1/interviews/{interview_id}", headers=headers)
        detail = r.json()
        record("interview detail", r.status_code == 200 and detail["rounds"][0]["name"] == "Technical Round")

        # 8. question search
        r = client.get("/api/v1/questions/search", params={"q": "closures", "company": "Google"},
                       headers=headers)
        record("questions/search", r.status_code == 200 and len(r.json()) >= 1)

        # 9. update interview status
        r = client.put(f"/api/v1/interviews/{interview_id}",
                       json={"status": "selected"}, headers=headers)
        record("update interview", r.status_code == 200 and r.json()["status"] == "selected")

        # 10. analytics
        r = client.get("/api/v1/analytics/summary", headers=headers)
        s = r.json()
        record("analytics/summary", r.status_code == 200 and s["total"] == 1 and s["selected"] == 1)

        r = client.get("/api/v1/analytics/monthly", headers=headers)
        record("analytics/monthly", r.status_code == 200 and len(r.json()) == 12)

        r = client.get("/api/v1/analytics/companies", headers=headers)
        record("analytics/companies", r.status_code == 200 and r.json()[0]["company"] == "Google")

        # 11. refresh token rotation
        r = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        record("auth/refresh", r.status_code == 200 and r.json()["access_token"] != access)

        # 12. unauthorized access is rejected
        r = client.get("/api/v1/interviews")
        record("auth guard", r.status_code == 401)

        # 13. delete interview (cleanup)
        r = client.delete(f"/api/v1/interviews/{interview_id}", headers=headers)
        record("delete interview", r.status_code == 204)

        # 14. logout revokes refresh tokens
        r = client.post("/api/v1/auth/logout", headers=headers)
        record("auth/logout", r.status_code == 204)

    failed = [name for name, ok, _ in RESULTS if ok is False]
    print("\n" + "=" * 50)
    print(f"{sum(1 for _, ok, _ in RESULTS if ok is True)} passed, "
          f"{len(failed)} failed, "
          f"{sum(1 for _, ok, _ in RESULTS if ok is None)} skipped")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
