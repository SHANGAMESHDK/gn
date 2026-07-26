from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

router = APIRouter(
    prefix="/obsync",
    tags=["OBSync"]
)

# Connection Manager for Walkie Talkie Channels
class ConnectionManager:
    def __init__(self):
        # Format: { "channel_id": [ (WebSocket, username), ... ] }
        self.active_connections: Dict[str, List[tuple]] = {}

    async def connect(self, websocket: WebSocket, channel: str, username: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append((websocket, username))
        await self.broadcast_status(channel)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel] = [conn for conn in self.active_connections[channel] if conn[0] != websocket]
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    async def broadcast_status(self, channel: str):
        if channel in self.active_connections:
            users = [username for _, username in self.active_connections[channel]]
            message = json.dumps({"type": "channel_status", "users": users})
            for connection, _ in self.active_connections[channel]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

    async def broadcast_audio(self, channel: str, sender_ws: WebSocket, sender_name: str, audio_data: bytes):
        if channel in self.active_connections:
            meta = json.dumps({"type": "incoming_audio", "speaker": sender_name})
            for connection, _ in self.active_connections[channel]:
                if connection != sender_ws:
                    try:
                        await connection.send_text(meta)
                        await connection.send_bytes(audio_data)
                    except Exception:
                        pass

    async def broadcast_talking_status(self, channel: str, sender_ws: WebSocket, sender_name: str, is_talking: bool):
        if channel in self.active_connections:
            msg = json.dumps({"type": "talking_status", "speaker": sender_name, "is_talking": is_talking})
            for connection, _ in self.active_connections[channel]:
                if connection != sender_ws:
                    try:
                        await connection.send_text(msg)
                    except Exception:
                        pass

manager = ConnectionManager()

@router.websocket("/ws/{channel}/{username}")
async def websocket_endpoint(websocket: WebSocket, channel: str, username: str):
    await manager.connect(websocket, channel, username)
    try:
        while True:
            # We can receive text (status) or bytes (audio)
            message = await websocket.receive()
            if "text" in message:
                try:
                    data = json.loads(message["text"])
                    if data.get("type") == "talking_status":
                        await manager.broadcast_talking_status(channel, websocket, username, data.get("is_talking", False))
                except json.JSONDecodeError:
                    pass
            elif "bytes" in message:
                # Received audio blob
                await manager.broadcast_audio(channel, websocket, username, message["bytes"])
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
        await manager.broadcast_status(channel)
    except Exception as e:
        manager.disconnect(websocket, channel)
