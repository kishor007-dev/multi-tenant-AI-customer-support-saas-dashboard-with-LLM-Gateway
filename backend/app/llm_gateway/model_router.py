
"""
model_router.py
---------------
Maps tenant tiers → (primary provider/model, fallback provider/model).
Add or modify tiers here without touching the gateway logic.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

TierName = Literal["free", "pro", "enterprise"]


@dataclass(frozen=True)
class RoutingConfig:
    primary_provider: str       
    primary_model: str          
    fallback_provider: str      
    fallback_model: str         
    max_tokens: int = 2048
    temperature: float = 0.5

    # Token-budget cap per request (enforced by gateway)
    request_token_limit: int = 8192


# ──────────────────────────────────────────────────────────────────────────────
# TIER → ROUTING TABLE (Updated September 2026)
# ──────────────────────────────────────────────────────────────────────────────
TIER_ROUTING: dict[str, RoutingConfig] = {
    
    # Free Tier → Groq Only (Using their active 2026 models)
    "free": RoutingConfig(
        primary_provider="groq",
        primary_model="openai/gpt-oss-20b",      
        fallback_provider="groq",
        fallback_model="openai/gpt-oss-120b",    
        max_tokens=2048,
        request_token_limit=8192,
        temperature=0.3,
    ),

    # Pro Tier → OpenAI GPT-5.6 Terra / fallback: Groq GPT-OSS 120B
    "pro": RoutingConfig(
        primary_provider="openai",
        primary_model="gpt-5.6-terra",          
        fallback_provider="groq",
        fallback_model="openai/gpt-oss-120b",    
        max_tokens=2048,
        request_token_limit=8192,
        temperature=0.3,
    ),

    # Enterprise Tier → Gemini 3.8 Flash / fallback: OpenAI GPT-5.6 Sol
    "enterprise": RoutingConfig(
        primary_provider="gemini",
        primary_model="gemini-3.8-flash",        
        fallback_provider= "groq",#"openai"
        fallback_model="openai/gpt-oss-120b",#"gpt-5.6-sol"           
        max_tokens=4096,
        request_token_limit=16384,
        temperature=0.2,
    ),
}

# Default fallback if tenant tier is unrecognised
_DEFAULT_TIER = "free"


def get_routing_config(tier: str) -> RoutingConfig:
    """
    Return RoutingConfig for the given tier string.
    Falls back to 'free' tier if the value is unknown.
    """
    return TIER_ROUTING.get(tier.lower(), TIER_ROUTING[_DEFAULT_TIER])


def list_tiers() -> list[str]:
    return list(TIER_ROUTING.keys())
