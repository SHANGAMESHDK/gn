import { useEffect, useState } from 'react';
import { BuildingsAPI } from '../api';
import { Building, Map, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DetailModal } from '../components/common/DetailModal';

export function Buildings() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await BuildingsAPI.getAllBuildings();
        setBuildings(data.buildings || data);
      } catch (err) {
        console.error("Failed to load buildings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 overflow-auto p-6 lg:p-10">
      <div className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold mb-4">
              <Building size={16} /> Campus Facilities
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Explore Buildings
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg max-w-2xl">
              Discover academic blocks, hostels, and administrative facilities across the campus.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {buildings.map((building: any, index: number) => (
              <div 
                key={index} 
                onClick={() => setSelectedBuilding(building)}
                className="group relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer flex flex-col h-64"
              >
                {building.cover_photo ? (
                  <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
                    <img src={building.cover_photo} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent opacity-80 dark:opacity-100"></div>
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                )}
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 text-white transform group-hover:rotate-6 transition-transform">
                    <Building size={28} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {building.name || building.building_name || `Building ${index + 1}`}
                  </h3>
                  
                  <p className="text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-1">
                    {building.description || 'A primary facility on campus.'}
                  </p>
                  
                  <div 
                    className="mt-auto w-full py-3 bg-slate-50/80 hover:bg-blue-50 dark:bg-slate-700/80 dark:hover:bg-blue-900/50 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    View Details <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
            
            {buildings.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="inline-block p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <Building size={32} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Buildings Found</h3>
                <p className="text-slate-500">Check back later or ensure the backend is connected.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <DetailModal
        isOpen={!!selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
        title={selectedBuilding?.name || selectedBuilding?.building_name || ''}
        description={selectedBuilding?.description || 'A primary facility on campus.'}
        coverPhoto={selectedBuilding?.cover_photo}
        icon={<Building />}
        themeColor="blue"
        destinationNodeId={selectedBuilding?.node_id}
      />
    </div>
  );
}
