import { useState, useRef, useEffect } from 'react';
import { Users, Navigation2, ShieldCheck, Activity, Map as MapIcon, Mic, MicOff, Radio, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient, baseURL } from '../api/axios';

const DEFAULT_CHANNELS = [
  { id: 'ch1', name: 'General', users: 0 },
  { id: 'ch2', name: 'Hospitality', users: 0 },
  { id: 'ch3', name: 'Tech', users: 0 },
  { id: 'ch4', name: 'Digital', users: 0 },
  { id: 'ch5', name: 'Emergency', users: 0 }
];

export function OBSync() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('telemetry_device_id'));
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
    let wsBaseUrl = baseURL;
    if (wsBaseUrl.startsWith('http')) {
      wsBaseUrl = wsBaseUrl.replace(/^http/, 'ws');
    } else {
      // If relative, prepend host
      const host = window.location.host;
      // Usually baseURL for dev is absolute, but just in case
      wsBaseUrl = `${protocol}//${host}${wsBaseUrl}`;
    }

    // In Vite dev env with proxy, the websocket connection often works over the same port
    // But we'll rely on the standard constructed URL
    const ws = new WebSocket(`${wsBaseUrl}/obsync/ws/${activeChannel}/${callSign}`);
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
      console.log("WebSocket Closed:", e.code, e.reason);
      setIsConnected(false);
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'talking_status') {
            if (msg.is_talking) {
              setIncomingSpeaker(msg.speaker);
            } else {
              // Wait until audio finishes playing to clear speaker, but we can't easily sync it here.
              // We'll clear it after 1 second as a fallback, or let the audio.onended clear it.
              setTimeout(() => {
                setIncomingSpeaker(null);
              }, 1000);
            }
          } else if (msg.type === 'channel_status') {
             // Update the active channel's user count
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
        
        // Show playing indicator
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
      <div className="min-h-full bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-md bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-emerald-500/30 self-center">
            <ShieldCheck size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2 text-center">OBSync Login</h1>
          <p className="text-slate-400 text-sm mb-8 text-center">
            Login to access Walkie Talkie and Location Sharing.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">OB Name / Call Sign</label>
              <input 
                type="text" 
                value={shareName}
                onChange={e => setShareName(e.target.value)}
                placeholder="e.g. Hosp Lead 1"
                className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Security Code</label>
              <input 
                type="password" 
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                placeholder="Enter administrative code"
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
              {shareLoading ? <Activity className="animate-spin" size={20} /> : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-900 flex flex-col items-center p-6 relative overflow-y-auto">
      {/* Background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Left Column: Tracking & Broadcasting */}
        <div className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-blue-500/30">
            <Users size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">OB Sync</h1>
          <p className="text-slate-400 text-sm mb-8">
            Track office bearers or start broadcasting your location.
          </p>

          <div className="flex flex-col gap-6 flex-1 justify-center">
            {/* Track Form */}
            <form onSubmit={handleTrack} className="flex gap-2">
              <input 
                type="text" 
                value={trackInput}
                onChange={e => setTrackInput(e.target.value.toUpperCase())}
                placeholder="OB CODE (e.g. HOSP123)"
                className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono tracking-widest uppercase text-sm"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-center shrink-0"
              >
                <Navigation2 size={20} />
              </button>
            </form>

            <div className="flex items-center gap-4 w-full">
              <div className="h-px bg-slate-700/50 flex-1"></div>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">OR</span>
              <div className="h-px bg-slate-700/50 flex-1"></div>
            </div>
            
            <button
              onClick={() => navigate('/map')}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 group"
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
              className="w-full bg-red-600/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Right Column: Walkie Talkie UI */}
        <div className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-500/20 text-orange-400 rounded-2xl flex items-center justify-center shadow-inner border border-orange-500/30">
                <Radio size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Radio Comms</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse'}`} title={isConnected ? "Connected" : "Disconnected"}></div>
                  <p className="text-slate-400 text-sm">CallSign: <span className="text-orange-400 font-bold">{callSign}</span></p>
                </div>
              </div>
            </div>
            <button onClick={handleAddChannel} className="p-2 bg-slate-700/50 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors" title="Add Channel">
              <Plus size={20} />
            </button>
          </div>

          {/* Channel Selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeChannel === ch.id 
                    ? 'bg-orange-600/20 border-orange-500/50 text-orange-400' 
                    : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold text-sm truncate">{ch.name}</div>
                <div className="text-xs opacity-70 mt-1">{ch.users} active</div>
              </button>
            ))}
          </div>

          {/* Speaker Info Panel */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700 flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[120px]">
            {/* Audio Waveform Viz */}
            <div className={`absolute bottom-0 w-full flex items-end justify-center gap-1 h-12 transition-opacity duration-300 ${incomingSpeaker || isTalking ? 'opacity-50' : 'opacity-10'}`}>
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`w-2 bg-orange-500 rounded-t-sm ${incomingSpeaker || isTalking ? 'animate-pulse' : ''}`} style={{ height: incomingSpeaker || isTalking ? `${20 + Math.random() * 80}%` : '10%', animationDuration: `${0.2 + Math.random() * 0.3}s` }}></div>
              ))}
            </div>

            <div className="relative z-10 text-center">
              {isTalking ? (
                <div>
                  <h3 className="text-green-400 font-bold text-xl uppercase tracking-widest animate-pulse">Transmitting</h3>
                  <p className="text-slate-400 text-sm mt-1">on {channels.find(c => c.id === activeChannel)?.name}</p>
                </div>
              ) : incomingSpeaker ? (
                <div>
                  <h3 className="text-orange-400 font-bold text-xl">{incomingSpeaker}</h3>
                  <p className="text-slate-400 text-sm mt-1">is speaking on {channels.find(c => c.id === activeChannel)?.name}</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-slate-500 font-bold text-lg uppercase tracking-widest">Listening</h3>
                  <p className="text-slate-600 text-sm mt-1">{channels.find(c => c.id === activeChannel)?.name} Channel</p>
                </div>
              )}
            </div>
          </div>

          {/* PTT Button */}
          <div className="mt-6 flex justify-center">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`relative group w-32 h-32 rounded-full flex items-center justify-center transition-all select-none ${
                isTalking 
                  ? 'bg-green-600 shadow-[0_0_40px_rgba(22,163,74,0.6)] scale-95' 
                  : 'bg-slate-700 hover:bg-slate-600 border-4 border-slate-600 shadow-xl hover:shadow-2xl'
              }`}
            >
              <div className={`absolute inset-0 rounded-full border-4 border-green-500/50 animate-ping ${isTalking ? 'block' : 'hidden'}`}></div>
              {isTalking ? (
                <Mic className="text-white drop-shadow-md" size={48} />
              ) : (
                <MicOff className="text-slate-400 group-hover:text-white transition-colors" size={48} />
              )}
            </button>
          </div>
          <p className="text-center text-slate-500 text-xs mt-4 font-bold uppercase tracking-widest">Hold to Speak</p>

        </div>
      </div>
    </div>
  );
}
