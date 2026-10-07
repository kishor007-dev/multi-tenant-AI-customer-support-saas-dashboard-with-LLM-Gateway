"""
app/routes/org.py
Organisation management routes.
"""

from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user
from app.users.role_checker import require_role
from app.dependencies.JWT import create_access_token, create_refresh_token
from app.core.roles import get_permissions, validate_role, VALID_ROLES
from app.core.security import hash_password
from app.db.collections import user_collections, refresh_tokens_collections
from app.db.invitations import invitations_collection
from app.db.organizations import organizations_collection
import asyncio
from app.services.email_service import send_invite_email
from app.services.audit_logs_service import create_audit
from app.services.subscription_service import enforce_subscription_limit

router = APIRouter(prefix="/org", tags=["Organisation"])

INVITE_TOKEN_EXPIRE_DAYS = int(os.getenv("INVITE_TOKEN_EXPIRE_DAYS", "3"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))


class InviteRequest(BaseModel):
    role:     str          = Field(..., description=f"One of: {sorted(VALID_ROLES)}")
    username: str | None   = Field(None, description="Pre-assign a username/email (optional).")


class JoinRequest(BaseModel):
    invite_token: str  = Field(..., min_length=10)
    username:     str  = Field(..., min_length=3, max_length=50)
    password:     str  = Field(..., min_length=8)


class RemoveMemberRequest(BaseModel):
    reason: str | None = None


def _generate_invite_token() -> tuple[str, str]:
    raw   = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


async def _issue_token_pair_for_new_member(user: dict, org_id: str) -> dict:
    # 🔥 Fetch the latest organization tier directly from the DB
    org = await organizations_collection.find_one({"_id": ObjectId(org_id)})
    tier = org.get("plan", "free") if org else "free"

    role        = user.get("role", "viewer")
    permissions = get_permissions(role)

    access_token = create_access_token(
        user_id     = str(user["_id"]),
        org_id      = org_id,
        role        = role,
        permissions = permissions,
        username    = user["username"],
        tier        = tier, # 🔥 Inject into JWT
    )
    refresh_token = create_refresh_token(
        user_id = str(user["_id"]),
        org_id  = org_id,
    )
    await refresh_tokens_collections.insert_one({
        "user_id": str(user["_id"]),
        "org_id":  org_id,
        "token":   refresh_token,
        "expires": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    })
    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
    }


def _serialize_user(user: dict) -> dict:
    return {
        "user_id":    str(user["_id"]),
        "username":   user["username"],
        "role":       user.get("role", "viewer"),
        "created_at": user.get("created_at", "").isoformat()
                      if isinstance(user.get("created_at"), datetime)
                      else user.get("created_at", ""),
    }


@router.post(
    "/invite",
    summary="[Admin/Owner] Generate an invitation token for a new member.",
    status_code=status.HTTP_201_CREATED,
)
async def invite_member(
    data:         InviteRequest,
    request:      Request, 
    current_user: dict = Depends(require_role(["owner", "admin"])),
):
    await enforce_subscription_limit(current_user["org_id"], "members")
    try:
        role = validate_role(data.role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if current_user["role"] == "admin" and role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot invite new owners. Only the current owner can.",
        )

    raw_token, token_hash = _generate_invite_token()

    invitation = {
        "org_id":     ObjectId(current_user["org_id"]), 
        "invited_by": current_user["user_id"],
        "username":   data.username,
        "role":       role,
        "token_hash": token_hash,
        "status":     "pending",
        "expires_at": datetime.utcnow() + timedelta(days=INVITE_TOKEN_EXPIRE_DAYS),
        "created_at": datetime.utcnow(),
    }
    await invitations_collection.insert_one(invitation)

    if data.username:
        try:
            await send_invite_email(
                to_email=data.username,
                invite_token=raw_token,
                org_name=current_user.get("org_name", "Your Organization"),
                inviter_name=current_user.get("username", "An Admin")
            )
        except Exception as e:
            print(f"⚠️ Mock Email dispatch failed: {e}")

    await create_audit(
        actor_id=current_user["user_id"],
        actor_name=current_user.get("username", "Unknown"),
        role=current_user["role"],
        org_id=current_user["org_id"],
        action="member.invited",
        resource="invitation",
        resource_id=data.username or "open_link",
        request=request
    )

    return {
        "message":      "Invitation created successfully.",
        "invite_token": raw_token,
        "role":         role,
        "expires_in":   f"{INVITE_TOKEN_EXPIRE_DAYS} days",
        "note":         "Share this token with the invitee. It is single-use.",
    }


@router.post(
    "/join",
    summary="Accept an invitation and create your member account.",
    status_code=status.HTTP_201_CREATED,
)
async def join_org(data: JoinRequest, request: Request):
    token_hash = hashlib.sha256(data.invite_token.encode()).hexdigest()
    invite     = await invitations_collection.find_one({
        "token_hash": token_hash,
        "status":     "pending",
        "expires_at": {"$gt": datetime.utcnow()},
    })
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid, expired, or has already been used.",
        )

    org_id = str(invite["org_id"])

    if invite.get("username") and invite["username"] != data.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This invitation was issued for username '{invite['username']}'. Please use that username.",
        )

    existing = await user_collections.find_one({
        "org_id":   ObjectId(org_id),
        "username": data.username,
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{data.username}' is already taken in this organisation.",
        )

    user_doc = {
        "org_id":     ObjectId(org_id),
        "username":   data.username,
        "password":   hash_password(data.password),
        "role":       invite["role"],
        "invited_by": invite.get("invited_by"),
        "created_at": datetime.utcnow(),
    }
    result        = await user_collections.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    await invitations_collection.update_one(
        {"_id": invite["_id"]},
        {"$set": {
            "status":      "accepted",
            "accepted_by": str(result.inserted_id),
            "accepted_at": datetime.utcnow(),
        }}
    )

    tokens = await _issue_token_pair_for_new_member(user_doc, org_id)

    await create_audit(
        actor_id=str(result.inserted_id),
        actor_name=data.username,
        role=invite["role"],
        org_id=org_id,
        action="member.joined",
        resource="user",
        resource_id=str(result.inserted_id),
        request=request
    )

    return {
        "message": f"Welcome! You have joined the organisation successfully.",
        "role": invite["role"],
        **tokens,
    }


@router.get(
    "/team",
    summary="[Admin/Owner] List all members in the current organisation.",
)
async def list_team(
    current_user: dict = Depends(require_role(["owner", "admin"])),
):
    cursor = user_collections.find(
        {"org_id": ObjectId(current_user["org_id"])},
        {"password": 0} 
    )
    members = await cursor.to_list(length=500)
    return {
        "org_id":  current_user["org_id"],
        "count":   len(members),
        "members": [_serialize_user(m) for m in members],
    }


@router.get("")
async def get_my_org(current_user: dict = Depends(get_current_user)):
    org = await organizations_collection.find_one({"_id": ObjectId(current_user["org_id"])})
    return {"id": current_user["org_id"], "name": org.get("name"), "slug": org.get("slug"), "plan": org.get("plan"), "settings": org.get("settings", {})}


@router.delete(
    "/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="[Owner] Remove a member from the organisation.",
)
async def remove_member(
    user_id:      str,
    request:      Request, 
    current_user: dict = Depends(require_role(["owner"])),
):
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself. Transfer ownership first.",
        )

    try:
        valid_user_id = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format."
        )

    target = await user_collections.find_one({
        "_id":    valid_user_id,
        "org_id": ObjectId(current_user["org_id"]),
    })
    
    if not target:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found in your organisation.",
        )

    await user_collections.delete_one({"_id": valid_user_id})
    await refresh_tokens_collections.delete_many({"user_id": user_id})

    await create_audit(
        actor_id=current_user["user_id"],
        actor_name=current_user.get("username", "Unknown"),
        role=current_user["role"],
        org_id=current_user["org_id"],
        action="member.removed",
        resource="user",
        resource_id=user_id,
        request=request
    )


@router.post("/upgrade")
async def simulate_payment_and_upgrade(
    payload: dict,
    # 🔥 FIX 1: Restrict this route so ONLY organization owners can trigger an upgrade
    current_user: dict = Depends(require_role(["owner"]))
):
    new_plan = payload.get("new_plan")
    
    # 🔥 FIX 2: Validate the plan string so users cannot inject fake plans
    valid_plans = ["free", "starter", "pro", "enterprise"]
    if not new_plan or isinstance(new_plan, str) and new_plan.lower() not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan selected. Must be one of {valid_plans}."
        )
        
    # Normalize to lowercase just in case
    new_plan = new_plan.lower()
    
    # Simulate 2-second payment gateway delay
    await asyncio.sleep(2.0) 
    
    # 1. Update the database
    await organizations_collection.update_one(
        {"_id": ObjectId(current_user["org_id"])},
        {"$set": {"plan": new_plan}}
    )
    
    # 2. Generate a fresh JWT with the new unlocked tier
    new_access_token = create_access_token(
        user_id=current_user["user_id"],
        org_id=current_user["org_id"],
        role=current_user["role"],
        permissions=current_user.get("permissions", []),
        username=current_user["username"],
        tier=new_plan  # 🔥 This instantly unlocks the new feature limits
    )
    
    return {
        "message": f"Successfully upgraded to {new_plan.capitalize()}",
        "new_plan": new_plan,
        "access_token": new_access_token
    }
