"""
providers/groq_provider.py
--------------------------
Groq provider — uses the official `groq` async SDK.
Supports both complete() and streaming via stream_complete().
"""
from __future__ import annotations

import os
import logging
from typing import AsyncGenerator

from groq import AsyncGroq
from groq import RateLimitError, APIStatusError

from app.llm_gateway.base_provider import BaseProvider, LLMResponse, RetryableProviderError, ProviderError

logger = logging.getLogger(__name__)


class GroqProvider(BaseProvider):
    name = "groq"

    def __init__(self, api_key: str | None = None):
        self._client = AsyncGroq(api_key=api_key or os.environ["GROQ_API_KEY"],timeout=60.0)

    # ── Non-streaming ─────────────────────────────────────────────────────────

    async def complete(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        **kwargs,
    ) -> LLMResponse:
        try:
            resp = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except RateLimitError as e:
            raise RetryableProviderError(str(e), status_code=429) from e
        except APIStatusError as e:
            if e.status_code >= 500:
                raise RetryableProviderError(str(e), status_code=e.status_code) from e
            raise ProviderError(str(e)) from e

        choice = resp.choices[0]
        usage = resp.usage

        return LLMResponse(
            content=choice.message.content or "",
            model=resp.model,
            provider=self.name,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens,
            raw_meta={"finish_reason": choice.finish_reason},
        )

    # ── Streaming ─────────────────────────────────────────────────────────────

    async def stream_complete(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except RateLimitError as e:
            raise RetryableProviderError(str(e), status_code=429) from e
        except APIStatusError as e:
            if e.status_code >= 500:
                raise RetryableProviderError(str(e), status_code=e.status_code) from e
            raise ProviderError(str(e)) from e
