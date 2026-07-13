import { useState, useRef } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useWebcam } from '../hooks/useWebcam';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { calculateBearing, calculateDistance } from '../hooks/useNavigationDirections';

interface EasterEgg {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'coin' | 'orb';
  color: string;
}

const EASTER_EGGS: EasterEgg[] = [
  { id: 'egg1', name: 'Golden Coin', lat: 13.031950, lng: 80.179700, type: 'coin', color: 'from-amber-400 to-yellow-600' },
  { id: 'egg2', name: 'Golden Coin', lat: 13.031750, lng: 80.179500, type: 'coin', color: 'from-amber-400 to-yellow-600' },
  { id: 'egg3', name: 'Golden Coin', lat: 13.031850, lng: 80.179850, type: 'coin', color: 'from-amber-400 to-yellow-600' },
  { id: 'egg4', name: 'Glowing Orb', lat: 13.031900, lng: 80.179550, type: 'orb', color: 'from-blue-400 to-indigo-600' },
  { id: 'egg5', name: 'Glowing Orb', lat: 13.031700, lng: 80.179750, type: 'orb', color: 'from-emerald-400 to-teal-600' }
];

const FOV = 60; 
const MAX_DISTANCE = 100; // Easter eggs need to be somewhat closer

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
        <div className="self-center bg-slate-800/90 backdrop-blur-md border border-slate-700/50 px-8 py-4 rounded-3xl shadow-xl pointer-events-auto flex items-center gap-4">
          <div className="bg-amber-900/50 border border-amber-500/30 p-3 rounded-2xl text-amber-500">
            <Trophy size={32} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
              Scavenger Hunt
            </div>
            <div className="text-2xl font-black text-white">
              {collectedEggs.length} <span className="text-slate-500">/ {EASTER_EGGS.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {isComplete && (
        <div className="absolute inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-500 pointer-events-auto">
          <div className="bg-slate-800 p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-slate-700 animate-in zoom-in duration-500 delay-150">
            <div className="mx-auto w-24 h-24 bg-green-900/30 border border-green-500/30 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">You did it! 🎉</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              You've successfully collected all the hidden Easter Eggs around campus.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      )}

      {/* Permission Request Overlay (For iOS Gyroscope) */}
      {needsPermission && !permissionGranted && (
        <div className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="bg-blue-500/20 w-24 h-24 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">AR Needs Compass Access</h2>
          <p className="text-slate-400 mb-8 max-w-sm">To overlay Easter Eggs correctly in the real world, we need access to your device's orientation sensors.</p>
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
          {EASTER_EGGS.filter(egg => !collectedEggs.includes(egg.id)).map((egg) => {
            const distance = calculateDistance(activeLat, activeLng, egg.lat, egg.lng);
            const bearing = calculateBearing(activeLat, activeLng, egg.lat, egg.lng);
            
            let angleDiff = bearing - heading;
            if (angleDiff > 180) angleDiff -= 360;
            if (angleDiff < -180) angleDiff += 360;

            if (Math.abs(angleDiff) > 90) return null;

            const xPercent = 50 + (angleDiff / (FOV / 2)) * 50;
            const scale = Math.max(0.4, 1 - (distance / MAX_DISTANCE));
            
            // Wobble up and down slightly based on distance or time
            const yPercent = 50 - (distance / MAX_DISTANCE) * 20;

            return (
              <div
                key={egg.id}
                className="absolute transition-all duration-100 pointer-events-auto cursor-pointer"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  zIndex: Math.round((MAX_DISTANCE - distance) * 10)
                }}
                onClick={() => handleCollect(egg.id)}
              >
                <div className="flex flex-col items-center gap-4 hover:scale-110 transition-transform">
                  
                  {/* CSS Gamified Objects */}
                  {egg.type === 'coin' ? (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 shadow-[0_0_30px_rgba(245,158,11,0.6)] border-4 border-yellow-200 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                      <div className="w-16 h-16 rounded-full border-2 border-amber-600/50 flex items-center justify-center">
                        <span className="text-yellow-100 font-bold text-3xl">$</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-24 h-24 animate-pulse">
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${egg.color} opacity-80 blur-md`}></div>
                      <div className="absolute inset-2 rounded-full bg-white opacity-90 blur-sm"></div>
                      <div className="absolute inset-6 rounded-full bg-white"></div>
                    </div>
                  )}

                  {/* Labels */}
                  <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700 shadow-xl flex flex-col items-center">
                    <span className="font-bold text-lg text-white">{egg.name}</span>
                    <span className="text-amber-400 text-xs font-bold tracking-widest mt-1">TAP TO COLLECT</span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs font-bold border border-slate-600/50">
                    {Math.round(distance)}m
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Target Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      </div>
    </div>
  );
}
