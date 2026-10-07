"""
ConnectionManager for the real-time ticket dashboard.

Design notes:
- Connections are grouped by org_id so a broadcast never has to fan out
  further than "this tenant's currently-open dashboards".
- We keep a plain dict[str, set[WebSocket]] in-process. This is fine for a
  single-instance deployment; the moment this service runs on more than one
  node, broadcasts need to go through a shared pub/sub (Redis Pub/Sub is the
  natural fit here, and is already on the Phase 6 stack list) instead of an
  in-memory dict, since two org members could be connected to two different
  instances. Flagging that here so it's not a surprise later.
- All mutation of the connection map happens under an asyncio.Lock to avoid
  races between concurrent connects/disconnects.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketState

logger = logging.getLogger("ticket_service.websockets")


class ConnectionManager:
    def __init__(self) -> None:
        # org_id -> set of live websocket connections for that org
        self._connections: dict[str, set[WebSocket]] = {}
        self._lock = None  # created lazily to bind to the running event loop

    def _ensure_lock(self):
        import asyncio

        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def connect(self, org_id: str, websocket: WebSocket) -> None:
        # ❌ REMOVED: await websocket.accept() - It is now handled securely in the route!
        lock = self._ensure_lock()
        async with lock:
            self._connections.setdefault(org_id, set()).add(websocket)
        logger.info("ws connected org_id=%s total_for_org=%d", org_id, len(self._connections[org_id]))

    async def disconnect(self, org_id: str, websocket: WebSocket) -> None:
        lock = self._ensure_lock()
        async with lock:
            conns = self._connections.get(org_id)
            if conns and websocket in conns:
                conns.discard(websocket)
                if not conns:
                    self._connections.pop(org_id, None)
        logger.info("ws disconnected org_id=%s", org_id)

    async def broadcast_to_org(self, org_id: str, payload: dict[str, Any]) -> None:
        """
        Send `payload` (JSON-serialized) to every live connection for org_id.
        Dead sockets encountered along the way are pruned instead of raising.
        """
        lock = self._ensure_lock()
        async with lock:
            conns = list(self._connections.get(org_id, ()))

        if not conns:
            return

        message = json.dumps(payload, default=str)
        stale: list[WebSocket] = []

        for ws in conns:
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_text(message)
                else:
                    stale.append(ws)
            except Exception:
                logger.warning("failed to send to a websocket for org_id=%s, pruning", org_id)
                stale.append(ws)

        if stale:
            async with lock:
                live = self._connections.get(org_id)
                if live:
                    for ws in stale:
                        live.discard(ws)
                    if not live:
                        self._connections.pop(org_id, None)

    def connection_count(self, org_id: str) -> int:
        return len(self._connections.get(org_id, ()))


# Single shared instance for the process. Imported by both the websocket
# route (to register/unregister connections) and the escalation route
# (to broadcast new tickets).
manager = ConnectionManager()
