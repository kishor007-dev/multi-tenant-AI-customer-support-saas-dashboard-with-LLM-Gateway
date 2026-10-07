from fastapi import Depends,HTTPException,status
from app.auth.dependencies import get_current_user
def require_permission(permission:str):
    def checker(current_user=Depends(get_current_user)):
        if permission not in current_user["permissions"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="permission denied"
            )
        return current_user
    return checker