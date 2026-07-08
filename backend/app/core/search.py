from pathlib import Path
import geopandas as gpd

from app.core.graph_loader import graph_manager
from app.core.nearest_node import nearest_node_finder


class SearchService:
    """
    Campus Search Service

    Supports:
    - Building Search
    - Navigation Node Search
    - Unified Search
    - Auto Suggestions
    """

    def __init__(self):
        base_dir = Path(__file__).resolve().parents[2]
        gpkg = base_dir / "gis" / "Campus.gpkg"
        
        # Load once
        self.buildings = gpd.read_file(gpkg, layer="Building")
        self.nodes = gpd.read_file(gpkg, layer="Navigation_Nodes")

    @property
    def graph(self):
        return graph_manager.get_graph()

    # =====================================================
    # Building Search
    # =====================================================

    def search_buildings(self, keyword: str):

        keyword = keyword.lower().strip()

        results = []

        for _, row in self.buildings.iterrows():

            name = str(row.get("Name") or row.get("name", ""))

            if keyword in name.lower():
                centroid = row.geometry.centroid
                lat, lon = centroid.y, centroid.x
                node_id = nearest_node_finder.find(lat, lon)["node_id"]

                results.append({
                    "id": str(row.get("id", "")),
                    "name": name,
                    "type": row.get("type", "Building"),
                    "latitude": lat,
                    "longitude": lon,
                    "node_id": node_id
                })

        return results

    # =====================================================
    # Navigation Node Search
    # =====================================================

    def search_nodes(self, keyword: str):

        keyword = keyword.lower().strip()

        results = []

        for _, row in self.nodes.iterrows():

            name = str(row.get("name", ""))

            if keyword in name.lower():

                results.append({
                    "id": int(row["id"]),
                    "name": name,
                    "type": row["type"]
                })

        return results

    # =====================================================
    # Unified Search
    # =====================================================

    def search(self, keyword: str):

        return {
            "buildings": self.search_buildings(keyword),
            "nodes": self.search_nodes(keyword)
        }

    # =====================================================
    # Exact Node Lookup
    # =====================================================

    def get_node(self, name: str):

        node_id = graph_manager.find_node_by_name(name)

        if node_id is None:
            return None

        node = self.graph.nodes[node_id]

        return {
            "id": node_id,
            "name": node["name"],
            "type": node["node_type"],
            "latitude": node["latitude"],
            "longitude": node["longitude"]
        }

    # =====================================================
    # Suggestions
    # =====================================================

    def suggestions(self):

        items = []

        # Buildings
        for _, row in self.buildings.iterrows():
            centroid = row.geometry.centroid
            lat, lon = centroid.y, centroid.x
            node_id = nearest_node_finder.find(lat, lon)["node_id"]

            items.append({
                "name": str(row.get("Name") or row.get("name", "")),
                "type": row.get("type", "Building"),
                "node_id": node_id
            })

        # Navigation Nodes
        for _, row in self.nodes.iterrows():

            items.append({
                "name": str(row.get("name", "")),
                "type": row.get("type", "Node"),
                "node_id": int(row["id"])
            })

        # Remove duplicates
        unique = {}

        for item in items:
            unique[item["name"].lower()] = item

        return sorted(
            unique.values(),
            key=lambda x: x["name"]
        )

    # =====================================================
    # List Buildings
    # =====================================================

    def list_buildings(self):

        buildings = []

        for _, row in self.buildings.iterrows():

            centroid = row.geometry.centroid
            lat, lon = centroid.y, centroid.x
            node_id = nearest_node_finder.find(lat, lon)["node_id"]

            buildings.append({
                "id": str(row.get("id", "")),
                "name": row.get("Name") or row.get("name"),
                "type": row.get("type", "Building"),
                "latitude": lat,
                "longitude": lon,
                "node_id": node_id
            })

        return buildings

    # =====================================================
    # List Navigation Nodes
    # =====================================================

    def list_nodes(self):

        nodes = []

        for _, row in self.nodes.iterrows():

            nodes.append({
                "id": int(row["id"]),
                "name": row["name"],
                "type": row["type"]
            })

        return nodes


search_service = SearchService()