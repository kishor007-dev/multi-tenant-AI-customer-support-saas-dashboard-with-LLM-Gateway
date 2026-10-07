"""
Per-org rate limiting dependency: fixed 60-second window, keyed by org_id.

Uses Redis INCR+EXPIRE when REDIS_URL is configured (safe across multiple
gateway instances); falls back to an in-process store otherwise (single
instance / dev only).
"""
from fastapi import Depends, HTTPException, status

from app.core.redis_client import incr_with_ttl
from app.dependencies.auth import get_current_user

RATE_LIMIT_PER_MINUTE = 60
WINDOW_SECONDS = 60


def rate_limiter(requests_per_minute: int = RATE_LIMIT_PER_MINUTE):
    """
    Factory so different routes can apply different thresholds if needed:
        Depends(rate_limiter())            -> default 60/min
        Depends(rate_limiter(20))          -> stricter limit for expensive routes
    """

    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        key = f"ratelimit:org:{current_user['org_id']}"
        current_count = await incr_with_ttl(key, WINDOW_SECONDS)

        if current_count > requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limit_exceeded",
                    "limit_per_minute": requests_per_minute,
                    "message": "Too many requests. Please slow down and retry shortly.",
                },
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )

        return current_user

    return _check


# Convenience default dependency for the common case.
verify_org_rate_limit = rate_limiter()
