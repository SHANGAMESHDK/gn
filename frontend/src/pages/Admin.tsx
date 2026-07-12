import { useEffect, useState } from 'react';
import { AdminAPI, StallsAPI, BuildingsAPI } from '../api';
import { Activity, Database, GitMerge, RefreshCw, Trash2, Edit, MapPin, Network, Lock, ShieldCheck } from 'lucide-react';
import { AdminStallPlacer } from '../components/admin/AdminStallPlacer';
import { AdminGraphEditor } from '../components/admin/AdminGraphEditor';
import { AdminEditModal } from '../components/admin/AdminEditModal';

export function Admin() {
  const [stats, setStats] = useState<any>(null);
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlacer, setShowPlacer] = useState(false);
  const [showGraphEditor, setShowGraphEditor] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<'building' | 'stall' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [securityCodeInput, setSecurityCodeInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid credentials');
    }
  };

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, stallsData, buildingsData, settingsData] = await Promise.all([
        AdminAPI.getStatus(),
        StallsAPI.getAllStalls(),
        BuildingsAPI.getAllBuildings(),
        AdminAPI.getSettings()
      ]);
      setStats(statsData);
      setStalls(stallsData.stalls || []);
      setBuildings(buildingsData.buildings || []);
      setSecurityCodeInput(settingsData?.friendsync_security_code || '');
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

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      await AdminAPI.updateSettings({ friendsync_security_code: securityCodeInput });
      alert("Settings saved successfully!");
      await loadData();
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSavingSettings(false);
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

  async function handleSaveItem(data: any) {
    try {
      if (editingType === 'stall') {
        await StallsAPI.updateStall(data);
        setStalls(stalls.map(s => s.id === data.id ? data : s));
      } else if (editingType === 'building') {
        await BuildingsAPI.updateBuildingOverride(data);
        setBuildings(buildings.map(b => b.id === data.id ? { ...b, ...data } : b));
      }
    } catch (err: any) {
      alert("Failed to save: " + err.message);
      throw err;
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all hover:scale-[1.01]">
          <div className="p-8 text-center bg-gradient-to-br from-indigo-600 to-blue-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
            <ShieldCheck className="mx-auto text-white mb-4 drop-shadow-md" size={56} />
            <h2 className="text-3xl font-black text-white tracking-tight">Admin Gateway</h2>
            <p className="text-indigo-100 mt-2 font-medium">Secure Access Only</p>
          </div>
          <div className="p-8 space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {authError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl text-center animate-pulse">
                  {authError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-medium"
                  placeholder="Enter admin username"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2"
              >
                <Lock size={18} /> Authenticate
              </button>
            </form>
          </div>
        </div>
      </div>
    );
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
        <div className="mb-10 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Friend Sync Security Code</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">This code is required for users to generate a new sharing session.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                value={securityCodeInput}
                onChange={e => setSecurityCodeInput(e.target.value)}
                placeholder="Security Code"
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold uppercase"
              />
              <button 
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {savingSettings ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
                Save
              </button>
            </div>
          </div>

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
                    <button onClick={() => { setEditingItem(stall); setEditingType('stall'); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
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
      
      {/* Buildings Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Buildings Management</h2>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Has Description</th>
                <th className="p-4 font-medium">Has Photo</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map(building => (
                <tr key={building.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{building.id}</td>
                  <td className="p-4 font-medium text-slate-800 dark:text-white">{building.name || building.Name}</td>
                  <td className="p-4 text-slate-500">{building.description ? 'Yes' : 'No'}</td>
                  <td className="p-4 text-slate-500">{building.cover_photo ? 'Yes' : 'No'}</td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingItem(building); setEditingType('building'); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {buildings.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No buildings found.</td>
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

      {editingItem && editingType && (
        <AdminEditModal 
          isOpen={!!editingItem}
          initialData={editingItem} 
          type={editingType} 
          onSave={handleSaveItem} 
          onClose={() => { setEditingItem(null); setEditingType(null); }} 
        />
      )}
    </div>
  );
}
