"""
/ws/tickets — real-time ticket dashboard feed.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.websockets.manager import manager
from app.dependencies.JWT import decode_token  

logger = logging.getLogger("ticket_service.ws_tickets")

router = APIRouter()

PING_INTERVAL_SECONDS = 30

@router.websocket("/ws/tickets")
async def ws_tickets(websocket: WebSocket):
    # 1. Accept the connection immediately to listen for the auth frame
    await websocket.accept()

    try:
        # 2. Wait up to 5 seconds for the client to send their JWT
        auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
        token = auth_message.get("token")
        
        if not token:
            raise ValueError("Token missing in auth message")

        # 3. 🔒 SECURE VERIFICATION: Verify signature, don't just base64 decode!
        payload = decode_token(token)
        if not payload:
            raise ValueError("Invalid or expired token")

        org_id = payload.get("org_id")
        user_id = payload.get("sub", "unknown")

        if not org_id:
            raise ValueError("Token missing org_id")
    except WebSocketDisconnect:
        # 🔒 Catch React Strict Mode's instant disconnects gracefully
        logger.info("WS Auth Aborted: Client disconnected before sending token.")
        return
    except asyncio.TimeoutError:
        logger.warning("WS Auth Failed: Timeout waiting for auth frame")
        await websocket.close(code=1008, reason="Auth timeout")
        return
    except (ValueError, JWTError) as e:
        logger.warning(f"WS Auth Failed: {e}")
        await websocket.close(code=1008, reason="Authentication failed")
        return

    logger.info(f"WS Connected! Org: {org_id}, User: {user_id}")
    
    # 4. Register connection. 
    await manager.connect(org_id, websocket)

    try:
        while True:
            try:
                message = await asyncio.wait_for(
                    websocket.receive_text(), timeout=PING_INTERVAL_SECONDS
                )
                if message == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "keepalive"})
    except WebSocketDisconnect:
        logger.info("client disconnected org_id=%s user_id=%s", org_id, user_id)
    except Exception as e:
        logger.exception("unexpected error on ws for org_id=%s: %s", org_id, str(e))
    finally:
        await manager.disconnect(org_id, websocket)
