"""
Ticket service — all Mongo access for tickets lives here, never in the route
handlers. Every query/update is scoped by org_id at the query level (not just
checked after the fact) so there is no code path where a cross-tenant read
is even expressible.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.ticket import TicketCreate, TicketUpdate, TicketStatus
from app.services.audit_logs_service import create_audit # Adjust this import path if needed


COLLECTION = "tickets"


def _oid(id_str: str) -> ObjectId:
    if not ObjectId.is_valid(id_str):
        raise HTTPException(status_code=400, detail="Invalid ticket id")
    return ObjectId(id_str)


def _id_filters(val: str) -> list:
    """Helper to handle String vs ObjectId mismatches safely."""
    filters = [val]
    if ObjectId.is_valid(val):
        filters.append(ObjectId(val))
    return filters


async def create_ticket(
    db: AsyncIOMotorDatabase,
    org_id: str,
    project_id: str,
    payload: TicketCreate,
    created_by: str,
) -> dict:
    now = datetime.now(timezone.utc)
    doc = {
        "org_id": org_id,
        "project_id": project_id,
        "conversation_id": payload.conversation_id,
        "subject": payload.subject,
        "description": payload.description,
        "status": TicketStatus.open.value,
        "priority": payload.priority.value,
        "assigned_to": payload.assigned_to,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def list_tickets(
    db: AsyncIOMotorDatabase,
    org_id: str,
    project_id: str,
    status_filter: Optional[TicketStatus] = None,
    assigned_to: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    # 🔥 Flexible filters to prevent String vs ObjectId mismatches
    query: dict = {
        "org_id": {"$in": _id_filters(org_id)},
        "project_id": {"$in": _id_filters(project_id)}
    }
    
    if status_filter:
        query["status"] = status_filter.value
    if assigned_to:
        query["assigned_to"] = assigned_to

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    skip = (page - 1) * page_size

    cursor = (
        db[COLLECTION]
        .find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
    )
    items = [doc async for doc in cursor]
    total = await db[COLLECTION].count_documents(query)
    return items, total


async def get_ticket(
    db: AsyncIOMotorDatabase, org_id: str, project_id: str, ticket_id: str
) -> dict:
    doc = await db[COLLECTION].find_one({
        "_id": _oid(ticket_id),
        "org_id": {"$in": _id_filters(org_id)},
        "project_id": {"$in": _id_filters(project_id)},
    })
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return doc


async def update_ticket(
    db: AsyncIOMotorDatabase, 
    org_id: str, 
    project_id: str, 
    ticket_id: str, 
    payload: TicketUpdate,
    current_user: dict, # 🔥 Added to capture the user making the change
    request=None
) -> dict:
    update_data = payload.to_update_dict()
    if not update_data:
        return await get_ticket(db, org_id, project_id, ticket_id)
        
    result = await db[COLLECTION].find_one_and_update(
        {
            "_id": _oid(ticket_id),
            "org_id": {"$in": _id_filters(org_id)},
            "project_id": {"$in": _id_filters(project_id)},
        },
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    # 🔥 AUDIT LOG: Log the ticket update
    await create_audit(
        actor_id=current_user["user_id"],
        actor_name=current_user.get("username", "Unknown"),
        role=current_user.get("role", "member"),
        org_id=org_id,
        action="ticket.updated",
        resource="ticket",
        resource_id=ticket_id,
        after=update_data,
        request=request
    )
    
    return result


async def delete_ticket(
    db: AsyncIOMotorDatabase, 
    org_id: str, 
    project_id: str, 
    ticket_id: str,
    current_user: dict, # 🔥 Added to capture the user making the change
    request=None
) -> bool:
    """Deletes a ticket permanently and logs the action."""
    result = await db[COLLECTION].delete_one({
        "_id": _oid(ticket_id),
        "org_id": {"$in": _id_filters(org_id)},
        "project_id": {"$in": _id_filters(project_id)}
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    # 🔥 AUDIT LOG: Log the ticket deletion
    await create_audit(
        actor_id=current_user["user_id"],
        actor_name=current_user.get("username", "Unknown"),
        role=current_user.get("role", "member"),
        org_id=org_id,
        action="ticket.deleted",
        resource="ticket",
        resource_id=ticket_id,
        request=request
    )
    
    return True


async def create_ticket_from_escalation(
    db: AsyncIOMotorDatabase,
    org_id: str,
    project_id: str,
    conversation_id: str,
    subject: str,
    description: str,
    priority: str = "medium",
) -> dict:
    now = datetime.now(timezone.utc)
    doc = {
        "org_id": org_id,
        "project_id": project_id,
        "conversation_id": conversation_id,
        "subject": subject,
        "description": description,
        "status": TicketStatus.open.value,
        "priority": priority,
        "assigned_to": None,
        "created_by": "ai_escalation",
        "created_at": now,
        "updated_at": now,
    }

    print("🔥 TICKET DOCUMENT BEFORE INSERT:")
    print(doc)
    print("🔥 PROJECT ID:", project_id)

    result = await db[COLLECTION].insert_one(doc)

    print("🔥 INSERTED TICKET ID:", result.inserted_id)

    doc["_id"] = result.inserted_id

    return doc
