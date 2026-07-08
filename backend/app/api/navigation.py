from fastapi import APIRouter, HTTPException

from app.core.router import router
from app.core.search import search_service
from app.core.nearest_node import nearest_node_finder
from app.core.graph_loader import graph_manager

router_api = APIRouter(
    prefix="/navigation",
    tags=["Campus Navigation"]
)

# ==========================================================
# Route using Node IDs
# ==========================================================

@router_api.get("/route")
def route(
    source: int,
    destination: int
):

    try:

        return router.route(
            source,
            destination
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

# ==========================================================
# Route using Location Names
# ==========================================================

@router_api.get("/route-by-name")
def route_by_name(
    source: str,
    destination: str
):

    try:

        return router.route_by_name(
            source,
            destination
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

# ==========================================================
# Route from Live GPS
# ==========================================================

@router_api.get("/route-from-gps")
def route_from_gps(
    latitude: float,
    longitude: float,
    destination: int
):

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
# Find Nearest Navigation Node
# ==========================================================

@router_api.get("/nearest-node")
def nearest_node(
    latitude: float,
    longitude: float
):

    try:

        return nearest_node_finder.find(
            latitude,
            longitude
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

# ==========================================================
# Search
# ==========================================================

@router_api.get("/search")
def search(
    keyword: str
):

    return search_service.search(
        keyword
    )

# ==========================================================
# Suggestions
# ==========================================================

@router_api.get("/suggestions")
def suggestions():

    return search_service.suggestions()

# ==========================================================
# Graph Statistics
# ==========================================================

@router_api.get("/graph")
def graph_statistics():

    return graph_manager.statistics()

# ==========================================================
# Health Check
# ==========================================================

@router_api.get("/health")
def health():

    return {

        "status": "healthy",

        "graph_loaded": True,

        "statistics": graph_manager.statistics()

    }