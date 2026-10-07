from app.users.member_role import get_current_user_role
from app.db.projects import projects_collection,serialize_project
from fastapi import HTTPException,status
from datetime import datetime
from bson import ObjectId
def update_project_service(payload:dict,project_id:str,current_user:dict):
    project=projects_collection.find_one({
        "_id":ObjectId(project_id),
        "is_deleted":False
    })
    if not project:
        raise HTTPException(status_code=404,detail="projects not found")
    
    role=get_current_user_role(project,current_user["user"])
    if role not in ["owner","editor"]:
        raise HTTPException(status_code=403,detail="you have no access")
    payload["updated_at"]=datetime.utcnow()
    projects_collection.update_one(
        {"_id":ObjectId(project_id)},
        {"$set":payload}
    )
    outdated_project=project.copy()
    updated_project=projects_collection.find_one({
        "_id":ObjectId(project_id)
    })
    create_audit(
        actor_id=current_user["user"],
        actor_name=current_user["username"],
        role=current_user["role"],
        action="update",
        resource="project",
        resource_id=project_id,
        before={
            "name":project["name"],
            "description":project["description"],
            "status":project["status"]
        },
        after={"name":updated_project["name"],
            "description":updated_project["description"],
            "status":updated_project["status"]
        }
    )
    return serialize_project(updated_project)