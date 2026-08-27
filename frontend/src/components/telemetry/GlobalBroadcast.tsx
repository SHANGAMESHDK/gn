import { useState, useEffect } from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';
import { apiClient } from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';


export function GlobalBroadcast() {
  const [isBroadcasting, setIsBroadcasting] = useState(() => {
    return sessionStorage.getItem('obsync_broadcasting') === 'true';
  });
  const [sharedCode, setSharedCode] = useState(() => {
    const id = sessionStorage.getItem('telemetry_device_id');
    return id && !id.startsWith('device_') ? id : '';
  });

  // Enable telemetry only if broadcasting and they have a code
  useTelemetry(isBroadcasting && !!sharedCode); 

  // Watch for changes in session storage (e.g. from OBSync modal setting the code)
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
      sessionStorage.setItem('obsync_broadcasting', 'true');
    } else {
      setIsBroadcasting(false);
      sessionStorage.removeItem('obsync_broadcasting');
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-4 right-4 md:top-6 md:right-6 z-[9999] pointer-events-auto"
      >
        <div className="glass-strong rounded-full shadow-xl flex items-center p-2 pr-4 gap-3 border-[#C8A951]/10" style={{ background: 'rgba(26,10,14,0.9)' }}>
          <button 
            onClick={handleToggleBroadcast}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center shrink-0 ${isBroadcasting ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${isBroadcasting ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          
          <div className="flex items-center gap-2">
            {isBroadcasting && (
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              </div>
            )}
            <span className="text-white text-xs font-mono font-bold tracking-widest">{sharedCode}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
