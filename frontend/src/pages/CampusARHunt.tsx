// @ts-nocheck
import { useEffect, useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface EasterEgg {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'coin' | 'orb';
  color: string;
}

const EASTER_EGGS: EasterEgg[] = [
  { id: 'egg1', name: 'Golden Coin', lat: 13.031950, lng: 80.179700, type: 'coin', color: '#fbbf24' },
  { id: 'egg2', name: 'Golden Coin', lat: 13.031750, lng: 80.179500, type: 'coin', color: '#fbbf24' },
  { id: 'egg3', name: 'Golden Coin', lat: 13.031850, lng: 80.179850, type: 'coin', color: '#fbbf24' },
  { id: 'egg4', name: 'Glowing Orb', lat: 13.031900, lng: 80.179550, type: 'orb', color: '#60a5fa' },
  { id: 'egg5', name: 'Glowing Orb', lat: 13.031700, lng: 80.179750, type: 'orb', color: '#34d399' }
];

export function CampusARHunt() {
  const { latitude, longitude, error } = useGeolocation();
  const [collectedEggs, setCollectedEggs] = useState<string[]>([]);
  const [simulationMode, setSimulationMode] = useState(true); // Default to true for testing
  const navigate = useNavigate();

  // Central coordinates for testing Gamification
  const SIMULATED_LAT = 13.031836;
  const SIMULATED_LNG = 80.179666;

  const activeLat = simulationMode ? SIMULATED_LAT : latitude;
  const activeLng = simulationMode ? SIMULATED_LNG : longitude;

  const handleCollect = (id: string) => {
    if (!collectedEggs.includes(id)) {
      setCollectedEggs(prev => [...prev, id]);
    }
  };

  const isComplete = collectedEggs.length === EASTER_EGGS.length;

  return (
    <div style={{ margin: 0, overflow: 'hidden', height: '100vh', width: '100vw', position: 'relative', backgroundColor: '#0f172a' }}>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full z-50 p-6 pointer-events-none flex flex-col gap-4">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <button
            onClick={() => navigate(-1)}
            className="bg-white/90 backdrop-blur p-3 rounded-full shadow-lg pointer-events-auto text-slate-800 hover:bg-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <button
              onClick={() => setSimulationMode(!simulationMode)}
              className={`px-4 py-2 rounded-full font-bold shadow-lg text-sm transition-colors ${simulationMode ? 'bg-amber-500 text-white' : 'bg-slate-800/90 text-slate-200'
                }`}
            >
              {simulationMode ? 'Simulation Active' : 'Live GPS'}
            </button>
            {error && !simulationMode && (
              <span className="text-red-400 bg-slate-900/80 px-3 py-1 rounded-full text-xs">GPS Error: {error}</span>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="self-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 px-8 py-4 rounded-3xl shadow-xl pointer-events-auto flex items-center gap-4">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-500">
            <Trophy size={32} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
              Scavenger Hunt
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">
              {collectedEggs.length} <span className="text-slate-400">/ {EASTER_EGGS.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {isComplete && (
        <div className="absolute inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-500 pointer-events-auto">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-slate-200 dark:border-slate-700 animate-in zoom-in duration-500 delay-150">
            <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">You did it! 🎉</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              You've successfully collected all the hidden Easter Eggs around campus.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      )}

      {/* A-Frame Scene for AR.js */}
      <a-scene
        vr-mode-ui="enabled: false"
        embedded
        arjs="sourceType: webcam; debugUIEnabled: false; videoTexture: true;"
        cursor="rayOrigin: mouse"
        raycaster="objects: .clickable"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {/* Render uncollected Easter Eggs using modern gps-new-entity-place */}
        {EASTER_EGGS.filter(egg => !collectedEggs.includes(egg.id)).map((egg) => (
          <a-entity
            key={egg.id}
            class="clickable"
            look-at="[gps-new-camera]"
            gps-new-entity-place={`latitude: ${egg.lat}; longitude: ${egg.lng};`}
            scale="10 10 10"
            onClick={() => handleCollect(egg.id)}
          >
            {egg.type === 'coin' ? (
              // Spinning Coin
              <a-entity position="0 3 0" animation="property: rotation; to: 0 360 0; loop: true; dur: 3000; easing: linear">
                <a-cylinder radius="1" height="0.2" color={egg.color} rotation="90 0 0" opacity="0.9"></a-cylinder>
                <a-cylinder radius="0.8" height="0.22" color="#fcd34d" rotation="90 0 0"></a-cylinder>
              </a-entity>
            ) : (
              // Floating Orb
              <a-entity position="0 3 0" animation="property: position; to: 0 4 0; dir: alternate; loop: true; dur: 2000; easing: easeInOutSine">
                <a-sphere radius="1.2" color={egg.color} opacity="0.8"></a-sphere>
                <a-sphere radius="0.8" color="#ffffff" opacity="0.9"></a-sphere>
              </a-entity>
            )}

            {/* Label */}
            <a-text
              value={egg.name}
              align="center"
              color="#ffffff"
              scale="2 2 2"
              position="0 6 0"
            ></a-text>
            <a-text
              value="TAP TO COLLECT"
              align="center"
              color="#facc15"
              scale="1.5 1.5 1.5"
              position="0 5 0"
            ></a-text>
          </a-entity>
        ))}

        {/* Modern GPS Camera */}
        <a-camera
          gps-new-camera={simulationMode ? `simulateLatitude: ${SIMULATED_LAT}; simulateLongitude: ${SIMULATED_LNG}` : "gpsMinDistance: 2"}
          rotation-reader
        >
        </a-camera>
      </a-scene>
    </div>
  );
}
