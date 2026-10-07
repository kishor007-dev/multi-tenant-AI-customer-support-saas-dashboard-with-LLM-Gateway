from fastapi import Depends, Query, APIRouter, status
from bson import ObjectId
from app.users.role_checker import require_role
from app.db.audit_logs import audit_logs_collection
from app.services.audit_logs_service import serialize_audit

router = APIRouter(
    prefix="/audit-logs",
    tags=["audit-logs"]
)


def _org_scope(org_id: str) -> dict:
    """Match org_id whether documents stored it as a string or ObjectId."""
    values: list = [org_id]
    if ObjectId.is_valid(org_id):
        values.append(ObjectId(org_id))
    return {"org_id": {"$in": values}}


@router.get("")
async def get_audit(
    actor_id: str | None = None,
    action: str | None = None,
    resource: str | None = None,
    resource_id: str | None = None,
    limit: int = Query(20, le=99),
    skip: int = 0,
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    query = _org_scope(current_user["org_id"])

    if actor_id:
        query["actor_id"] = actor_id
    if action:
        query["action"] = action
    if resource:
        query["resource"] = resource
    if resource_id:
        query["resource_id"] = resource_id

    logs = await (
        audit_logs_collection.find(query)
        .sort("timestamp", -1)
        .skip(skip)
        .limit(limit)
        .to_list(length=limit)
    )
    return [serialize_audit(log) for log in logs]


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_audit(current_user: dict = Depends(require_role(["owner", "admin"]))):
    await audit_logs_collection.delete_many(_org_scope(current_user["org_id"]))
