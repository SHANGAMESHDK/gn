import { useEffect, useState } from 'react';
import { NavigationAPI } from '../../api';
import { MapPin, Navigation2, Search, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(true);
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
    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-[1000] w-[calc(100vw-2rem)] sm:w-80 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all border border-[#C8A951]/10"
      style={{ background: 'rgba(26,10,14,0.92)', backdropFilter: 'blur(20px)' }}
    >
      <div
        className="bg-[#7B1113] p-4 text-white flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold flex items-center gap-2 text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
          <Navigation2 size={18} className="fill-[#C8A951] text-[#C8A951]" /> Route Planner
        </h3>
        {isExpanded ? <ChevronUp size={18} className="text-[#C8A951]" /> : <ChevronDown size={18} className="text-[#C8A951]" />}
      </div>

      {isExpanded && (
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#a09080] uppercase tracking-[0.15em] mb-2">Starting Point</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin size={16} className="text-[#C8A951]" />
              </div>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black/30 border border-[#C8A951]/15 rounded-xl focus:ring-2 focus:ring-[#C8A951]/20 focus:border-[#C8A951]/30 outline-none text-sm text-[#f0e8dc] transition-all"
              >
                <option value="" className="bg-[#1a0a0e]">Choose starting point...</option>
                <option value="gps" className="bg-[#1a0a0e] font-bold">📍 My Current Location</option>
                <optgroup label="Campus Locations">
                  {locations.map((loc, i) => (
                    <option key={i} value={loc.node_id} className="bg-[#1a0a0e]">{loc.name} ({loc.type})</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="relative">
            {/* Vertical dotted line connector */}
            <div className="absolute -top-6 left-5 bottom-8 w-0.5 border-l-2 border-dashed border-[#C8A951]/15 z-0"></div>

            <label className={`block text-[10px] font-bold uppercase tracking-[0.15em] mb-2 transition-colors ${!source && !initialDestinationNodeId ? 'text-[#5a4a3a]' : 'text-[#a09080]'}`}>Destination</label>
            <div className="relative z-10">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className={!source && !initialDestinationNodeId ? 'text-[#5a4a3a]' : 'text-[#7B1113]'} />
              </div>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={!source && !initialDestinationNodeId}
                className="w-full pl-10 pr-4 py-3 bg-black/30 border border-[#C8A951]/15 rounded-xl focus:ring-2 focus:ring-[#C8A951]/20 focus:border-[#C8A951]/30 outline-none text-sm text-[#f0e8dc] disabled:opacity-40 transition-all"
              >
                <option value="" className="bg-[#1a0a0e]">{initialDestinationName || 'Choose destination...'}</option>
                {locations.map((loc, i) => (
                  <option key={i} value={loc.node_id} className="bg-[#1a0a0e]">{loc.name} ({loc.type})</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleRoute}
            disabled={!source || !destination}
            className="w-full py-3 mt-2 bg-[#7B1113] hover:bg-[#9B1B30] active:bg-[#5a0c0e] text-white font-bold rounded-xl shadow-md shadow-[#7B1113]/20 hover:shadow-lg transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2 text-sm"
          >
            <Navigation2 size={16} /> Plot Route
          </button>
        </div>
      )}
    </div>
  );
}
