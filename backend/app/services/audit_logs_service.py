
from datetime import datetime
from app.db.audit_logs import audit_logs_collection
from bson import ObjectId


async def create_audit(
    *,
    actor_id: str,
    actor_name: str,
    role: str,
    org_id: str,
    action: str,
    resource: str,
    resource_id: str,
    before: dict | None = None,
    after: dict | None = None,
    request = None
):
    
    await audit_logs_collection.insert_one({
        "org_id": ObjectId(org_id) if isinstance(org_id, str) else org_id,  # <-- ADDED THIS LINE
        "actor_id": actor_id,
        "actor_name": actor_name,
        "role": role,
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "before": before,
        "after": after,
        "ip_address": request.client.host if request else None,
        "user_agent": request.headers.get("user-agent") if request else None,
        "timestamp": datetime.utcnow()
    })

def sanitize(obj):
    if isinstance(obj, ObjectId):
        return str(obj)

    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [sanitize(v) for v in obj]

    return obj

def serialize_audit(log: dict) -> dict:
    timestamp = log.get("timestamp")
    if isinstance(timestamp, datetime):
        timestamp = timestamp.isoformat()

    return {
        "id": str(log["_id"]),
        "org_id": str(log["org_id"]) if log.get("org_id") else None,
        "actor_id": str(log["actor_id"]) if isinstance(log.get("actor_id"), ObjectId) else log.get("actor_id"),
        "actor_name": log.get("actor_name"),
        "action": log.get("action"),
        "resource": log.get("resource"),
        "resource_id": str(log["resource_id"]) if isinstance(log.get("resource_id"), ObjectId) else log.get("resource_id"),
        "before": sanitize(log.get("before")),
        "after": sanitize(log.get("after")),
        "ip_address": log.get("ip_address"),
        "user_agent": log.get("user_agent"),
        "timestamp": timestamp,
    }
