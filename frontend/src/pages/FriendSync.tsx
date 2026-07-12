import { useState, useEffect, useRef } from 'react';
import { Lock, Users, ArrowLeft, Share2, Navigation2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { apiClient } from '../api/axios';

export function FriendSync() {
  const [mode, setMode] = useState<'select' | 'track' | 'share_select' | 'share_new' | 'share_existing'>('select');
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Share form
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [sharedCode, setSharedCode] = useState('');
  
  // Existing code input
  const [existingCode, setExistingCode] = useState('');

  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);

  // Friend Location Data
  const [friendName, setFriendName] = useState('Friend');
  const [friendLat, setFriendLat] = useState(13.031836);
  const [friendLng, setFriendLng] = useState(80.179666);
  const [friendBearing, setFriendBearing] = useState(0);

  // Track a Friend submit
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setError('');
    
    try {
      const res = await apiClient.get(`/telemetry/friend/${code}`);
      setFriendName(res.data.name);
      setFriendLat(res.data.lat);
      setFriendLng(res.data.lng);
      setUnlocked(true);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(err.response.data.detail || 'Friend not found or not broadcasting');
      } else {
        setError('Failed to connect to the server');
      }
    }
  };

  // Share My Location submit (New)
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !regNo) {
      setError('Please fill all fields');
      return;
    }
    setError('');
    setSuccessMsg('');

    try {
      const res = await apiClient.post(`/telemetry/share`, {
        name,
        reg_no: regNo
      });
      const generatedCode = res.data.code;
      setSharedCode(generatedCode);
      
      // Update session storage so useTelemetry broadcasts under this new code
      sessionStorage.setItem('telemetry_device_id', generatedCode);
      
      setSuccessMsg(`You are now broadcasting! Your code is: ${generatedCode}`);
    } catch (err: any) {
      setError('Failed to share location');
    }
  };

  // Share Existing Location submit
  const handleShareExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingCode) return;
    setError('');
    setSuccessMsg('');

    try {
      const res = await apiClient.get(`/telemetry/validate/${existingCode}`);
      if (res.data.valid) {
        sessionStorage.setItem('telemetry_device_id', existingCode);
        setSuccessMsg(`Welcome back ${res.data.name}! You are now broadcasting with code: ${existingCode}`);
        setSharedCode(existingCode);
      }
    } catch (err: any) {
      setError('Invalid tracking code');
    }
  };

  // Poll friend's location every 5 seconds if unlocked
  useEffect(() => {
    if (!unlocked || !code) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/telemetry/friend/${code}`);
        
        const nextLat = res.data.lat;
        const nextLng = res.data.lng;
        
        // Calculate bearing between previous and next for rotation
        const bearing = Math.atan2(
          nextLng - friendLng,
          nextLat - friendLat
        ) * (180 / Math.PI);

        setFriendLat(nextLat);
        setFriendLng(nextLng);
        // Only update bearing if they actually moved to prevent snapping back to 0
        if (Math.abs(nextLat - friendLat) > 0.000001 || Math.abs(nextLng - friendLng) > 0.000001) {
          setFriendBearing(bearing);
        }
      } catch (err) {
        console.warn('Lost connection to friend', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [unlocked, code, friendLat, friendLng]);

  // Keep camera on friend
  useEffect(() => {
    if (unlocked && mapRef.current) {
      const map = mapRef.current.getMap();
      map.easeTo({
        center: [friendLng, friendLat],
        zoom: 19,
        pitch: 60,
        bearing: friendBearing,
        duration: 1500,
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
          onClick={() => {
            if (mode === 'select') navigate('/');
            else if (mode === 'share_new' || mode === 'share_existing') {
              setMode('share_select');
              setError('');
              setSuccessMsg('');
              setSharedCode('');
            }
            else {
              setMode('select');
              setError('');
              setSuccessMsg('');
            }
          }}
          className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-20"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="relative z-10 bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl w-full max-w-sm text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-500/30">
            <Users size={40} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Friend Sync</h1>
          <p className="text-slate-400 text-sm mb-8">
            {mode === 'select' && "Choose how you want to connect"}
            {mode === 'track' && "Enter your friend's code to track them"}
            {mode === 'share_select' && "Do you already have a tracking code?"}
            {mode === 'share_new' && "Generate a new tracking code"}
            {mode === 'share_existing' && "Enter your existing tracking code"}
          </p>

          {mode === 'select' && (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setMode('track')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all flex justify-center items-center gap-2 group"
              >
                <Navigation2 size={20} /> Track a Friend
              </button>
              
              <button
                onClick={() => setMode('share_select')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all flex justify-center items-center gap-2 group"
              >
                <Share2 size={20} /> Share My Location
              </button>
            </div>
          )}

          {mode === 'share_select' && (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setMode('share_new')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex justify-center items-center gap-2"
              >
                Generate New Code
              </button>
              
              <button
                onClick={() => setMode('share_existing')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2"
              >
                I Already Have a Code
              </button>
            </div>
          )}

          {mode === 'track' && (
            <form onSubmit={handleTrack}>
              <div className="relative mb-6">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CODE (e.g. X7K9A2)"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono tracking-[0.2em] text-lg text-center uppercase"
                />
              </div>
              
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex justify-center items-center gap-2 group"
              >
                Sync Connection <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={20} />
              </button>
            </form>
          )}

          {mode === 'share_new' && (
            <form onSubmit={handleShare}>
              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="Registration Number"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
              
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              {!sharedCode ? (
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex justify-center items-center gap-2"
                >
                  Generate Code
                </button>
              ) : (
                <div className="bg-slate-900/80 p-6 rounded-xl border border-emerald-500/30">
                  <p className="text-emerald-400 text-sm mb-2">{successMsg}</p>
                  <p className="text-3xl font-mono text-white tracking-[0.2em] font-bold">
                    {sharedCode}
                  </p>
                </div>
              )}
            </form>
          )}

          {mode === 'share_existing' && (
            <form onSubmit={handleShareExisting}>
              <div className="relative mb-6">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={existingCode}
                  onChange={(e) => setExistingCode(e.target.value.toUpperCase())}
                  placeholder="CODE (e.g. X7K9A2)"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono tracking-[0.2em] text-lg text-center uppercase"
                />
              </div>
              
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              {!sharedCode ? (
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex justify-center items-center gap-2"
                >
                  Start Broadcasting
                </button>
              ) : (
                <div className="bg-slate-900/80 p-6 rounded-xl border border-emerald-500/30">
                  <p className="text-emerald-400 text-sm mb-2">{successMsg}</p>
                  <p className="text-3xl font-mono text-white tracking-[0.2em] font-bold">
                    {sharedCode}
                  </p>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-slate-900">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-[1000] flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => setUnlocked(false)}
          className="pointer-events-auto p-3 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-white rounded-full transition-all border border-slate-700 shadow-xl"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-xl flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <span className="text-white font-bold text-sm tracking-wide">TRACKING: {code}</span>
        </div>
      </div>

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: friendLng,
          latitude: friendLat,
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
              {friendName}
            </div>

            {/* Glowing ring underneath */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/20 border-2 border-blue-500/30 rounded-full scale-y-50 -z-10 blur-[2px]"></div>
          </div>
        </Marker>
      </Map>
    </div>
  );
}
