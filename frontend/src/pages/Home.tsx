import { useNavigate } from 'react-router-dom';
import { Map, Glasses, Compass, Navigation } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-6">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 p-10 md:p-14 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] text-center flex flex-col items-center">
        
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/40 mb-8 transform -rotate-6">
          <Compass size={40} className="text-white" />
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
          Campus Navigator
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-md">
          Experience your campus in a whole new dimension with true 3D maps and location-based AR.
        </p>

        <div className="w-full flex flex-col md:flex-row gap-4">
          <button
            onClick={() => navigate('/map')}
            className="flex-1 group relative overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            <Map size={24} />
            Explore 3D Map
          </button>
          
          <button
            onClick={() => navigate('/ar')}
            className="flex-1 group relative overflow-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-lg shadow-slate-200/50 dark:shadow-none"
          >
            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Glasses size={24} className="relative z-10 text-blue-500" />
            <span className="relative z-10">Launch AR Mode</span>
          </button>
        </div>
      </div>
      
      {/* Features showcase */}
      <div className="mt-16 flex flex-wrap justify-center gap-8 z-10 opacity-70 text-sm font-medium text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Navigation size={18} /> Turn-by-turn Navigation
        </div>
        <div className="flex items-center gap-2">
          <Map size={18} /> MapLibre 3D Terrain
        </div>
        <div className="flex items-center gap-2">
          <Glasses size={18} /> Augmented Reality
        </div>
      </div>
    </div>
  );
}
