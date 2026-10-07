"""
app/routes/chat_routes.py
Chat routes isolated by Project ID.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict

from app.dependencies.rate_limit import verify_org_rate_limit
from app.dependencies.budget import verify_org_budget
from app.db.organizations import organizations_collection
from app.dependencies.auth import get_current_user
from app.services.chat_service import (
    chat_with_ai,
    create_conversation,
    get_conversation,
    get_conversation_history,
)
from app.services import ticket_service

router = APIRouter(prefix="/chat", tags=["Chat"])

def get_db():
    return organizations_collection.database


# ──────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────

class StartConversationRequest(BaseModel):
    project_id: str = Field(..., description="ID of the project.") # <--- Added Project ID requirement

class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)

class EscalateRequest(BaseModel):
    priority: Optional[str] = "medium"
    reason: Optional[str] = ""


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.post("/conversation", status_code=status.HTTP_201_CREATED)
async def start_conversation(
    payload: StartConversationRequest, # <--- Accept Payload
    current_user: dict = Depends(get_current_user)
):
    conversation_id = await create_conversation(
        org_id=current_user["org_id"],
        project_id=payload.project_id, # <--- Pass to Service (Update chat_service.py to accept this)
        user_id=current_user["user_id"],
    )
    return {
        "conversation_id": conversation_id,
        "org_id": current_user["org_id"],
        "project_id": payload.project_id,
    }


@router.post("/{conversation_id}", dependencies=[Depends(verify_org_rate_limit), Depends(verify_org_budget)])
async def send_message(
    conversation_id: str,
    payload: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    reply = await chat_with_ai(
        conversation_id=conversation_id,
        user_message=payload.message,
        org_id=current_user["org_id"],
        user_id=current_user["user_id"],
        tier=current_user.get("tier", "free"),
        db=db
    )
    return {"reply": reply}


def format_message(m: dict) -> dict:
    text_val = m.get("content") or m.get("text") or m.get("message") or ""
    msg_id = str(m.get("id", uuid.uuid4()))
    role = m.get("role", "user")
    
    return {
        "id": msg_id,
        "role": role,
        "content": text_val,
        "createdAt": str(m.get("created_at", datetime.now(timezone.utc).isoformat())), 
    }


@router.get("")
async def list_user_conversations(
    project_id: str = Query(..., description="ID of the active project."), # <--- Enforce Project Filtering
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    org_id_val = current_user["org_id"]
    org_filter = [org_id_val]
    if ObjectId.is_valid(org_id_val):
        org_filter.append(ObjectId(org_id_val))

    cursor = db.conversations.find(
        {
            "org_id": {"$in": org_filter},
            "project_id": project_id, # <--- Project Filter Active
            "user_id": current_user["user_id"],
            "is_deleted":{"$ne":True}
        }
    ).sort("updated_at", -1).skip(skip).limit(limit)

    convs = await cursor.to_list(length=limit)
    formatted_convs = []

    for c in convs:
        formatted_msgs = [format_message(m) for m in c.get("messages", [])]
        
        title = "New conversation"
        for m in formatted_msgs:
            if m["role"] == "user" and m["content"].strip():
                t = m["content"]
                title = t[:35] + ("..." if len(t) > 35 else "")
                break
        
        if title == "New conversation":
            dt = c.get("created_at", datetime.now(timezone.utc))
            if isinstance(dt, str):
                try:
                    dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                except Exception:
                    dt = datetime.now(timezone.utc)
            title = dt.strftime("%b %d, %I:%M %p")

        formatted_convs.append({
            "id": str(c["_id"]),
            "org_id": str(c.get("org_id", "")),
            "project_id": str(c.get("project_id", project_id)),
            "user_id": current_user["user_id"],
            "title": title,
            "msg_count": len(formatted_msgs),
            "messages": formatted_msgs, 
            "handed_off": c.get("handed_off", False),
            "created_at": str(c.get("created_at", "")),
            "updated_at": str(c.get("updated_at", "")),
        })

    return formatted_convs


@router.get("/{conversation_id}")
async def get_single_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    conv_filter = [conversation_id]
    if ObjectId.is_valid(conversation_id):
        conv_filter.append(ObjectId(conversation_id))

    org_filter = [current_user["org_id"]]
    if ObjectId.is_valid(current_user["org_id"]):
        org_filter.append(ObjectId(current_user["org_id"]))

    convo = await db.conversations.find_one({
        "_id": {"$in": conv_filter},
        "org_id": {"$in": org_filter},
    })

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    formatted_msgs = [format_message(m) for m in convo.get("messages", [])]

    return {
        "id": str(convo["_id"]),
        "org_id": str(convo.get("org_id", "")),
        "project_id": str(convo.get("project_id", "")), # <--- Display Project ID
        "user_id": convo.get("user_id", ""),
        "messages": formatted_msgs, 
        "handed_off": convo.get("handed_off", False),
        "created_at": str(convo.get("created_at", "")),
        "updated_at": str(convo.get("updated_at", "")),
    }




@router.post("/{conversation_id}/escalate", status_code=status.HTTP_201_CREATED)
async def escalate_conversation(
    conversation_id: str,
    payload: EscalateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    org_id = current_user["org_id"]

    # ──────────────────────────────────────────────
    # 1. Find the conversation
    # ──────────────────────────────────────────────
    conv = await db.conversations.find_one({
        "_id": ObjectId(conversation_id),
        "org_id": ObjectId(org_id)
    })

    if not conv:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    # ──────────────────────────────────────────────
    # 2. Get project_id directly from conversation
    # ──────────────────────────────────────────────
    project_id = conv.get("project_id")

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Conversation is missing project_id"
        )

    # ──────────────────────────────────────────────
    # 3. Mark conversation as handed off
    # ──────────────────────────────────────────────
    now = datetime.now(timezone.utc)

    await db.conversations.update_one(
        {
            "_id": ObjectId(conversation_id),
            "org_id": ObjectId(org_id)
        },
        {
            "$set": {
                "handed_off": True,
                "project_id": project_id,
                "updated_at": now
            }
        }
    )

    # ──────────────────────────────────────────────
    # 4. Create ticket through ticket_service
    # ──────────────────────────────────────────────
    ticket = await ticket_service.create_ticket_from_escalation(
        db=db,
        org_id=org_id,
        project_id=project_id,
        conversation_id=conversation_id,
        subject="Escalation from AI Chat",
        description=(
            f"Reason: {payload.reason}\n\n"
            "Automated AI handoff."
        ),
        priority=payload.priority or "medium",
    )

    # ──────────────────────────────────────────────
    # 5. Return ticket
    # ──────────────────────────────────────────────
    return {
        "id": str(ticket["_id"]),
        "org_id": org_id,
        "project_id": project_id,
        "conversation_id": conversation_id,
        "subject": ticket["subject"],
        "description": ticket["description"],
        "status": ticket["status"],
        "priority": ticket["priority"],
        "created_by": ticket["created_by"],
        "created_at": ticket["created_at"],
        "updated_at": ticket["updated_at"],
    }

@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
async def delete_single_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Soft deletes a specific conversation."""
    conv_filter = [conversation_id]
    if ObjectId.is_valid(conversation_id):
        conv_filter.append(ObjectId(conversation_id))

    org_filter = [current_user["org_id"]]
    if ObjectId.is_valid(current_user["org_id"]):
        org_filter.append(ObjectId(current_user["org_id"]))

    # Perform a soft delete by setting a flag and timestamp
    result = await db.conversations.update_one(
        {
            "_id": {"$in": conv_filter},
            "org_id": {"$in": org_filter},
            "user_id": current_user["user_id"],
            "is_deleted": {"$ne": True} # Prevents updating if already deleted
        },
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.now(timezone.utc)
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Conversation not found, already deleted, or you lack permission"
        )

    return {"message": "Conversation deleted successfully"}

EscalateRequest.model_rebuild()
