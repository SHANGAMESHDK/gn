import { useState, useRef, useEffect } from 'react';
import { Users, Navigation2, ShieldCheck, Activity, Map as MapIcon, Mic, MicOff, Radio, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient, baseURL } from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_CHANNELS = [
  { id: 'ch1', name: 'General', users: 0 },
  { id: 'ch2', name: 'Hospitality', users: 0 },
  { id: 'ch3', name: 'Tech', users: 0 },
  { id: 'ch4', name: 'Digital', users: 0 },
  { id: 'ch5', name: 'Emergency', users: 0 }
];

export function OBSync() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('obsync_call_sign'));
  const [trackInput, setTrackInput] = useState('');

  // Share Modal (now used for login)
  const [shareName, setShareName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  // Walkie Talkie State
  const [activeChannel, setActiveChannel] = useState(DEFAULT_CHANNELS[0].id);
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [isTalking, setIsTalking] = useState(false);
  const [incomingSpeaker, setIncomingSpeaker] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const callSign = sessionStorage.getItem('obsync_call_sign') || sessionStorage.getItem('telemetry_device_id') || `OB_${Math.floor(Math.random() * 1000)}`;

  // Real-time WebSocket connection
  useEffect(() => {
    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsBaseUrl = baseURL.replace(/\/$/, ''); // Remove trailing slash if any
    
    if (wsBaseUrl.startsWith('http')) {
      wsBaseUrl = wsBaseUrl.replace(/^http/, 'ws');
    } else {
      // If relative, prepend host
      const host = window.location.host;
      wsBaseUrl = `${protocol}//${host}${wsBaseUrl}`;
    }

    const finalWsUrl = `${wsBaseUrl}/obsync/ws/${activeChannel}/${callSign}`;
    console.log("Attempting Walkie Talkie connection to:", finalWsUrl);
    const ws = new WebSocket(finalWsUrl);
    ws.binaryType = "blob";
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket Connected to ${wsBaseUrl}/obsync/ws/${activeChannel}/${callSign}`);
      setIsConnected(true);
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setIsConnected(false);
    };

    ws.onclose = (e) => {
      console.log("WebSocket Closed:", e.code);
      setIsConnected(false);
      if (e.code === 4000) {
        alert("Your Call Sign is already in use by another active user. Please log in with a different name.");
        sessionStorage.removeItem('obsync_call_sign');
        sessionStorage.removeItem('telemetry_device_id');
        setIsLoggedIn(false);
      }
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'talking_status') {
            if (msg.is_talking) {
              setIncomingSpeaker(msg.speaker);
            } else {
              setTimeout(() => {
                setIncomingSpeaker(null);
              }, 1000);
            }
          } else if (msg.type === 'channel_status') {
             setChannels(prev => prev.map(ch => 
               ch.id === activeChannel ? { ...ch, users: msg.users.length } : ch
             ));
          }
        } catch (e) {
          // ignore parsing error
        }
      } else {
        // Play audio blob
        let blob = event.data;
        if (blob instanceof ArrayBuffer) {
           blob = new Blob([blob]);
        }
        
        setIncomingSpeaker("Playing Message...");
        
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.play().catch(e => {
          console.error("Error playing audio", e);
          alert("Audio playback was blocked by the browser. Please click anywhere on the page to allow audio, or check if your browser supports this audio format.");
        });
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setIncomingSpeaker(null);
        };
      }
    };

    return () => {
      ws.close();
    };
  }, [activeChannel, callSign]);

  const startRecording = async () => {
    setIsTalking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(audioBlob);
        }
        // Clean up tracks to turn off microphone light
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'talking_status', is_talking: true }));
      }

    } catch (err) {
      console.error("Mic error", err);
      setIsTalking(false);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    setIsTalking(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'talking_status', is_talking: false }));
    }
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput) return;
    navigate(`/map?track=${trackInput.toUpperCase()}`);
  };

  const handleNewShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareName || !adminCode) {
      setShareError('All fields are required');
      return;
    }
    setShareError('');
    setShareLoading(true);

    try {
      const res = await apiClient.post(`/telemetry/share`, {
        name: shareName,
        reg_no: 'OBSync',
        admin_code: adminCode
      });
      const generatedCode = res.data.code;
      sessionStorage.setItem('telemetry_device_id', generatedCode);
      sessionStorage.setItem('obsync_call_sign', shareName);
      sessionStorage.setItem('obsync_broadcasting', 'true');
      
      setIsLoggedIn(true);
      
      setShareName('');
      setAdminCode('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setShareError('Invalid Security Code');
      } else if (err.response?.status === 400) {
        setShareError(err.response?.data?.detail || 'Call sign name is already in use.');
      } else {
        setShareError('Failed to generate sharing session');
      }
    } finally {
      setShareLoading(false);
    }
  };

  const handleAddChannel = () => {
    const name = prompt("Enter new channel name:");
    if (name) {
      setChannels([...channels, { id: `ch${Date.now()}`, name, users: 1 }]);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-full bg-[#110810] flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        {/* Animated background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-[#7B1113]/[0.06] blur-[120px] rounded-full animate-float-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#C8A951]/[0.06] blur-[100px] rounded-full animate-float-slow delay-300" />
          <div className="absolute inset-0 dot-grid opacity-50" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md glass-strong rounded-2xl p-8 flex flex-col border-[#C8A951]/10"
          style={{ background: 'rgba(26,10,14,0.85)' }}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#7B1113] rounded-xl flex items-center justify-center shadow-md shadow-[#7B1113]/25 mb-5">
              <ShieldCheck size={32} className="text-[#C8A951]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>OB Sync Login</h1>
            <p className="text-[#a09080] text-sm text-center">
              Login to access Walkie Talkie and Location Sharing.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-[#a09080] uppercase tracking-[0.15em] mb-2">OB Name / Call Sign</label>
              <input 
                type="text" 
                value={shareName}
                onChange={e => setShareName(e.target.value)}
                placeholder="e.g. Hosp Lead 1"
                className="w-full bg-black/30 border border-[#C8A951]/15 text-white px-4 py-3 rounded-lg outline-none focus:border-[#C8A951]/40 focus:ring-2 focus:ring-[#C8A951]/15 transition-all placeholder:text-[#6a5a4a]"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-[#a09080] uppercase tracking-[0.15em] mb-2">Security Code</label>
              <input 
                type="password" 
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                placeholder="Enter administrative code"
                className="w-full bg-black/30 border border-[#C8A951]/15 text-white px-4 py-3 rounded-lg outline-none focus:border-[#C8A951]/40 focus:ring-2 focus:ring-[#C8A951]/15 transition-all placeholder:text-[#6a5a4a]"
              />
            </div>

            <AnimatePresence>
              {shareError && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center justify-center font-medium"
                >
                  {shareError}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={handleNewShare}
              disabled={shareLoading}
              className="w-full bg-[#7B1113] hover:bg-[#9B1B30] text-white font-bold py-3.5 rounded-xl shadow-md shadow-[#7B1113]/20 transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {shareLoading ? <Activity className="animate-spin" size={20} /> : 'Login'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#110810] flex flex-col items-center p-6 relative overflow-y-auto">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-[#7B1113]/[0.05] blur-[120px] rounded-full animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#C8A951]/[0.05] blur-[100px] rounded-full animate-float-slow delay-300" />
        <div className="absolute inset-0 dot-grid opacity-30" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6"
      >
        
        {/* Left Column: Tracking & Broadcasting */}
        <motion.div 
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-2xl p-6 flex flex-col border-[#C8A951]/10"
          style={{ background: 'rgba(26,10,14,0.85)' }}
        >
          <div className="w-12 h-12 bg-[#7B1113] rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <Users size={24} className="text-[#C8A951]" />
          </div>
          
          <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>OB Sync</h1>
          <p className="text-[#a09080] text-sm mb-6">
            Track office bearers or start broadcasting your location.
          </p>

          <div className="flex flex-col gap-5 flex-1 justify-center">
            {/* Track Form */}
            <form onSubmit={handleTrack} className="flex gap-2">
              <input 
                type="text" 
                value={trackInput}
                onChange={e => setTrackInput(e.target.value.toUpperCase())}
                placeholder="OB CODE (e.g. HOSP123)"
                className="w-full bg-black/30 border border-[#C8A951]/15 text-white px-4 py-3 rounded-lg outline-none focus:border-[#C8A951]/40 focus:ring-2 focus:ring-[#C8A951]/15 font-mono tracking-widest uppercase text-sm transition-all placeholder:text-[#6a5a4a]"
              />
              <button 
                type="submit"
                className="bg-[#7B1113] hover:bg-[#9B1B30] text-[#C8A951] px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center shrink-0 shadow-sm active:scale-95"
              >
                <Navigation2 size={20} />
              </button>
            </form>

            <div className="flex items-center gap-4 w-full">
              <div className="h-px bg-gradient-to-r from-transparent via-[#C8A951]/15 to-transparent flex-1" />
              <span className="text-[#6a5a4a] text-xs font-bold uppercase tracking-wider">OR</span>
              <div className="h-px bg-gradient-to-r from-transparent via-[#C8A951]/15 to-transparent flex-1" />
            </div>
            
            <button
              onClick={() => navigate('/map')}
              className="w-full glass text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 group active:scale-[0.98] border-[#C8A951]/10"
              style={{ background: 'rgba(40,20,25,0.6)' }}
            >
              <MapIcon size={20} className="group-hover:scale-110 transition-transform" /> 
              Open Campus Map
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem('telemetry_device_id');
                sessionStorage.removeItem('obsync_call_sign');
                sessionStorage.removeItem('obsync_broadcasting');
                setIsLoggedIn(false);
              }}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 active:scale-[0.98]"
            >
              End Session
            </button>
          </div>
        </motion.div>

        {/* Right Column: Walkie Talkie UI */}
        <motion.div 
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl p-6 flex flex-col border-[#C8A951]/10"
          style={{ background: 'rgba(26,10,14,0.85)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C8A951] rounded-xl flex items-center justify-center shadow-sm">
                <Radio size={24} className="text-[#2d2019]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Radio Comms</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'}`} title={isConnected ? "Connected" : "Disconnected"} />
                  <p className="text-[#a09080] text-sm">CallSign: <span className="text-[#C8A951] font-bold">{callSign}</span></p>
                </div>
              </div>
            </div>
            <button onClick={handleAddChannel} className="p-2 glass rounded-lg text-[#a09080] hover:text-white transition-colors" title="Add Channel" style={{ background: 'rgba(40,20,25,0.5)' }}>
              <Plus size={18} />
            </button>
          </div>

          {/* Channel Selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5 max-h-36 overflow-y-auto pr-1 hide-scrollbar">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                  activeChannel === ch.id 
                    ? 'bg-[#C8A951]/10 border-[#C8A951]/30 text-[#C8A951]' 
                    : 'bg-black/20 border-[#C8A951]/8 hover:bg-[#C8A951]/5 text-[#a09080] hover:text-[#f0e8dc]'
                }`}
              >
                <div className="font-bold text-sm truncate">{ch.name}</div>
                <div className="text-xs opacity-70 mt-1">{ch.users} active</div>
              </button>
            ))}
          </div>

          {/* Speaker Info Panel */}
          <div className="bg-black/30 rounded-xl p-5 border border-[#C8A951]/10 flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[120px]">
            {/* Audio Waveform Viz */}
            <div className={`absolute bottom-0 w-full flex items-end justify-center gap-1 h-14 transition-opacity duration-300 ${incomingSpeaker || isTalking ? 'opacity-40' : 'opacity-10'}`}>
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`w-1.5 rounded-t-sm transition-all ${isTalking ? 'bg-emerald-500' : 'bg-[#C8A951]'} ${incomingSpeaker || isTalking ? 'animate-pulse' : ''}`} style={{ height: incomingSpeaker || isTalking ? `${20 + Math.random() * 80}%` : '10%', animationDuration: `${0.2 + Math.random() * 0.3}s` }} />
              ))}
            </div>

            <div className="relative z-10 text-center">
              {isTalking ? (
                <div>
                  <h3 className="text-emerald-400 font-bold text-xl uppercase tracking-widest animate-pulse">Transmitting</h3>
                  <p className="text-slate-500 text-sm mt-1">on {channels.find(c => c.id === activeChannel)?.name}</p>
                </div>
              ) : incomingSpeaker ? (
                <div>
                  <h3 className="text-[#C8A951] font-bold text-xl">{incomingSpeaker}</h3>
                  <p className="text-slate-500 text-sm mt-1">is speaking on {channels.find(c => c.id === activeChannel)?.name}</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-[#6a5a4a] font-bold text-lg uppercase tracking-widest">Listening</h3>
                  <p className="text-[#5a4a3a] text-sm mt-1">{channels.find(c => c.id === activeChannel)?.name} Channel</p>
                </div>
              )}
            </div>
          </div>

          {/* PTT Button */}
          <div className="mt-5 flex justify-center">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`relative group w-28 h-28 rounded-full flex items-center justify-center transition-all select-none ${
                isTalking 
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-95' 
                  : 'bg-[#2d2019] border-4 border-[#C8A951]/20 shadow-xl hover:shadow-2xl hover:border-[#C8A951]/40 active:scale-95'
              }`}
            >
              {/* Animated ping rings */}
              {isTalking && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40" style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30" style={{ animation: 'pulse-ring 1.5s ease-out infinite 0.5s' }} />
                </>
              )}
              {isTalking ? (
                <Mic className="text-white drop-shadow-md" size={44} />
              ) : (
                <MicOff className="text-[#C8A951]/50 group-hover:text-[#C8A951] transition-colors" size={44} />
              )}
            </button>
          </div>
          <p className="text-center text-[#6a5a4a] text-xs mt-3 font-bold uppercase tracking-widest">Hold to Speak</p>

        </motion.div>
      </motion.div>
    </div>
  );
}
