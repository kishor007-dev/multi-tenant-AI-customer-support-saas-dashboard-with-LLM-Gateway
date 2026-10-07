"""
base_provider.py
----------------
Abstract contract every LLM provider must satisfy.
Keeps the gateway provider-agnostic.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncGenerator


@dataclass
class LLMResponse:
    """Normalised response returned by every provider."""
    content: str
    model: str
    provider: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    # Raw provider response metadata (for debugging / auditing)
    raw_meta: dict = field(default_factory=dict)


class ProviderError(Exception):
    """Raised when a provider call fails (non-retryable)."""


class RetryableProviderError(Exception):
    """
    Raised on 429 (rate-limit) or 5xx errors.
    The gateway will catch this and attempt the fallback provider.
    """
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class BaseProvider(ABC):
    """
    All providers must implement both `complete` (blocking) and
    `stream_complete` (async-generator that yields text chunks).
    """

    # Set by each subclass, e.g. "groq", "openai", "anthropic", "gemini"
    name: str = "base"

    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        **kwargs,
    ) -> LLMResponse:
        """Return a complete LLMResponse (non-streaming)."""

    @abstractmethod
    async def stream_complete(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """
        Yield raw text chunks as they arrive from the provider.
        The gateway accumulates them for token tracking after the stream ends.
        """
