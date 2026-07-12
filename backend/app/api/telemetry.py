from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
import json
import random
import string
from typing import Dict
from pathlib import Path

router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry"]
)

class LocationPing(BaseModel):
    device_id: str
    lat: float
    lng: float

class ShareRequest(BaseModel):
    name: str
    reg_no: str
    admin_code: str

FRIEND_SESSIONS_JSON = Path(__file__).resolve().parents[2] / "app" / "data" / "friend_sessions.json"

def get_friend_sessions():
    if FRIEND_SESSIONS_JSON.exists():
        with open(FRIEND_SESSIONS_JSON, "r") as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}

def save_friend_sessions(data):
    FRIEND_SESSIONS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(FRIEND_SESSIONS_JSON, "w") as f:
        json.dump(data, f, indent=4)

# In-memory store for active devices
# Format: { "device_id": { "lat": 13.0, "lng": 80.0, "timestamp": 1690000000 } }
active_devices: Dict[str, dict] = {}

# Time to live for a device ping (in seconds)
# Devices that haven't pinged in 15 minutes are considered inactive
TTL_SECONDS = 900 

@router.post("/location")
def update_location(ping: LocationPing):
    active_devices[ping.device_id] = {
        "lat": ping.lat,
        "lng": ping.lng,
        "timestamp": time.time()
    }
    return {"status": "success"}

@router.get("/heatmap")
def get_heatmap():
    current_time = time.time()
    
    # Clean up stale devices
    stale_keys = [k for k, v in active_devices.items() if current_time - v["timestamp"] > TTL_SECONDS]
    for k in stale_keys:
        del active_devices[k]
        
    # Build GeoJSON FeatureCollection
    features = []
    for device_id, data in active_devices.items():
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [data["lng"], data["lat"]]
            },
            "properties": {
                "device_id": device_id,
                "weight": 1.0  # Used for heatmap intensity
            }
        })
    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.post("/share")
def share_location(req: ShareRequest):
    # Validate admin code
    from app.api.admin import load_settings
    settings = load_settings()
    if req.admin_code != settings.get("friendsync_security_code"):
        raise HTTPException(status_code=403, detail="Invalid security code. Please check with an administrator.")

    data = get_friend_sessions()
    
    # Generate 6-char alphanumeric code
    letters_and_digits = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choice(letters_and_digits) for i in range(6))
        if code not in data:
            break
            
    data[code] = {
        "name": req.name,
        "reg_no": req.reg_no,
        "created_at": time.time()
    }
    
    save_friend_sessions(data)
    
    return {"code": code}

@router.get("/friend/{code}")
def get_friend_location(code: str):
    code = code.upper()
    sessions = get_friend_sessions()
    
    if code not in sessions:
        raise HTTPException(status_code=404, detail="Invalid tracking code.")
        
    friend_info = sessions[code]
    
    # Check if they are broadcasting
    if code not in active_devices:
        raise HTTPException(status_code=404, detail="Friend is not currently broadcasting their location.")
        
    device_data = active_devices[code]
    
    # Check TTL
    if time.time() - device_data["timestamp"] > TTL_SECONDS:
        raise HTTPException(status_code=404, detail="Friend's location signal is lost.")
        
    return {
        "name": friend_info["name"],
        "lat": device_data["lat"],
        "lng": device_data["lng"],
        "timestamp": device_data["timestamp"]
    }

@router.get("/validate/{code}")
def validate_code(code: str):
    code = code.upper()
    sessions = get_friend_sessions()
    if code not in sessions:
        raise HTTPException(status_code=404, detail="Invalid tracking code.")
    return {"valid": True, "name": sessions[code]["name"]}

@router.get("/active_friends")
def get_active_friends():
    current_time = time.time()
    sessions = get_friend_sessions()
    
    # Clean up stale devices
    stale_keys = [k for k, v in active_devices.items() if current_time - v["timestamp"] > TTL_SECONDS]
    for k in stale_keys:
        del active_devices[k]
        
    active_list = []
    for device_id, data in active_devices.items():
        if device_id in sessions:
            active_list.append({
                "code": device_id,
                "name": sessions[device_id]["name"],
                "lat": data["lat"],
                "lng": data["lng"],
                "timestamp": data["timestamp"]
            })
            
    return {"friends": active_list}
