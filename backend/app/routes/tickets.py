"""
app/routes/tickets.py
Ticket CRUD routes isolated by Project ID.
"""

from __future__ import annotations

from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.organizations import organizations_collection 
from app.dependencies.auth import get_current_user 
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketOut,
    TicketListResponse,
    TicketStatus,
)
from app.services import ticket_service
from app.websockets.manager import manager

router = APIRouter(prefix="/tickets", tags=["tickets"])


def get_gateway_db():
    return organizations_collection.database


# -------------------------------------------------------------------
# NEW: Schema for Agent Replies
# -------------------------------------------------------------------
class AgentReplyRequest(BaseModel):
    message: str


@router.post("", response_model=TicketOut, status_code=201)
async def create_ticket(
    payload: TicketCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_gateway_db),
):
    print("🔥🔥🔥 POST /tickets CALLED 🔥🔥🔥")
    print("🔥 PAYLOAD:", payload.model_dump())
    print("🔥 PROJECT ID:", payload.project_id)

    doc = await ticket_service.create_ticket(
        db=db,
        org_id=current_user["org_id"],
        project_id=payload.project_id,
        payload=payload,
        created_by=current_user["user_id"],
    )

    print("🔥 TICKET CREATED:", doc)

    return doc


@router.get("")
async def list_tickets(
    project_id: str = Query(..., description="ID of the active project."),
    status_filter: Optional[TicketStatus] = Query(default=None, alias="status"),
    assigned_to: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_gateway_db),
):
    items, total = await ticket_service.list_tickets(
        db=db,
        org_id=current_user["org_id"],
        project_id=project_id,
        status_filter=status_filter,
        assigned_to=assigned_to,
        page=page,
        page_size=page_size,
    )
    
    formatted_items = []
    for item in items:
        if hasattr(item, "model_dump"):
            d = item.model_dump(by_alias=False)
        elif hasattr(item, "dict"):
            d = item.dict(by_alias=False)
        else:
            d = dict(item)
            
        raw_id = d.pop("_id", None) or d.get("id")
        d["id"] = str(raw_id) if raw_id else "unknown_id"
        
        formatted_items.append(d)

    return {
        "items": formatted_items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(
    ticket_id: str,
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_gateway_db),
):
    return await ticket_service.get_ticket(
        db=db, 
        org_id=current_user["org_id"],
        project_id=project_id,
        ticket_id=ticket_id
    )


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    request: Request, 
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_gateway_db), 
):
    updated_ticket = await ticket_service.update_ticket(
        db=db,
        org_id=current_user["org_id"],
        project_id=project_id,
        ticket_id=ticket_id,
        payload=payload,
        current_user=current_user, 
        request=request            
    )
    
    if payload.status:
        status_str = getattr(payload.status, "value", str(payload.status)).lower()
        if status_str in ["resolved", "closed", "completed"]:
            conversation_id = getattr(updated_ticket, "conversation_id", None)
            if conversation_id:
                await db.conversations.update_one(
                    {"_id": ObjectId(conversation_id)},
                    {"$set": {"handed_off": False}}
                )
                
    return updated_ticket


# -------------------------------------------------------------------
# NEW: Agent Reply Endpoint
# -------------------------------------------------------------------

@router.post("/{ticket_id}/reply")
async def agent_reply_to_ticket(
    ticket_id: str,
    payload: AgentReplyRequest,
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_gateway_db),
):
    ticket = await db.tickets.find_one({
        "_id": ObjectId(ticket_id),
        "org_id": current_user["org_id"],
        "project_id": project_id
    })
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found in this project")

    conversation_id = ticket.get("conversation_id")
    if not conversation_id:
        raise HTTPException(status_code=400, detail="No conversation linked to this ticket")

    new_message = {
        "role": "assistant",
        "content": payload.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_human_agent": True,
        "agent_id": current_user["user_id"] 
    }

    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$push": {"messages": new_message}}
    )

    ws_payload = {
        "type": "agent_reply",
        "conversation_id": str(conversation_id),
        "project_id": project_id,
        "message": new_message
    }
    
    await manager.broadcast_to_org(current_user["org_id"], ws_payload)

    return {"status": "success", "message": "Reply saved successfully", "data": new_message}


@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: str,
    request: Request, # 🔥 FIX 5: Accept request
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_gateway_db),
):

    await ticket_service.delete_ticket(
        db=db,
        org_id=current_user["org_id"],
        project_id=project_id,
        ticket_id=ticket_id,
        current_user=current_user,
        request=request
    )
