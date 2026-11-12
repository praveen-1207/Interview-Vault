"""
Supabase client setup.

Creates a single shared Supabase client using the project URL + service_role
key. The schema itself is managed by Supabase (run `backend/migrations/*.sql`
in the Supabase SQL Editor), so there is no ORM, no create_all, and no
migration runner here — the Python code just talks to the tables via the
Supabase PostgREST API.

The `service_role` key bypasses row-level security, so all row-level
ownership filtering is done explicitly in the routers (e.g. `eq("user_id", ...)`).
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env"
    )

# `client` — the shared Supabase client. PostgREST is stateless, so a single
# client is safe to reuse across all requests (no per-request session needed).
client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def fetch_one(builder):
    """Run a query builder and return the first row, or None if no rows match.

    supabase-py's `.maybe_single().execute()` returns None (not a response
    object) when there are no matches, which makes the `.data` attribute
    unusable. This helper instead limits to 1 row and reads the returned list,
    which is always an APIResponse.
    """
    rows = builder.limit(1).execute().data
    return rows[0] if rows else None


def get_db():
    """FastAPI dependency that provides the shared Supabase client.

    Declared as `supabase: Client = Depends(get_db)` on every endpoint. The
    client is stateless and thread-safe, so this simply yields the singleton.
    It is kept as a generator to match the FastAPI dependency pattern and to
    give us a single place to swap in request-scoped auth later if needed.
    """
    yield client
