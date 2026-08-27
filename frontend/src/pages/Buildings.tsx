import { useEffect, useState } from 'react';
import { BuildingsAPI } from '../api';
import { Building, ArrowRight, Search, X } from 'lucide-react';
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

export function Buildings() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredBuildings = buildings.filter(b => {
    const name = (b.name || b.building_name || '').toLowerCase();
    const desc = (b.description || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || desc.includes(searchQuery.toLowerCase());
  });

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
            <p className="text-[11px] font-bold text-[#7B1113] dark:text-[#C8A951] uppercase tracking-[0.2em] mb-2">Campus Facilities</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#2d2019] dark:text-[#f0e8dc] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Buildings
            </h1>
            <p className="text-[#6a5a4a] dark:text-[#8a7a6a] mt-2 text-sm max-w-lg">
              Academic blocks, labs, hostels and administrative offices.
            </p>
          </div>

          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="shrink-0 glass rounded-xl px-4 py-2.5 text-center"
            >
              <div className="text-2xl font-black gradient-text">{filteredBuildings.length}</div>
              <div className="text-[10px] font-bold text-[#8a7a6a] uppercase tracking-wider">Total</div>
            </motion.div>
          )}
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a09080]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search buildings..."
              className="w-full pl-10 pr-9 py-2.5 glass rounded-lg text-[#2d2019] dark:text-[#f0e8dc] placeholder:text-[#a09080] outline-none focus:ring-2 focus:ring-[#7B1113]/20 transition-all text-sm font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#a09080] hover:text-[#2d2019] transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-52 glass rounded-2xl animate-pulse" />
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
              {filteredBuildings.map((building: any, index: number) => (
                <motion.div 
                  key={building.id || index}
                  variants={cardVariant}
                  layout
                  onClick={() => setSelectedBuilding(building)}
                  className="group glass rounded-2xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col min-h-[13rem] relative overflow-hidden hover:border-[#7B1113]/15"
                >
                  {building.cover_photo && (
                    <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-400">
                      <img src={building.cover_photo} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#110810] via-white/70 dark:via-[#110810]/70 to-transparent" />
                    </div>
                  )}
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="w-10 h-10 bg-[#7B1113] rounded-lg flex items-center justify-center mb-4 text-[#C8A951] shadow-sm">
                      <Building size={20} />
                    </div>
                    
                    <h3 className="text-lg font-bold text-[#2d2019] dark:text-[#f0e8dc] mb-1.5 group-hover:text-[#7B1113] dark:group-hover:text-[#C8A951] transition-colors">
                      {building.name || building.building_name || `Building ${index + 1}`}
                    </h3>
                    
                    <p className="text-[#6a5a4a] dark:text-[#8a7a6a] line-clamp-2 mb-4 flex-1 text-[13px] leading-relaxed">
                      {building.description || 'A primary facility on campus.'}
                    </p>
                    
                    <div className="mt-auto flex items-center gap-1.5 text-[#7B1113] dark:text-[#C8A951] text-[13px] font-semibold">
                      View Details <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredBuildings.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <Building size={28} className="mx-auto mb-3 text-[#a09080]" />
                <h3 className="text-lg font-bold text-[#2d2019] dark:text-[#f0e8dc] mb-1">No Buildings Found</h3>
                <p className="text-[#8a7a6a] text-sm">
                  {searchQuery ? 'Try a different search term.' : 'Check back later or ensure the backend is connected.'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <DetailModal
        isOpen={!!selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
        title={selectedBuilding?.name || selectedBuilding?.building_name || ''}
        description={selectedBuilding?.description || 'A primary facility on campus.'}
        coverPhoto={selectedBuilding?.cover_photo}
        icon={<Building />}
        themeColor="maroon"
        destinationNodeId={selectedBuilding?.node_id}
      />
    </div>
  );
}
