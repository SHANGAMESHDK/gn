from pathlib import Path
import json

from fastapi import APIRouter, HTTPException

from fastapi import APIRouter, HTTPException

from app.core.router import router
from app.core.nearest_node import nearest_node_finder

stall_router = APIRouter(
    prefix="/stalls",
    tags=["Stalls"]
)

# =====================================================
# Load Stall Data
# =====================================================

BASE_DIR = Path(__file__).resolve().parents[3]

STALL_FILE = BASE_DIR / "backend" / "app" / "data" / "stalls.json"


def load_stalls():

    if not STALL_FILE.exists():
        return []

    with open(STALL_FILE, "r", encoding="utf-8") as file:
        return json.load(file)

def save_stalls(stalls):
    with open(STALL_FILE, "w", encoding="utf-8") as file:
        json.dump(stalls, file, indent=4)

# =====================================================
# List All Stalls
# =====================================================

@stall_router.get("/")
def get_stalls():

    stalls = load_stalls()

    return {
        "count": len(stalls),
        "stalls": stalls
    }


# =====================================================
# Get Stall By ID
# =====================================================

@stall_router.get("/{stall_id}")
def get_stall(stall_id: int):

    stalls = load_stalls()

    for stall in stalls:

        if stall["id"] == stall_id:
            return stall

    raise HTTPException(
        status_code=404,
        detail="Stall not found."
    )


# =====================================================
# Search Stall
# =====================================================

@stall_router.get("/search/{keyword}")
def search_stalls(keyword: str):

    stalls = load_stalls()

    keyword = keyword.lower()

    results = []

    for stall in stalls:

        if (
            keyword in stall["name"].lower()
            or keyword in stall["description"].lower()
            or keyword in stall["category"].lower()
        ):

            results.append(stall)

    return {
        "count": len(results),
        "results": results
    }


# =====================================================
# Route To Stall
# =====================================================

@stall_router.get("/{stall_id}/route")
def route_to_stall(
    stall_id: int,
    source: int
):

    stalls = load_stalls()

    for stall in stalls:

        if stall["id"] == stall_id:
            
            target_node = stall.get("node_id")
            
            if not target_node and stall.get("latitude") and stall.get("longitude"):
                target_node = nearest_node_finder.find(
                    stall["latitude"], 
                    stall["longitude"]
                )["node_id"]
                
            if not target_node:
                raise HTTPException(status_code=400, detail="Stall has no valid location data.")

            return router.route(
                source,
                target_node
            )

    raise HTTPException(
        status_code=404,
        detail="Stall not found."
    )


# =====================================================
# Stall Categories
# =====================================================

@stall_router.get("/categories/all")
def categories():

    stalls = load_stalls()

    categories = sorted(
        list(
            {
                stall["category"]
                for stall in stalls
            }
        )
    )

    return {
        "count": len(categories),
        "categories": categories
    }


# =====================================================
# Filter By Category
# =====================================================

@stall_router.get("/category/{category}")
def filter_category(category: str):

    stalls = load_stalls()

    results = [
        stall
        for stall in stalls
        if stall["category"].lower() == category.lower()
    ]

    return {
        "count": len(results),
        "results": results
    }

# =====================================================
# Admin Operations
# =====================================================

@stall_router.post("/create")
def create_stall(stall: dict):
    stalls = load_stalls()
    
    # Generate new ID
    new_id = 1
    if stalls:
        new_id = max(s["id"] for s in stalls) + 1
        
    stall["id"] = new_id
    stalls.append(stall)
    
    save_stalls(stalls)
    return {"message": "Stall created successfully", "stall": stall}

@stall_router.post("/update")
def update_stall(stall_data: dict):
    stalls = load_stalls()
    
    for i, stall in enumerate(stalls):
        if stall["id"] == stall_data.get("id"):
            stalls[i] = stall_data
            save_stalls(stalls)
            return {"message": "Stall updated successfully", "stall": stall_data}
            
    raise HTTPException(status_code=404, detail="Stall not found.")

@stall_router.delete("/{stall_id}")
def delete_stall(stall_id: int):
    stalls = load_stalls()
    
    filtered_stalls = [s for s in stalls if s["id"] != stall_id]
    
    if len(filtered_stalls) == len(stalls):
        raise HTTPException(status_code=404, detail="Stall not found.")
        
    save_stalls(filtered_stalls)
    return {"message": "Stall deleted successfully"}