from pathlib import Path

import geopandas as gpd
from shapely.geometry import Point

# =====================================================
# Configuration
# =====================================================

MAX_NODE_DISTANCE = 2.0  # meters

# =====================================================
# Project Paths
# =====================================================

BASE_DIR = Path(__file__).resolve().parents[2]
GPKG = BASE_DIR / "gis" / "Campus.gpkg"

# =====================================================
# Read Layers
# =====================================================

nodes = gpd.read_file(GPKG, layer="Navigation_Nodes")
edges = gpd.read_file(GPKG, layer="Edges")

print("=" * 60)
print("Campus Edge Mapper")
print("=" * 60)

print(f"Nodes Loaded : {len(nodes)}")
print(f"Edges Loaded : {len(edges)}")

# =====================================================
# Convert to Metric CRS (UTM Zone 44N - Chennai)
# =====================================================

nodes = nodes.to_crs(epsg=32644)
edges = edges.to_crs(epsg=32644)

# =====================================================
# Find Nearest Node
# =====================================================

def nearest_node(point):

    distances = nodes.geometry.distance(point)

    idx = distances.idxmin()

    return (
        int(nodes.loc[idx, "id"]),
        float(distances.loc[idx])
    )

# =====================================================
# Mapping
# =====================================================

from_nodes = []
to_nodes = []
edge_lengths = []

mapped = 0
skipped = 0
warnings = 0

print("\nMapping Edges...\n")

for index, edge in edges.iterrows():

    edge_type = str(edge.get("type", "")).strip()

    # -------------------------------------------------
    # Skip Open Areas
    # -------------------------------------------------

    if edge_type.lower() == "openarea":

        print(f"Edge {index+1:02d} | OpenArea | Skipped")

        from_nodes.append(None)
        to_nodes.append(None)
        edge_lengths.append(None)

        skipped += 1
        continue

    line = edge.geometry

    start = Point(line.coords[0])
    end = Point(line.coords[-1])

    start_node, start_distance = nearest_node(start)
    end_node, end_distance = nearest_node(end)

    # -------------------------------------------------
    # Warn if endpoint is too far
    # -------------------------------------------------

    if (
        start_distance > MAX_NODE_DISTANCE or
        end_distance > MAX_NODE_DISTANCE
    ):

        print(
            f"WARNING Edge {index+1:02d}: "
            f"Endpoint too far "
            f"(Start={start_distance:.2f}m, "
            f"End={end_distance:.2f}m)"
        )

        warnings += 1

    # -------------------------------------------------
    # Reject Self Loops
    # -------------------------------------------------

    if start_node == end_node:

        print(
            f"WARNING Edge {index+1:02d}: "
            f"Self-loop ({start_node} -> {end_node})"
        )

        from_nodes.append(None)
        to_nodes.append(None)
        edge_lengths.append(None)

        warnings += 1
        continue

    # -------------------------------------------------
    # Save Mapping
    # -------------------------------------------------

    length = float(line.length)

    from_nodes.append(start_node)
    to_nodes.append(end_node)
    edge_lengths.append(length)

    mapped += 1

    print(
        f"Edge {index+1:02d} | "
        f"{start_node} -> {end_node} | "
        f"{length:.2f} m"
    )

# =====================================================
# Update Attribute Table
# =====================================================

edges["from_node"] = from_nodes
edges["to_node"] = to_nodes
edges["distance"] = edge_lengths

# =====================================================
# Convert Back to WGS84
# =====================================================

edges = edges.to_crs(epsg=4326)

# =====================================================
# Save Updated Layer
# =====================================================

edges.to_file(
    GPKG,
    layer="Edges",
    driver="GPKG",
    mode="w"
)

# =====================================================
# Summary
# =====================================================

print("\n" + "=" * 60)
print("Edge Mapping Completed")
print("=" * 60)

print(f"Mapped   : {mapped}")
print(f"Skipped  : {skipped}")
print(f"Warnings : {warnings}")

print("=" * 60)