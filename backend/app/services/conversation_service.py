"""
Thin adapter over the `conversations` collection (owned by the LLM Gateway
service). Only what escalation needs lives here — full conversation CRUD
stays in the gateway module.

Assumed existing shape of a conversation document (from the gateway phase):
{
  "_id": ObjectId,
  "org_id": str,
  "messages": [{"role": "user" | "assistant", "content": str, "ts": datetime}, ...],
  "handed_off": bool,
  ...
}
If the gateway's actual field names differ, adjust the two functions below —
the escalation route only depends on this module's interface, not on Mongo
directly.
"""

from __future__ import annotations

from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

CONVERSATIONS_COLLECTION = "conversations"


async def get_conversation_for_org(
    db: AsyncIOMotorDatabase, org_id: str, conversation_id: str
) -> dict:
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation id")

    convo = await db[CONVERSATIONS_COLLECTION].find_one(
        {"_id": ObjectId(conversation_id), "org_id": org_id}
    )
    if not convo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return convo


async def mark_handed_off(
    db: AsyncIOMotorDatabase, org_id: str, conversation_id: str
) -> None:
    """
    Flips the conversation so the LLM gateway's message-handling path stops
    generating AI replies for it. The gateway's chat endpoint should check
    this flag before calling the model and short-circuit to "a human will
    respond shortly" if it's set.
    """
    await db[CONVERSATIONS_COLLECTION].update_one(
        {"_id": ObjectId(conversation_id), "org_id": org_id},
        {"$set": {"handed_off": True, "status": "handed_off"}},
    )


def build_escalation_summary(convo: dict, max_messages: int = 20) -> tuple[str, str]:
    """
    Extracts context from the conversation and returns (subject, description)
    for the generated ticket. Keeps it simple/deterministic (no extra LLM
    call) — the last user message becomes the subject, and a trimmed
    transcript becomes the description. Swap in an LLM summarization call
    here later if you want a tighter subject line.
    """
    messages = convo.get("messages", [])[-max_messages:]

    last_user_msg = next(
        (m["content"] for m in reversed(messages) if m.get("role") == "user"),
        "Escalated conversation",
    )
    subject = (last_user_msg[:100] + "...") if len(last_user_msg) > 100 else last_user_msg

    transcript_lines = [
        f"{m.get('role', 'unknown').upper()}: {m.get('content', '')}" for m in messages
    ]
    description = "\n".join(transcript_lines) if transcript_lines else "No transcript available."

    return subject, description
