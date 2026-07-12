import { X, Map, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  coverPhoto?: string;
  icon?: React.ReactNode;
  category?: string;
  themeColor?: 'blue' | 'orange';
  destinationNodeId?: string | number;
  destinationLat?: number;
  destinationLng?: number;
}

export function DetailModal({
  isOpen,
  onClose,
  title,
  description,
  coverPhoto,
  icon,
  category,
  themeColor = 'blue',
  destinationNodeId,
  destinationLat,
  destinationLng
}: DetailModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const colorClass = themeColor === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400';
  const bgClass = themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700';
  const bgSubtleClass = themeColor === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-orange-50 dark:bg-blue-900/30';
  const gradientClass = themeColor === 'blue' ? 'from-blue-500 to-purple-600' : 'from-orange-500 to-pink-600';

  const handleNavigate = () => {
    let url = `/map?destination=${encodeURIComponent(title)}`;
    if (destinationNodeId) {
      url += `&destination_node_id=${destinationNodeId}`;
    } else if (destinationLat && destinationLng) {
      url += `&destination_lat=${destinationLat}&destination_lng=${destinationLng}`;
    }
    navigate(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative animate-in zoom-in-95 duration-300">

        {/* Cover Photo Area */}
        <div className={`relative h-64 w-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
          {coverPhoto ? (
            <img src={coverPhoto} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 text-white">
              <div className="scale-[5]">{icon}</div>
            </div>
          )}

          {/* Close button layered on top of photo */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full transition-colors z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 -mt-6 relative z-10 bg-white dark:bg-slate-800 rounded-t-3xl">
          <div className="flex items-center gap-3 mb-2">
            {icon && (
              <div className={`w-10 h-10 ${bgSubtleClass} ${colorClass} rounded-xl flex items-center justify-center shadow-sm`}>
                {icon}
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {title}
            </h2>
          </div>

          {category && (
            <div className={`inline-block px-3 py-1 mt-2 mb-4 rounded-full text-xs font-bold uppercase tracking-wider ${bgSubtleClass} ${colorClass}`}>
              {category}
            </div>
          )}

          <div className="prose dark:prose-invert prose-slate mt-4 mb-8">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
              {description || 'No description available for this location.'}
            </p>
          </div>

          <button
            onClick={handleNavigate}
            className={`w-full py-4 ${bgClass} text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group`}
          >
            <Map size={20} /> Navigate Here <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
