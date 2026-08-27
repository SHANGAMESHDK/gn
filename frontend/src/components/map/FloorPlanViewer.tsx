import React, { useState } from 'react';
import { X, Image as ImageIcon, Map } from 'lucide-react';

interface FloorPlanViewerProps {
  buildingName: string;
  floor: string;
  onClose: () => void;
}

export const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({ buildingName, floor, onClose }) => {
  const [hasError, setHasError] = useState(false);
  
  // Format building name to remove spaces and special characters for the filename
  const safeBuildingName = buildingName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  
  // Try jpg first, though usually you'd want a consistent format or an API to fetch the exact URL
  const imageUrl = `/floorplans/${safeBuildingName}_${floor}.png`;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] z-[7000] md:w-[400px] lg:w-[500px] bg-[#110810]/95 backdrop-blur-xl border border-[#C8A951]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-[#C8A951]/20 flex items-center justify-between bg-gradient-to-r from-[#7B1113]/80 to-[#4A0A0B]/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/20 rounded-lg text-[#C8A951]">
            <Map size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm truncate max-w-[200px]" style={{ fontFamily: "'Playfair Display', serif" }}>{buildingName}</h3>
            <p className="text-[#C8A951] text-xs font-medium tracking-wide">Floor: {floor}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-black/30 hover:bg-black/50 text-[#f0e8dc] hover:text-white rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Image Viewer */}
      <div className="relative w-full h-[300px] md:h-[400px] bg-gradient-to-br from-[#1a0a0e] to-[#110810] flex items-center justify-center p-4 overflow-auto">
        {!hasError ? (
          <img 
            src={imageUrl}
            alt={`${buildingName} Floor ${floor}`}
            onError={() => setHasError(true)}
            className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-[#C8A951]/10"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[#a09080] gap-4 text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-black/30 flex items-center justify-center border border-[#C8A951]/10">
              <ImageIcon size={32} className="opacity-50 text-[#C8A951]" />
            </div>
            <div>
              <p className="font-bold text-[#f0e8dc] mb-1">No Floor Plan Found</p>
              <p className="text-xs">Please add an image at <br/><code className="text-[#C8A951] bg-[#C8A951]/10 px-2 py-1 rounded mt-2 inline-block shadow-inner">{imageUrl}</code></p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
