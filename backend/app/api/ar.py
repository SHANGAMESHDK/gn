from fastapi import APIRouter
from app.core.search import search_service
import math

router = APIRouter(
    prefix="/ar",
    tags=["AR"]
)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000  # Radius of earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

@router.get("/nearby")
def get_nearby_pois(lat: float, lng: float, radius: float = 200.0):
    pois = []
    
    # Add buildings
    buildings = search_service.list_buildings()
    for b in buildings:
        if "lat" in b and "lng" in b:
            b_lat = float(b["lat"])
            b_lng = float(b["lng"])
            dist = haversine_distance(lat, lng, b_lat, b_lng)
            
            if dist <= radius:
                pois.append({
                    "id": b.get("id", b["name"]),
                    "name": b["name"],
                    "lat": b_lat,
                    "lng": b_lng,
                    "type": "building",
                    "distance": dist
                })
    
    # Sort by distance
    pois.sort(key=lambda x: x["distance"])
    
    # Only return top 20 to not overwhelm AR view
    return pois[:20]
