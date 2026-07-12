import { useState, useEffect, useRef } from 'react';
import { Lock, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';

export function FriendSync() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);

  // Simulated Friend Location
  const [friendLat, setFriendLat] = useState(13.031836);
  const [friendLng, setFriendLng] = useState(80.179666);
  const [friendBearing, setFriendBearing] = useState(0);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === '1234') {
      setUnlocked(true);
      setError('');
    } else {
      setError('Invalid security code. Hint: Try 1234');
    }
  };

  // Simulate friend's movement
  useEffect(() => {
    if (!unlocked) return;

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      // Simple circle simulation
      const radius = 0.0005;
      const speed = 0.1;
      
      const nextLat = 13.031836 + radius * Math.sin(tick * speed);
      const nextLng = 80.179666 + radius * Math.cos(tick * speed);
      
      const bearing = Math.atan2(
        nextLng - friendLng,
        nextLat - friendLat
      ) * (180 / Math.PI);

      setFriendLat(nextLat);
      setFriendLng(nextLng);
      setFriendBearing(bearing);

    }, 1000);

    return () => clearInterval(interval);
  }, [unlocked, friendLat, friendLng]);

  // Keep camera on friend
  useEffect(() => {
    if (unlocked && mapRef.current) {
      const map = mapRef.current.getMap();
      map.easeTo({
        center: [friendLng, friendLat],
        zoom: 19,
        pitch: 60,
        bearing: friendBearing,
        duration: 1000,
        easing: (t) => t
      });
    }
  }, [unlocked, friendLat, friendLng, friendBearing]);

  if (!unlocked) {
    return (
      <div className="min-h-full bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full"></div>
        
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="relative z-10 bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl w-full max-w-sm text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-500/30">
            <Users size={40} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Friend Sync</h1>
          <p className="text-slate-400 text-sm mb-8">
            Connect securely to your friend's live GPS signal.
          </p>

          <form onSubmit={handleUnlock}>
            <div className="relative mb-6">
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Security Code"
                className="w-full bg-slate-900/50 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono tracking-[0.3em] text-lg text-center"
              />
            </div>
            
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all flex justify-center items-center gap-2 group"
            >
              Sync Connection <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-slate-900">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-[1000] flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => navigate('/')}
          className="pointer-events-auto p-3 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-white rounded-full transition-all border border-slate-700 shadow-xl"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-xl flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <span className="text-white font-bold text-sm tracking-wide">SYNC ACTIVE</span>
        </div>
      </div>

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 80.179666,
          latitude: 13.031836,
          zoom: 19,
          pitch: 60,
        }}
        mapStyle={{
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
              tileSize: 256,
              attribution: '&copy; CARTO'
            }
          },
          layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }]
        }}
        style={{ width: '100%', height: '100%' }}
        maxZoom={26}
        interactive={false} // Cinematographic view
      >
        <Marker
          longitude={friendLng}
          latitude={friendLat}
          anchor="center"
          rotationAlignment="map"
          rotation={friendBearing}
        >
          <div className="relative group">
            {/* 3D Avatar Marker */}
            <div className="w-16 h-16 rounded-full border-4 border-white shadow-[0_0_20px_rgba(59,130,246,0.6)] overflow-hidden transition-transform transform hover:scale-110">
              <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Friend" className="w-full h-full object-cover" />
            </div>
            
            {/* Name label that stays upright */}
            <div 
              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap shadow-lg border border-slate-700/50"
              style={{ transform: `translateX(-50%) rotate(${-friendBearing}deg)` }}
            >
              Alex
            </div>

            {/* Glowing ring underneath */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/20 border-2 border-blue-500/30 rounded-full scale-y-50 -z-10 blur-[2px]"></div>
          </div>
        </Marker>
      </Map>
    </div>
  );
}
