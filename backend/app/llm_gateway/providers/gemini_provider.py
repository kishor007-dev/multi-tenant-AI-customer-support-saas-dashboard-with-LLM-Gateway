from __future__ import annotations

import os
import logging
from typing import AsyncGenerator

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.llm_gateway.base_provider import BaseProvider, LLMResponse, RetryableProviderError, ProviderError
from app.llm_gateway.token_tracker import count_tokens

logger = logging.getLogger(__name__)


def _to_gemini_messages(messages: list[dict]) -> tuple[str | None, list[types.Content]]:
    """
    Extracts system messages and strictly maps user/assistant history 
    into Google GenAI types.Content objects.
    """
    system_parts: list[str] = []
    contents: list[types.Content] = []

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            system_parts.append(content)
        elif role == "assistant":
            # 🔥 FIX: Use strict types.Content and types.Part objects instead of raw dictionaries
            contents.append(
                types.Content(role="model", parts=[types.Part.from_text(text=content)])
            )
        else:
            contents.append(
                types.Content(role="user", parts=[types.Part.from_text(text=content)])
            )

    system_text = "\n".join(system_parts) if system_parts else None
    return system_text, contents


class GeminiProvider(BaseProvider):
    name = "gemini"

    def __init__(self, api_key: str | None = None):
        self.client = genai.Client(
            api_key=api_key or os.environ["GEMINI_API_KEY"],
            http_options={"api_version": "v1"} 
        )

    def _get_config(self, max_tokens: int, temperature: float, system_instruction: str | None) -> types.GenerateContentConfig:
        config_kwargs = {
            "max_output_tokens": max_tokens,
            "temperature": temperature,
            # 🔥 FIX: Explicitly disable AFC to silence the noisy SDK warning
            "automatic_function_calling": types.AutomaticFunctionCallingConfig(disable=True)
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        return types.GenerateContentConfig(**config_kwargs)

    # ── Non-streaming ─────────────────────────────────────────────────────────

    async def complete(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        **kwargs,
    ) -> LLMResponse:
        system_text, contents = _to_gemini_messages(messages)
        config = self._get_config(max_tokens, temperature, system_text)

        try:
            resp = await self.client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except APIError as e:
            status_code = getattr(e, "code", 500)
            if status_code in (429, 503):
                raise RetryableProviderError(str(e), status_code=status_code) from e
            raise ProviderError(str(e)) from e

        content_text = resp.text or ""
        usage = getattr(resp, "usage_metadata", None)
        
        prompt_tokens = getattr(usage, "prompt_token_count", None) or count_tokens(
            " ".join(m.get("content", "") for m in messages), model
        )
        completion_tokens = getattr(usage, "candidates_token_count", None) or count_tokens(content_text, model)

        finish_reason = ""
        if getattr(resp, "candidates", None) and len(resp.candidates) > 0:
            finish_reason = str(getattr(resp.candidates[0], "finish_reason", ""))

        return LLMResponse(
            content=content_text,
            model=model,
            provider=self.name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            raw_meta={"finish_reason": finish_reason},
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
        system_text, contents = _to_gemini_messages(messages)
        config = self._get_config(max_tokens, temperature, system_text)

        try:
            stream = await self.client.aio.models.generate_content_stream(
                model=model,
                contents=contents,
                config=config,
            )
            async for chunk in stream:
                if chunk.text:
                    yield chunk.text
        except APIError as e:
            status_code = getattr(e, "code", 500)
            if status_code in (429, 503):
                raise RetryableProviderError(str(e), status_code=status_code) from e
            raise ProviderError(str(e)) from e
