import { ArrowUp, CornerUpLeft, CornerUpRight, MapPin, Navigation } from 'lucide-react';
import type { TurnInstruction } from '../../hooks/useNavigationDirections';

interface LiveNavigationPanelProps {
  routeData: any;
  destination: string | null;
  instruction: TurnInstruction | null;
}

export function LiveNavigationPanel({ routeData, destination, instruction }: LiveNavigationPanelProps) {
  if (!routeData) return null;

  const renderIcon = () => {
    if (!instruction) return <Navigation size={48} className="text-white" />;
    switch (instruction.action) {
      case 'left':
      case 'slight-left':
        return <CornerUpLeft size={48} className="text-white" />;
      case 'right':
      case 'slight-right':
        return <CornerUpRight size={48} className="text-white" />;
      case 'arrive':
        return <MapPin size={48} className="text-white" />;
      case 'straight':
      default:
        return <ArrowUp size={48} className="text-white" />;
    }
  };

  const isNearingTurn = instruction && instruction.distance < 20 && instruction.action !== 'straight';

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] w-[90%] max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-4 border-slate-900/10 overflow-hidden flex flex-col transition-all duration-300">
      
      {/* Primary Instruction HUD */}
      <div className={`p-4 flex items-center gap-4 transition-colors duration-500 ${isNearingTurn ? 'bg-orange-500' : 'bg-green-600'}`}>
        <div className="shrink-0 flex items-center justify-center p-2">
          {renderIcon()}
        </div>
        <div className="flex-1 text-white">
          <div className="text-3xl font-black tracking-tight flex items-baseline gap-1">
            {instruction ? instruction.distance : 0}
            <span className="text-xl font-bold opacity-80">m</span>
          </div>
          <div className="text-lg font-bold leading-tight opacity-95">
            {instruction ? instruction.message : 'Calculating...'}
          </div>
        </div>
      </div>

      {/* Destination / Progress HUD */}
      <div className="px-5 py-3 flex items-center justify-between bg-white dark:bg-slate-800">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Navigating To</p>
          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{destination || "Destination"}</p>
        </div>
        
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2"></div>
        
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Arrive in</p>
          <p className="text-lg font-black text-blue-600 dark:text-blue-400">
            {routeData.walking_time?.minutes > 0 ? `${routeData.walking_time.minutes}m ` : ''}
            {routeData.walking_time?.seconds}s
          </p>
        </div>
      </div>
    </div>
  );
}
