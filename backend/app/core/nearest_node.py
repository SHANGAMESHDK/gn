from math import radians, sin, cos, sqrt, atan2

from app.core.graph_loader import graph_manager


class NearestNodeFinder:
    """
    Finds the nearest navigation node to a GPS coordinate.
    Uses the Haversine formula for accurate distance calculation.
    """

    EARTH_RADIUS = 6371000  # meters

    def __init__(self):
        pass

    @property
    def graph(self):
        return graph_manager.get_graph()

    # --------------------------------------------------
    # Haversine Distance
    # --------------------------------------------------

    def haversine(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:

        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)

        a = (
            sin(dlat / 2) ** 2
            + cos(radians(lat1))
            * cos(radians(lat2))
            * sin(dlon / 2) ** 2
        )

        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return self.EARTH_RADIUS * c

    # --------------------------------------------------
    # Find Nearest Node
    # --------------------------------------------------

    def find(
        self,
        latitude: float,
        longitude: float
    ):

        nearest_node = None
        nearest_distance = float("inf")

        for node_id, data in self.graph.nodes(data=True):
            if "latitude" not in data or "longitude" not in data:
                continue

            distance = self.haversine(
                latitude,
                longitude,
                data["latitude"],
                data["longitude"]
            )

            if distance < nearest_distance:
                nearest_distance = distance
                nearest_node = node_id

        return {
            "node_id": nearest_node,
            "distance": round(nearest_distance, 2),
            "node": self.graph.nodes[nearest_node]
        }


nearest_node_finder = NearestNodeFinder()