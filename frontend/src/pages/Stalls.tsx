import { useEffect, useState } from 'react';
import { StallsAPI } from '../api';
import { Store, ArrowRight, Coffee, Book, Pizza, ShoppingBag } from 'lucide-react';
import { DetailModal } from '../components/common/DetailModal';

export function Stalls() {
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedStall, setSelectedStall] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await StallsAPI.getAllStalls();
        setStalls(data.stalls || data);
      } catch (err) {
        console.error("Failed to load stalls", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = ['All', ...Array.from(new Set(stalls.map(s => s.category || 'General')))];
  
  const filteredStalls = activeFilter === 'All' 
    ? stalls 
    : stalls.filter(s => (s.category || 'General') === activeFilter);

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('canteen')) return <Pizza size={24} />;
    if (cat.includes('coffee') || cat.includes('cafe')) return <Coffee size={24} />;
    if (cat.includes('book') || cat.includes('stationery')) return <Book size={24} />;
    return <ShoppingBag size={24} />;
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 overflow-auto p-6 lg:p-10">
      <div className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-bold mb-4">
              <Store size={16} /> Campus Marketplace
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Food & Retail
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg max-w-2xl">
              Explore canteens, cafes, stationery shops, and utility stores available on campus.
            </p>
          </div>
        </div>

        {!loading && categories.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-8 snap-x hide-scrollbar">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveFilter(cat as string)}
                className={`shrink-0 px-6 py-2.5 rounded-full font-bold text-sm transition-all snap-start ${
                  activeFilter === cat 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat as string}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStalls.map((stall: any, index: number) => (
              <div 
                key={index} 
                onClick={() => setSelectedStall(stall)}
                className="group relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/30 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer flex flex-col h-64"
              >
                {stall.cover_photo ? (
                  <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
                    <img src={stall.cover_photo} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent opacity-80 dark:opacity-100"></div>
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                )}
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 text-white transform group-hover:-rotate-6 transition-transform">
                      {getCategoryIcon(stall.category || 'General')}
                    </div>
                    {stall.status === 'active' && (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Open
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {stall.name}
                  </h3>
                  
                  <div className="text-sm font-bold text-orange-500 dark:text-orange-400 mb-3 uppercase tracking-wider">
                    {stall.category || 'General Store'}
                  </div>
                  
                  <p className="text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-1">
                    {stall.description || `Visit ${stall.name} for the best services.`}
                  </p>
                  
                  <div 
                    className="mt-auto w-full py-3 bg-slate-50/80 hover:bg-orange-50 dark:bg-slate-700/80 dark:hover:bg-orange-900/50 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:text-orange-700 dark:hover:text-orange-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    View Details <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
            
            {filteredStalls.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="inline-block p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <Store size={32} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Stalls Found</h3>
                <p className="text-slate-500">Try selecting a different category or check back later.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <DetailModal
        isOpen={!!selectedStall}
        onClose={() => setSelectedStall(null)}
        title={selectedStall?.name || ''}
        description={selectedStall?.description || `Visit ${selectedStall?.name} for the best services.`}
        coverPhoto={selectedStall?.cover_photo}
        icon={selectedStall ? getCategoryIcon(selectedStall.category || 'General') : <Store />}
        category={selectedStall?.category}
        themeColor="orange"
        destinationNodeId={selectedStall?.node_id}
      />
    </div>
  );
}
