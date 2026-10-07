from __future__ import annotations

from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.db.organizations import organizations_collection
from app.dependencies.auth import get_current_user
from app.schemas.ticket import TicketOut, TicketPriority
from app.websockets.manager import manager

router = APIRouter(prefix="/chat", tags=["escalation"])


def get_gateway_db():
    return organizations_collection.database


class EscalateRequest(BaseModel):
    priority: TicketPriority = TicketPriority.medium
    reason: Optional[str] = Field(default=None)


@router.post(
    "/{conversation_id}/escalate",
    response_model=TicketOut,
    status_code=201
)
async def escalate_conversation(
    conversation_id: str,
    payload: EscalateRequest = EscalateRequest(),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_gateway_db),
):
    org_id = current_user["org_id"]

    # ──────────────────────────────────────────────
    # 1. Load conversation
    # ──────────────────────────────────────────────
    convo = await db.conversations.find_one({
        "_id": ObjectId(conversation_id),
        "org_id": ObjectId(org_id)
    })

    if not convo:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found in database."
        )

    # ──────────────────────────────────────────────
    # 2. Get project_id from conversation
    # ──────────────────────────────────────────────
    project_id = convo.get("project_id")

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Conversation is missing project_id."
        )

    # ──────────────────────────────────────────────
    # 3. Build escalation description
    # ──────────────────────────────────────────────
    history = convo.get("messages", [])

    chat_summary = "\n".join([
        f"{msg.get('role', '').capitalize()}: "
        f"{msg.get('content', '')}"
        for msg in history[-3:]
    ])

    description = (
        f"Escalation reason: {payload.reason}\n\n"
        f"--- Recent Chat Context ---\n"
        f"{chat_summary}"
    )

    # ──────────────────────────────────────────────
    # 4. Create ticket
    # ──────────────────────────────────────────────
    new_ticket_id = ObjectId()
    now = datetime.now(timezone.utc)

    ticket_doc = {
        "_id": new_ticket_id,
        "id": str(new_ticket_id),
        "org_id": org_id,

        # 🔥 FIX: Save project_id
        "project_id": project_id,

        "conversation_id": conversation_id,
        "subject": "Escalation from AI Chat",
        "description": description,
        "status": "open",
        "priority": payload.priority.value,
        "created_by": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }

    print("🔥 TICKET BEING SAVED:")
    print(ticket_doc)

    await db.tickets.insert_one(ticket_doc)

    # ──────────────────────────────────────────────
    # 5. Mark conversation as handed off
    # ──────────────────────────────────────────────
    await db.conversations.update_one(
        {
            "_id": ObjectId(conversation_id),
            "org_id": ObjectId(org_id)
        },
        {
            "$set": {
                "handed_off": True,
                "updated_at": now
            }
        }
    )

    # ──────────────────────────────────────────────
    # 6. Format response
    # ──────────────────────────────────────────────
    response_doc = {
        "id": str(new_ticket_id),
        "org_id": org_id,
        "project_id": project_id,
        "conversation_id": conversation_id,
        "subject": "Escalation from AI Chat",
        "description": description,
        "status": "open",
        "priority": payload.priority.value,
        "created_by": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }

    ticket_out = TicketOut.model_validate(
        response_doc,
        from_attributes=False
    )

    # ──────────────────────────────────────────────
    # 7. Broadcast ticket
    # ──────────────────────────────────────────────
    await manager.broadcast_to_org(
        org_id,
        {
            "type": "ticket.created",
            "source": "ai_escalation",
            "ticket": ticket_out.model_dump(
                by_alias=True,
                mode="json"
            ),
        },
    )

    return ticket_out