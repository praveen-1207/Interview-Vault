"""
Follow-up reminder & status-update service.

Centralizes the "how long have we been waiting?" logic so the API never has
its own hard-coded day counts. All the reminder timing lives here:

    3  days  -> first reminder
    7  days  -> second reminder
    14 days  -> third reminder
    30 days  -> No Response warning (NOT rejected!)

The back-end decides which interviews need attention and what kind of
reminder (FOLLOW_UP vs NO_RESPONSE) because we must never rely on the
browser's clock or local storage for reminder state.

Interviews are plain dicts straight from the Supabase client. Date columns
arrive as ISO-8601 strings; `parse_dt` converts them to timezone-aware
datetimes so all arithmetic is consistent and timezone-safe.

Two time references are used:
- `_completion_date`  → when the interview actually happened; used for the
  user-facing "days waiting" number and the reminder anchor.
- `_engagement_date`  → the last time the user acknowledged the interview
  (status_updated_at, falling back to completion). The No Response warning
  is based on THIS, so choosing "Still waiting" resets it and the warning
  is not shown again for another 30 days.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from supabase import Client

from app.models.models import parse_dt, REMINDER_TRACKED_STATUSES


# Configurable reminder intervals.
FIRST_REMINDER_DAYS = 3
SECOND_REMINDER_DAYS = 7
THIRD_REMINDER_DAYS = 14
NO_RESPONSE_DAYS = 30
SNOOZE_DAYS = 3

# The threshold for each reminder stage, oldest->newest.
REMINDER_STAGES = [
    FIRST_REMINDER_DAYS,
    SECOND_REMINDER_DAYS,
    THIRD_REMINDER_DAYS,
    NO_RESPONSE_DAYS,
]

REMINDER_TYPE_FOLLOW_UP = "FOLLOW_UP"
REMINDER_TYPE_NO_RESPONSE = "NO_RESPONSE"


def now_utc() -> datetime:
    """Current time as an aware UTC datetime (the reminder service's clock)."""
    return datetime.now(timezone.utc)


def _completion_date(interview: dict) -> Optional[datetime]:
    """Reference date used for reminder math.

    Prefers the actual interview completion date, falls back to the logged
    interview date, then the row's created_at. A future date never triggers
    reminders (see `is_reminder_due`).
    """
    return (
        parse_dt(interview.get("interview_completed_at"))
        or parse_dt(interview.get("date"))
        or parse_dt(interview.get("created_at"))
    )


def _engagement_date(interview: dict) -> Optional[datetime]:
    """When the user last acknowledged the interview.

    Uses `status_updated_at`; for legacy rows that never set it, falls back to
    the completion date so the 30-day No Response rule still applies.
    """
    return parse_dt(interview.get("status_updated_at")) or _completion_date(interview)


def _days_since(dt: Optional[datetime], now: datetime) -> int:
    """Whole days between `now` and `dt` (0 for None or future dates)."""
    if not dt:
        return 0
    return max(0, (now - dt).days)


def days_waiting(interview: dict, now: Optional[datetime] = None) -> int:
    """Whole days since the interview happened (0 for future dates)."""
    now = now or now_utc()
    return _days_since(_completion_date(interview), now)


def _is_snoozed(interview: dict, now: datetime) -> bool:
    """True if the user hit "Tell me later" and the snooze is still active."""
    snoozed = parse_dt(interview.get("reminder_snoozed_until"))
    return bool(snoozed and snoozed > now)


def reminder_type(interview: dict, now: Optional[datetime] = None) -> str:
    """FOLLOW_UP for normal reminders, NO_RESPONSE once 30+ days pass since the
    last acknowledgment."""
    now = now or now_utc()
    return (
        REMINDER_TYPE_NO_RESPONSE
        if _days_since(_engagement_date(interview), now) >= NO_RESPONSE_DAYS
        else REMINDER_TYPE_FOLLOW_UP
    )


def is_reminder_due(interview: dict, now: Optional[datetime] = None) -> bool:
    """Whether an interview currently needs a status-update reminder.

    Rules:
    - Only tracked statuses (AWAITING_RESULT / legacy pending+waiting).
    - Future interviews never remind.
    - A 30+ day wait since the last acknowledgment always reminds (the No
      Response warning) even if the user snoozed — the snooze only delays
      normal follow-ups.
    - Otherwise, due when the scheduled `next_reminder_at` has passed AND the
      user is not currently snoozing.
    """
    now = now or now_utc()
    if interview.get("status") not in REMINDER_TRACKED_STATUSES:
        return False
    ref = _completion_date(interview)
    if not ref or ref > now:
        return False

    # 30+ day No Response warning always shows (cannot be snoozed away).
    if _days_since(_engagement_date(interview), now) >= NO_RESPONSE_DAYS:
        return True

    if _is_snoozed(interview, now):
        return False

    # No schedule yet? Backwards-compatible: treat as due once the first stage
    # threshold has passed, to migrate legacy rows into the flow.
    if interview.get("next_reminder_at") is None:
        return days_waiting(interview, now) >= REMINDER_STAGES[0]
    return parse_dt(interview.get("next_reminder_at")) <= now


def schedule_next_reminder(interview: dict, now: Optional[datetime] = None) -> None:
    """Advance a tracked interview to its next reminder stage.

    Uses `reminder_count` to pick the next threshold; after the 30-day stage
    it keeps reminding at the 30-day mark until the user updates the status.
    Sets `next_reminder_at` and bumps `reminder_count` in place on the dict.
    """
    now = now or now_utc()
    anchor = _completion_date(interview) or now
    stage = min(interview.get("reminder_count") or 0, len(REMINDER_STAGES) - 1)
    interview["next_reminder_at"] = anchor + timedelta(days=REMINDER_STAGES[stage])
    interview["last_reminder_at"] = now
    interview["reminder_count"] = (interview.get("reminder_count") or 0) + 1


def snooze_reminder(interview: dict, days: int = SNOOZE_DAYS, now: Optional[datetime] = None) -> None:
    """"Tell me later": push the next reminder out by `days` (default 3).

    Only affects normal follow-ups; the 30-day No Response warning ignores
    the snooze (handled in `is_reminder_due`).
    """
    now = now or now_utc()
    interview["reminder_snoozed_until"] = now + timedelta(days=days)
    interview["last_reminder_at"] = now


def mark_tracked_status(interview: dict, now: Optional[datetime] = None) -> None:
    """Call when an interview enters (or remains in) a tracked status.

    Resets the reminder clock so the user has a fresh, predictable schedule:
    - records when the status was set (this clears the No Response timer),
    - fixes the completion reference date,
    - schedules the first reminder 3 days after the interview date,
    - resets the reminder stage count and clears any snooze.
    Mutates the dict in place.
    """
    now = now or now_utc()
    interview["status_updated_at"] = now
    interview["interview_completed_at"] = interview.get("interview_completed_at") or interview.get("date")
    interview["reminder_snoozed_until"] = None
    interview["reminder_count"] = 0
    interview["next_reminder_at"] = now + timedelta(days=FIRST_REMINDER_DAYS)


def clear_reminder_schedule(interview: dict) -> None:
    """Stop all reminder tracking for a final/terminal status (mutates dict)."""
    interview["next_reminder_at"] = None
    interview["last_reminder_at"] = None
    interview["reminder_count"] = 0
    interview["reminder_snoozed_until"] = None


def get_interviews_needing_status_update(supabase: Client, user_id: str) -> List[dict]:
    """Return the user's tracked interviews that need attention right now.

    Ordered oldest-first (longest waiting gets seen first). The No Response
    warning takes priority as it is the most overdue.
    """
    now = now_utc()
    data = (
        supabase.table("interviews")
        .select("*, companies(company_name)")
        .eq("user_id", user_id)
        .in_("status", list(REMINDER_TRACKED_STATUSES))
        .execute()
        .data
    )
    due = [i for i in data if is_reminder_due(i, now)]
    # Oldest reference date first; ties broken by longest status dwell.
    due.sort(key=lambda i: (_completion_date(i) or now, days_waiting(i, now)))
    return due


def count_interviews_needing_status_update(supabase: Client, user_id: str) -> int:
    """Fast count for banners/badges without returning the full list."""
    return len(get_interviews_needing_status_update(supabase, user_id))
