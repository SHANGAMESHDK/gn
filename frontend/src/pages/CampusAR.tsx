// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { apiClient } from '../api/axios';
import { useNavigate } from 'react-router-dom';

interface ARPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  distance: number;
}

export function CampusAR() {
  const { latitude, longitude, error } = useGeolocation();
  const [pois, setPois] = useState<ARPoi[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const navigate = useNavigate();

  // Central coordinates for testing
  const SIMULATED_LAT = 13.031836;
  const SIMULATED_LNG = 80.179666;

  const activeLat = simulationMode ? SIMULATED_LAT : latitude;
  const activeLng = simulationMode ? SIMULATED_LNG : longitude;

  useEffect(() => {
    if (activeLat && activeLng) {
      fetchNearbyPOIs(activeLat, activeLng);
    }
  }, [activeLat, activeLng]);

  const fetchNearbyPOIs = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ar/nearby', {
        params: { lat, lng, radius: 200 }
      });
      setPois(response.data);
    } catch (err) {
      console.error('Failed to fetch nearby POIs for AR', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: 0, overflow: 'hidden', height: '100vh', width: '100vw', position: 'relative', backgroundColor: '#000' }}>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full z-50 p-4 pointer-events-none flex justify-between items-start">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="bg-white/80 backdrop-blur p-3 rounded-full shadow-lg pointer-events-auto text-slate-800 hover:bg-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {/* Status Panel */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <button
            onClick={() => setSimulationMode(!simulationMode)}
            className={`px-4 py-2 rounded-full font-bold shadow-lg text-sm transition-colors ${simulationMode ? 'bg-amber-500 text-white' : 'bg-slate-800/80 text-slate-200'
              }`}
          >
            {simulationMode ? 'Simulation Active' : 'On Simulation'}
          </button>

          <div className="bg-slate-800/80 backdrop-blur text-white px-4 py-2 rounded-2xl text-xs font-medium shadow-lg max-w-[200px] text-right border border-slate-600/50">
            {error && !simulationMode ? (
              <span className="text-red-400">GPS Error: {error}</span>
            ) : !activeLat ? (
              <span className="text-blue-400 animate-pulse">Waiting for GPS...</span>
            ) : (
              <span>Found {pois.length} places nearby</span>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-900/80 text-white px-6 py-3 rounded-full font-bold backdrop-blur flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Scanning...
        </div>
      )}

      {/* A-Frame Scene for AR.js */}
      {/* We keep the scene unconditionally rendered to prevent camera feed crashes */}
      <a-scene
        vr-mode-ui="enabled: false"
        embedded
        arjs="sourceType: webcam; debugUIEnabled: false; videoTexture: true;"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {/* Render POIs as 3D Pins in AR space */}
        {pois.map((poi) => {
          const isBuilding = poi.type === 'building';
          const color = isBuilding ? '#3b82f6' : '#10b981';

          return (
            <a-entity
              key={poi.id}
              look-at="[gps-camera]"
              gps-entity-place={`latitude: ${poi.lat}; longitude: ${poi.lng};`}
              scale="15 15 15"
            >
              {/* Pin Head */}
              <a-sphere radius="1" color={color} position="0 6 0" opacity="0.9"></a-sphere>
              {/* Pin Point */}
              <a-cone radius-bottom="0" radius-top="1" height="2" color={color} position="0 4.5 0" opacity="0.9"></a-cone>

              {/* Name Label */}
              <a-text
                value={poi.name}
                align="center"
                color="#ffffff"
                scale="3 3 3"
                position="0 8 0"
              ></a-text>

              {/* Distance Label */}
              <a-text
                value={`${Math.round(poi.distance)}m`}
                align="center"
                color="#facc15"
                scale="2 2 2"
                position="0 7 0"
              ></a-text>
            </a-entity>
          );
        })}

        {/* GPS Camera for Location-Based AR */}
        <a-camera
          gps-camera={simulationMode ? `simulateLatitude: ${SIMULATED_LAT}; simulateLongitude: ${SIMULATED_LNG}` : ""}
          rotation-reader
        ></a-camera>
      </a-scene>
    </div>
  );
}
