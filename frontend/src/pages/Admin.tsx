import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { AdminAPI, StallsAPI, BuildingsAPI, EventsAPI } from '../api';
import { Activity, Database, GitMerge, RefreshCw, Trash2, Edit, MapPin, Network, Lock, ShieldCheck } from 'lucide-react';
import { AdminStallPlacer } from '../components/admin/AdminStallPlacer';
import { AdminGraphEditor } from '../components/admin/AdminGraphEditor';
import { AdminEditModal } from '../components/admin/AdminEditModal';

export function Admin() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlacer, setShowPlacer] = useState(false);
  const [showGraphEditor, setShowGraphEditor] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<'building' | 'stall' | 'event' | null>(null);
  const [securityCodeInput, setSecurityCodeInput] = useState('');
  const [proximityThresholdInput, setProximityThresholdInput] = useState(25);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, stallsData, buildingsData, eventsData, settingsData] = await Promise.all([
        AdminAPI.getStatus(),
        StallsAPI.getAllStalls(),
        BuildingsAPI.getAllBuildings(),
        EventsAPI.getAllEvents(),
        AdminAPI.getSettings()
      ]);
      setStats(statsData);
      setStalls(stallsData.stalls || []);
      setBuildings(buildingsData.buildings || []);
      setEvents(eventsData || []);
      setSecurityCodeInput(settingsData?.friendsync_security_code || '');
      setProximityThresholdInput(settingsData?.building_proximity_threshold ?? 25);
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
      await AdminAPI.updateSettings({ 
        friendsync_security_code: securityCodeInput,
        building_proximity_threshold: Number(proximityThresholdInput)
      });
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

  async function handleDeleteEvent(id: string) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await EventsAPI.deleteEvent(id);
      setEvents(events.filter(e => e.id !== id));
    } catch (err: any) {
      alert("Failed to delete event: " + err.message);
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
      } else if (editingType === 'event') {
        if (data.id) {
          const updatedEvent = await EventsAPI.updateEvent(data.id, data as any);
          setEvents(events.map(e => e.id === data.id ? updatedEvent : e));
        } else {
          const newEvent = await EventsAPI.createEvent(data as any);
          setEvents([...events, newEvent]);
        }
      }
    } catch (err: any) {
      alert("Failed to save: " + err.message);
      throw err;
    }
  }

  if (!firebaseUser) {
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
          <div className="p-8 space-y-6 text-center">
            <p className="text-slate-600 dark:text-slate-300">
              Please sign in using the Google Single Sign-On (SSO) button in the sidebar to access the Admin Gateway.
            </p>
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

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <MapPin size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Building Proximity Threshold</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Radius in meters to trigger 'You are in X Block' notification.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                value={proximityThresholdInput}
                onChange={e => setProximityThresholdInput(Number(e.target.value))}
                className="w-24 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
              />
              <span className="text-slate-500 font-medium mr-2">meters</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      
      {/* Events Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Events Management</h2>
          <button 
            onClick={() => { setEditingItem({}); setEditingType('event'); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            + Add Event
          </button>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium">Time</th>
                <th className="p-4 font-medium">Organizer</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-4 font-medium text-slate-800 dark:text-white">{event.title}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{event.building_id}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{event.time}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{event.organizer}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${event.is_live ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {event.is_live ? 'Live' : 'Upcoming/Past'}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingItem({ ...event, name: event.title }); setEditingType('event'); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No events found.</td>
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
