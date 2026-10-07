# from fastapi.security import OAuth2PasswordBearer
# from fastapi import Depends,HTTPException
# from jose import jwt,JWTError
# from auth.JWT import SECRET_KEY,ALGORITHM
# oauth2_scheme=OAuth2PasswordBearer(tokenUrl="/login")
# def get_current_user(token:str=Depends(oauth2_scheme)):
#     try:
#         payload=jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
#         user_id=payload.get("sub")
#         if not user_id:
#             raise HTTPException(status_code=401)
#         return user_id
#     except JWTError:
#         raise HTTPException(status_code=401,details="invalid or expired token")

# from fastapi import Depends, HTTPException, status
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from jose import JWTError, jwt
# from app.auth.JWT import SECRET_KEY,ALGORITHM

# bearer_scheme = HTTPBearer()

# def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
#     token = credentials.credentials
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         user_id=payload.get("sub")
#         role=payload.get("role")
#         org_id=payload.get("org_id")
#         permissions=payload.get("permissions")
#         username=payload.get("username")
#         if user_id is None or role is None or permissions is None:
#             raise HTTPException(status_code=401,detail="invalid credentials")
#         return{"user":user_id,"role":role,"permissions":permissions,"username":username}
#     except JWTError:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
# def verify_token(token:str):
#     try:
#         return jwt.decode(token,SECRET_KEY,algorithms=ALGORITHM)
#     except JWTError:
#         return None

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.dependencies.JWT import SECRET_KEY, ALGORITHM, TokenType


bearer_scheme = HTTPBearer()


# ──────────────────────────────────────────────
# Get current user (MAIN dependency)
# ──────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Extract fields
        user_id     = payload.get("sub")
        org_id      = payload.get("org_id")
        role        = payload.get("role")
        permissions = payload.get("permissions")
        username    = payload.get("username")
        token_type  = payload.get("type")
        tier = payload.get("tier","free")

        # 🔒 Validate token type (IMPORTANT)
        if token_type != TokenType.ACCESS:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

        # Validate required fields
        if not all([user_id, org_id, role, permissions]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        return {
            "user_id":     user_id,
            "org_id":      org_id,
            "role":        role,
            "permissions": permissions,
            "username":    username,
            "tier":tier
        }

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ──────────────────────────────────────────────
# Optional helper (used in some places)
# ──────────────────────────────────────────────

def verify_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ──────────────────────────────────────────────
# Role-based access control helper
# ──────────────────────────────────────────────

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user

    return role_checker