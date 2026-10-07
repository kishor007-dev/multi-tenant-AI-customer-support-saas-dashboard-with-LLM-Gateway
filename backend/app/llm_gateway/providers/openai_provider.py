
"""
providers/openai_provider.py
----------------------------
OpenAI provider — uses the official `openai` async SDK.
"""
from __future__ import annotations

import os
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI
from openai import RateLimitError, APIStatusError

from app.llm_gateway.base_provider import BaseProvider, LLMResponse, RetryableProviderError, ProviderError

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseProvider):
    name = "openai"

    def __init__(self, api_key: str | None = None):
        # Added explicit timeouts and max_retries to prevent infinite network hangs
        self._client = AsyncOpenAI(
            api_key=api_key or os.environ["OPENAI_API_KEY"],
            timeout=30.0,
            max_retries=2
        )

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
        except Exception as e:
            raise ProviderError(f"OpenAI connection failed: {str(e)}") from e

        choice = resp.choices[0]
        usage = resp.usage

        return LLMResponse(
            content=choice.message.content or "",
            model=resp.model,
            provider=self.name,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens,
            raw_meta={"finish_reason": choice.finish_reason, "system_fingerprint": resp.system_fingerprint},
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
        except Exception as e:
            raise ProviderError(f"OpenAI connection failed: {str(e)}") from e
