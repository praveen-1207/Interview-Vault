"""
Pure domain logic that used to live inside the SQLAlchemy models.

The tables themselves are managed by Supabase (see `backend/migrations/`), so
there are no ORM classes here anymore. What survives is the shared logic that
is NOT database-specific: id generation, the interview status enum + legacy
normalisation, and the set of statuses the reminder system tracks.
"""
import uuid
import enum
from datetime import datetime, timezone


def gen_uuid():
    """Generate a random UUID string to use as a primary key.

    Used as the `id` for every new row since all primary keys are strings.
    """
    return str(uuid.uuid4())


def parse_dt(value):
    """Parse a value coming back from Supabase into a timezone-aware datetime.

    PostgREST returns `timestamptz` columns as ISO-8601 strings (e.g.
    "2026-08-10T12:34:56.789+00:00"). The reminder logic needs real datetime
    objects, so this converts strings (or plain datetimes) to aware UTC.
    Returns None for None / empty input.
    """
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def serialize_payload(payload: dict) -> dict:
    """Convert datetime values to ISO-8601 strings before sending to PostgREST.

    supabase-py's JSON encoder does not handle `datetime` objects, so any
    datetime (e.g. `created_at`, reminder dates) must be a string in insert /
    update payloads. Timestamps stored in the DB are UTC, and `.isoformat()`
    preserves that offset so round-tripping is lossless.
    """
    out = {}
    for key, value in payload.items():
        if isinstance(value, datetime):
            out[key] = value.isoformat()
        else:
            out[key] = value
    return out


class InterviewStatus(str, enum.Enum):
    """Lifecycle statuses for an interview.

    Defined as a `str, enum.Enum` so each member is BOTH a real Python
    string AND an enum value. That means `InterviewStatus.awaiting_result == "AWAITING_RESULT"`
    is True, which lets us store `status` directly as a string column while
    still enjoying autocomplete + typo-safety in code.

    New lifecycle (canonical, uppercase):
    - `applied`              → application submitted.
    - `shortlisted`          → shortlisted by the company.
    - `interview_scheduled`  → interview date has been fixed.
    - `interview_completed`  → interview happened.
    - `awaiting_result`      → waiting for the company's decision (the
                               reminder system tracks this).
    - `selected`             → got the offer.
    - `rejected`             → did not move forward.
    - `next_round`           → moved to the next round (status is "in
                               progress", not a final result).
    - `no_response`          → NO final result after a long wait. This is
                               NOT the same as rejected.

    Legacy values (`pending`, `waiting`) are still valid members so old
    database rows keep working after the upgrade.
    """
    applied = "APPLIED"
    shortlisted = "SHORTLISTED"
    interview_scheduled = "INTERVIEW_SCHEDULED"
    interview_completed = "INTERVIEW_COMPLETED"
    awaiting_result = "AWAITING_RESULT"
    selected = "SELECTED"
    rejected = "REJECTED"
    next_round = "NEXT_ROUND"
    no_response = "NO_RESPONSE"
    # Legacy aliases (kept so existing rows aren't broken).
    pending = "pending"
    waiting = "waiting"


# The statuses that participate in the follow-up reminder flow. Anything else
# (final outcomes, still-in-progress stages, legacy values) is not tracked.
REMINDER_TRACKED_STATUSES = {InterviewStatus.awaiting_result.value}


def normalize_status(value: str) -> str:
    """Map a user-supplied status to its canonical stored value.

    Frontends may send either the new canonical value (e.g. "AWAITING_RESULT")
    or a legacy lowercase value ("pending"/"waiting"). This maps legacy values
    to their canonical equivalent so new code can rely on one spelling while
    old data keeps working.
    """
    if not value:
        return InterviewStatus.awaiting_result.value
    mapping = {
        "pending": InterviewStatus.awaiting_result.value,
        "waiting": InterviewStatus.awaiting_result.value,
        "selected": InterviewStatus.selected.value,
        "rejected": InterviewStatus.rejected.value,
        "applied": InterviewStatus.applied.value,
        "shortlisted": InterviewStatus.shortlisted.value,
        "interview_scheduled": InterviewStatus.interview_scheduled.value,
        "interview_completed": InterviewStatus.interview_completed.value,
        "awaiting_result": InterviewStatus.awaiting_result.value,
        "next_round": InterviewStatus.next_round.value,
        "no_response": InterviewStatus.no_response.value,
    }
    return mapping.get(value.strip().lower(), InterviewStatus.awaiting_result.value)
