from collections import defaultdict
from fastapi import APIRouter, Depends
from supabase import Client

from app.database.connection import get_db, fetch_one
from app.models.models import parse_dt
from app.schemas.schemas import AnalyticsOut
from app.authentication.auth import get_current_user
from app.services.reminder_service import count_interviews_needing_status_update

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsOut)
def get_analytics(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return the analytics summary used by the Dashboard & AI Analysis pages.

    It combines two things:
    1. The pre-computed counts stored in the `analytics` row (selected,
       rejected, awaiting_result, next_round, no_response) that
       `_sync_analytics` keeps up to date.
    2. Live calculations over the user's interviews: average confidence,
       how many interviews per company, and how many per month.

    `needs_attention` is computed from the reminder service so the dashboard
    can show "N interviews need an update" without duplicating date logic.
    Everything is scoped to `current_user.id` so each user only sees their own.
    """
    interviews = (
        supabase.table("interviews")
        .select("*, companies(company_name)")
        .eq("user_id", current_user["id"])
        .execute()
        .data
    )
    analytics = fetch_one(
        supabase.table("analytics")
        .select("*")
        .eq("user_id", current_user["id"])
    ) or {}

    avg_confidence = (
        sum((i.get("confidence") or 0) for i in interviews) / len(interviews) if interviews else 0
    )

    company_distribution = defaultdict(int)
    monthly_activity = defaultdict(int)
    for i in interviews:
        company_distribution[(i.get("companies") or {}).get("company_name", "Unknown")] += 1
        date = parse_dt(i.get("date"))
        if date:
            monthly_activity[date.strftime("%Y-%m")] += 1

    return AnalyticsOut(
        total_interviews=analytics.get("total_interviews") or 0,
        selected=analytics.get("selected") or 0,
        waiting=0,
        rejected=analytics.get("rejected") or 0,
        pending=0,
        awaiting_result=analytics.get("awaiting_result") or 0,
        next_round=analytics.get("next_round") or 0,
        no_response=analytics.get("no_response") or 0,
        needs_attention=count_interviews_needing_status_update(supabase, current_user["id"]),
        avg_confidence=round(avg_confidence, 1),
        company_distribution=dict(company_distribution),
        monthly_activity=dict(monthly_activity),
    )
