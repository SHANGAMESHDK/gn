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
    <div className="absolute bottom-28 left-4 md:bottom-8 z-[1000] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center p-2 gap-2 transition-all">
      <div className="p-2 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700 mb-1">
        <Layers size={20} />
      </div>
      {floors.map(floor => (
        <button
          key={floor}
          onClick={() => onChange(floor)}
          className={`w-10 h-10 rounded-xl font-bold transition-all flex items-center justify-center ${
            currentFloor === floor
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-110'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          {floor}
        </button>
      ))}
    </div>
  );
};

