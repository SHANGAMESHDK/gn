import React, { useState, useEffect } from 'react';
import { X, Layers, ChevronRight, Building2 } from 'lucide-react';

interface ExplodedBuildingViewProps {
  buildingName: string;
  onClose: () => void;
  onFloorSelect: (floor: string) => void;
}

const BUILDING_FLOORS: Record<string, string[]> = {
  'main block': ['G', '1', '2', '3', '4', '5'],
  'academic block': ['G', '1', '2', '3', '4', '5'],
  'civil block': ['G', '1', '2', '3', '4', '5', '6'],
  'eb block': ['G', '1', '2', '3', '4', '5', '6'],
  'block 3': ['G', '1', '2', '3', '4', '5'],
  'block 2': ['G', '1', '2', '3', '4', '5'],
  'mechanical block': ['G', '1', '2', '3', '4', '5'],
  'canteen block': ['G'],
  'automobile dept': ['G', '1'],
};

const FLOOR_COLORS = [
  'from-emerald-500/30 to-emerald-600/10 border-emerald-400/40',
  'from-sky-500/30 to-sky-600/10 border-sky-400/40',
  'from-violet-500/30 to-violet-600/10 border-violet-400/40',
  'from-amber-500/30 to-amber-600/10 border-amber-400/40',
  'from-rose-500/30 to-rose-600/10 border-rose-400/40',
  'from-cyan-500/30 to-cyan-600/10 border-cyan-400/40',
  'from-fuchsia-500/30 to-fuchsia-600/10 border-fuchsia-400/40',
];

const FLOOR_LABEL_COLORS = [
  'bg-emerald-500 shadow-emerald-500/50',
  'bg-sky-500 shadow-sky-500/50',
  'bg-violet-500 shadow-violet-500/50',
  'bg-amber-500 shadow-amber-500/50',
  'bg-rose-500 shadow-rose-500/50',
  'bg-cyan-500 shadow-cyan-500/50',
  'bg-fuchsia-500 shadow-fuchsia-500/50',
];

export const ExplodedBuildingView: React.FC<ExplodedBuildingViewProps> = ({
  buildingName,
  onClose,
  onFloorSelect,
}) => {
  const [isExploded, setIsExploded] = useState(false);
  const [hoveredFloor, setHoveredFloor] = useState<string | null>(null);

  const normalizedName = (buildingName || '').toLowerCase().trim();
  const floors = BUILDING_FLOORS[normalizedName] || ['G', '1', '2', '3'];
  const safeBuildingName = buildingName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  // Trigger the explode animation shortly after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsExploded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExploded(false);
    setTimeout(onClose, 400); // Wait for collapse animation
  };

  const totalFloors = floors.length;

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500 ${isExploded ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center justify-between h-screen py-10 transition-all duration-500 ${isExploded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        {/* Header */}
        <div className="relative z-50 flex items-center gap-4 bg-[#110810]/90 backdrop-blur-xl border border-[#C8A951]/30 rounded-2xl px-6 py-4 shadow-2xl">
          <div className="p-2.5 bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] rounded-xl text-[#C8A951] shadow-lg shadow-[#7B1113]/30">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
              {buildingName}
            </h2>
            <p className="text-[#C8A951]/80 text-xs font-medium tracking-widest uppercase">
              {totalFloors} Floor{totalFloors > 1 ? 's' : ''} · Tap a floor to explore
            </p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 p-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* 3D Exploded Container */}
        <div
          className="relative flex-1 flex items-center justify-center -mt-10"
          style={{
            perspective: '1200px',
            perspectiveOrigin: '50% 40%',
          }}
        >
          <div
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(55deg) rotateZ(-45deg)',
              transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {[...floors].reverse().map((floor, index) => {
              const reverseIndex = totalFloors - 1 - index;
              const explodeOffset = isExploded ? reverseIndex * 90 : reverseIndex * 4;
              const isHovered = hoveredFloor === floor;
              const imageUrl = `/floorplans/${safeBuildingName}_${floor}.png`;
              const colorClass = FLOOR_COLORS[reverseIndex % FLOOR_COLORS.length];
              const labelColorClass = FLOOR_LABEL_COLORS[reverseIndex % FLOOR_LABEL_COLORS.length];

              return (
                <div
                  key={floor}
                  className={`relative cursor-pointer group`}
                  style={{
                    width: '280px',
                    height: '200px',
                    transition: `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.05}s, box-shadow 0.3s ease`,
                    transform: `translateZ(${explodeOffset}px) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                    transformStyle: 'preserve-3d',
                    marginBottom: '-196px', // Stack them on top of each other
                  }}
                  onClick={() => onFloorSelect(floor)}
                  onMouseEnter={() => setHoveredFloor(floor)}
                  onMouseLeave={() => setHoveredFloor(null)}
                >
                  {/* Floor Slab */}
                  <div className={`absolute inset-0 rounded-xl border-2 bg-gradient-to-br ${colorClass} overflow-hidden shadow-xl ${isHovered ? 'shadow-2xl ring-2 ring-white/30' : ''} transition-all duration-300`}>
                    {/* Floor plan image */}
                    <img
                      src={imageUrl}
                      alt={`Floor ${floor}`}
                      className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Floor label */}
                    <div className={`absolute top-3 left-3 px-3 py-1.5 ${labelColorClass} text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1.5`}>
                      <Layers size={12} />
                      {floor === 'G' ? 'Ground' : `Floor ${floor}`}
                    </div>

                    {/* Click hint */}
                    <div className={`absolute bottom-3 right-3 flex items-center gap-1 text-white/0 group-hover:text-white/80 text-xs font-medium transition-all duration-300 bg-black/30 px-2.5 py-1.5 rounded-lg backdrop-blur-sm`}>
                      Explore <ChevronRight size={14} />
                    </div>

                    {/* Side edge (3D effect) */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-black/30"
                      style={{
                        height: '8px',
                        transform: 'translateZ(-4px) rotateX(90deg)',
                        transformOrigin: 'bottom',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floor Legend */}
        <div className="relative z-50 flex flex-wrap gap-2 justify-center max-w-[350px]">
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => onFloorSelect(floor)}
              onMouseEnter={() => setHoveredFloor(floor)}
              onMouseLeave={() => setHoveredFloor(null)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                hoveredFloor === floor
                  ? 'bg-white/20 text-white border-white/40 scale-110 shadow-lg'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
              }`}
            >
              {floor === 'G' ? 'Ground' : `Floor ${floor}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
