"""
WebSocket authentication.

Browsers can't set an Authorization header on a native WebSocket handshake,
so the token travels as a query param: wss://host/ws/tickets?token=<jwt>.
(If you'd rather not put the token in a URL/logs, an alternative is to accept
the connection and require the first client message to be
{"type": "auth", "token": "..."} within a short timeout — swap
`authenticate_websocket` below for that if that's the preference.)

This reuses the same JWT verification and payload shape established in
Phase 1 (org_id embedded in the token claims) — wire `decode_access_token`
below to import from your existing app.core.security module instead of
duplicating the decode logic if that module is already in the codebase.
"""


from __future__ import annotations

from dataclasses import dataclass

from fastapi import WebSocket, status

# Import the existing verify_token function from your auth file
from app.dependencies.auth import verify_token


@dataclass
class WSPrincipal:
    user_id: str
    org_id: str
    role: str | None = None


async def authenticate_websocket(websocket: WebSocket) -> WSPrincipal | None:
    """
    Validates the JWT on an incoming websocket connection *before* accept().
    Returns None (after closing the socket) on any auth failure so the
    caller can just check for None and return.
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return None

    # Use your existing auth dependency to decode the token
    payload = verify_token(token)
    
    # verify_token returns None if a JWTError occurs (expired, invalid, etc.)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
        return None

    # Extract claims based on your specific JWT payload structure
    org_id = payload.get("org_id")
    user_id = payload.get("sub") 
    role = payload.get("role")

    if not org_id or not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token missing org_id or sub")
        return None

    return WSPrincipal(user_id=str(user_id), org_id=str(org_id), role=role)
