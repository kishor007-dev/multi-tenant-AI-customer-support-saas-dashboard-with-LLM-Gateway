from app.db.app_db import db
from datetime import datetime
from bson import ObjectId
organizations_collection=db["organizations"]
async def create_organization(data: dict):
    # check slug uniqueness
    existing = await organizations_collection.find_one({"slug": data["slug"]})
    if existing:
        raise ValueError("Organisation slug already exists")

    data["created_at"] = datetime.utcnow()
    data["status"] = "active"

    result = await organizations_collection.insert_one(data)
    data["_id"] = result.inserted_id
    return data


# ──────────────────────────────────────────────
# Get org by ID
# ──────────────────────────────────────────────

async def get_active_org_by_id(org_id: str):
    return await organizations_collection.find_one({
        "_id": ObjectId(org_id),
        "status": "active"
    })

async def get_org_by_slug(slug: str):
    return await organizations_collection.find_one({
        "slug": slug
    })
    
async def create_org_indexes():
    """
    Create indexes required for multi-tenant org system.
    Runs at startup.
    """

    # Unique slug per org (VERY IMPORTANT)
    await organizations_collection.create_index("slug", unique=True)

    # Optional: filter active orgs fast
    await organizations_collection.create_index("status")