"""
token_tracker.py
----------------
- Counts tokens using tiktoken (OpenAI-compatible) or a fast estimator.
- Persists a UsageLog document to MongoDB after every gateway call.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import tiktoken

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Encoding selection
# ──────────────────────────────────────────────────────────────────────────────

# OpenAI model names that tiktoken can resolve directly
_TIKTOKEN_SUPPORTED_PREFIXES = ("gpt-", "text-", "davinci", "curie", "babbage", "ada")

# One shared encoder for non-OpenAI models (cl100k is a good approximation)
_FALLBACK_ENCODING = "cl100k_base"


def _get_encoder(model: str) -> tiktoken.Encoding:
    """Return the best tiktoken encoding for a given model name."""
    for prefix in _TIKTOKEN_SUPPORTED_PREFIXES:
        if model.startswith(prefix):
            try:
                return tiktoken.encoding_for_model(model)
            except KeyError:
                break
    # LLaMA / Gemini / Claude – cl100k_base is a reasonable approximation
    return tiktoken.get_encoding(_FALLBACK_ENCODING)


def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """Count tokens in a plain string for the given model."""
    try:
        enc = _get_encoder(model)
        return len(enc.encode(text))
    except Exception:  # pragma: no cover
        # Last-resort: 1 token ≈ 4 chars
        return max(1, len(text) // 4)


def count_messages_tokens(messages: list[dict], model: str = "gpt-4o-mini") -> int:
    """
    Count tokens for a list of chat messages.
    Uses OpenAI's documented formula: every message costs 4 overhead tokens.
    """
    try:
        enc = _get_encoder(model)
        total = 3  # priming tokens
        for msg in messages:
            total += 4  # role + separator overhead
            for value in msg.values():
                if isinstance(value, str):
                    total += len(enc.encode(value))
        return total
    except Exception:
        raw = " ".join(m.get("content", "") for m in messages if isinstance(m.get("content"), str))
        return max(1, len(raw) // 4)


# ──────────────────────────────────────────────────────────────────────────────
# MongoDB persistence
# ──────────────────────────────────────────────────────────────────────────────

async def log_usage(
    db,  # Motor AsyncIOMotorDatabase
    *,
    org_id: str,
    user_id: str | None,
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    latency_ms: int,
    streamed: bool,
    conversation_id: str | None = None,
    extra: dict | None = None,
) -> str:
    """
    Insert a UsageLog document and return its inserted_id as a string.

    Collection schema (UsageLogs):
    ─────────────────────────────
    {
      _id:                ObjectId,
      org_id:             str,       ← tenant scope
      user_id:            str | null,
      provider:           str,       ← "groq" | "openai" | "anthropic" | "gemini"
      model:              str,
      prompt_tokens:      int,
      completion_tokens:  int,
      total_tokens:       int,
      latency_ms:         int,
      streamed:           bool,
      conversation_id:    str | null,
      created_at:         datetime,
      extra:              dict       ← any additional metadata
    }
    """
    doc = {
        "org_id": org_id,
        "user_id": user_id,
        "provider": provider,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "latency_ms": latency_ms,
        "streamed": streamed,
        "conversation_id": conversation_id,
        "created_at": datetime.now(timezone.utc),
        "extra": extra or {},
    }
    result = await db["UsageLogs"].insert_one(doc)
    logger.debug(
        "UsageLog inserted | org=%s provider=%s model=%s tokens=%d",
        org_id, provider, model, total_tokens,
    )
    return str(result.inserted_id)


# ──────────────────────────────────────────────────────────────────────────────
# MongoDB index helper  (call once at app startup)
# ──────────────────────────────────────────────────────────────────────────────

async def ensure_usage_log_indexes(db) -> None:
    """Create indexes required for efficient usage queries."""
    col = db["UsageLogs"]
    await col.create_index([("org_id", 1), ("created_at", -1)])
    await col.create_index([("org_id", 1), ("provider", 1)])
    await col.create_index("user_id")
    await col.create_index("conversation_id")
    logger.info("UsageLogs indexes ensured.")
