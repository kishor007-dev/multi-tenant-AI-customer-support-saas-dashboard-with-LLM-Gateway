from app.db.app_db import db
from bson import ObjectId
projects_collection=db["projects"]
def serialize_project(project):
    return{
        "id":str(project["_id"]),
        "name":project["name"],
        "description":project.get("description"),
        "owner_id":str(project["owner_id"]),
        "created_at":project["created_at"],
        "members": [
            {
                "user_id": m["user_id"],
                "role": m["role"]
            }
            for m in project.get("members", [])
        ]
    }    
    