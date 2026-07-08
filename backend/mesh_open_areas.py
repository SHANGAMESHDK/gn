import json
import math
import geopandas as gpd
from shapely.geometry import Point
from app.core.graph_builder import CUSTOM_GRAPH_JSON
from app.core.graph_loader import graph_manager

# 1. Load Data
G = graph_manager.get_graph()
buildings = gpd.read_file(Path(__file__).parent / 'gis' / 'Campus.gpkg', layer='Building')

with open(CUSTOM_GRAPH_JSON, 'r') as f:
    custom_data = json.load(f)

# Keep track of max custom node ID
max_id = 90000
if custom_data['nodes']:
    max_id = max([n['id'] for n in custom_data['nodes']])

# Helper to calculate distance in meters
def calc_dist(lat1, lon1, lat2, lon2):
    return math.sqrt((lat1-lat2)**2 + (lon1-lon2)**2) * 111139

for idx, bldg in buildings.iterrows():
    name = (bldg.get('Name') or '').lower()
    if 'parking' in name or 'ground' in name or 'oat' in name or 'openarea' in name or 'open area' in name:
        
        poly = bldg.geometry
        if poly is None or poly.is_empty: continue
        
        # Centroid
        centroid = poly.centroid
        clat, clng = centroid.y, centroid.x
        
        # Check if we already have a custom node for this
        centroid_name = f"{bldg.get('Name', 'Area')} Center"
        existing = [n for n in custom_data['nodes'] if n.get('name') == centroid_name]
        
        if existing:
            c_id = existing[0]['id']
        else:
            max_id += 1
            c_id = max_id
            custom_data['nodes'].append({
                'id': c_id,
                'name': centroid_name,
                'node_type': 'OpenArea',
                'lat': clat,
                'lng': clng
            })
            
        # Find all graph nodes within 20 meters (approx 0.00018 degrees) of the polygon boundary
        buffered_poly = poly.buffer(0.0002) # approx 22 meters
        
        nearby_nodes = []
        for n_id, data in G.nodes(data=True):
            if n_id == c_id: continue
            pt = Point(data['longitude'], data['latitude'])
            if buffered_poly.contains(pt):
                nearby_nodes.append((n_id, data['latitude'], data['longitude']))
                
        # Connect each nearby node to the centroid!
        for n_id, nlat, nlng in nearby_nodes:
            edge_exists = any(
                (e['from'] == c_id and e['to'] == n_id) or 
                (e['from'] == n_id and e['to'] == c_id) 
                for e in custom_data['edges']
            )
            if not edge_exists:
                dist = calc_dist(clat, clng, nlat, nlng)
                custom_data['edges'].append({
                    'from': n_id,
                    'to': c_id,
                    'distance': dist,
                    'thickness': 10.0,
                    'weight': dist / 10.0
                })

with open(CUSTOM_GRAPH_JSON, 'w') as f:
    json.dump(custom_data, f, indent=4)
    
print('Open Area routing meshes generated!')
