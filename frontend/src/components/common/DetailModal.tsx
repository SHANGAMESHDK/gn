import { X, Map, ArrowRight, Glasses, Share2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  coverPhoto?: string;
  icon?: React.ReactNode;
  category?: string;
  themeColor?: 'maroon' | 'gold' | 'blue' | 'orange';
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
  themeColor = 'maroon',
  destinationNodeId,
  destinationLat,
  destinationLng
}: DetailModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isMaroon = themeColor === 'maroon' || themeColor === 'blue';
  const gradientClass = isMaroon ? 'from-[#7B1113] via-[#9B1B30] to-[#7B1113]' : 'from-[#a68b3a] via-[#C8A951] to-[#a68b3a]';
  const btnBg = 'bg-[#7B1113] hover:bg-[#9B1B30] shadow-[#7B1113]/15';
  const subtleBg = 'bg-[#7B1113]/[0.07] text-[#7B1113] dark:bg-[#C8A951]/10 dark:text-[#C8A951]';

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

  const handleARNavigate = () => {
    let url = `/ar?destination=${encodeURIComponent(title)}`;
    if (destinationNodeId) {
      url += `&destination_node_id=${destinationNodeId}`;
    } else if (destinationLat && destinationLng) {
      url += `&destination_lat=${destinationLat}&destination_lng=${destinationLng}`;
    }
    navigate(url);
    onClose();
  };

  const handleShare = async () => {
    const url = window.location.origin + `/map?destination=${encodeURIComponent(title)}${destinationNodeId ? `&destination_node_id=${destinationNodeId}` : ''}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#2d2019]/40 dark:bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative glass-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Cover */}
            <div className={`relative h-48 w-full bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden`}>
              {coverPhoto ? (
                <>
                  <img src={coverPhoto} alt={title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] text-white">
                  <div className="scale-[4]">{icon}</div>
                </div>
              )}

              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button onClick={handleShare} className="p-2 bg-black/25 hover:bg-black/40 backdrop-blur text-white rounded-lg transition-colors" title="Copy link">
                  {copied ? <Check size={16} /> : <Share2 size={16} />}
                </button>
                <button onClick={onClose} className="p-2 bg-black/25 hover:bg-black/40 backdrop-blur text-white rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 -mt-4 relative z-10 bg-white dark:bg-[#1a0a0e] rounded-t-2xl">
              <div className="flex items-center gap-3 mb-1">
                {icon && (
                  <div className={`w-9 h-9 ${subtleBg} rounded-lg flex items-center justify-center`}>
                    {icon}
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-[#2d2019] dark:text-[#f0e8dc] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {title}
                </h2>
              </div>

              {category && (
                <div className="inline-block px-2.5 py-1 mt-2 mb-3 rounded text-[10px] font-bold uppercase tracking-[0.15em] bg-[#C8A951]/10 text-[#C8A951]">
                  {category}
                </div>
              )}

              <div className="mt-3 mb-6">
                <p className="text-[#6a5a4a] dark:text-[#a09080] leading-relaxed text-[14px]">
                  {description || 'No description available for this location.'}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleNavigate}
                  className={`w-full py-3.5 ${btnBg} text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 group`}
                >
                  <Map size={18} /> View on Map <ArrowRight size={16} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={handleARNavigate}
                  className="w-full py-3.5 glass text-[#2d2019] dark:text-[#f0e8dc] font-bold rounded-xl hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                  <Glasses size={18} className="text-[#7B1113] dark:text-[#C8A951]" /> AR Navigate
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
