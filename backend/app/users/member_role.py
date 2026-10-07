def get_current_user_role(project:dict,user_id:str):
    if project["owner_id"]== user_id:
        return owner
    for member in project.get("members",[]):
        if member["user_id"]==user_id:
            return member["role"]
    return None