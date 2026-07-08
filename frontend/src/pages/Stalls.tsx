import { useEffect, useState } from 'react';
import { StallsAPI } from '../api';
import { Tent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Stalls() {
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadStalls() {
      try {
        const data = await StallsAPI.getAllStalls();
        setStalls(data.stalls || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch stalls from backend.');
        console.error("Error fetching stalls:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStalls();
  }, []);

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
          <Tent size={24} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Symposium Stalls</h1>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-6">
          <strong>Connection Error:</strong> {error}
        </div>
      )}
      
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stalls.map((stall, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h2 className="font-bold text-lg text-slate-800 dark:text-white">{stall.name}</h2>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 text-xs font-medium rounded-full">
                  {stall.category}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 flex-1">
                {stall.description}
              </p>
              <button 
                onClick={() => navigate(`/map?destination=${encodeURIComponent(stall.name)}&node_id=${stall.node_id}`)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-medium rounded-lg transition-colors">
                Navigate Here
              </button>
            </div>
          ))}
          {stalls.length === 0 && (
            <div className="col-span-full text-center p-12 text-slate-500">
              No stalls found in the database.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
