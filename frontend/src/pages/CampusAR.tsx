import { useEffect, useState, useRef } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { apiClient } from '../api/axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWebcam } from '../hooks/useWebcam';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { calculateBearing } from '../hooks/useNavigationDirections';
import { NavigationAPI } from '../api';

interface ARPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  distance: number;
}

// Mobile cameras typically have roughly a 60-70 degree horizontal Field of View
const FOV = 60; 
const MAX_DISTANCE = 150; // meters

// Helper for distance calculation
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d * 1000; 
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export function CampusAR() {
  const { latitude, longitude, error: gpsError } = useGeolocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { error: camError } = useWebcam(videoRef);
  const { heading, needsPermission, permissionGranted, requestPermission, error: orientationError } = useDeviceOrientation();
  
  const [pois, setPois] = useState<ARPoi[]>([]);
  const [routeWaypoints, setRouteWaypoints] = useState<any[]>([]);
  const [destinationName, setDestinationName] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destNodeId = searchParams.get('destination_node_id');
  const destNameParam = searchParams.get('destination');

  // Central coordinates for testing
  const SIMULATED_LAT = 13.031836;
  const SIMULATED_LNG = 80.179666;

  const activeLat = simulationMode ? SIMULATED_LAT : latitude;
  const activeLng = simulationMode ? SIMULATED_LNG : longitude;

  useEffect(() => {
    if (activeLat && activeLng) {
      if (destNodeId) {
        if (destNameParam) setDestinationName(destNameParam);
        fetchRoute(activeLat, activeLng, parseInt(destNodeId));
      } else {
        fetchNearbyPOIs(activeLat, activeLng);
      }
    }
  }, [activeLat, activeLng, destNodeId]);

  const fetchRoute = async (lat: number, lng: number, destId: number) => {
    try {
      setLoading(true);
      const res = await NavigationAPI.getRouteFromGPS(lat, lng, destId);
      if (res && res.coordinates) {
        setRouteWaypoints(res.coordinates);
      }
    } catch (err) {
      console.error('Failed to fetch route for AR', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyPOIs = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ar/nearby', {
        params: { lat, lng, radius: MAX_DISTANCE }
      });
      setPois(response.data);
    } catch (err) {
      console.error('Failed to fetch nearby POIs for AR', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white">
      {/* Background Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full z-50 p-4 pointer-events-none flex justify-between items-start">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="bg-slate-900/80 backdrop-blur p-3 rounded-full shadow-lg pointer-events-auto text-white hover:bg-slate-800 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {/* Status Panel */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <button
            onClick={() => setSimulationMode(!simulationMode)}
            className={`px-4 py-2 rounded-full font-bold shadow-lg text-sm transition-colors ${
              simulationMode ? 'bg-amber-500 text-white' : 'bg-slate-800/80 text-slate-200'
            }`}
          >
            {simulationMode ? 'Simulation Active' : 'Live GPS'}
          </button>

          <div className="bg-slate-800/80 backdrop-blur text-white px-4 py-2 rounded-2xl text-xs font-medium shadow-lg max-w-[200px] text-right border border-slate-600/50">
            {gpsError && !simulationMode ? (
              <span className="text-red-400">GPS Error: {gpsError}</span>
            ) : !activeLat ? (
              <span className="text-blue-400 animate-pulse">Waiting for GPS...</span>
            ) : destNodeId ? (
              <span className="text-emerald-400 font-bold">Navigating to {destinationName || 'Destination'}</span>
            ) : (
              <span>Found {pois.length} places nearby</span>
            )}
          </div>
          
          {(camError || orientationError) && (
            <div className="bg-red-500/90 text-white px-3 py-1 rounded-full text-xs shadow-lg backdrop-blur">
              {camError || orientationError}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-900/80 text-white px-6 py-3 rounded-full font-bold backdrop-blur flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Scanning...
        </div>
      )}

      {/* Permission Request Overlay (For iOS Gyroscope) */}
      {needsPermission && !permissionGranted && (
        <div className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="bg-blue-500/20 w-24 h-24 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">AR Needs Compass Access</h2>
          <p className="text-slate-400 mb-8 max-w-sm">To perfectly overlay points of interest, we need access to your device's orientation sensors.</p>
          <button 
            onClick={requestPermission}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
          >
            Enable AR Compass
          </button>
        </div>
      )}

      {/* AR Projection Layer */}
      {activeLat && activeLng && heading !== null && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          
          {/* Navigation Route Waypoints */}
          {routeWaypoints.map((wp, idx) => {
            const distance = getDistanceFromLatLonInM(activeLat, activeLng, wp.latitude, wp.longitude);
            if (distance > MAX_DISTANCE || distance < 2) return null; // Don't show if too far or already passed

            const bearing = calculateBearing(activeLat, activeLng, wp.latitude, wp.longitude);
            let angleDiff = bearing - heading;
            if (angleDiff > 180) angleDiff -= 360;
            if (angleDiff < -180) angleDiff += 360;

            if (Math.abs(angleDiff) > 90) return null;

            const xPercent = 50 + (angleDiff / (FOV / 2)) * 50;
            const scale = Math.max(0.2, 1 - (distance / MAX_DISTANCE));
            
            // Route dots slightly lower on screen to simulate ground path
            const yPercent = 65 - (distance / MAX_DISTANCE) * 30;
            const isLast = idx === routeWaypoints.length - 1;

            return (
              <div
                key={`wp-${idx}`}
                className="absolute transition-transform duration-75 pointer-events-auto"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  zIndex: Math.round((MAX_DISTANCE - distance) * 10)
                }}
              >
                {isLast ? (
                   <div className="flex flex-col items-center gap-2">
                     <div className="px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md border bg-red-600/80 border-red-400 text-white shadow-red-500/50">
                       <span className="font-bold text-lg whitespace-nowrap">{destinationName || 'Destination'}</span>
                     </div>
                     <div className="px-3 py-1 rounded-full text-sm font-bold shadow-lg bg-red-900/90 text-red-200">
                       {Math.round(distance)}m
                     </div>
                     <div className="w-1 h-12 rounded-full mt-1 bg-red-400"></div>
                   </div>
                ) : (
                   <div className="flex flex-col items-center opacity-60">
                     <div className="w-6 h-6 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] border-2 border-white animate-pulse"></div>
                   </div>
                )}
              </div>
            );
          })}

          {/* POIs rendering (only if not navigating) */}
          {!destNodeId && pois.map((poi) => {
            const bearing = calculateBearing(activeLat, activeLng, poi.lat, poi.lng);
            let angleDiff = bearing - heading;
            if (angleDiff > 180) angleDiff -= 360;
            if (angleDiff < -180) angleDiff += 360;

            if (Math.abs(angleDiff) > 90) return null;

            const xPercent = 50 + (angleDiff / (FOV / 2)) * 50;
            const scale = Math.max(0.3, 1 - (poi.distance / MAX_DISTANCE));
            const yPercent = 50 - (poi.distance / MAX_DISTANCE) * 20;

            const isBuilding = poi.type === 'building';
            
            return (
              <div
                key={poi.id}
                className="absolute transition-transform duration-75 pointer-events-auto"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  zIndex: Math.round((MAX_DISTANCE - poi.distance) * 10)
                }}
              >
                <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => navigate(`/ar?destination_node_id=${poi.id}&destination=${encodeURIComponent(poi.name)}`)}>
                  <div className={`px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md border ${
                    isBuilding 
                      ? 'bg-blue-600/80 border-blue-400 text-white shadow-blue-500/50' 
                      : 'bg-emerald-600/80 border-emerald-400 text-white shadow-emerald-500/50'
                  }`}>
                    <span className="font-bold text-lg whitespace-nowrap">{poi.name}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold shadow-lg ${
                    isBuilding ? 'bg-blue-900/90 text-blue-200' : 'bg-emerald-900/90 text-emerald-200'
                  }`}>
                    {Math.round(poi.distance)}m
                  </div>
                  <div className={`w-1 h-12 rounded-full mt-1 ${isBuilding ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Target Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-30 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
      </div>
    </div>
  );
}
