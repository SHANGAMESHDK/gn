from pathlib import Path
import json
import networkx as nx


class GraphManager:
    """
    Loads and manages the campus navigation graph.
    The graph is loaded once and reused across the application.
    """

    def __init__(self):

        self.base_dir = Path(__file__).resolve().parents[2]

        self.graph_path = (
            self.base_dir
            / "app"
            / "data"
            / "graph.json"
        )

        self.graph = None

    # --------------------------------------------------
    # Load Graph
    # --------------------------------------------------

    def load(self):

        if self.graph is not None:
            return self.graph

        if not self.graph_path.exists():
            raise FileNotFoundError(
                f"Graph file not found:\n{self.graph_path}\n"
                "Run graph_builder.py first."
            )

        with open(self.graph_path, "r") as f:
            graph_data = json.load(f)

        self.graph = nx.node_link_graph(graph_data)

        print("\n" + "=" * 60)
        print("Campus Navigation Graph Loaded")
        print("=" * 60)

        print(f"Nodes : {self.graph.number_of_nodes()}")
        print(f"Edges : {self.graph.number_of_edges()}")

        return self.graph

    # --------------------------------------------------
    # Get Graph
    # --------------------------------------------------

    def get_graph(self):

        if self.graph is None:
            self.load()

        return self.graph

    # --------------------------------------------------
    # Reload Graph
    # --------------------------------------------------

    def reload(self):
        from app.core.graph_builder import build_graph
        self.graph = build_graph()
        return self.graph

    # --------------------------------------------------
    # Node Lookup
    # --------------------------------------------------

    def get_node(self, node_id: int):

        graph = self.get_graph()

        return graph.nodes[node_id]

    # --------------------------------------------------
    # Find Node By Name
    # --------------------------------------------------

    def find_node_by_name(self, name: str):

        graph = self.get_graph()

        name = name.strip().lower()

        for node_id, data in graph.nodes(data=True):

            if data["name"].lower() == name:
                return node_id

        return None

    # --------------------------------------------------
    # Graph Statistics
    # --------------------------------------------------

    def statistics(self):

        graph = self.get_graph()

        return {
            "nodes": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
            "connected": nx.is_connected(graph)
        }


graph_manager = GraphManager()