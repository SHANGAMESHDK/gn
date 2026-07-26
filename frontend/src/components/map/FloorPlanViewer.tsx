import React, { useState } from 'react';
import { X, Image as ImageIcon, Map, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-x-4 bottom-4 md:inset-auto md:top-24 md:right-4 z-[2000] md:w-[400px] lg:w-[500px] bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-blue-900/50 to-indigo-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <Map size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm truncate max-w-[200px]">{buildingName}</h3>
            <p className="text-blue-300 text-xs font-medium">Floor: {floor}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Image Viewer */}
      <div className="relative w-full h-[300px] md:h-[400px] bg-slate-950 flex items-center justify-center p-4 overflow-auto">
        {!hasError ? (
          <img 
            src={imageUrl}
            alt={`${buildingName} Floor ${floor}`}
            onError={() => setHasError(true)}
            className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-800"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-4 text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800">
              <ImageIcon size={32} className="opacity-50" />
            </div>
            <div>
              <p className="font-bold text-slate-400 mb-1">No Floor Plan Found</p>
              <p className="text-xs">Please add an image at <br/><code className="text-orange-400/70 bg-orange-400/10 px-2 py-1 rounded mt-2 inline-block">{imageUrl}</code></p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
