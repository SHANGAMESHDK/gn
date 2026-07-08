from pathlib import Path
import geopandas as gpd

BASE_DIR = Path(__file__).resolve().parents[2]

gpkg = BASE_DIR / "gis" / "Campus.gpkg"

buildings = gpd.read_file(gpkg, layer="Building")
nodes = gpd.read_file(gpkg, layer="Navigation_Nodes")
edges = gpd.read_file(gpkg, layer="Edges")

print(buildings.head())
print(nodes.head())
print(edges.head())

print("Buildings :", len(buildings))
print("Nodes :", len(nodes))
print("Edges :", len(edges))