import networkx as nx

from app.core.graph_loader import graph_manager
from app.core.nearest_node import nearest_node_finder


class Router:
    """
    Campus Navigation Router

    Features:
    ----------
    • Shortest Path (A*)
    • Route by Node IDs
    • Route by GPS
    • Route by Location Names
    • Route Coordinates
    • Walking Distance
    • Estimated Walking Time
    """

    WALKING_SPEED = 1.4  # meters/second

    def __init__(self):
        pass

    @property
    def graph(self):
        return graph_manager.get_graph()

    # ==================================================
    # Shortest Path
    # ==================================================

    def shortest_path(
        self,
        source: int,
        destination: int
    ):

        if source not in self.graph:
            raise ValueError(f"Invalid source node: {source}")

        if destination not in self.graph:
            raise ValueError(f"Invalid destination node: {destination}")

        return nx.astar_path(
            self.graph,
            source,
            destination,
            weight="weight"
        )

    # ==================================================
    # Total Distance
    # ==================================================

    def total_distance(self, path):

        distance = 0.0

        for i in range(len(path) - 1):

            distance += self.graph[
                path[i]
            ][
                path[i + 1]
            ].get("distance", 0.0)

        return round(distance, 2)

    # ==================================================
    # Estimated Walking Time
    # ==================================================

    def walking_time(self, distance):

        seconds = distance / self.WALKING_SPEED

        minutes = int(seconds // 60)
        secs = int(seconds % 60)

        return {
            "minutes": minutes,
            "seconds": secs
        }

    # ==================================================
    # Coordinates
    # ==================================================

    def coordinates(self, path):

        result = []

        for node in path:

            data = self.graph.nodes[node]

            result.append(
                {
                    "id": node,
                    "name": data["name"],
                    "type": data["node_type"],
                    "latitude": data["latitude"],
                    "longitude": data["longitude"]
                }
            )

        return result

    # ==================================================
    # Route by Node IDs
    # ==================================================

    def route(
        self,
        source: int,
        destination: int
    ):

        path = self.shortest_path(
            source,
            destination
        )

        distance = self.total_distance(path)

        return {

            "source": source,

            "destination": destination,

            "path": path,

            "distance_meters": distance,

            "walking_time": self.walking_time(distance),

            "coordinates": self.coordinates(path)

        }

    # ==================================================
    # Route by GPS
    # ==================================================

    def route_from_gps(
        self,
        latitude: float,
        longitude: float,
        destination_node: int
    ):

        source = nearest_node_finder.find(
            latitude,
            longitude
        )["node_id"]

        return self.route(
            source,
            destination_node
        )

    # ==================================================
    # Route by Names
    # ==================================================

    def route_by_name(
        self,
        source_name: str,
        destination_name: str
    ):

        source = graph_manager.find_node_by_name(
            source_name
        )

        destination = graph_manager.find_node_by_name(
            destination_name
        )

        if source is None:
            raise ValueError(
                f"Unknown location: {source_name}"
            )

        if destination is None:
            raise ValueError(
                f"Unknown location: {destination_name}"
            )

        return self.route(
            source,
            destination
        )

    # ==================================================
    # Route Statistics
    # ==================================================

    def route_summary(
        self,
        source: int,
        destination: int
    ):

        route = self.route(
            source,
            destination
        )

        return {

            "distance": route["distance_meters"],

            "walking_time": route["walking_time"],

            "nodes": len(route["path"])

        }


router = Router()