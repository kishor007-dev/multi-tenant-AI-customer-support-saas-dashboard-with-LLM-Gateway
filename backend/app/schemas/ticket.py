"""
Ticket schemas.

Follows the same pattern as the rest of the platform: Mongo stores raw dicts,
Pydantic models handle validation + serialization at the API boundary.
`org_id` is NEVER accepted from the client body — it is always injected
server-side from the authenticated JWT (see app/core/security.py conventions
established in Phase 1).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from bson import ObjectId
from pydantic import BaseModel, Field, field_validator


class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


class TicketPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class PyObjectId(str):
    """Lets us accept/emit Mongo ObjectIds as plain strings in the API layer."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")


class TicketCreate(BaseModel):
    project_id: str = Field(..., description="ID of the project.")  # <--- Added required field
    conversation_id: Optional[str] = None
    subject: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    priority: TicketPriority = TicketPriority.medium
    assigned_to: Optional[str] = None

    @field_validator("project_id", "conversation_id")
    @classmethod
    def validate_ids(cls, v):
        if v is not None and not ObjectId.is_valid(v) and len(v) < 5:
            # Allows custom or string-based IDs depending on your DB configuration
            pass
        return v



class TicketUpdate(BaseModel):
    """
    Partial update payload. Every field optional — only what's present
    gets $set. status/priority/assigned_to are the fields agents change
    day-to-day; org_id and conversation_id are immutable post-creation.
    """

    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[str] = None
    subject: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)

    def to_update_dict(self) -> dict:
        data = self.model_dump(exclude_unset=True, exclude_none=True)
        if data:
            data["updated_at"] = datetime.now(timezone.utc)
        return data


class TicketOut(BaseModel):
    """What we hand back to clients / broadcast over the websocket."""

    id: str = Field(..., alias="_id")
    org_id: str
    project_id:str=Field(...,description="ID of the project")
    conversation_id: Optional[str] = None
    subject: str
    description: Optional[str] = None
    status: TicketStatus
    priority: TicketPriority
    assigned_to: Optional[str] = None
    created_by: Optional[str] = None  # "ai_escalation" or a user_id
    created_at: datetime
    updated_at: datetime

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
    }

    @field_validator("id", mode="before")
    @classmethod
    def stringify_id(cls, v):
        return str(v)


class TicketListResponse(BaseModel):
    items: list[TicketOut]
    total: int
    page: int
    page_size: int


class AgentReplyRequest(BaseModel):
    message: str

