import { useEffect, useState } from 'react';
import { StallsAPI } from '../api';
import { Store, ArrowRight, Coffee, Book, Pizza, ShoppingBag, Search, X } from 'lucide-react';
import { DetailModal } from '../components/common/DetailModal';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } }
};

const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } }
};

export function Stalls() {
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedStall, setSelectedStall] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
  
  const filteredStalls = stalls.filter(s => {
    const matchesCategory = activeFilter === 'All' || (s.category || 'General') === activeFilter;
    const matchesSearch = !searchQuery || 
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('canteen')) return <Pizza size={20} />;
    if (cat.includes('coffee') || cat.includes('cafe')) return <Coffee size={20} />;
    if (cat.includes('book') || cat.includes('stationery')) return <Book size={20} />;
    return <ShoppingBag size={20} />;
  };

  return (
    <div className="min-h-full overflow-auto p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8"
        >
          <div>
            <p className="text-[11px] font-bold text-[#C8A951] uppercase tracking-[0.2em] mb-2">Campus Marketplace</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#2d2019] dark:text-[#f0e8dc] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Food & Retail
            </h1>
            <p className="text-[#6a5a4a] dark:text-[#8a7a6a] mt-2 text-sm max-w-lg">
              Canteens, cafes, stationery, and utility stores on campus.
            </p>
          </div>

          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="shrink-0 glass rounded-xl px-4 py-2.5 text-center"
            >
              <div className="text-2xl font-black gradient-text">{filteredStalls.length}</div>
              <div className="text-[10px] font-bold text-[#8a7a6a] uppercase tracking-wider">Stalls</div>
            </motion.div>
          )}
        </motion.div>

        {/* Search + Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6 space-y-3">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a09080]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stalls..."
              className="w-full pl-10 pr-9 py-2.5 glass rounded-lg text-[#2d2019] dark:text-[#f0e8dc] placeholder:text-[#a09080] outline-none focus:ring-2 focus:ring-[#C8A951]/25 transition-all text-sm font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#a09080] hover:text-[#2d2019] transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {!loading && categories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {categories.map((cat, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFilter(cat as string)}
                  className={`shrink-0 px-4 py-2 rounded-lg font-semibold text-[12.5px] transition-all duration-200 ${
                    activeFilter === cat 
                      ? 'bg-[#7B1113] text-white shadow-sm' 
                      : 'glass text-[#6a5a4a] dark:text-[#8a7a6a] hover:text-[#2d2019] dark:hover:text-[#f0e8dc]'
                  }`}
                >
                  {cat as string}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-56 glass rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredStalls.map((stall: any, index: number) => (
                <motion.div 
                  key={stall.id || index}
                  variants={cardVariant}
                  layout
                  onClick={() => setSelectedStall(stall)}
                  className="group glass rounded-2xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col h-56 relative overflow-hidden hover:border-[#C8A951]/20"
                >
                  {stall.cover_photo && (
                    <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-400">
                      <img src={stall.cover_photo} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#110810] via-white/70 dark:via-[#110810]/70 to-transparent" />
                    </div>
                  )}
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-[#C8A951]/[0.12] dark:bg-[#C8A951]/10 rounded-lg flex items-center justify-center text-[#C8A951]">
                        {getCategoryIcon(stall.category || 'General')}
                      </div>
                      {stall.status === 'active' && (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold rounded-md flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Open
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-[#2d2019] dark:text-[#f0e8dc] mb-0.5 group-hover:text-[#7B1113] dark:group-hover:text-[#C8A951] transition-colors">
                      {stall.name}
                    </h3>
                    
                    <div className="text-[10px] font-bold text-[#C8A951] mb-2 uppercase tracking-[0.15em]">
                      {stall.category || 'General Store'}
                    </div>
                    
                    <p className="text-[#6a5a4a] dark:text-[#8a7a6a] line-clamp-2 mb-4 flex-1 text-[12.5px] leading-relaxed">
                      {stall.description || `Visit ${stall.name} for the best services.`}
                    </p>
                    
                    <div className="mt-auto flex items-center gap-1.5 text-[#7B1113] dark:text-[#C8A951] text-[13px] font-semibold">
                      View Details <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredStalls.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <Store size={28} className="mx-auto mb-3 text-[#a09080]" />
                <h3 className="text-lg font-bold text-[#2d2019] dark:text-[#f0e8dc] mb-1">No Stalls Found</h3>
                <p className="text-[#8a7a6a] text-sm">
                  {searchQuery ? 'Try a different search term.' : 'Try a different category or check back later.'}
                </p>
              </div>
            )}
          </motion.div>
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
        themeColor="gold"
        destinationNodeId={selectedStall?.node_id}
        destinationLat={selectedStall?.latitude}
        destinationLng={selectedStall?.longitude}
      />
    </div>
  );
}
