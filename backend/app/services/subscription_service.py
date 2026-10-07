"""
app/services/subscription_service.py
Centralized multi-tenant subscription tier & quota enforcement.
"""

from __future__ import annotations

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status

from app.db.collections import db, user_collections
from app.db.invitations import invitations_collection
from app.db.organizations import organizations_collection
from app.db.projects import projects_collection

# Define tier limits (Now includes monthly LLM tokens)
TIER_LIMITS = {
    "starter": {"members": 3, "projects": 1, "kb_docs": 5, "monthly_tokens": 10_000},
    "free": {"members": 3, "projects": 1, "kb_docs": 5, "monthly_tokens": 10_000},
    "pro": {"members": 15, "projects": 10, "kb_docs": 50, "monthly_tokens": 500_000},
    "enterprise": {"members": 9999, "projects": 9999, "kb_docs": 9999, "monthly_tokens": 99_999_999},
}


def _id_filters(val: str | ObjectId) -> list:
    """Matches both raw strings and ObjectIds in MongoDB."""
    filters = [str(val)]
    if ObjectId.is_valid(str(val)):
        filters.append(ObjectId(str(val)))
    return filters


async def enforce_subscription_limit(org_id: str | ObjectId, resource_type: str) -> bool:
    """
    Counts existing resources and blocks creation with HTTP 403 if the plan limit is reached.
    Supported resource_types: 'members', 'projects', 'kb_docs'
    """
    org_oid = ObjectId(str(org_id)) if ObjectId.is_valid(str(org_id)) else str(org_id)
    org_filters = _id_filters(org_id)

    # 1. Fetch organization and active plan
    org = await organizations_collection.find_one({"_id": {"$in": org_filters}})
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    plan = str(org.get("plan", "starter")).lower()
    limits = TIER_LIMITS.get(plan, TIER_LIMITS["starter"])
    max_allowed = limits.get(resource_type, 0)

    # 2. Calculate real-time counts
    current_count = 0

    if resource_type == "projects":
        current_count = await projects_collection.count_documents({
            "org_id": {"$in": org_filters},
            "is_deleted": {"$ne": True},
        })

    elif resource_type == "members":
        # Active users + pending invitations count toward member seats
        active_users = await user_collections.count_documents({"org_id": {"$in": org_filters}})
        pending_invites = await invitations_collection.count_documents({
            "org_id": {"$in": org_filters},
            "status": "pending",
        })
        current_count = active_users + pending_invites

    elif resource_type == "kb_docs":
        # Distinct document titles or files stored for this org
        distinct_docs = await db["knowledge_base"].distinct("title", {"org_id": {"$in": org_filters}})
        current_count = len(distinct_docs)

    else:
        raise ValueError(f"Unknown resource type: {resource_type}")

    # 3. Reject if limit reached
    if current_count >= max_allowed:
        resource_label = resource_type.replace("_", " ")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Plan limit reached: The '{plan.title()}' tier permits a maximum of "
                f"{max_allowed} {resource_label}. Current count: {current_count}. "
                f"Please upgrade your subscription to add more."
            ),
        )

    return True


async def enforce_token_budget(org_id: str | ObjectId, estimated_tokens: int = 1000) -> bool:
    """
    Validates if the organization has exceeded its monthly LLM token budget.
    Raises 429 Too Many Requests if the budget is breached.
    """
    org_filters = _id_filters(org_id)
    org = await organizations_collection.find_one({"_id": {"$in": org_filters}})
    
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    plan = str(org.get("plan", "starter")).lower()
    limits = TIER_LIMITS.get(plan, TIER_LIMITS["starter"])
    max_tokens = limits.get("monthly_tokens",10000)

    # Establish the current billing period (Start of current month)
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Sum up all prompt and completion tokens used this month
    pipeline = [
        {"$match": {
            "org_id": {"$in": org_filters}, 
            "created_at": {"$gte": start_of_month}
        }},
        {"$group": {
            "_id": None,
            "total_prompt": {"$sum": "$prompt_tokens"},
            "total_completion": {"$sum": "$completion_tokens"}
        }}
    ]
    
    result = await db["UsageLogs"].aggregate(pipeline).to_list(length=1)
    
    current_usage = 0
    if result:
        current_usage = result[0].get("total_prompt", 0) + result[0].get("total_completion", 0)

    # Block if current usage + estimated new tokens exceeds limit
    if current_usage + estimated_tokens > max_tokens:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Monthly token budget exceeded. Your '{plan.title()}' plan allows a maximum "
                f"of {max_tokens:,} tokens per month, but you have consumed {current_usage:,}. "
                f"Please upgrade your plan to continue using AI features."
            )
        )
    return True
