from datetime import datetime, timedelta
from jose import jwt, JWTError
import os

#  Load from environment (IMPORTANT)
SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key")
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_TIME = 15 # minutes
REFRESH_TOKEN_EXPIRE_DAYS = 10  # days
class TokenType:
    ACCESS="access"
    REFRESH="refresh"

def create_access_token(
    user_id: str,
    org_id: str,                 
    role: str,
    permissions: list[str],      
    username: str,
    tier: str,                   # 🔥 NEW: Accept tier as an argument
):
    payload = {
        "sub": user_id,
        "org_id": org_id,        
        "role": role,
        "permissions": permissions,
        "username": username,
        "tier": tier,            # 🔥 NEW: Inject tier into the token payload
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_TIME),
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str, org_id: str):   
    payload = {
        "sub": user_id,
        "org_id": org_id,        
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# 🔍 Decode access token
def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "access":
            raise JWTError("Invalid token type")

        return payload

    except JWTError:
        return None


# 🔍 Decode refresh token safely
def safe_decode_refresh(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "refresh":
            return None

        return payload

    except JWTError:
        return None