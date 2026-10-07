"""
models/usage_log.py
--------------------
Pydantic schemas for:
  - UsageLog   → mirrors the MongoDB UsageLogs document
  - GatewayRequest  → what clients POST to /gateway/complete or /gateway/stream
  - GatewayResponse → non-streaming response body
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────────────
# MongoDB document schema
# ──────────────────────────────────────────────────────────────────────────────

class UsageLog(BaseModel):
    """Read model — returned by the usage analytics endpoint."""
    id: str = Field(..., alias="_id")
    org_id: str
    project_id: str | None = None  # <--- ADDED: Track token usage by project
    user_id: str | None = None
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    streamed: bool
    conversation_id: str | None = None
    created_at: datetime
    extra: dict = Field(default_factory=dict)

    class Config:
        populate_by_name = True


# ──────────────────────────────────────────────────────────────────────────────
# Chat message schema  (subset of OpenAI spec)
# ──────────────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


# ──────────────────────────────────────────────────────────────────────────────
# Gateway request / response
# ──────────────────────────────────────────────────────────────────────────────

class GatewayRequest(BaseModel):
    project_id: str = Field(default="", description="ID of the active project") # <--- ADDED: Tells the AI which RAG KB to search
    messages: list[ChatMessage] = Field(..., min_length=1)
    conversation_id: str | None = None

    # Optional overrides (ignored for Free tier)
    max_tokens: int | None = Field(default=None, ge=1, le=16384)
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)

    def to_provider_messages(self) -> list[dict]:
        return [{"role": m.role, "content": m.content} for m in self.messages]


class GatewayResponse(BaseModel):
    content: str
    model: str
    provider: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    conversation_id: str | None = None
    usage_log_id: str | None = None  # inserted _id from UsageLogs


# ──────────────────────────────────────────────────────────────────────────────
# Usage analytics query / response
# ──────────────────────────────────────────────────────────────────────────────

class UsageSummary(BaseModel):
    """Aggregated usage for an org over a period."""
    org_id: str
    project_id: str | None = None # <--- ADDED: Allow analytics filtering by project
    total_requests: int
    total_tokens: int
    total_prompt_tokens: int
    total_completion_tokens: int
    by_provider: dict[str, int]   # provider → total_tokens
    by_model: dict[str, int]      # model    → total_tokens
