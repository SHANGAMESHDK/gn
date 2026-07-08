import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BuildingsAPI } from '../api';
import { Building } from 'lucide-react';

export function Buildings() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBuildings() {
      try {
        const data = await BuildingsAPI.getAllBuildings();
        setBuildings(data.buildings || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch buildings from backend.');
        console.error("Error fetching buildings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBuildings();
  }, []);

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
          <Building size={24} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Campus Buildings</h1>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-6">
          <strong>Connection Error:</strong> {error}
        </div>
      )}
      
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {buildings.map((b, i) => (
            <Link to={`/buildings/${encodeURIComponent(b.name || b.id)}`} key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col block">
              <div className="h-32 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <Building size={48} className="text-slate-400 dark:text-slate-500" />
              </div>
              <div className="p-4">
                <h2 className="font-bold text-lg text-slate-800 dark:text-white mb-2">{b.name || 'Unnamed Building'}</h2>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <p>Type: {b.properties?.type || b.type || 'Building'}</p>
                </div>
              </div>
            </Link>
          ))}
          {buildings.length === 0 && (
            <div className="col-span-full text-center p-12 text-slate-500">
              No buildings found in the database.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
