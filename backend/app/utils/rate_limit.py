"""Small in-process per-user rate limiter.

This is intentionally simple and works for a single backend instance. For
multi-instance deployments, back this with Redis or a database table.
"""

import threading
import time
from collections import defaultdict, deque

from app.config import settings
from app.utils.errors import APIError

_lock = threading.Lock()
_buckets: dict[str, deque[float]] = defaultdict(deque)

WINDOW_SECONDS = 60.0


def check_rate_limit(user_id: str, *, limit: int | None = None) -> None:
    max_requests = limit if limit is not None else settings.rate_limit_requests_per_minute
    if max_requests <= 0:
        return

    now = time.monotonic()
    with _lock:
        bucket = _buckets[user_id]
        while bucket and now - bucket[0] > WINDOW_SECONDS:
            bucket.popleft()
        if len(bucket) >= max_requests:
            retry_after = int(WINDOW_SECONDS - (now - bucket[0])) + 1
            raise APIError(
                "RATE_LIMITED",
                "Too many requests. Please slow down and try again shortly.",
                429,
                extra={"retry_after": retry_after},
            )
        bucket.append(now)
