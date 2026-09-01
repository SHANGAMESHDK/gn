import { useEffect, useState, useRef } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { apiClient } from '../api/axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWebcam } from '../hooks/useWebcam';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { calculateBearing } from '../hooks/useNavigationDirections';
import { NavigationAPI, AdminAPI } from '../api';

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

  const [buildingListData, setBuildingListData] = useState<any[]>([]);
  const [proximityThreshold, setProximityThreshold] = useState(25);
  const [currentBlockName, setCurrentBlockName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBuildingList() {
      try {
        const res = await apiClient.get('/buildings/');
        setBuildingListData(res.data.buildings || []);
      } catch (e) {
        console.warn('Failed to fetch building list', e);
      }
    }
    async function fetchSettings() {
      try {
        const res = await AdminAPI.getSettings();
        if (res?.building_proximity_threshold) {
          setProximityThreshold(res.building_proximity_threshold);
        }
      } catch (e) {
        console.warn("Failed to fetch settings for proximity threshold");
      }
    }
    fetchBuildingList();
    fetchSettings();
  }, []);

  // Proximity Calculation
  useEffect(() => {
    if (!activeLat || !activeLng || buildingListData.length === 0) return;

    let nearestBlock = null;
    let minDistance = Infinity;

    for (const building of buildingListData) {
      if (building.latitude && building.longitude) {
        const dist = getDistanceFromLatLonInM(activeLat, activeLng, building.latitude, building.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearestBlock = building.name || building.Name;
        }
      } else if (building.lat && building.lng) {
        const dist = getDistanceFromLatLonInM(activeLat, activeLng, building.lat, building.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestBlock = building.name || building.Name;
        }
      }
    }

    if (minDistance <= proximityThreshold) {
      setCurrentBlockName(nearestBlock);
    } else {
      setCurrentBlockName(null);
    }
  }, [activeLat, activeLng, buildingListData, proximityThreshold]);

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

      {currentBlockName && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className="bg-[#7B1113]/90 text-white px-6 py-2.5 rounded-full shadow-lg font-bold flex items-center gap-2 backdrop-blur-md border border-white/20 animate-fade-in-down">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C8A951]"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            You are in {currentBlockName} Block
          </div>
        </div>
      )}

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
            if (distance > MAX_DISTANCE || distance < 2) return null;

            const bearing = calculateBearing(activeLat, activeLng, wp.latitude, wp.longitude);
            let angleDiff = bearing - heading;
            if (angleDiff > 180) angleDiff -= 360;
            if (angleDiff < -180) angleDiff += 360;

            if (Math.abs(angleDiff) > 90) return null;

            const xPercent = 50 + (angleDiff / (FOV / 2)) * 50;
            const scale = Math.max(0.2, 1 - (distance / MAX_DISTANCE));
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
                  /* ── Destination Beacon ── */
                  <div className="flex flex-col items-center">
                    {/* Pulsing concentric rings */}
                    <div className="relative flex items-center justify-center mb-2">
                      <div className="absolute w-24 h-24 rounded-full border-2 border-[#C8A951]/40 animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="absolute w-16 h-16 rounded-full border border-[#C8A951]/25 animate-ping" style={{ animationDuration: '2.5s' }} />
                      <div className="relative bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] backdrop-blur-xl border border-[#C8A951]/30 px-5 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(123,17,19,0.6)]">
                        <span className="font-black text-white text-lg whitespace-nowrap tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {destinationName || 'Destination'}
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-black bg-[#C8A951] text-[#2d2019] shadow-lg shadow-[#C8A951]/30">
                      {Math.round(distance)}m away
                    </div>
                    {/* Stem with glow */}
                    <div className="w-0.5 h-10 mt-1.5 bg-gradient-to-b from-[#C8A951] to-transparent rounded-full shadow-[0_0_8px_rgba(200,169,81,0.5)]" />
                    <div className="w-3 h-3 rounded-full bg-[#C8A951] shadow-[0_0_12px_rgba(200,169,81,0.8)] animate-pulse" />
                  </div>
                ) : (
                  /* ── Route Waypoint — Radar Ping ── */
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-10 h-10 rounded-full bg-[#C8A951]/10 animate-ping" style={{ animationDuration: '1.5s' }} />
                    <div className="absolute w-6 h-6 rounded-full bg-[#C8A951]/20 animate-pulse" />
                    <div className="w-3 h-3 rounded-full bg-[#C8A951] shadow-[0_0_10px_rgba(200,169,81,0.7)] border border-white/50" />
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
            const poiIcon = isBuilding ? '🏢' : '🏪';
            
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
                <div className="flex flex-col items-center cursor-pointer group" onClick={() => navigate(`/ar?destination_node_id=${poi.id}&destination=${encodeURIComponent(poi.name)}`)}>
                  {/* Glassmorphism Card */}
                  <div className="relative">
                    {/* Subtle outer glow */}
                    <div className={`absolute -inset-1 rounded-2xl blur-md opacity-40 ${isBuilding ? 'bg-[#7B1113]' : 'bg-[#C8A951]'}`} />
                    <div className="relative bg-black/40 backdrop-blur-xl border border-white/15 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 group-active:scale-95 transition-transform">
                      <span className="text-xl">{poiIcon}</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm whitespace-nowrap leading-tight tracking-tight">{poi.name}</span>
                        <span className="text-[10px] font-bold text-[#C8A951]/80 uppercase tracking-wider">{poi.type}</span>
                      </div>
                    </div>
                  </div>
                  {/* Distance badge */}
                  <div className="mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/10 backdrop-blur-md text-white/90 border border-white/10 shadow-lg">
                    {Math.round(poi.distance)}m
                  </div>
                  {/* Stem line + dot */}
                  <div className={`w-px h-8 mt-1 rounded-full ${isBuilding ? 'bg-gradient-to-b from-[#7B1113]/60 to-transparent' : 'bg-gradient-to-b from-[#C8A951]/60 to-transparent'}`} />
                  <div className={`w-2 h-2 rounded-full ${isBuilding ? 'bg-[#7B1113] shadow-[0_0_8px_rgba(123,17,19,0.6)]' : 'bg-[#C8A951] shadow-[0_0_8px_rgba(200,169,81,0.6)]'}`} />
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
