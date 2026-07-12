import { useState, useEffect } from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';
import { apiClient } from '../../api/axios';


export function GlobalBroadcast() {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [sharedCode, setSharedCode] = useState(() => {
    const id = sessionStorage.getItem('telemetry_device_id');
    return id && !id.startsWith('device_') ? id : '';
  });

  // Enable telemetry only if broadcasting and they have a code
  useTelemetry(isBroadcasting && !!sharedCode); 

  // Watch for changes in session storage (e.g. from FriendSync modal setting the code)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentId = sessionStorage.getItem('telemetry_device_id');
      if (currentId && !currentId.startsWith('device_') && currentId !== sharedCode) {
        setSharedCode(currentId);
        // If a code was just set, automatically turn on broadcasting
        setIsBroadcasting(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sharedCode]);

  const handleToggleBroadcast = async () => {
    if (!sharedCode) return; // Cannot broadcast without a code
    
    if (!isBroadcasting) {
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

  // Only render if a code exists
  if (!sharedCode) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] pointer-events-auto">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-full shadow-2xl border border-slate-700/50 flex items-center p-2 pr-4 gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
        <button 
          onClick={handleToggleBroadcast}
          className={`w-12 h-6 rounded-full p-1 transition-colors relative flex items-center shrink-0 ${isBroadcasting ? 'bg-emerald-500' : 'bg-slate-700'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isBroadcasting ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
        
        <div className="flex items-center gap-2">
          {isBroadcasting && (
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          )}
          <span className="text-white text-xs font-mono font-bold tracking-widest">{sharedCode}</span>
        </div>
      </div>
    </div>
  );
}
