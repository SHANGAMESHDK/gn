import { useMemo, useState } from 'react';
import { generateTurnByTurnDirections } from '../../utils/navigationUtils';
import { ArrowUp, CornerUpLeft, CornerUpRight, MapPin, Navigation, ChevronUp, ChevronDown } from 'lucide-react';

interface RouteDirectionsListProps {
  routeData: any;
}

export function RouteDirectionsList({ routeData }: RouteDirectionsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const instructions = useMemo(() => {
    if (!routeData || !routeData.coordinates) return [];
    return generateTurnByTurnDirections(routeData.coordinates);
  }, [routeData]);

  if (!instructions.length) return null;

  const renderIcon = (action: string) => {
    switch (action) {
      case 'left':
      case 'slight-left':
        return <CornerUpLeft size={20} className="text-blue-500" />;
      case 'right':
      case 'slight-right':
        return <CornerUpRight size={20} className="text-blue-500" />;
      case 'arrive':
        return <MapPin size={20} className="text-green-500" />;
      case 'straight':
      default:
        return <ArrowUp size={20} className="text-slate-500" />;
    }
  };

  const totalDistance = instructions.reduce((acc, inst) => acc + inst.distance, 0);

  return (
    <div className="absolute top-4 right-4 z-[1000] w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh] transition-all">
      <div 
        className="bg-slate-50 dark:bg-slate-900 p-4 flex items-center justify-between cursor-pointer border-b border-slate-200 dark:border-slate-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Navigation size={18} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Directions List</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">
            {totalDistance}m total
          </span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-y-auto p-2">
          {instructions.map((inst, idx) => (
            <div key={idx} className="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0">
              <div className="shrink-0 mt-0.5 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                {renderIcon(inst.action)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 dark:text-white text-sm">{inst.message}</p>
                {inst.distance > 0 && (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    {inst.distance} meters
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
