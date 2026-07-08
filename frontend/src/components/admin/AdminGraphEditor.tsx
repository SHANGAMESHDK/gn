import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, Polyline, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AdminAPI } from '../../api';
import { Trash2, Link as LinkIcon, MapPin, RefreshCw, Building } from 'lucide-react';
import { apiClient } from '../../api/axios';

function EditorMapEvents({ 
  mode, 
  onMapClick 
}: { 
  mode: 'view' | 'node' | 'edge' | 'moveNode' | 'buildings', 
  onMapClick: (latlng: L.LatLng) => void 
}) {
  useMapEvents({
    click(e) {
      if (mode === 'node' || mode === 'moveNode') {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

export function AdminGraphEditor({ onClose }: { onClose: () => void }) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [showEdges, setShowEdges] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Master Mode: 'graph' or 'buildings'
  const [masterMode, setMasterMode] = useState<'graph' | 'buildings'>('graph');
  
  const [mode, setMode] = useState<'view' | 'node' | 'edge' | 'moveNode'>('view');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<any>(null);
  
  const [selectedEdgeDetails, setSelectedEdgeDetails] = useState<any>(null);
  const [edgeThicknessInput, setEdgeThicknessInput] = useState<number>(3.0);

  // Buildings state
  const [buildingsGeoJSON, setBuildingsGeoJSON] = useState<any>(null);
  const [geoJSONKey, setGeoJSONKey] = useState(Date.now());
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [buildingNameInput, setBuildingNameInput] = useState<string>('');
  const [buildingHeightInput, setBuildingHeightInput] = useState<number>(0);
  const [buildingColorInput, setBuildingColorInput] = useState<string>('');
  const [buildingWalkableInput, setBuildingWalkableInput] = useState<boolean>(false);

  const center: [number, number] = [13.031836, 80.179666];

  async function loadNodes() {
    setLoading(true);
    try {
      const data = await AdminAPI.getGraphInfo();
      setNodes(data.nodes.filter((n: any) => n.lat && n.lng));
      setEdges(data.edges || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load graph nodes");
    } finally {
      setLoading(false);
    }
  }

  async function loadBuildings() {
    try {
      const response = await apiClient.get('/buildings/geojson');
      setBuildingsGeoJSON(response.data);
      setGeoJSONKey(Date.now());
    } catch (e) {
      console.error("Failed to load buildings", e);
    }
  }

  useEffect(() => {
    if (masterMode === 'graph') {
      loadNodes();
    } else {
      loadBuildings();
      setSelectedBuilding(null);
    }
  }, [masterMode]);
  
  useEffect(() => {
    if (mode !== 'view') {
      setSelectedNodeDetails(null);
      setSelectedEdgeDetails(null);
    }
  }, [mode]);

  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach(n => map.set(String(n.id), n));
    return map;
  }, [nodes]);

  async function handleMapClick(latlng: L.LatLng) {
    if (masterMode === 'buildings') return;

    if (mode === 'node') {
      const name = prompt("Enter a name for this custom node:");
      if (!name) return;
      
      try {
        await AdminAPI.addCustomNode({ name, lat: latlng.lat, lng: latlng.lng });
        await loadNodes();
      } catch (e: any) {
        alert("Failed to add node: " + e.message);
      }
    } else if (mode === 'moveNode' && selectedNodeId) {
      if (confirm(`Move Node ${selectedNodeId} to these coordinates?`)) {
        try {
          await AdminAPI.customNodeOverride({
            id: selectedNodeId,
            action: 'update',
            lat: latlng.lat,
            lng: latlng.lng
          });
          await loadNodes();
          setMode('view');
          setSelectedNodeDetails(null);
          setSelectedEdgeDetails(null);
        } catch (e: any) {
          alert("Failed to move node: " + e.message);
        }
      }
    }
  }

  async function handleNodeClick(nodeId: number, lat: number, lng: number) {
    if (masterMode === 'buildings') return;

    if (mode === 'view') {
      const node = nodeMap.get(String(nodeId));
      setSelectedEdgeDetails(null);
      setSelectedNodeDetails(node || null);
    } else if (mode === 'edge') {
      if (selectedNodeId === null) {
        setSelectedNodeId(nodeId);
      } else {
        if (selectedNodeId === nodeId) {
          setSelectedNodeId(null);
          return;
        }
        
        const selectedNode = nodeMap.get(String(selectedNodeId));
        if (selectedNode) {
          const pt1 = L.latLng(selectedNode.lat, selectedNode.lng);
          const pt2 = L.latLng(lat, lng);
          const dist = pt1.distanceTo(pt2);
          
          if (confirm(`Create edge from Node ${selectedNodeId} to Node ${nodeId}? Distance: ${Math.round(dist)}m`)) {
            try {
              await AdminAPI.addCustomEdge({ from: selectedNodeId, to: nodeId, weight: dist });
              await loadNodes();
            } catch (e: any) {
              alert("Failed to add edge: " + e.message);
            }
          }
        }
        setSelectedNodeId(null);
      }
    }
  }

  async function handleClearCustom() {
    if (confirm("Are you sure you want to delete ALL custom nodes and edges? This cannot be undone.")) {
      try {
        await AdminAPI.clearCustomGraph();
        setSelectedNodeDetails(null);
        setSelectedEdgeDetails(null);
        await loadNodes();
      } catch (e: any) {
        alert("Failed to clear custom graph: " + e.message);
      }
    }
  }

  async function handleOverrideAction(action: 'delete' | 'rename') {
    if (!selectedNodeDetails) return;
    
    let newName = selectedNodeDetails.name;
    if (action === 'rename') {
      const p = prompt("Enter new name:", selectedNodeDetails.name);
      if (!p || p === selectedNodeDetails.name) return;
      newName = p;
    } else if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete Node ${selectedNodeDetails.id}?`)) return;
    }

    try {
      if (action === 'delete') {
        await AdminAPI.customNodeOverride({ id: selectedNodeDetails.id, action: 'delete' });
        setSelectedNodeDetails(null);
      } else {
        await AdminAPI.customNodeOverride({ id: selectedNodeDetails.id, action: 'update', name: newName });
        setSelectedNodeDetails(null);
      }
      await loadNodes();
    } catch (e: any) {
      alert(`Failed to ${action} node: ${e.message}`);
    }
  }

  async function handleEdgeOverrideAction(action: 'delete' | 'update') {
    if (!selectedEdgeDetails) return;
    
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete Edge ${selectedEdgeDetails.from} → ${selectedEdgeDetails.to}?`)) return;
    }
    
    try {
      if (action === 'delete') {
        await AdminAPI.customEdgeOverride({ from: selectedEdgeDetails.from, to: selectedEdgeDetails.to, action: 'delete' });
        setSelectedEdgeDetails(null);
      } else {
        await AdminAPI.customEdgeOverride({ from: selectedEdgeDetails.from, to: selectedEdgeDetails.to, action: 'update', thickness: Number(edgeThicknessInput) });
        setSelectedEdgeDetails(null);
      }
      await loadNodes();
    } catch (e: any) {
      alert(`Failed to ${action} edge: ${e.message}`);
    }
  }

  async function saveBuilding() {
    if (!selectedBuilding) return;
    try {
      await AdminAPI.customBuildingOverride({ 
        id: selectedBuilding.properties.id, 
        Name: buildingNameInput,
        height: buildingHeightInput,
        color: buildingColorInput,
        walkable: buildingWalkableInput
      });
      await loadBuildings();
      alert("Building updated!");
    } catch (e: any) {
      alert("Failed to save building: " + e.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
        
        {/* Header Tools */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Admin Panel</h2>
            
            {/* Master Toggle */}
            <div className="flex bg-slate-200 dark:bg-slate-900 rounded-lg p-1 mr-4">
              <button 
                onClick={() => setMasterMode('graph')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${masterMode === 'graph' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Graph Routes
              </button>
              <button 
                onClick={() => setMasterMode('buildings')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${masterMode === 'buildings' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                3D Buildings
              </button>
            </div>

            {masterMode === 'graph' && (
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                <button 
                  onClick={() => { setMode('view'); setSelectedNodeId(null); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'view' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                  Select Node
                </button>
                <button 
                  onClick={() => { setMode('node'); setSelectedNodeId(null); }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'node' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <MapPin size={16} /> Add Node
                </button>
                <button 
                  onClick={() => { setMode('edge'); setSelectedNodeId(null); }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'edge' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LinkIcon size={16} /> Draw Edge
                </button>
              </div>
            )}
            
            {masterMode === 'graph' && (
              <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 rounded-lg px-4 py-1.5 h-[32px]">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                  <input 
                    type="checkbox" 
                    checked={showEdges} 
                    onChange={e => setShowEdges(e.target.checked)} 
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                  />
                  Show Edges
                </label>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {masterMode === 'graph' && (
              <button onClick={handleClearCustom} className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash2 size={16} /> Clear Custom Graph
              </button>
            )}
            <button onClick={onClose} className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
              Close
            </button>
          </div>
        </div>
        
        {/* Map Area */}
        <div className="flex-1 relative flex">
          {masterMode === 'graph' && mode === 'node' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium pointer-events-none animate-pulse">
              Click anywhere on the map to add a Custom Node
            </div>
          )}
          {masterMode === 'graph' && mode === 'edge' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium pointer-events-none">
              {selectedNodeId ? `Node ${selectedNodeId} selected. Click another node to link them.` : 'Click a node to start drawing an edge'}
            </div>
          )}
          {masterMode === 'buildings' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium pointer-events-none">
              Click any building footprint to edit its 3D properties
            </div>
          )}
          
          {loading && (
            <div className="absolute inset-0 z-[2000] bg-white/50 flex items-center justify-center">
              <RefreshCw className="animate-spin text-blue-600" size={32} />
            </div>
          )}

          <MapContainer center={center} zoom={18} className="w-full h-full z-0 cursor-crosshair">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* BUILDINGS LAYER */}
            {masterMode === 'buildings' && buildingsGeoJSON && (
              <GeoJSON
                key={geoJSONKey}
                data={buildingsGeoJSON}
                style={(feature) => ({
                  color: feature?.properties?.color || '#3388ff',
                  weight: 2,
                  fillOpacity: selectedBuilding?.properties?.id === feature?.properties?.id ? 0.8 : 0.4
                })}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    click: () => {
                      setSelectedBuilding(feature);
                      setBuildingNameInput(feature.properties?.Name || "");
                      setBuildingHeightInput(feature.properties?.height || 0);
                      setBuildingColorInput(feature.properties?.color || "#e2e8f0");
                      setBuildingWalkableInput(feature.properties?.walkable || false);
                    }
                  });
                }}
              />
            )}

            {/* EDGES LAYER */}
            {masterMode === 'graph' && showEdges && edges.map((e, idx) => {
              const u = nodeMap.get(String(e.from));
              const v = nodeMap.get(String(e.to));
              const isSelectedEdge = selectedEdgeDetails?.from === e.from && selectedEdgeDetails?.to === e.to;
              
              if (u && v) {
                return (
                  <Polyline 
                    key={`edge-${idx}`} 
                    positions={[[u.lat, u.lng], [v.lat, v.lng]]}
                    color={isSelectedEdge ? "#f59e0b" : "#94a3b8"} 
                    weight={isSelectedEdge ? Math.max(5, (e.thickness || 3) + 2) : (e.thickness || 3)} 
                    opacity={isSelectedEdge ? 1 : 0.6}
                    eventHandlers={{
                      click: () => {
                        if (mode === 'view') {
                          setSelectedNodeDetails(null);
                          setSelectedEdgeDetails(e);
                          setEdgeThicknessInput(e.thickness || 3.0);
                        }
                      }
                    }}
                  />
                );
              }
              return null;
            })}

            <EditorMapEvents mode={masterMode === 'graph' ? mode : 'view'} onMapClick={handleMapClick} />
            
            {/* NODES LAYER */}
            {masterMode === 'graph' && nodes.map(node => {
              const isCustom = node.type === 'Custom';
              const isSelected = selectedNodeId === node.id;
              
              return (
                <CircleMarker 
                  key={node.id}
                  center={[node.lat, node.lng]} 
                  radius={isSelected ? 10 : isCustom ? 7 : 5}
                  pathOptions={{ 
                    fillColor: isSelected ? '#a855f7' : isCustom ? '#f59e0b' : '#3b82f6', 
                    color: isSelected ? 'white' : 'transparent', 
                    weight: 2, 
                    fillOpacity: 1 
                  }}
                  eventHandlers={{
                    click: () => handleNodeClick(node.id, node.lat, node.lng)
                  }}
                >
                  <Popup>
                    <div className="font-bold">{node.name}</div>
                    <div className="text-xs text-slate-500">ID: {node.id}</div>
                    <div className="text-xs text-slate-500">Type: {node.type}</div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Node Properties Panel */}
          {masterMode === 'graph' && mode === 'view' && selectedNodeDetails && (
            <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto">
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">Node Properties</h3>
                <p className="text-sm text-slate-500">ID: {selectedNodeDetails.id}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Name</label>
                  <div className="text-slate-800 dark:text-slate-200 font-medium break-words">{selectedNodeDetails.name}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Type</label>
                  <div className="text-slate-800 dark:text-slate-200 font-medium">{selectedNodeDetails.type}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleOverrideAction('rename')}
                  className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-lg font-medium transition-colors"
                >
                  Rename Node
                </button>
                <button 
                  onClick={() => { setMode('moveNode'); setSelectedNodeId(selectedNodeDetails.id); }}
                  className="w-full py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60 rounded-lg font-medium transition-colors"
                >
                  Move Node
                </button>
                <button 
                  onClick={() => handleOverrideAction('delete')}
                  className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 rounded-lg font-medium transition-colors mt-4 border border-red-200 dark:border-red-900"
                >
                  Delete Node
                </button>
              </div>
            </div>
          )}

          {/* Edge Properties Panel */}
          {masterMode === 'graph' && mode === 'view' && selectedEdgeDetails && (
            <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto">
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">Edge Properties</h3>
                <p className="text-sm text-slate-500">From {selectedEdgeDetails.from} to {selectedEdgeDetails.to}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Road Thickness (m)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={edgeThicknessInput}
                    onChange={e => setEdgeThicknessInput(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-2">Wider roads are prioritized by the routing engine.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleEdgeOverrideAction('update')}
                  className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-lg font-medium transition-colors"
                >
                  Update Weight
                </button>
                <button 
                  onClick={() => handleEdgeOverrideAction('delete')}
                  className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 rounded-lg font-medium transition-colors mt-4 border border-red-200 dark:border-red-900"
                >
                  Delete Edge
                </button>
              </div>
            </div>
          )}

          {/* Building Properties Panel */}
          {masterMode === 'buildings' && selectedBuilding && (
            <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto">
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Building size={20} className="text-emerald-500" />
                  Building Override
                </h3>
                <p className="text-sm text-slate-500">ID: {selectedBuilding.properties.id}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={buildingNameInput}
                    onChange={e => setBuildingNameInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">3D Extrusion Height</label>
                    <span className="text-sm font-bold text-emerald-600">{buildingHeightInput}m</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={buildingHeightInput}
                    onChange={e => setBuildingHeightInput(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                    disabled={buildingWalkableInput}
                  />
                  <p className="text-xs text-slate-400 mt-1">Set to 0m for grounds/parkings.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Color HEX</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={buildingColorInput}
                      onChange={e => setBuildingColorInput(e.target.value)}
                      className="w-10 h-10 rounded border-0 p-0 cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={buildingColorInput}
                      onChange={e => setBuildingColorInput(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={buildingWalkableInput}
                      onChange={e => {
                        setBuildingWalkableInput(e.target.checked);
                        if (e.target.checked) setBuildingHeightInput(0);
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                    />
                    Walkable Area
                  </label>
                  <p className="text-xs text-slate-400 mt-1 pl-6">
                    If enabled, a routing mesh will be generated across this area so users can walk straight through it.
                  </p>
                </div>
              </div>

              <button 
                onClick={saveBuilding}
                className="w-full py-3 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-emerald-500/30"
              >
                Save Overrides
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
