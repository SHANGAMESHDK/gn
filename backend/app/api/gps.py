from fastapi import APIRouter, HTTPException, Query

from app.core.nearest_node import nearest_node_finder
from app.core.router import router

gps_router = APIRouter(
    prefix="/gps",
    tags=["GPS"]
)


# ==========================================================
# Get Nearest Navigation Node
# ==========================================================

@gps_router.get("/nearest")
def nearest_node(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):
    """
    Find the nearest navigation node from a GPS coordinate.
    """

    try:
        return nearest_node_finder.find(
            latitude,
            longitude
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================================
# Route From Current GPS Location
# ==========================================================

@gps_router.get("/route")
def route_from_gps(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    destination: int = Query(...)
):
    """
    Generate a walking route from the current GPS location.
    """

    try:

        return router.route_from_gps(
            latitude,
            longitude,
            destination
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ==========================================================
# GPS Health Check
# ==========================================================

@gps_router.get("/health")
def health():

    return {
        "service": "GPS",
        "status": "healthy"
    }