import { X, Map as MapIcon, Glasses, Calendar, Users, Activity, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EventsAPI } from '../../api/events';
import type { CampusEvent } from '../../api/events';

interface BuildingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  buildingData: any;
}

export function BuildingSidebar({ isOpen, onClose, buildingData }: BuildingSidebarProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (isOpen && buildingData?.Name) {
      setLoadingEvents(true);
      EventsAPI.getEventsByBuilding(buildingData.Name)
        .then(res => setEvents(res))
        .catch(() => setEvents([]))
        .finally(() => setLoadingEvents(false));
    } else {
      setEvents([]);
    }
  }, [isOpen, buildingData?.Name]);

  if (!isOpen || !buildingData) return null;

  const title = buildingData.Name || 'Building';
  const description = buildingData.description || 'A building on the SRM Easwari Engineering College campus.';
  const coverPhoto = buildingData.cover_photo;
  const occupancy: number = typeof buildingData.live_occupancy === 'number' ? buildingData.live_occupancy : 0;

  const getOccupancyColor = (val: number) => {
    if (val < 35) return 'bg-emerald-500';
    if (val < 70) return 'bg-amber-500';
    return 'bg-red-500';
  };
  const getOccupancyLabel = (val: number) => {
    if (val < 35) return 'Low Activity';
    if (val < 70) return 'Moderately Busy';
    return 'Very Crowded';
  };
  const getOccupancyDot = (val: number) => {
    if (val < 35) return 'text-emerald-400';
    if (val < 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const handleNavigate = () => {
    let url = `/map?destination=${encodeURIComponent(title)}`;
    if (buildingData.node_id) url += `&destination_node_id=${buildingData.node_id}`;
    navigate(url);
    onClose();
  };

  const handleARNavigate = () => {
    let url = `/ar?destination=${encodeURIComponent(title)}`;
    if (buildingData.node_id) url += `&destination_node_id=${buildingData.node_id}`;
    navigate(url);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/50 z-[5000]"
            onClick={onClose}
          />

          {/* Sidebar Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed bottom-0 left-0 w-full h-[85vh] rounded-t-3xl md:left-auto md:right-0 md:top-0 md:h-full md:w-[380px] md:rounded-none z-[6000] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #1a0a0e 0%, #110810 100%)' }}
          >
            {/* Cover Image */}
            <div className="relative h-44 shrink-0 overflow-hidden">
              {coverPhoto ? (
                <>
                  <img src={coverPhoto} alt={title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#110810] via-black/40 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#7B1113] via-[#5a0c0e] to-[#2a0508] flex items-center justify-center">
                  <MapIcon size={48} className="text-[#C8A951]/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#110810] to-transparent" />
                </div>
              )}

              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all z-[6100] border border-white/20 shadow-lg"
              >
                <X size={20} />
              </button>

              <div className="absolute bottom-4 left-5 right-5 z-10">
                <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {title}
                </h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5" style={{ scrollbarWidth: 'none' }}>

              {/* Description */}
              <p className="text-[#a09080] text-sm leading-relaxed">{description}</p>

              {/* Live Occupancy Card */}
              <div className="bg-white/[0.04] border border-[#C8A951]/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-[#C8A951]" />
                    <span className="font-bold text-[#f0e8dc] text-sm">Live Occupancy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getOccupancyDot(occupancy)} animate-pulse`} />
                    <span className="text-xs font-bold text-[#C8A951]">{occupancy}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${occupancy}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-full ${getOccupancyColor(occupancy)}`}
                  />
                </div>
                <p className="text-[10px] text-[#8a7a6a] uppercase tracking-[0.15em] font-bold mt-2">
                  {getOccupancyLabel(occupancy)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleNavigate}
                  className="py-3 bg-[#7B1113] hover:bg-[#9B1B30] text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <MapIcon size={16} /> Navigate
                </button>
                <button
                  onClick={handleARNavigate}
                  className="py-3 bg-white/[0.05] hover:bg-white/[0.1] text-[#f0e8dc] font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-sm border border-[#C8A951]/15"
                >
                  <Glasses size={16} className="text-[#C8A951]" /> AR View
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-[#C8A951]/15 to-transparent" />

              {/* Live Events Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-[#C8A951]" />
                  <h3 className="font-bold text-[#f0e8dc] text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Events Here
                  </h3>
                </div>

                {loadingEvents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#C8A951] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : events.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {events.map(evt => (
                      <div key={evt.id} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="font-bold text-white text-sm leading-tight">{evt.title}</h4>
                          {evt.is_live && (
                            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Live
                            </span>
                          )}
                        </div>
                        <p className="text-[#a09080] text-xs mb-3 line-clamp-2">{evt.description}</p>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 text-[#8a7a6a]">
                            <Users size={11} /> {evt.organizer}
                          </span>
                          <span className="flex items-center gap-1 text-[#C8A951]/60">
                            <Clock size={11} /> {evt.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-white/[0.03] text-[#6a5a4a] text-sm">
                    No events scheduled here today.
                  </div>
                )}
              </div>

              <div className="h-8 shrink-0" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
