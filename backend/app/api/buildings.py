from fastapi import APIRouter, HTTPException

from app.core.search import search_service
import geopandas as gpd
from pathlib import Path
import json
import math
from shapely.geometry import Polygon, MultiPolygon, Point
from app.core.graph_loader import graph_manager
from app.core.graph_builder import CUSTOM_GRAPH_JSON

router = APIRouter(
    prefix="/buildings",
    tags=["Buildings"]
)


# =====================================================
# List All Buildings
# =====================================================

@router.get("/")
def get_buildings():
    try:
        from fastapi.encoders import jsonable_encoder
        b = search_service.list_buildings()
        jsonable_encoder(b) # test if encoder crashes
        return {
            "count": len(b),
            "buildings": b
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# =====================================================
# =====================================================

CUSTOM_BUILDINGS_JSON = Path(__file__).resolve().parents[3] / "backend" / "app" / "data" / "custom_buildings.json"

def get_building_overrides():
    if CUSTOM_BUILDINGS_JSON.exists():
        with open(CUSTOM_BUILDINGS_JSON, "r") as f:
            return json.load(f)
    return {}

def save_building_overrides(data):
    CUSTOM_BUILDINGS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(CUSTOM_BUILDINGS_JSON, "w") as f:
        json.dump(data, f, indent=4)

@router.post("/override")
def custom_building_override(override: dict):
    # payload: {"id": "...", "height": ..., "color": "...", "Name": "..."}
    data = get_building_overrides()
    b_id = str(override["id"])
    
    if b_id not in data:
        data[b_id] = {}
        
    if "height" in override:
        data[b_id]["height"] = override["height"]
    if "color" in override:
        data[b_id]["color"] = override["color"]
    if "Name" in override:
        data[b_id]["Name"] = override["Name"]
    if "walkable" in override:
        data[b_id]["walkable"] = override["walkable"]
        if override["walkable"]:
            data[b_id]["height"] = 0
            _generate_building_mesh(b_id, data[b_id].get("Name", "Custom Area"))
        else:
            _remove_building_mesh(b_id)
        # Reload graph to apply mesh changes
        graph_manager.reload()
        
    save_building_overrides(data)
    return {"message": "Building override applied"}

# =====================================================
# Building Mesh Generators
# =====================================================

def _generate_building_mesh(building_id: str, area_name: str):
    GPKG = Path(__file__).resolve().parents[2] / "gis" / "Campus.gpkg"
    try:
        buildings = gpd.read_file(GPKG, layer="Building")
        bldg = buildings[buildings["id"] == building_id]
        if bldg.empty: return
        poly = bldg.iloc[0].geometry
        if poly is None or poly.is_empty: return
        
        with open(CUSTOM_GRAPH_JSON, "r") as f:
            custom_data = json.load(f)
            
        # Clean up any existing mesh for this building first
        _scrub_mesh(custom_data, building_id)
        
        max_id = 90000
        if custom_data.get('nodes'):
            max_id = max([n['id'] for n in custom_data['nodes']])
            
        c_id = max_id + 1
        centroid = poly.centroid
        custom_data['nodes'].append({
            'id': c_id,
            'name': f"{area_name} Center",
            'node_type': 'BuildingMesh',
            'building_id': building_id,
            'lat': centroid.y,
            'lng': centroid.x
        })
        
        buffered_poly = poly.buffer(0.0002)
        G = graph_manager.get_graph()
        
        def calc_dist(lat1, lon1, lat2, lon2):
            return math.sqrt((lat1-lat2)**2 + (lon1-lon2)**2) * 111139
            
        for n_id, d in G.nodes(data=True):
            if n_id == c_id: continue
            if "longitude" not in d or "latitude" not in d: continue
            if buffered_poly.contains(Point(d["longitude"], d["latitude"])):
                dist = calc_dist(centroid.y, centroid.x, d["latitude"], d["longitude"])
                custom_data['edges'].append({
                    'from': n_id,
                    'to': c_id,
                    'distance': dist,
                    'thickness': 10.0,
                    'weight': dist / 10.0,
                    'building_id': building_id
                })
                
        with open(CUSTOM_GRAPH_JSON, "w") as f:
            json.dump(custom_data, f, indent=4)
            
    except Exception as e:
        print(f"Mesh generation failed: {e}")

def _remove_building_mesh(building_id: str):
    try:
        with open(CUSTOM_GRAPH_JSON, "r") as f:
            custom_data = json.load(f)
        _scrub_mesh(custom_data, building_id)
        with open(CUSTOM_GRAPH_JSON, "w") as f:
            json.dump(custom_data, f, indent=4)
    except Exception:
        pass

def _scrub_mesh(custom_data: dict, building_id: str):
    custom_data['nodes'] = [n for n in custom_data.get('nodes', []) if n.get('building_id') != building_id]
    custom_data['edges'] = [e for e in custom_data.get('edges', []) if e.get('building_id') != building_id]


# =====================================================
# GeoJSON 3D Buildings
# =====================================================

def force_2d(geom):
    """Remove Z coordinate from geometries since MapLibre prefers 2D polygons + extrude height"""
    if geom.is_empty:
        return geom
    if isinstance(geom, Polygon):
        return Polygon([(x, y) for x, y, *_ in geom.exterior.coords],
                       [[(x, y) for x, y, *_ in ring.coords] for ring in geom.interiors])
    elif isinstance(geom, MultiPolygon):
        return MultiPolygon([force_2d(p) for p in geom.geoms])
    return geom

@router.get("/geojson")
def get_buildings_geojson():
    GPKG = Path(__file__).resolve().parents[2] / "gis" / "Campus.gpkg"
    overrides = get_building_overrides()
    try:
        gdf = gpd.read_file(GPKG, layer="Building")
        # Ensure geometry is 2D
        gdf["geometry"] = gdf.geometry.apply(force_2d)
        
        features_dict = json.loads(gdf.to_json())
        
        for f in features_dict.get("features", []):
            props = f["properties"]
            b_id = str(props.get("id"))
            
            # Default properties
            props["height"] = 15
            props["base_height"] = 0
            props["color"] = "#e2e8f0" # slate-200
            
            # Smart defaults for land level
            name = (props.get("Name") or "").lower()
            if "parking" in name or "ground" in name or "oat" in name or "openarea" in name or "open area" in name:
                props["height"] = 0
                props["color"] = "#10b981" # emerald-500
                
            # Apply overrides
            if b_id in overrides:
                ov = overrides[b_id]
                if "height" in ov: props["height"] = ov["height"]
                if "color" in ov: props["color"] = ov["color"]
                if "Name" in ov: props["Name"] = ov["Name"]
                if "walkable" in ov: props["walkable"] = ov["walkable"]
                
        return features_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# =====================================================
# Search Buildings
# =====================================================

@router.get("/search")
def search_buildings(keyword: str):

    result = search_service.search_buildings(keyword)

    return {
        "count": len(result),
        "results": result
    }


# =====================================================
# Get Building by Name
# =====================================================

@router.get("/{building_name}")
def get_building(building_name: str):

    buildings = search_service.list_buildings()

    for building in buildings:

        if building["name"].lower() == building_name.lower():

            return building

    raise HTTPException(
        status_code=404,
        detail="Building not found"
    )


# =====================================================
# Auto Suggestions
# =====================================================

@router.get("/suggestions/all")
def building_suggestions():

    suggestions = []

    for building in search_service.list_buildings():

        suggestions.append(
            building["name"]
        )

    suggestions.sort()

    return {
        "count": len(suggestions),
        "suggestions": suggestions
    }