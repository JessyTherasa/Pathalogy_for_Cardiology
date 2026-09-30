"""
CardioEvidence — WebSocket Real-Time Streaming Layer
Manages WebSocket connections and broadcasts events to connected clients.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, List, Any, Optional
import json

router = APIRouter(
    prefix="/ws",
    tags=["websocket"],
)


class ConnectionManager:
    """Manages active WebSocket connections, including per-case subscriptions."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.case_subscriptions: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, case_id: Optional[str] = None):
        """Accept and register a WebSocket connection, optionally subscribing to a case."""
        await websocket.accept()
        self.active_connections.append(websocket)
        if case_id:
            if case_id not in self.case_subscriptions:
                self.case_subscriptions[case_id] = set()
            self.case_subscriptions[case_id].add(websocket)

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket from all active connections and subscriptions."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        # Remove from all case subscriptions
        for case_id, sockets in list(self.case_subscriptions.items()):
            sockets.discard(websocket)
            if not sockets:
                del self.case_subscriptions[case_id]

    async def broadcast(self, message: dict):
        """Send a message to ALL connected clients."""
        data = json.dumps(message)
        dead = []
        for ws in list(self.active_connections):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def broadcast_to_case(self, case_id: str, message: dict):
        """Send a message only to clients subscribed to the given case_id."""
        if case_id not in self.case_subscriptions:
            return
        data = json.dumps(message)
        dead = []
        for ws in list(self.case_subscriptions[case_id]):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# Module-level singleton — imported by ingestion.py, simulator.py, etc.
manager = ConnectionManager()


async def broadcast_event(event_data: dict):
    """Helper called by ingestion endpoints after saving events."""
    await manager.broadcast(event_data)


# ── REST endpoint ──────────────────────────────────────────────────────────────

@router.get("/stats")
def get_ws_stats():
    """Return active connection count and subscription map (no auth required)."""
    return {
        "active_connections": len(manager.active_connections),
        "subscriptions": {k: len(v) for k, v in manager.case_subscriptions.items()},
    }


# ── WebSocket endpoints ────────────────────────────────────────────────────────

@router.websocket("/events")
async def websocket_events(websocket: WebSocket, case_id: Optional[str] = None):
    """
    General event stream — any client can connect.
    Pass ?case_id=CASE-xxxx to also receive per-case broadcasts.
    """
    await manager.connect(websocket, case_id=case_id)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "CardioEvidence real-time stream active",
        }))
        # Keep alive loop — handles ping/pong and client messages
        while True:
            data = await websocket.receive_text()
            # Echo back ping messages
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.websocket("/case/{case_id}")
async def websocket_case(websocket: WebSocket, case_id: str):
    """
    Case-specific event stream — subscribes to broadcasts for a single case.
    """
    await manager.connect(websocket, case_id=case_id)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "case_id": case_id,
            "message": f"Subscribed to real-time events for {case_id}",
        }))
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
