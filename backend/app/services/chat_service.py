"""
app/services/chat_service.py
AI chat service – LLM Gateway integrated, multi-tenancy preserved.

What changed vs. original
──────────────────────────
• Removed direct Groq API client and imports.
• chat_with_ai now accepts `tier` and `db` arguments.
• LLM Gateway dynamically handles model routing (Groq vs OpenAI) based on tier.
• Token usage and cost are extracted and logged to db.UsageLogs.
• AI message persistence now saves the dynamic model name used by the Gateway.
"""

from __future__ import annotations

import os
import json
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.chat import conversations_collection    # Motor async collection
from app.services.retrieval_service import retrieve_context_string
from app.llm_gateway.gateway import LLMGateway      # New Gateway Service
from app.websockets.manager import manager as websocket_manager
from typing import AsyncGenerator

MAX_HISTORY = int(os.getenv("CHAT_MAX_HISTORY_TURNS", "10"))  # turns kept in context

# ──────────────────────────────────────────────
# Conversation management
# ──────────────────────────────────────────────

async def create_conversation(org_id: str, project_id: str, user_id: str) -> str:
    """Create a new empty conversation document scoped to a project."""
    doc = {
        "org_id":     ObjectId(org_id) if ObjectId.is_valid(org_id) else org_id,
        "project_id": project_id,  # <--- Added project scoping
        "user_id":    user_id,
        "messages":   [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await conversations_collection.insert_one(doc)
    return str(result.inserted_id)



async def get_conversation(conversation_id: str, org_id: str) -> dict:
    """
    Fetch a conversation, verifying it belongs to this org.
    """
    conv = await conversations_collection.find_one({
        "_id":    ObjectId(conversation_id),
        "org_id": ObjectId(org_id),        # ← cross-org guard
    })
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conversation not found or you do not have access to it.",
        )
    return conv


async def get_conversation_history(
    org_id:  str,
    user_id: str,
    limit:   int = 20,
    skip:    int = 0,
) -> list[dict]:
    """
    Return the caller's conversations within the org.
    """
    # Removed {"messages": 0} projection so we can read message counts and titles!
    cursor = conversations_collection.find(
        {
            "org_id":  ObjectId(org_id),
            "user_id": user_id,
        }
    ).sort("updated_at", -1).skip(skip).limit(limit)

    convs = await cursor.to_list(length=limit)
    return [_serialize_conversation(c) for c in convs]


# ──────────────────────────────────────────────
# Core chat function (LLM Gateway Integrated)
# ──────────────────────────────────────────────


async def chat_with_ai(
    conversation_id: str,
    user_message:    str,
    org_id:          str,
    user_id:         str,
    tier:            str,      # ← Injected from route
    db                         # ← Injected from route for Gateway & Logging
) -> str:
    """
    Run one chat turn:
      1. Verify + load the conversation (org-scoped).
      1b. SHORT-CIRCUIT: Check if handed over to a human agent.
      2. Retrieve RAG context from the org's KB.
      3. Build the LLM prompt.
      4. Call LLM Gateway (Routes based on tier).
      5. Log Token Usage to Analytics.
      6. Persist both turns.
      7. Return the AI reply.
    """

    # ── Step 1: Load conversation (org-scoped) ─────────────────────────
    conv = await get_conversation(conversation_id, org_id)
    project_id = conv.get("project_id", "")

    
    # ── Step 1b: THE SHORT-CIRCUIT ─────────────────────────────────────
    # If a human has taken over, block AI generation.
    if conv.get("handed_off") is True:
        timestamp = datetime.utcnow().isoformat()
        
        # 1. We STILL need to save the user's message so the agent can read it!
        await conversations_collection.update_one(
            {
                "_id": ObjectId(conversation_id),
                "org_id": ObjectId(org_id),
            },
            {
                "$push": {
                    "messages": {
                        "role": "user",
                        "content": user_message,
                        "user_id": user_id,
                        "created_at": timestamp,
                    }
                },
                "$set": {"updated_at": datetime.utcnow()},
            }
        )
        
                # -------------------------------------------------------------------
        # 🚀 NEW ADDITION FOR POINT 2: BROADCAST TO AGENT VIA WEBSOCKETS
        # -------------------------------------------------------------------
        ws_payload = {
            "event": "new_user_message",
            "conversation_id": conversation_id,
            "message": {
                "role": "user",
                "content": user_message,
                "created_at": timestamp
            }
        }
        
        # Call your specific manager here. It might look like one of these:
        await websocket_manager.broadcast_to_org(org_id, ws_payload) 
        # OR
        # await websocket_manager.send_personal_message(ws_payload, agent_id)
        # -------------------------------------------------------------------


        # Immediately exit the function without calling the LLM
        return "A human agent has taken over this chat. Please wait for their reply."

    # Proceed normally if not handed off...
    history: list[dict] = conv.get("messages", [])

    # ── Step 2: RAG – retrieve org-specific KB context ─────────────────
    kb_context = await retrieve_context_string(
        query  = user_message,
        org_id = org_id,
        project_id=project_id,
        k      = 5,
    )
    print("\n" + "🚀"*20)
    print(f"USER QUERY: {user_message}")
    print(f"RAG CONTEXT FOUND:\n{kb_context}")
    print("🚀"*20 + "\n")
    # ── Step 3: Build the LLM message list ────────────────────────────
    system_prompt = (
        "You are a helpful AI customer support assistant. "
        "Answer questions based on the provided knowledge base context. "
        "If the answer is not in the context, say you don't know.\n\n"
    )
    if kb_context:
        system_prompt += f"=== Knowledge Base Context ===\n{kb_context}\n==========================="

    recent_history = [
        {
            "role": msg["role"],
            "content": msg["content"]
        }
        for msg in history[-(MAX_HISTORY * 2):]
    ]

    messages_for_llm = [
        {"role": "system", "content": system_prompt},
        *recent_history,
        {"role": "user", "content": user_message},
    ]

    # ── Step 4: Call LLM Gateway ───────────────────────────────────────
    gateway = LLMGateway(db=db)
    
    llm_response = await gateway.complete(
        org_id=org_id,
        tier=tier,
        messages=messages_for_llm,
        user_id=user_id,
        conversation_id=conversation_id
    )

    # 🔥 FIX: Extract directly from your Gateway's LLMResponse object
    if hasattr(llm_response, "content"):
        # Matches the object seen in your Swagger UI
        ai_reply = llm_response.content
        dynamic_model_used = getattr(llm_response, "model", "gateway-model")
        prompt_tokens = getattr(llm_response, "prompt_tokens", 0)
        completion_tokens = getattr(llm_response, "completion_tokens", 0)
    elif isinstance(llm_response, dict) and "choices" in llm_response:
        # Fallback just in case it ever returns a raw OpenAI/Groq dict
        ai_reply = llm_response["choices"][0]["message"]["content"]
        dynamic_model_used = llm_response.get("model", "gateway-model")
        prompt_tokens = llm_response.get("usage", {}).get("prompt_tokens", 0)
        completion_tokens = llm_response.get("usage", {}).get("completion_tokens", 0)
    else:
        # Absolute fallback
        ai_reply = str(llm_response)
        dynamic_model_used = "gateway-model"
        prompt_tokens = 0
        completion_tokens = 0

    # ── Step 5: Log Token Usage to Analytics ───────────────────────────
    cost = 0.002 # Update with your exact pricing logic

    await db.UsageLogs.insert_one({
        "org_id": org_id,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "cost": cost,
        "created_at": datetime.now(timezone.utc)
    })

    # ── Step 6: Persist both the user message and AI reply ─────────────
    new_turns = [
        {
            "role":       "user",
            "content":    user_message,
            "user_id":    user_id,
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "role":       "assistant",
            "content":    ai_reply,
            "model":      dynamic_model_used, # Now saves the exact model the Gateway picked
            "created_at": datetime.utcnow().isoformat(),
        },
    ]

    await conversations_collection.update_one(
        {
            "_id":    ObjectId(conversation_id),
            "org_id": ObjectId(org_id),    # ← cross-org write guard
        },
        {
            "$push":  {"messages": {"$each": new_turns}},
            "$set":   {"updated_at": datetime.utcnow()},
        }
    )

    # ── Step 7: Return the AI reply ────────────────────────────────────
    return ai_reply


# ──────────────────────────────────────────────
# Serializer
# ──────────────────────────────────────────────

def _serialize_conversation(conv: dict) -> dict:
    messages = conv.get("messages", [])
    
    # Generate a dynamic title from the user's first message if available
    title = "New conversation"
    for m in messages:
        if m.get("role") == "user":
            text_val = m.get("content") or m.get("text") or m.get("message") or ""
            if text_val:
                title = text_val[:30] + ("..." if len(text_val) > 30 else "")
            break

    return {
        "id":         str(conv["_id"]),
        "org_id":     str(conv.get("org_id", "")),
        "project_id":str(conv.get("project_id","")),
        "user_id":    conv.get("user_id", ""),
        "title":      title,         # ✅ Sends the dynamic title to the sidebar
        "msg_count":  len(messages), # ✅ Sends the real message count
        "created_at": conv["created_at"].isoformat()
                      if isinstance(conv.get("created_at"), datetime)
                      else conv.get("created_at", ""),
        "updated_at": conv["updated_at"].isoformat()
                      if isinstance(conv.get("updated_at"), datetime)
                      else conv.get("updated_at", ""),
    }


async def stream_chat_with_ai(
    conversation_id: str,
    user_message:    str,
    org_id:          str,
    project_id:      str,  # <--- ADDED HERE in the parameters
    user_id:         str,
    tier:            str,
    db
) -> AsyncGenerator[str, None]:
    """
    Streaming version of chat_with_ai.
    Respects human handoff, uses Vector RAG, streams the LLM, and persists history.
    """
    # ── Step 1: Load conversation ──────────────────────────────────────
    conv = await get_conversation(conversation_id, org_id)
    
    # ── Step 1b: THE SHORT-CIRCUIT (Human Handoff) ─────────────────────
    if conv.get("handed_off") is True:
        timestamp = datetime.utcnow().isoformat()
        
        # Save user message
        await conversations_collection.update_one(
            {"_id": ObjectId(conversation_id), "org_id": ObjectId(org_id)},
            {
                "$push": {"messages": {"role": "user", "content": user_message, "user_id": user_id, "created_at": timestamp}},
                "$set": {"updated_at": datetime.utcnow()},
            }
        )
        
        # Broadcast to agent
        ws_payload = {
            "event": "new_user_message",
            "conversation_id": conversation_id,
            "message": {"role": "user", "content": user_message, "created_at": timestamp}
        }
        await websocket_manager.broadcast_to_org(org_id, ws_payload) 
        
        # Yield static message and exit
        handoff_msg = "A human agent has taken over this chat. Please wait for their reply."
        yield f"data: {handoff_msg}\n\n"
        return

    # ── Step 2: Vector RAG – retrieve org-specific KB context ──────────
    # 🔥 UPDATED HERE: Now passes project_id to ensure strict isolation
    kb_context = await retrieve_context_string(
        query      = user_message, 
        org_id     = org_id, 
        project_id = project_id, 
        k          = 5
    )
    
    # ── Step 3: Build the LLM message list ─────────────────────────────
    system_prompt = (
        "You are a helpful AI customer support assistant. "
        "Answer questions based on the provided knowledge base context. "
        "If the answer is not in the context, say you don't know.\n\n"
    )
    if kb_context:
        system_prompt += f"=== Knowledge Base Context ===\n{kb_context}\n==========================="

    history: list[dict] = conv.get("messages", [])
    recent_history = [{"role": msg["role"], "content": msg["content"]} for msg in history[-(MAX_HISTORY * 2):]]

    messages_for_llm = [
        {"role": "system", "content": system_prompt},
        *recent_history,
        {"role": "user", "content": user_message},
    ]

    # ── Step 4: Stream from LLM Gateway ────────────────────────────────
    gateway = LLMGateway(db=db)
    stream_gen = await gateway.stream(
        org_id=org_id,
        tier=tier,
        messages=messages_for_llm,
        user_id=user_id,
        conversation_id=conversation_id
    )

    prompt_tokens = 0 # Can be calculated based on prompt length if needed
    completion_tokens = 0
    full_ai_reply = ""

    # Yield tokens to the frontend
    async for token in stream_gen:
        completion_tokens += 1
        full_ai_reply += token
        yield f"data: {token}\n\n"

    # ── Step 5: Log Usage & Persist ────────────────────────────────────
    await db.UsageLogs.insert_one({
        "org_id": org_id,
        "project_id": project_id, # <--- Also good to log usage by project!
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "cost": 0.002,
        "created_at": datetime.now(timezone.utc)
    })

    new_turns = [
        {"role": "user", "content": user_message, "user_id": user_id, "created_at": datetime.utcnow().isoformat()},
        {"role": "assistant", "content": full_ai_reply, "model": "gateway-model", "created_at": datetime.utcnow().isoformat()},
    ]

    await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id), "org_id": ObjectId(org_id)},
        {"$push": {"messages": {"$each": new_turns}}, "$set": {"updated_at": datetime.utcnow()}}
    )
