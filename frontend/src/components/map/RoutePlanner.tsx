import { useEffect, useState } from 'react';
import { NavigationAPI } from '../../api';
import { MapPin, Navigation2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RoutePlanner({
  initialDestinationNodeId,
  initialDestinationName
}: {
  initialDestinationNodeId?: string | null;
  initialDestinationName?: string | null;
}) {
  const [locations, setLocations] = useState<any[]>([]);
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>(initialDestinationNodeId || '');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await NavigationAPI.getSuggestions();
        setLocations(data);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const handleRoute = () => {
    if (source && destination) {
      const destName = locations.find(l => l.node_id.toString() === destination)?.name || '';
      navigate(`/map?source_node_id=${source}&destination_node_id=${destination}&destination=${encodeURIComponent(destName)}`);
    }
  };

  return (
    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-[1000] w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
      <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2 text-lg">
          <Navigation2 size={20} className="fill-white" /> Route Planner
        </h3>
      </div>
      
      <div className="p-5 space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Starting Point</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin size={18} className="text-blue-500" />
            </div>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-800 dark:text-white transition-shadow shadow-sm"
            >
              <option value="">Choose starting point...</option>
              <option value="gps" className="font-bold text-blue-600">📍 My Current Location</option>
              <optgroup label="Campus Locations">
                {locations.map((loc, i) => (
                  <option key={i} value={loc.node_id}>{loc.name} ({loc.type})</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="relative">
          {/* Vertical dotted line connector */}
          <div className="absolute -top-7 left-5 bottom-8 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-600 z-0"></div>
          
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 transition-colors ${!source && !initialDestinationNodeId ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>Destination</label>
          <div className="relative z-10">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className={!source && !initialDestinationNodeId ? 'text-slate-300 dark:text-slate-600' : 'text-red-500'} />
            </div>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={!source && !initialDestinationNodeId}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-800 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition-all shadow-sm"
            >
              <option value="">{initialDestinationName || 'Choose destination...'}</option>
              {locations.map((loc, i) => (
                <option key={i} value={loc.node_id}>{loc.name} ({loc.type})</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleRoute}
          disabled={!source || !destination}
          className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-sm"
        >
          <Navigation2 size={18} /> Plot Route
        </button>
      </div>
    </div>
  );
}
