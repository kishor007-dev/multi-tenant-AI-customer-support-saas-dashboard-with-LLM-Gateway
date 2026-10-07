"""
gateway.py
----------
The LLMGateway orchestrates everything:
  1. Resolves routing config for the tenant's tier.
  2. Attempts the primary provider.
  3. On RetryableProviderError (429 / 5xx) falls over to the secondary.
  4. Counts tokens and writes a UsageLog to MongoDB.
  5. Supports both blocking (complete) and streaming (stream) modes.
"""
from __future__ import annotations

import logging
import time
from typing import AsyncGenerator

from app.llm_gateway.base_provider import LLMResponse, RetryableProviderError, ProviderError
from app.llm_gateway.model_router import get_routing_config
from app.llm_gateway.token_tracker import count_messages_tokens, count_tokens, log_usage

# ─── AUTO-ASSEMBLY PROVIDER IMPORTS ──────────────────────────────────────────
from app.llm_gateway.providers.groq_provider import GroqProvider
from app.llm_gateway.providers.openai_provider import OpenAIProvider
from app.llm_gateway.providers.gemini_provider import GeminiProvider
# ─────────────────────────────────────────────────────────────────────────────

logger = logging.getLogger(__name__)


class LLMGateway:
    def __init__(self, provider_registry: dict | None = None, db = None):
        """
        If provider_registry is passed (e.g. during Pytest), it uses the mocks.
        If None (live server), it boots up the real engines.
        """
        if provider_registry is None:
            self._providers = {
                "groq": GroqProvider(),
                "openai": OpenAIProvider(),
                "gemini": GeminiProvider(),
            }
        else:
            self._providers = provider_registry

        self._db = db

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    async def complete(
        self,
        *,
        org_id: str,
        tier: str,
        messages: list[dict],
        user_id: str | None = None,
        conversation_id: str | None = None,
    ) -> LLMResponse:
        config = get_routing_config(tier)
        start = time.monotonic()

        response, provider_used, model_used = await self._with_failover(
            config=config,
            call=lambda p, m: p.complete(
                messages=messages,
                model=m,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
            ),
        )

        latency_ms = int((time.monotonic() - start) * 1000)

        await log_usage(
            self._db,
            org_id=org_id,
            user_id=user_id,
            provider=provider_used,
            model=model_used,
            prompt_tokens=response.prompt_tokens,
            completion_tokens=response.completion_tokens,
            total_tokens=response.total_tokens,
            latency_ms=latency_ms,
            streamed=False,
            conversation_id=conversation_id,
        )

        return response

    async def stream(
        self,
        *,
        org_id: str,
        tier: str,
        messages: list[dict],
        user_id: str | None = None,
        conversation_id: str | None = None,
    ) -> AsyncGenerator[str, None]:
        config = get_routing_config(tier)
        start = time.monotonic()

        prompt_tokens = count_messages_tokens(messages, config.primary_model)

        generator, provider_used, model_used = await self._stream_with_failover(
            config=config, messages=messages
        )

        full_content_parts: list[str] = []

        async def _tracked_stream():
            async for chunk in generator:
                full_content_parts.append(chunk)
                yield chunk

            full_text = "".join(full_content_parts)
            completion_tokens = count_tokens(full_text, model_used)
            latency_ms = int((time.monotonic() - start) * 1000)

            await log_usage(
                self._db,
                org_id=org_id,
                user_id=user_id,
                provider=provider_used,
                model=model_used,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                latency_ms=latency_ms,
                streamed=True,
                conversation_id=conversation_id,
            )

        return _tracked_stream()

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _with_failover(self, *, config, call):
        primary = self._get_provider(config.primary_provider)

        try:
            logger.info("Gateway → %s / %s", config.primary_provider, config.primary_model)
            resp = await call(primary, config.primary_model)
            return resp, config.primary_provider, config.primary_model

        except RetryableProviderError as primary_err:
            logger.warning(
                "Primary provider %s failed (%s). Trying fallback %s.",
                config.primary_provider, primary_err, config.fallback_provider,
            )

        fallback = self._get_provider(config.fallback_provider)
        try:
            resp = await call(fallback, config.fallback_model)
            return resp, config.fallback_provider, config.fallback_model
        except RetryableProviderError as fallback_err:
            raise ProviderError(
                f"Both providers failed. Primary: {config.primary_provider}. "
                f"Fallback: {config.fallback_provider} → {fallback_err}"
            ) from fallback_err

    async def _stream_with_failover(self, *, config, messages: list[dict]):
        primary = self._get_provider(config.primary_provider)

        try:
            logger.info("Gateway [stream] → %s / %s", config.primary_provider, config.primary_model)
            gen = primary.stream_complete(
                messages=messages,
                model=config.primary_model,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
            )
            first_chunk, gen = await _probe_generator(gen)
            if first_chunk is _PROBE_FAILED:
                raise RetryableProviderError("stream probe failed")

            return _prepend(first_chunk, gen), config.primary_provider, config.primary_model

        except RetryableProviderError as e:
            logger.warning(
                "Primary stream %s failed (%s). Trying fallback %s.",
                config.primary_provider, e, config.fallback_provider,
            )

        fallback = self._get_provider(config.fallback_provider)
        gen = fallback.stream_complete(
            messages=messages,
            model=config.fallback_model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
        )
        return gen, config.fallback_provider, config.fallback_model

    def _get_provider(self, name: str):
        provider = self._providers.get(name)
        if provider is None:
            raise ProviderError(f"Provider '{name}' not registered in gateway.")
        return provider


# ─────────────────────────────────────────────────────────────────────────────
# Generator utilities
# ─────────────────────────────────────────────────────────────────────────────

_PROBE_FAILED = object()


async def _probe_generator(gen) -> tuple:
    try:
        first = await gen.__anext__()
        return first, gen
    except StopAsyncIteration:
        return "", _empty_gen()
    except (RetryableProviderError, Exception):
        return _PROBE_FAILED, None


async def _empty_gen():
    return
    yield


async def _prepend(first_chunk: str, gen) -> AsyncGenerator[str, None]:
    if first_chunk:
        yield first_chunk
    async for chunk in gen:
        yield chunk
