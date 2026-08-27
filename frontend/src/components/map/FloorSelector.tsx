import React from 'react';
import { Layers } from 'lucide-react';

interface FloorSelectorProps {
  currentFloor: string;
  buildingName: string;
  onChange: (floor: string) => void;
}

const BUILDING_FLOORS: Record<string, number> = {
  'academic block': 6,
  'main block': 5,
  'civil block': 7,
  'eb block': 7,
  'block 3': 6,
  'block 2': 6,
  'mechanical block': 6,
  'canteen block': 1,
  'automobile dept': 2,
};

const NO_FLOORS = [
  'girls hostel', 'temple', 'bus parking', 'cricket nets', 'staff parking', 
  'oat', 'trp', 'playground', 'student parking', 'mech parking', 'office', 'dental block'
];

export const FloorSelector: React.FC<FloorSelectorProps> = ({ currentFloor, buildingName, onChange }) => {
  const normalizedName = (buildingName || '').toLowerCase().trim();
  
  if (NO_FLOORS.includes(normalizedName)) {
    return null;
  }

  const numFloors = BUILDING_FLOORS[normalizedName];
  
  // If building is completely unknown and not in any list, don't show the floor selector
  if (numFloors === undefined) {
    return null;
  }

  // Generate array: ['All', '6', '5', '4', '3', '2', '1', 'G']
  const floors = ['All'];
  for (let i = numFloors; i >= 1; i--) {
    floors.push(i.toString());
  }
  floors.push('G');

  return (
    <div className="absolute top-[35%] md:top-auto -translate-y-1/2 left-2 md:left-4 md:translate-y-0 md:bottom-8 z-[6500] bg-white/90 dark:bg-[#110810]/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-[#C8A951]/20 flex flex-col items-center p-1.5 md:p-2 gap-1 md:gap-2 transition-all">
      <div className="p-1 md:p-2 text-[#7B1113] dark:text-[#C8A951] border-b border-slate-200 dark:border-[#C8A951]/20 mb-1">
        <Layers size={18} className="md:w-5 md:h-5" />
      </div>
      {floors.map(floor => (
        <button
          key={floor}
          onClick={() => onChange(floor)}
          className={`w-8 h-8 md:w-10 md:h-10 rounded-xl font-bold transition-all flex items-center justify-center text-xs md:text-sm ${
            currentFloor === floor
              ? 'bg-[#7B1113] text-white shadow-md shadow-[#7B1113]/30 scale-110'
              : 'text-slate-600 dark:text-[#f0e8dc] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          {floor}
        </button>
      ))}
    </div>
  );
};

