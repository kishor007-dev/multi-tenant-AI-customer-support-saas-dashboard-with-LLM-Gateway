"""
app/routes/auth.py
Authentication routes.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user
from app.dependencies.JWT import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    safe_decode_refresh,
)
from app.core.roles import get_permissions, validate_role
from app.core.security import hash_password, verify_password
from app.db.collections import (
    refresh_tokens_collections,
    user_collections,
)
from app.db.organizations import create_organization, get_active_org_by_id, organizations_collection
from app.models.organization import OrgSettings, OrganizationCreate, Plan

router = APIRouter(prefix="/auth", tags=["Auth"])

REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))


class OwnerSignupRequest(BaseModel):
    org_name: str       = Field(..., min_length=2, max_length=80)
    org_slug: str | None = Field(None, min_length=2, max_length=40,
                                  pattern=r"^[a-z0-9\-]+$")
    plan:     Plan      = Plan.STARTER
    username: str       = Field(..., min_length=3, max_length=50)
    password: str       = Field(..., min_length=8)


class LoginRequest(BaseModel):
    org_slug: str
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


async def _issue_token_pair(user: dict, org_id: str) -> dict:
    """
    Build and store a full access + refresh token pair for a user.
    Called by both /signup/owner and /login to avoid duplication.
    """
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
        "user_id":  str(user["_id"]),
        "org_id":   org_id,
        "token":    refresh_token,
        "expires":  datetime.now(tz=timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    })

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
    }


@router.post(
    "/signup/owner",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new organisation and its owner account.",
)
async def signup_owner(data: OwnerSignupRequest):
    org_payload = OrganizationCreate(
        name     = data.org_name,
        slug     = data.org_slug,
        plan     = data.plan,
        settings = OrgSettings(),
    )

    try:
        org_doc = await create_organization({
            "name":     org_payload.name,
            "slug":     org_payload.slug,
            "plan":     org_payload.plan,
            "settings": org_payload.settings.dict(),
            "owner_id": "pending",   
        })
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    org_id = str(org_doc["_id"])

    owner_doc = {
        "org_id":     ObjectId(org_id),
        "username":   data.username,
        "password":   hash_password(data.password),
        "role":       "owner",
        "created_at": datetime.utcnow(),
    }
    try:
        result = await user_collections.insert_one(owner_doc)
    except Exception as exc:
        # 🔥 FIX: Roll back by directly deleting the orphaned organization record
        await organizations_collection.delete_one({"_id": ObjectId(org_id)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create owner user: {exc}",
        )


    owner_doc["_id"] = result.inserted_id

    await organizations_collection.update_one(
        {"_id": ObjectId(org_id)},
        {"$set": {"owner_id": str(result.inserted_id)}}
    )

    return await _issue_token_pair(owner_doc, org_id)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with org_slug + username + password.",
)
async def login(data: LoginRequest):
    invalid_creds = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid organisation, username, or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    from app.db.organizations import get_org_by_slug
    org = await get_org_by_slug(data.org_slug)
    if not org or org.get("status") != "active":
        raise invalid_creds

    org_id = str(org["_id"])

    user = await user_collections.find_one({
        "org_id":   ObjectId(org_id),
        "username": data.username,
    })
    if not user or not verify_password(data.password, user["password"]):
        raise invalid_creds

    return await _issue_token_pair(user, org_id)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate access token using a refresh token.",
)
async def refresh_access_token(data: RefreshRequest):
    payload = safe_decode_refresh(data.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired.",
        )

    user_id = payload["sub"]
    org_id  = payload["org_id"]

    token_in_db = await refresh_tokens_collections.find_one({
        "token":   data.refresh_token,
        "user_id": user_id,
    })
    if not token_in_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked. Please log in again.",
        )

    org = await get_active_org_by_id(org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your organisation is no longer active.",
        )

    user = await user_collections.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    await refresh_tokens_collections.delete_one({"token": data.refresh_token})

    return await _issue_token_pair(user, org_id)


@router.post(
    "/logout",
    summary="Revoke all refresh tokens for the current session.",
)
async def logout(current_user: dict = Depends(get_current_user)):
    await refresh_tokens_collections.delete_many({
        "user_id": current_user["user_id"],
        "org_id":  current_user["org_id"],
    })
    return {"message": "Logged out successfully. All sessions revoked."}


@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    org = await organizations_collection.find_one({"_id": ObjectId(current_user["org_id"])})
    return {
        "id": current_user["user_id"],
        "username": current_user["username"],
        "role": current_user["role"],
        "permissions": current_user["permissions"],
        "org": {"id": current_user["org_id"], "name": org.get("name"), "slug": org.get("slug"), "plan": org.get("plan")}
    }