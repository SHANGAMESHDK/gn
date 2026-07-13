import { useState, useRef } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useWebcam } from '../hooks/useWebcam';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { calculateBearing } from '../hooks/useNavigationDirections';

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

const FOV = 60; // Mobile camera horizontal Field of View
const MAX_DISTANCE = 200; // Scavenger hunt covers a wider radius

export function CampusARHunt() {
  const { latitude, longitude, error: gpsError } = useGeolocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { error: camError } = useWebcam(videoRef);
  const { heading, needsPermission, permissionGranted, requestPermission, error: orientationError } = useDeviceOrientation();
  
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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 text-white">
      {/* Background Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full z-50 p-6 pointer-events-none flex flex-col gap-4">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <button
            onClick={() => navigate(-1)}
            className="bg-slate-900/80 backdrop-blur p-3 rounded-full shadow-lg pointer-events-auto text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <button
              onClick={() => setSimulationMode(!simulationMode)}
              className={`px-4 py-2 rounded-full font-bold shadow-lg text-sm transition-colors ${
                simulationMode ? 'bg-amber-500 text-white' : 'bg-slate-800/90 text-slate-200'
              }`}
            >
              {simulationMode ? 'Simulation Active' : 'Live GPS'}
            </button>
            {gpsError && !simulationMode && (
              <span className="text-red-400 bg-slate-900/80 px-3 py-1 rounded-full text-xs">GPS Error: {gpsError}</span>
            )}
            {(camError || orientationError) && (
              <div className="bg-red-500/90 text-white px-3 py-1 rounded-full text-xs shadow-lg backdrop-blur">
                {camError || orientationError}
              </div>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="self-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 px-8 py-4 rounded-3xl shadow-xl pointer-events-auto flex items-center gap-4">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-500 shadow-inner">
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

      {/* Permission Request Overlay */}
      {needsPermission && !permissionGranted && (
        <div className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="bg-amber-500/20 w-24 h-24 rounded-full flex items-center justify-center mb-6">
            <Trophy size={40} className="text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4">AR Hunt Needs Compass Access</h2>
          <p className="text-slate-400 mb-8 max-w-sm">To find the hidden Easter Eggs around you, we need access to your device's orientation sensors.</p>
          <button 
            onClick={requestPermission}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 px-8 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
          >
            Enable AR Compass
          </button>
        </div>
      )}

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
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg"
            >
              Return Home
            </button>
          </div>
        </div>
      )}

      {/* AR Projection Layer */}
      {activeLat && activeLng && heading !== null && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {EASTER_EGGS.filter(egg => !collectedEggs.includes(egg.id)).map((egg) => {
            // Calculate bearing from user to Easter Egg
            const bearing = calculateBearing(activeLat, activeLng, egg.lat, egg.lng);
            
            // Note: Since this is a gamified demo with fixed static coordinates, we manually calculate 
            // a mock distance if we're in simulation mode so that eggs aren't just overlapping.
            // In a real app, distance is calculated via haversine.
            const mockDistance = Math.abs((egg.lat - activeLat) * 100000) + Math.abs((egg.lng - activeLng) * 100000);
            const displayDistance = simulationMode ? mockDistance : mockDistance; // simplifying for demo

            // Calculate difference between phone heading and egg bearing
            let angleDiff = bearing - heading;
            
            if (angleDiff > 180) angleDiff -= 360;
            if (angleDiff < -180) angleDiff += 360;

            if (Math.abs(angleDiff) > 90) return null;

            const xPercent = 50 + (angleDiff / (FOV / 2)) * 50;
            const scale = Math.max(0.5, 1 - (displayDistance / MAX_DISTANCE));
            const yPercent = 50 - (displayDistance / MAX_DISTANCE) * 10;

            return (
              <div
                key={egg.id}
                onClick={() => handleCollect(egg.id)}
                className="absolute transition-transform duration-75 pointer-events-auto cursor-pointer flex flex-col items-center hover:scale-110 active:scale-95"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  zIndex: Math.round((MAX_DISTANCE - displayDistance) * 10)
                }}
              >
                {/* 3D-like CSS Element */}
                {egg.type === 'coin' ? (
                  <div className="w-24 h-24 rounded-full border-[6px] border-amber-300 bg-amber-400 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-bounce relative">
                     <div className="absolute inset-2 border-4 border-amber-200/50 rounded-full"></div>
                     <span className="text-4xl">💰</span>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-400 flex items-center justify-center shadow-[0_0_40px_rgba(96,165,250,0.8)] relative animate-pulse">
                     <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/60 rounded-full"></div>
                     <span className="text-4xl drop-shadow-lg">✨</span>
                  </div>
                )}
                
                <div className="mt-4 px-4 py-2 bg-slate-900/80 backdrop-blur rounded-full text-white font-bold border border-slate-700 shadow-xl">
                  {egg.name}
                </div>
                <div className="mt-2 text-xs font-bold text-amber-400 drop-shadow-md bg-black/50 px-2 py-1 rounded">
                  TAP TO COLLECT
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Target Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>
      </div>
    </div>
  );
}
