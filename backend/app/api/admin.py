from fastapi import APIRouter, HTTPException
import networkx as nx
import json
from pathlib import Path

from app.core.graph_loader import graph_manager

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ==========================================================
# Settings Management
# ==========================================================

SETTINGS_JSON = Path(__file__).resolve().parents[1] / "data" / "settings.json"

def load_settings():
    if not SETTINGS_JSON.exists():
        default_settings = {"friendsync_security_code": "ADMIN123"}
        save_settings(default_settings)
        return default_settings
    with open(SETTINGS_JSON, "r") as f:
        try:
            return json.load(f)
        except:
            return {"friendsync_security_code": "ADMIN123"}

def save_settings(data):
    SETTINGS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_JSON, "w") as f:
        json.dump(data, f, indent=4)

@router.get("/settings")
def get_settings():
    return load_settings()

@router.post("/settings")
def update_settings(settings: dict):
    data = load_settings()
    data.update(settings)
    save_settings(data)
    return {"message": "Settings updated", "settings": data}


# ==========================================================
# System Status
# ==========================================================

@router.get("/status")
def status():

    graph = graph_manager.get_graph()

    return {
        "status": "running",
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "connected": nx.is_connected(graph)
    }


# ==========================================================
# Graph Statistics
# ==========================================================

@router.get("/statistics")
def statistics():

    graph = graph_manager.get_graph()

    return {
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "connected": nx.is_connected(graph),
        "components": nx.number_connected_components(graph)
    }


# ==========================================================
# Reload Graph
# ==========================================================

@router.post("/reload")
def reload_graph():

    try:

        graph = graph_manager.reload()

        return {
            "message": "Graph reloaded successfully.",
            "nodes": graph.number_of_nodes(),
            "edges": graph.number_of_edges()
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================================
# Connectivity Check
# ==========================================================

@router.get("/connectivity")
def connectivity():

    graph = graph_manager.get_graph()

    components = list(nx.connected_components(graph))

    return {
        "connected": nx.is_connected(graph),
        "components": len(components),
        "sizes": [len(c) for c in components]
    }


# ==========================================================
# Graph Information
# ==========================================================

@router.get("/graph")
def graph_info():
    graph = graph_manager.get_graph()
    
    nodes = []
    for node, data in graph.nodes(data=True):
        nodes.append({
            "id": node,
            "lat": data.get("latitude"),
            "lng": data.get("longitude"),
            "name": data.get("name", str(node)),
            "type": data.get("node_type", "Unknown")
        })

    edges = []
    for u, v, data in graph.edges(data=True):
        edges.append({
            "from": u,
            "to": v,
            "thickness": data.get("thickness", 3.0),
            "distance": data.get("distance", 0.0),
            "weight": data.get("weight", 0.0)
        })

    return {
        "nodes": nodes,
        "edges": edges
    }


# ==========================================================
# Custom Graph Editor
# ==========================================================

CUSTOM_GRAPH_JSON = Path(__file__).resolve().parents[1] / "data" / "custom_graph.json"

def load_custom_graph():
    if not CUSTOM_GRAPH_JSON.exists():
        return {"nodes": [], "edges": [], "overrides": {}}
    with open(CUSTOM_GRAPH_JSON, "r") as f:
        data = json.load(f)
        if "overrides" not in data:
            data["overrides"] = {}
        return data

def save_custom_graph(data):
    CUSTOM_GRAPH_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(CUSTOM_GRAPH_JSON, "w") as f:
        json.dump(data, f, indent=4)

@router.post("/custom-node")
def add_custom_node(node: dict):
    data = load_custom_graph()
    
    # Generate custom node ID (starts at 90000 to avoid conflicts with GPKG)
    new_id = 90000
    if data["nodes"]:
        new_id = max(n["id"] for n in data["nodes"]) + 1
        
    node["id"] = new_id
    data["nodes"].append(node)
    
    save_custom_graph(data)
    graph_manager.reload()
    
    return {"message": "Custom node added", "node": node}

@router.post("/custom-edge")
def add_custom_edge(edge: dict):
    data = load_custom_graph()
    
    data["edges"].append(edge)
    
    # Remove any deletion overrides for this edge so it can be restored
    if "edge_overrides" in data:
        for k in [f"{edge['from']}-{edge['to']}", f"{edge['to']}-{edge['from']}"]:
            if k in data["edge_overrides"] and data["edge_overrides"][k].get("deleted"):
                del data["edge_overrides"][k]
                
    save_custom_graph(data)
    graph_manager.reload()
    
    return {"message": "Custom edge added", "edge": edge}

@router.post("/custom-node-override")
def custom_node_override(override: dict):
    # payload: {"id": 13, "action": "update", "name": "...", "lat": ..., "lng": ...} or {"id": 13, "action": "delete"}
    data = load_custom_graph()
    node_id = str(override["id"])
    
    if override["action"] == "delete":
        data["overrides"][node_id] = {"deleted": True}
    elif override["action"] == "update":
        if node_id not in data["overrides"]:
            data["overrides"][node_id] = {}
        if "name" in override:
            data["overrides"][node_id]["name"] = override["name"]
        if "lat" in override:
            data["overrides"][node_id]["lat"] = override["lat"]
        if "lng" in override:
            data["overrides"][node_id]["lng"] = override["lng"]
            
    save_custom_graph(data)
    graph_manager.reload()
    return {"message": "Override applied"}

@router.post("/custom-edge-override")
def custom_edge_override(override: dict):
    # payload: {"from": 1, "to": 2, "action": "update", "weight": 10.5} or {"action": "delete"}
    data = load_custom_graph()
    edge_key = f"{override['from']}-{override['to']}"
    
    if "edge_overrides" not in data:
        data["edge_overrides"] = {}
        
    if override["action"] == "delete":
        data["edge_overrides"][edge_key] = {"deleted": True}
    elif override["action"] == "update":
        if edge_key not in data["edge_overrides"]:
            data["edge_overrides"][edge_key] = {}
        if "thickness" in override:
            data["edge_overrides"][edge_key]["thickness"] = override["thickness"]
            
    save_custom_graph(data)
    graph_manager.reload()
    return {"message": "Edge override applied"}

@router.delete("/custom-graph")
def clear_custom_graph():
    save_custom_graph({"nodes": [], "edges": [], "overrides": {}})
    graph_manager.reload()
    return {"message": "Custom graph cleared"}

# ==========================================================
# Node Information
# ==========================================================

@router.get("/node/{node_id}")
def node(node_id: int):

    graph = graph_manager.get_graph()

    if node_id not in graph:

        raise HTTPException(
            status_code=404,
            detail="Node not found"
        )

    return graph.nodes[node_id]


# ==========================================================
# Edge Information
# ==========================================================

@router.get("/edge/{source}/{destination}")
def edge(source: int, destination: int):

    graph = graph_manager.get_graph()

    if not graph.has_edge(source, destination):

        raise HTTPException(
            status_code=404,
            detail="Edge not found"
        )

    return graph[source][destination]


# ==========================================================
# Health Check
# ==========================================================

@router.get("/health")
def health():

    return {
        "status": "healthy"
    }