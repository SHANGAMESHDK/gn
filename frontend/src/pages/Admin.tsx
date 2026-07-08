import { useEffect, useState } from 'react';
import { AdminAPI, StallsAPI } from '../api';
import { Activity, Database, GitMerge, RefreshCw, Trash2, Edit, MapPin, Network } from 'lucide-react';
import { AdminStallPlacer } from '../components/admin/AdminStallPlacer';
import { AdminGraphEditor } from '../components/admin/AdminGraphEditor';

export function Admin() {
  const [stats, setStats] = useState<any>(null);
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlacer, setShowPlacer] = useState(false);
  const [showGraphEditor, setShowGraphEditor] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, stallsData] = await Promise.all([
        AdminAPI.getStatus(),
        StallsAPI.getAllStalls()
      ]);
      setStats(statsData);
      setStalls(stallsData.stalls || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch admin data from backend.');
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleReloadGraph() {
    setReloading(true);
    try {
      await AdminAPI.reloadGraph();
      await loadData();
      alert("Map graph reloaded successfully!");
    } catch (err: any) {
      alert("Failed to reload graph: " + err.message);
    } finally {
      setReloading(false);
    }
  }

  async function handleDeleteStall(id: number) {
    if (!window.confirm("Are you sure you want to delete this stall?")) return;
    try {
      await StallsAPI.deleteStall(id);
      setStalls(stalls.filter(s => s.id !== id));
    } catch (err: any) {
      alert("Failed to delete stall: " + err.message);
    }
  }

  async function handleSaveStall(lat: number, lng: number, name: string, category: string) {
    const newStall = {
      name,
      description: "Added via Map Interface",
      category,
      building: "Custom Location",
      floor: 0,
      node_id: null,
      latitude: lat,
      longitude: lng,
      status: "active",
      opening_time: "09:00",
      closing_time: "17:00"
    };
    try {
      const res = await StallsAPI.createStall(newStall);
      setStalls([...stalls, res.stall]);
      setShowPlacer(false);
    } catch (err: any) {
      alert("Failed to create stall: " + err.message);
    }
  }

  return (
    <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Database size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">System Admin</h1>
        </div>
        
        <button 
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-6 shadow-sm">
          <strong>Backend Connection Error:</strong> {error}
        </div>
      )}
      
      {stats && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">System Controls & Status</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowGraphEditor(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm rounded-lg transition-colors text-sm font-medium"
              >
                <Network size={16} />
                Edit Routing Graph
              </button>
              <button 
                onClick={handleReloadGraph}
                disabled={reloading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <RefreshCw size={16} className={reloading ? "animate-spin" : ""} />
                {reloading ? "Reloading..." : "Reload Map Data"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="text-green-500" size={20} />
                <h3 className="font-medium text-slate-500 dark:text-slate-400">Backend Status</h3>
              </div>
              <p className="text-3xl font-bold capitalize text-slate-800 dark:text-white">
                {stats.status}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500"></div>
                <h3 className="font-medium text-slate-500 dark:text-slate-400">Total Nodes</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">
                {stats.nodes}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <GitMerge className="text-purple-500" size={20} />
                <h3 className="font-medium text-slate-500 dark:text-slate-400">Total Edges</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">
                {stats.edges}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${stats.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <h3 className="font-medium text-slate-500 dark:text-slate-400">Graph Connectivity</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">
                {stats.connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stalls Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Stalls Management</h2>
          <button 
            onClick={() => setShowPlacer(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <MapPin size={16} /> Place on Map
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Node ID</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stalls.map(stall => (
                <tr key={stall.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-4 text-slate-600 dark:text-slate-300">#{stall.id}</td>
                  <td className="p-4 font-medium text-slate-800 dark:text-white">{stall.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300">
                      {stall.category}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                    {stall.node_id ? `Node: ${stall.node_id}` : stall.latitude ? `Lat: ${stall.latitude.toFixed(4)}, Lng: ${stall.longitude.toFixed(4)}` : 'Unknown'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${stall.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {stall.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Edit (Coming soon)">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteStall(stall.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {stalls.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No stalls found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {!stats && loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {showPlacer && (
        <AdminStallPlacer 
          onSave={handleSaveStall} 
          onCancel={() => setShowPlacer(false)} 
        />
      )}

      {showGraphEditor && (
        <AdminGraphEditor 
          onClose={() => setShowGraphEditor(false)} 
        />
      )}
    </div>
  );
}
