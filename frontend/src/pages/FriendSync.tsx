import { useState, useEffect, useRef } from 'react';
import { Users, ArrowLeft, Navigation2, ShieldCheck, X, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { apiClient } from '../api/axios';
import { useTelemetry } from '../hooks/useTelemetry';

export function FriendSync() {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);

  // Floating card states
  const [trackInput, setTrackInput] = useState('');
  const [trackError, setTrackError] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [sharedCode, setSharedCode] = useState(() => {
    // If they have a device ID that doesn't start with 'device_', it's a real shared code
    const id = sessionStorage.getItem('telemetry_device_id');
    return id && !id.startsWith('device_') ? id : '';
  });

  // Enable telemetry only if broadcasting and they have a code
  useTelemetry(isBroadcasting && !!sharedCode); 

  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [trackedCode, setTrackedCode] = useState('');
  const [friendName, setFriendName] = useState('');
  const [friendLat, setFriendLat] = useState(13.031836);
  const [friendLng, setFriendLng] = useState(80.179666);
  const [friendBearing, setFriendBearing] = useState(0);

  // New Share Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareName, setShareName] = useState('');
  const [shareRegNo, setShareRegNo] = useState('');
  const [shareAdminCode, setShareAdminCode] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  // Track submit
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput) return;
    setTrackError('');
    
    try {
      const res = await apiClient.get(`/telemetry/friend/${trackInput}`);
      setFriendName(res.data.name);
      setFriendLat(res.data.lat);
      setFriendLng(res.data.lng);
      setTrackedCode(trackInput);
      setIsTracking(true);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setTrackError(err.response.data.detail || 'Friend not found or not broadcasting');
      } else {
        setTrackError('Failed to connect to the server');
      }
    }
  };

  // Toggle broadcast
  const handleToggleBroadcast = async () => {
    if (!isBroadcasting) {
      if (!sharedCode) {
        setShowShareModal(true);
        return;
      }
      setIsBroadcasting(true);
    } else {
      setIsBroadcasting(false);
      try {
        await apiClient.post('/telemetry/stop', { device_id: sharedCode });
      } catch (err) {
        console.warn("Failed to send stop broadcast signal", err);
      }
    }
  };

  // Submit New Share
  const handleNewShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareName || !shareRegNo || !shareAdminCode) {
      setShareError('All fields are required');
      return;
    }
    setShareError('');
    setShareLoading(true);

    try {
      const res = await apiClient.post(`/telemetry/share`, {
        name: shareName,
        reg_no: shareRegNo,
        admin_code: shareAdminCode
      });
      const generatedCode = res.data.code;
      setSharedCode(generatedCode);
      sessionStorage.setItem('telemetry_device_id', generatedCode);
      
      setIsBroadcasting(true);
      setShowShareModal(false);
      
      // Clear form
      setShareName('');
      setShareRegNo('');
      setShareAdminCode('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setShareError('Invalid Security Code');
      } else {
        setShareError('Failed to generate sharing session');
      }
    } finally {
      setShareLoading(false);
    }
  };

  // Active Friends state
  const [activeFriends, setActiveFriends] = useState<any[]>([]);

  useEffect(() => {
    // Only poll for all friends if we are NOT tracking someone specifically
    if (isTracking) return;

    const fetchFriends = async () => {
      try {
        const res = await apiClient.get('/telemetry/active_friends');
        // Filter out our own device from the map display if desired, or just show it.
        setActiveFriends((res.data.friends || []).filter((f: any) => f.code !== sharedCode));
      } catch (e) {
        console.warn("Failed to fetch active friends", e);
      }
    };
    
    fetchFriends();
    const interval = setInterval(fetchFriends, 5000);
    return () => clearInterval(interval);
  }, [isTracking, sharedCode]);

  // Poll specific friend location
  useEffect(() => {
    if (!isTracking || !trackedCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/telemetry/friend/${trackedCode}`);
        const nextLat = res.data.lat;
        const nextLng = res.data.lng;
        
        const bearing = Math.atan2(
          nextLng - friendLng,
          nextLat - friendLat
        ) * (180 / Math.PI);

        setFriendLat(nextLat);
        setFriendLng(nextLng);
        if (Math.abs(nextLat - friendLat) > 0.000001 || Math.abs(nextLng - friendLng) > 0.000001) {
          setFriendBearing(bearing);
        }
      } catch (err) {
        console.warn('Lost connection to friend', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isTracking, trackedCode, friendLat, friendLng]);

  // Keep camera on friend
  useEffect(() => {
    if (isTracking && mapRef.current) {
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
  }, [isTracking, friendLat, friendLng, friendBearing]);

  return (
    <div className="w-full h-full relative bg-slate-900 overflow-hidden flex flex-col">
      {/* Header Back Button */}
      <div className="absolute top-6 left-6 z-[100]">
        <button 
          onClick={() => isTracking ? setIsTracking(false) : navigate('/')}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all border border-slate-700 shadow-xl"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Floating Card Top Right */}
      <div className="absolute top-6 right-6 z-[100] w-80 bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Users size={20} />
            </div>
            <h2 className="text-white font-bold text-lg">Friend Sync</h2>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Track Friend */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Track a Friend</label>
            <form onSubmit={handleTrack} className="flex gap-2">
              <input 
                type="text" 
                value={trackInput}
                onChange={e => setTrackInput(e.target.value.toUpperCase())}
                placeholder="CODE"
                className="w-full bg-slate-900/50 border border-slate-700 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono tracking-widest uppercase text-sm"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center"
              >
                <Navigation2 size={16} />
              </button>
            </form>
            {trackError && <p className="text-red-400 text-xs mt-2">{trackError}</p>}
          </div>

          <div className="h-px bg-slate-700/50 w-full"></div>

          {/* Share Location Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-bold text-slate-200">Broadcast Location</label>
              {sharedCode && isBroadcasting && (
                <p className="text-xs text-emerald-400 mt-1 font-mono tracking-widest font-bold">CODE: {sharedCode}</p>
              )}
              {sharedCode && !isBroadcasting && (
                <p className="text-xs text-slate-400 mt-1 font-mono tracking-widest">Ready ({sharedCode})</p>
              )}
            </div>
            
            <button 
              onClick={handleToggleBroadcast}
              className={`w-14 h-8 rounded-full p-1 transition-colors relative flex items-center ${isBroadcasting ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isBroadcasting ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div className="h-px bg-slate-700/50 w-full"></div>

          {/* New Share Location Button */}
          <button 
            onClick={() => setShowShareModal(true)}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-inner"
          >
            New Share Location
          </button>
        </div>
      </div>

      {/* New Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-600/20 to-teal-600/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-400" size={24} />
                <h3 className="text-xl font-bold text-white">Generate Code</h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-slate-400 text-sm">To generate a new location sharing code, please provide your details and the administrative security code.</p>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={shareName}
                  onChange={e => setShareName(e.target.value)}
                  placeholder="e.g. Alice Smith"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registration Number</label>
                <input 
                  type="text" 
                  value={shareRegNo}
                  onChange={e => setShareRegNo(e.target.value)}
                  placeholder="e.g. 21BCE1234"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Security Code</label>
                <input 
                  type="password" 
                  value={shareAdminCode}
                  onChange={e => setShareAdminCode(e.target.value)}
                  placeholder="Admin provided code"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              {shareError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center justify-center">
                  {shareError}
                </div>
              )}

              <button 
                onClick={handleNewShare}
                disabled={shareLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-50"
              >
                {shareLoading ? <Activity className="animate-spin" size={20} /> : 'Generate & Start Broadcasting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Info Overlay */}
      {isTracking && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </div>
          <span className="text-white font-bold tracking-wide">
            TRACKING <span className="text-blue-400">{friendName}</span>
          </span>
          <span className="text-slate-500 text-sm font-mono bg-slate-800 px-2 py-1 rounded">
            {trackedCode}
          </span>
        </div>
      )}

      <div className="flex-1 w-full h-full">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: 80.179666,
            latitude: 13.031836,
            zoom: 16,
            pitch: 0,
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
          interactive={!isTracking} 
        >
          {!isTracking && <NavigationControl position="bottom-right" />}

          {isTracking && (
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
                
                {/* Glowing ring underneath */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/20 border-2 border-blue-500/30 rounded-full scale-y-50 -z-10 blur-[2px]"></div>
              </div>
            </Marker>
          )}

          {/* Active Friends Markers (when not tracking a specific friend) */}
          {!isTracking && activeFriends.map(friend => (
            <Marker
              key={friend.code}
              longitude={friend.lng}
              latitude={friend.lat}
              anchor="center"
              rotationAlignment="map"
            >
              <div 
                className="relative group hover:z-50 cursor-pointer"
                onClick={() => {
                  setTrackInput(friend.code);
                  // We could auto-track here, but populating the code is good enough
                }}
              >
                {/* 3D Avatar Marker */}
                <div className="w-12 h-12 rounded-full border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] overflow-hidden bg-slate-800 flex items-center justify-center transition-transform transform group-hover:scale-110">
                  <span className="text-emerald-400 font-bold text-lg">{friend.name.charAt(0).toUpperCase()}</span>
                </div>
                
                {/* Name label */}
                <div 
                  className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap shadow-lg border border-slate-700/50"
                >
                  {friend.name}
                </div>
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}
