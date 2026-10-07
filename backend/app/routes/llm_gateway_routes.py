"""
app/routes/llm_gateway_routes.py
LLM Gateway chat streaming route with context-aware query rewriting and strict RAG grounding scoped by project.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Annotated, Optional

import pymongo.errors
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.db.knowledge_base import kb_collections
from app.db.organizations import organizations_collection
from app.dependencies.auth import get_current_user
from app.dependencies.budget import verify_org_budget
from app.dependencies.rate_limit import verify_org_rate_limit
from app.llm_gateway.gateway import LLMGateway
from app.llm_gateway.models.usage_log import GatewayRequest

router = APIRouter(prefix="/gateway", tags=["LLM Gateway"])


def get_gateway_db():
    return organizations_collection.database


def extract_text(m) -> str:
    """Helper to extract text regardless of frontend field name."""
    if isinstance(m, dict):
        return m.get("content") or m.get("text") or m.get("message") or ""
    return (
        getattr(m, "content", None)
        or getattr(m, "text", None)
        or getattr(m, "message", None)
        or ""
    )


# ─── 1. CONTEXT-AWARE QUERY REWRITER ─────────────────────────────────────────
async def rewrite_query_with_history(
    messages: list, 
    current_query: str, 
    gateway: LLMGateway, 
    org_id: str, 
    tier: str
) -> str:
    if not messages or len(messages) <= 1:
        return current_query

    history_snippet = ""
    for m in messages[-4:-1]:
        role = m.get("role", "user")
        content = m.get("content") or m.get("text") or m.get("message") or ""
        history_snippet += f"{role}: {content}\n"

    rewrite_prompt = [
        {
            "role": "system",
            "content": (
                "Given a conversation history and a user's follow-up message, rewrite the message "
                "into a standalone search query that preserves all relevant subject matter and entity names. "
                "Output ONLY the rewritten search query and nothing else."
            )
        },
        {
            "role": "user",
            "content": f"History:\n{history_snippet}\nLatest Message: {current_query}\nStandalone Query:"
        }
    ]

    try:
        rewritten = await gateway.complete(
            org_id=org_id,
            tier=tier,
            messages=rewrite_prompt,
            user_id="system_rewriter",
            conversation_id=None
        )
        
        # 🔥 FIX: Safely extract just the text string instead of stringifying the object
        extracted = extract_text(rewritten)
        query_text = extracted.strip() if extracted else current_query
            
        return query_text if query_text else current_query
    except Exception as e:

        print(f"Rewrite error: {e}")
        return current_query


# ─── 2. BLOCKING CHAT ────────────────────────────────────────────────────────
@router.post("/chat", summary="Blocking Gateway Chat")
async def blocking_chat(
    payload: GatewayRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    db=Depends(get_gateway_db),
    org_rate_limit: dict = Depends(verify_org_rate_limit),
    org_budget: dict = Depends(verify_org_budget),
):
    try:
        gateway = LLMGateway(db=db)
        messages_dict = [
            m.model_dump() if hasattr(m, "model_dump") else m.dict() if hasattr(m, "dict") else m
            for m in payload.messages
        ]

        llm_response = await gateway.complete(
            org_id=current_user["org_id"],
            tier=current_user.get("tier", "free"),
            messages=messages_dict,
            user_id=current_user["user_id"],
            conversation_id=getattr(payload, "conversation_id", None),
        )

        # prompt_tokens = (
        #     llm_response.get("usage", {}).get("prompt_tokens", 0)
        #     if isinstance(llm_response, dict)
        #     else 100
        # )
        # completion_tokens = (
        #     llm_response.get("usage", {}).get("completion_tokens", 0)
        #     if isinstance(llm_response, dict)
        #     else 50
        # )
        # cost = 0.002

        # await db.UsageLogs.insert_one({
        #     "org_id": current_user["org_id"],
        #     "project_id": getattr(payload, "project_id", "default"), # <-- Added project logging
        #     "prompt_tokens": prompt_tokens,
        #     "completion_tokens": completion_tokens,
        #     "cost": cost,
        #     "created_at": datetime.now(timezone.utc),
        # })

        return llm_response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# ─── 3. STREAMING CHAT WITH RAG & PERSISTENCE ───────────────────────────────
@router.post("/chat/stream", summary="SSE Streaming Gateway Chat with RAG")
async def streaming_chat(
    payload: GatewayRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    db=Depends(get_gateway_db),
    org_rate_limit: dict = Depends(verify_org_rate_limit),
    org_budget: dict = Depends(verify_org_budget),
):
    try:
        from app.db.chat import conversations_collection
    except ImportError:
        conversations_collection = db.conversations

    user_query = ""
    if hasattr(payload, "message") and payload.message:
        user_query = payload.message
    elif hasattr(payload, "query") and payload.query:
        user_query = payload.query
    elif hasattr(payload, "messages") and payload.messages:
        for m in reversed(payload.messages):
            d = m.model_dump() if hasattr(m, "model_dump") else (m if isinstance(m, dict) else m.dict())
            if d.get("role") == "user":
                text = d.get("content") or d.get("text") or d.get("message") or ""
                if text:
                    user_query = text
                    break
                    
    if not getattr(payload, "conversation_id", None):
        raise HTTPException(status_code=400, detail="conversation_id is required.")

    # Get Project ID from payload payload (fallback to empty if not provided)
    project_id = getattr(payload, "project_id", "")

    conv_id = str(payload.conversation_id)
    conv_filters = [conv_id]
    if ObjectId.is_valid(conv_id):
        conv_filters.append(ObjectId(conv_id))
        
    db_query = {"_id": {"$in": conv_filters}}

    timestamp = datetime.now(timezone.utc).isoformat()
    if user_query:
        res = await conversations_collection.update_one(
            db_query,
            {
                "$push": {
                    "messages": {
                        "role": "user",
                        "content": user_query,
                        "text": user_query,
                        "message": user_query,
                        "user_id": current_user["user_id"],
                        "created_at": timestamp,
                    }
                },
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    async def event_generator():
        from app.services.retrieval_service import retrieve_context_string
        
        gateway = LLMGateway(db=db)
        messages_dict = [
            m.model_dump() if hasattr(m, "model_dump") else m.dict() if hasattr(m, "dict") else m 
            for m in getattr(payload, "messages", [])
        ]

        search_query = await rewrite_query_with_history(
            messages=messages_dict,
            current_query=user_query,
            gateway=gateway,
            org_id=current_user["org_id"],
            tier=current_user.get("tier", "free")
        )

        # 🔥 STRICT PROJECT ISOLATION HERE
        context = await retrieve_context_string(
            query=search_query, 
            org_id=current_user["org_id"], 
            project_id=project_id, # <--- PASSED TO SERVICE
            k=5
        )

        system_prompt = (
            "You are a strict data-lookup assistant. Your ONLY job is to answer questions using the provided Knowledge Base context.\n"
            "CRITICAL RULES:\n"
            "1. Rely exclusively on the facts explicitly stated in the Knowledge Base context below.\n"
            "2. If the answer cannot be found entirely within the context, you must state: 'I cannot find that information in the knowledge base.'\n"
            "3. NEVER use outside knowledge, assumptions, or prior historical data (do not guess past stats or external info).\n"
            "4.For greetings, pleasantries, or general conversational remarks (like 'hi', 'hello', 'thanks'), respond politely and offer assistance.\n"
        )
        if context:
            system_prompt += f"\n\n--- KNOWLEDGE BASE CONTEXT ---\n{context}\n-----------------------------"

        llm_messages = [{"role": "system", "content": system_prompt}] + messages_dict

        stream_gen = await gateway.stream(
            org_id=current_user["org_id"],
            tier=current_user.get("tier", "free"),
            messages=llm_messages,
            user_id=current_user["user_id"],
            conversation_id=conv_id,
        )

        full_assistant_response = ""
        try:
            async for token in stream_gen:
                full_assistant_response += token
                yield f"data: {token}\n\n"
        finally:
            if full_assistant_response:
                ai_timestamp = datetime.now(timezone.utc).isoformat()
                async def save_ai_turn():
                    await conversations_collection.update_one(
                        db_query,
                        {
                            "$push": {
                                "messages": {
                                    "role": "assistant",
                                    "content": full_assistant_response,
                                    "text": full_assistant_response,
                                    "message": full_assistant_response,
                                    "created_at": ai_timestamp,
                                }
                            },
                            "$set": {"updated_at": datetime.now(timezone.utc)},
                        },
                    )
                asyncio.create_task(save_ai_turn())

    return StreamingResponse(event_generator(), media_type="text/event-stream")
