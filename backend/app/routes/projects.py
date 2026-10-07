"""
app/routes/projects.py
Project CRUD – fully patched for multi-tenancy and subscription limits.
"""

from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies.auth import get_current_user
from app.users.role_checker import require_role
from app.db.project_members import project_members_collection
from app.db.projects import projects_collection, serialize_project
from app.models.project import ProjectCreate, ProjectOut, ProjectUpdate
from app.services.audit_logs_service import create_audit
from app.services.updateservice import update_project_service
from app.services.subscription_service import enforce_subscription_limit # 🔥 NEW IMPORT

router = APIRouter(prefix="/projects", tags=["Projects"])

def _org_filter(current_user: dict) -> dict:
    return {"org_id": ObjectId(current_user["org_id"])}

@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    data:         ProjectCreate,
    request:      Request,
    current_user: dict = Depends(get_current_user),
):
    """Create a new project scoped to the caller's organisation."""
    
    # 🔒 TIER ENFORCEMENT
    await enforce_subscription_limit(current_user["org_id"], "projects")

    project = {
        "org_id":      ObjectId(current_user["org_id"]),
        "name":        data.name,
        "description": data.description,
        "owner_id":    ObjectId(current_user["user_id"]),
        "created_at":  datetime.utcnow(),
        "updated_at":  datetime.utcnow(),
        "is_deleted":  False,
        "status":      "active",
    }
    result = await projects_collection.insert_one(project)
    project["_id"] = result.inserted_id

    members_to_insert = [{
        "org_id":     ObjectId(current_user["org_id"]),
        "project_id": project["_id"],
        "user_id":    current_user["user_id"],
        "role":       "owner",
        "added_at":   datetime.utcnow(),
    }]

    for m in data.members:
        if m.user_id and m.user_id != "string":
            from app.db.collections import user_collections
            member_exists = await user_collections.find_one({
                "_id":    ObjectId(m.user_id),
                "org_id": ObjectId(current_user["org_id"]),
            })
            if not member_exists:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"User '{m.user_id}' does not belong to your organisation.",
                )
            members_to_insert.append({
                "org_id":     ObjectId(current_user["org_id"]),
                "project_id": project["_id"],
                "user_id":    m.user_id,
                "role":       m.role,
                "added_at":   datetime.utcnow(),
            })

    if members_to_insert:
        await project_members_collection.insert_many(members_to_insert)

    members = await project_members_collection.find(
        {"project_id": project["_id"]}
    ).to_list(length=200)
    project["members"] = members

    await create_audit(
        actor_id    = current_user["user_id"],
        actor_name  = current_user["username"],
        role        = current_user["role"],
        org_id      = current_user["org_id"],
        action      = "create",
        resource    = "project",
        resource_id = str(project["_id"]),
        after       = {"name": project["name"], "status": project["status"]},
        request     = request,
    )

    return serialize_project(project)


@router.get("/", response_model=list[ProjectOut])
async def get_projects(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {
            "$match": {
                **_org_filter(current_user),
                "is_deleted": False,
            }
        },
        {
            "$lookup": {
                "from":         "project_members",
                "localField":   "_id",
                "foreignField": "project_id",
                "as":           "members",
            }
        },
    ]
    projects = await projects_collection.aggregate(pipeline).to_list(length=500)
    return [serialize_project(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id:   str,
    current_user: dict = Depends(get_current_user),
):
    pipeline = [
        {
            "$match": {
                **_org_filter(current_user),
                "_id":        ObjectId(project_id),
                "is_deleted": False,
            }
        },
        {
            "$lookup": {
                "from":         "project_members",
                "localField":   "_id",
                "foreignField": "project_id",
                "as":           "members",
            }
        },
    ]
    results = await projects_collection.aggregate(pipeline).to_list(length=1)

    if not results:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project not found or you do not have access to it.",
        )

    return serialize_project(results[0])


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id:   str,
    payload:      ProjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    # 1. Verify the project exists and belongs to this organization
    project = await projects_collection.find_one({
        "org_id": ObjectId(current_user["org_id"]),
        "_id": ObjectId(project_id),
        "is_deleted": False,
    })

    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project not found or you do not have access to it.",
        )

    # 2. Extract only the fields the user actually wants to update
    update_data = payload.dict(exclude_unset=True)
    if not update_data:
        # If nothing was sent to update, just return the existing project
        return await get_project(project_id, current_user)

    update_data["updated_at"] = datetime.utcnow()

    # 3. Apply the updates directly to the database
    await projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": update_data}
    )

    # 4. Fetch and return the updated project using your existing lookup function
    return await get_project(project_id, current_user)



@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id:   str,
    request:      Request,
    current_user: dict = Depends(get_current_user),
):
    project = await projects_collection.find_one({
        **_org_filter(current_user),
        "_id":        ObjectId(project_id),
        "is_deleted": False,
    })

    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project not found or you do not have access to it.",
        )

    is_project_owner = str(project["owner_id"]) == current_user["user_id"]
    is_org_admin     = current_user["role"] in ("owner", "admin")

    if not (is_project_owner or is_org_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner or an org admin can delete this project.",
        )

    await projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {
            "is_deleted": True,
            "updated_at": datetime.utcnow(),
        }}
    )

    await create_audit(
        actor_id    = current_user["user_id"],
        actor_name  = current_user["username"],
        role        = current_user["role"],
        org_id      = current_user["org_id"],
        action      = "soft_delete",
        resource    = "project",
        resource_id = project_id,
        before      = {"is_deleted": False},
        after       = {"is_deleted": True},
        request     = request,
    )