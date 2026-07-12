import { useState } from 'react';
import { Users, Navigation2, ShieldCheck, X, Activity, Map as MapIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/axios';

export function FriendSync() {
  const navigate = useNavigate();

  const [trackInput, setTrackInput] = useState('');

  // New Share Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareName, setShareName] = useState('');
  const [shareRegNo, setShareRegNo] = useState('');
  const [shareAdminCode, setShareAdminCode] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  // Track submit
  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput) return;
    navigate(`/map?track=${trackInput.toUpperCase()}`);
  };

  // Submit New Share
  const handleNewShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareName || !shareRegNo || !shareAdminCode) {
      setShareError('All fields are required');
      return;
    }
    setShareError('');
    setShareLoading(true);

    try {
      const res = await apiClient.post(`/telemetry/share`, {
        name: shareName,
        reg_no: shareRegNo,
        admin_code: shareAdminCode
      });
      const generatedCode = res.data.code;
      sessionStorage.setItem('telemetry_device_id', generatedCode);
      
      setShowShareModal(false);
      
      // Clear form
      setShareName('');
      setShareRegNo('');
      setShareAdminCode('');
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

  return (
    <div className="min-h-full bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full"></div>
      
      <div className="relative z-10 bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl w-full max-w-sm text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-500/30">
          <Users size={40} />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Friend Sync</h1>
        <p className="text-slate-400 text-sm mb-8">
          Track a friend or start broadcasting your location.
        </p>

        <div className="flex flex-col gap-6">
          {/* Track Form */}
          <form onSubmit={handleTrack} className="flex gap-2">
            <input 
              type="text" 
              value={trackInput}
              onChange={e => setTrackInput(e.target.value.toUpperCase())}
              placeholder="FRIEND CODE"
              className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono tracking-widest uppercase text-sm text-center"
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
            onClick={() => setShowShareModal(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all flex justify-center items-center gap-2"
          >
            New Share Location
          </button>
        </div>
      </div>

      {/* New Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 text-left">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-600/20 to-teal-600/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-400" size={24} />
                <h3 className="text-xl font-bold text-white">Generate Code</h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-slate-400 text-sm">To generate a new location sharing code, please provide your details and the administrative security code.</p>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={shareName}
                  onChange={e => setShareName(e.target.value)}
                  placeholder="e.g. Alice Smith"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registration Number</label>
                <input 
                  type="text" 
                  value={shareRegNo}
                  onChange={e => setShareRegNo(e.target.value)}
                  placeholder="e.g. 21BCE1234"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Security Code</label>
                <input 
                  type="password" 
                  value={shareAdminCode}
                  onChange={e => setShareAdminCode(e.target.value)}
                  placeholder="Admin provided code"
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
                {shareLoading ? <Activity className="animate-spin" size={20} /> : 'Generate Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
