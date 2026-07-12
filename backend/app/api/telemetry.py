from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
from typing import Dict

router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry"]
)

class LocationPing(BaseModel):
    device_id: str
    lat: float
    lng: float

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
