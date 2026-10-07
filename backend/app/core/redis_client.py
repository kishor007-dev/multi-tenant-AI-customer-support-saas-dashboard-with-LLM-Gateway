"""
Shared Redis connection pool.

Falls back to an in-process dict-based store if REDIS_URL is not set —
useful for local dev / tests, but NOT safe for multi-instance production
deployments (rate limit state won't be shared across pods).
"""
import os
import time
from typing import Optional

REDIS_URL = os.getenv("REDIS_URL")

_redis = None
if REDIS_URL:
    import redis.asyncio as redis
    _redis = redis.from_url(REDIS_URL, decode_responses=True)


class _InMemoryStore:
    """Minimal fallback shim implementing just what we need (INCR + TTL)."""

    def __init__(self):
        self._counters: dict[str, tuple[int, float]] = {}  # key -> (count, expires_at)

    async def incr_with_ttl(self, key: str, ttl_seconds: int) -> int:
        now = time.time()
        count, expires_at = self._counters.get(key, (0, 0.0))
        if now >= expires_at:
            count, expires_at = 0, now + ttl_seconds
        count += 1
        self._counters[key] = (count, expires_at)
        return count


_fallback = _InMemoryStore()


async def incr_with_ttl(key: str, ttl_seconds: int) -> int:
    """
    Atomically increments `key` and ensures it expires after `ttl_seconds`
    (only set on first creation, mirroring a fixed-window rate limit).
    Returns the new count.
    """
    if _redis is None:
        return await _fallback.incr_with_ttl(key, ttl_seconds)

    # Redis pipeline: INCR then, only if this was the first hit, EXPIRE.
    pipe = _redis.pipeline()
    pipe.incr(key)
    result = await pipe.execute()
    count = result[0]
    if count == 1:
        await _redis.expire(key, ttl_seconds)
    return count


def get_redis():
    return _redis
