from pathlib import Path
import json

import geopandas as gpd
import networkx as nx

# =====================================================
# Project Paths
# =====================================================

BASE_DIR = Path(__file__).resolve().parents[2]

GPKG = BASE_DIR / "gis" / "Campus.gpkg"

GRAPH_JSON = BASE_DIR / "app" / "data" / "graph.json"
CUSTOM_GRAPH_JSON = BASE_DIR / "app" / "data" / "custom_graph.json"

# =====================================================
# Read Layers
# =====================================================

print("=" * 60)
print("Loading Campus GIS")
print("=" * 60)

buildings = gpd.read_file(GPKG, layer="Building")
nodes = gpd.read_file(GPKG, layer="Navigation_Nodes")
edges = gpd.read_file(GPKG, layer="Edges")

print(f"Buildings : {len(buildings)}")
print(f"Nodes     : {len(nodes)}")
print(f"Edges     : {len(edges)}")

# =====================================================
# Create Graph
# =====================================================

def build_graph():
    print("=" * 60)
    print("Building Campus Navigation Graph")
    print("=" * 60)
    
    graph = nx.Graph()

    # =====================================================
    # Add Navigation Nodes
    # =====================================================

    print("\nLoading Navigation Nodes...\n")

    for _, row in nodes.iterrows():
        graph.add_node(
            int(row["id"]),
            name=row["name"],
            node_type=row["type"],
            latitude=row.geometry.y,
            longitude=row.geometry.x
        )

    print(f"Loaded {graph.number_of_nodes()} Nodes")

    # =====================================================
    # Add Edges
    # =====================================================

    print("\nLoading Graph Edges...\n")

    valid_edges = 0
    skipped_edges = 0

    for _, row in edges.iterrows():
        if (
            row.get("from_node") is None or
            row.get("to_node") is None or
            row.get("distance") is None
        ):
            skipped_edges += 1
            continue

        if (
            gpd.pd.isna(row["from_node"]) or
            gpd.pd.isna(row["to_node"]) or
            gpd.pd.isna(row["distance"])
        ):
            skipped_edges += 1
            continue

        graph.add_edge(
            int(row["from_node"]),
            int(row["to_node"]),
            distance=float(row["distance"]),
            thickness=3.0,
            weight=float(row["distance"]) / 3.0
        )

        valid_edges += 1

    print(f"Loaded {valid_edges} Edges")
    print(f"Skipped {skipped_edges} Edges")

    # =====================================================
    # Inject Custom Graph Layer
    # =====================================================

    print("\nLoading Custom Graph Layer...\n")

    if CUSTOM_GRAPH_JSON.exists():
        try:
            with open(CUSTOM_GRAPH_JSON, "r") as f:
                custom_data = json.load(f)
                
            custom_nodes = custom_data.get("nodes", [])
            custom_edges = custom_data.get("edges", [])
            
            for node in custom_nodes:
                graph.add_node(
                    node["id"],
                    name=node.get("name", "Custom Node"),
                    node_type="Custom",
                    latitude=node["lat"],
                    longitude=node["lng"]
                )
                
            for edge in custom_edges:
                dist = float(edge.get("distance", edge.get("weight", 10.0)))
                thick = float(edge.get("thickness", 3.0))
                graph.add_edge(
                    edge["from"],
                    edge["to"],
                    distance=dist,
                    thickness=thick,
                    weight=dist / thick
                )
                
            print(f"Injected {len(custom_nodes)} Custom Nodes and {len(custom_edges)} Custom Edges")
            
            # Apply Overrides
            overrides = custom_data.get("overrides", {})
            for node_id_str, override in overrides.items():
                node_id = int(node_id_str)
                if override.get("deleted"):
                    if node_id in graph:
                        graph.remove_node(node_id)
                        print(f"Deleted overridden node {node_id}")
                else:
                    if node_id in graph:
                        if "name" in override:
                            graph.nodes[node_id]["name"] = override["name"]
                        if "lat" in override:
                            graph.nodes[node_id]["latitude"] = override["lat"]
                        if "lng" in override:
                            graph.nodes[node_id]["longitude"] = override["lng"]
                        print(f"Updated overridden node {node_id}")
                        
            # Apply Edge Overrides
            edge_overrides = custom_data.get("edge_overrides", {})
            for edge_key, override in edge_overrides.items():
                u_str, v_str = edge_key.split('-')
                u, v = int(u_str), int(v_str)
                if override.get("deleted"):
                    if graph.has_edge(u, v):
                        graph.remove_edge(u, v)
                        print(f"Deleted overridden edge {u}-{v}")
                else:
                    if graph.has_edge(u, v):
                        if "thickness" in override:
                            thick = float(override["thickness"])
                            graph[u][v]["thickness"] = thick
                            dist = graph[u][v].get("distance", 1.0)
                            graph[u][v]["weight"] = dist / thick
                        elif "weight" in override:
                            # Backwards compatibility
                            thick = float(override["weight"])
                            graph[u][v]["thickness"] = thick
                            dist = graph[u][v].get("distance", 1.0)
                            graph[u][v]["weight"] = dist / thick
                        print(f"Updated overridden edge {u}-{v}")
                        
        except Exception as e:
            print("Error loading custom graph:", e)
    else:
        print("No custom graph found.")

    # =====================================================
    # Graph Statistics
    # =====================================================

    print("\n" + "=" * 60)
    print("Graph Statistics")
    print("=" * 60)

    print("Nodes :", graph.number_of_nodes())
    print("Edges :", graph.number_of_edges())

    # =====================================================
    # Connectivity Check
    # =====================================================

    print("\nConnectivity Check")

    if nx.is_connected(graph):
        print("[OK] Graph is Fully Connected")
    else:
        print("[WARNING] Graph is NOT Connected")

        components = list(nx.connected_components(graph))

        print(f"Connected Components : {len(components)}")

    # =====================================================
    # Preview
    # =====================================================

    print("\nSample Nodes\n")

    for i, (node, data) in enumerate(graph.nodes(data=True)):
        print(node, data)
        if i == 4:
            break

    print("\nSample Edges\n")

    for i, (u, v, data) in enumerate(graph.edges(data=True)):
        print(f"{u} -> {v} ({data['weight']:.2f} m)")
        if i == 4:
            break

    # =====================================================
    # Save Graph
    # =====================================================

    graph_data = nx.node_link_data(graph)

    GRAPH_JSON.parent.mkdir(parents=True, exist_ok=True)

    with open(GRAPH_JSON, "w") as f:
        json.dump(graph_data, f, indent=4)

    print("\nGraph saved to")
    print(GRAPH_JSON)

    print("\n" + "=" * 60)
    print("Graph Builder Completed Successfully")
    print("=" * 60)
    
    return graph

if __name__ == "__main__":
    build_graph()