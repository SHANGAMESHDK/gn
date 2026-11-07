import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Navigation, Footprints, Car, Map as MapIcon, Moon, Sun, Clock, Languages, Maximize, Layers, Play, Tag, LocateFixed, Building2, DoorOpen, Square, Mic, MicOff, Share2, Gauge, CalendarDays, Store, MoreHorizontal } from 'lucide-react';
import { buildings, buildingById, FLOOR_HEIGHT, MAIN_GATE_NODE, nodeById } from '../data';
import { allRooms, indoorPlans } from '../indoor';
import { WALK_SPEED_MPS } from '../graph';
import { buildingLabel, t } from '../i18n';
import { focusOn, setState, useStore } from '../store';
import { clearRoute, setRouteFrom, openIndoor, routeToBuilding, routeToNode, selectBuilding, selectRoom, setMode, toast } from '../actions';
import { shareCurrent, twoDLink } from '../links';
import { useVoiceSearch } from './voice';
import { enterAr } from '../ar';
import { arArrow, routeProgress } from '../scene/arArrow';
import { ArrowUp, ScanEye } from 'lucide-react';
import { Joystick } from './Joystick';

const glass = 'bg-[#33090d]/88 backdrop-blur-md border border-[#C8A951]/30 text-white shadow-xl';

export function Overlay() {
  const s = useStore((x) => x);
  const L = s.lang;
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20">
      <TopBar />
      <RightTools />
      {s.route && <RouteCard />}
      {s.selectedBuildingId && !s.indoor && s.mode === 'orbit' && <BuildingCard />}
      {s.indoor && <IndoorPanel />}
      {s.selectedPinId && !s.indoor && s.mode === 'orbit' && <PinCard />}
      {s.toast && <div className={`absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-semibold ${glass}`} role="status">{s.toast}</div>}
      <ModeBar />
      {(s.mode === 'walk' || s.mode === 'drive') && (
        <>
          <div className="absolute bottom-24 md:bottom-8 left-4 pointer-events-auto"><Joystick /></div>
          <div className={`absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs ${glass}`}>{t(s.mode === 'walk' ? 'walkHint' : 'driveHint', L)}</div>
        </>
      )}
      {s.mode === 'ar' && <ArHud />}
      {s.mode === 'preview' && <div className={`absolute top-36 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl text-xs ${glass}`}>{t('tapTakeOver', L)}</div>}
    </div>
  );
}

function TopBar() {
  const L = useStore((s) => s.lang);
  const [q, setQ] = useState('');
  const voice = useVoiceSearch(L, (text) => setQ(text));
  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    const bs = buildings.filter((b) => b.name.toLowerCase().includes(k) || b.sourceName.toLowerCase().includes(k) || buildingLabel(b, 'ta').includes(q.trim()) || (b.description ?? '').toLowerCase().includes(k))
      .map((b) => ({ key: b.id, title: buildingLabel(b, L), sub: t('building', L), go: () => selectBuilding(b.id) }));
    const rs = allRooms.filter(({ room }) => room.name.toLowerCase().includes(k) || room.number.toLowerCase().includes(k))
      .slice(0, 8)
      .map(({ room, floor, building }) => ({ key: room.id, title: `${room.number} · ${room.name}`, sub: `${buildingLabel(building, L)} · ${floor.name}`, go: () => selectRoom(room.id) }));
    const gate = nodeById.get(MAIN_GATE_NODE)!;
    const gateHit = ['main gate', 'gate', 'entrance', 'arch', t('mainGate', 'ta')].some((w) => w.toLowerCase().startsWith(k) || k.includes(w.toLowerCase()))
      ? [{ key: 'gate', title: t('mainGate', L), sub: 'SRM · Easwari Engineering College', go: () => { setState({ selectedBuildingId: null, selectedPinId: null }); focusOn(gate.p, 34); } }] : [];
    return [...gateHit, ...bs, ...rs].slice(0, 10);
  }, [q, L]);
  return (
    <div className="absolute top-3 left-3 right-16 md:right-auto md:w-[420px] pointer-events-auto">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl ${glass}`}>
        <Search size={16} className="text-[#C8A951] shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={voice.listening ? t('listening', L) : t('search', L)}
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-white/50 min-w-0"
          aria-label={t('search', L)}
        />
        {q && <button onClick={() => setQ('')} aria-label="clear"><X size={16} /></button>}
        {voice.supported && (
          <button onClick={voice.listening ? voice.stop : voice.start} title={t('voice', L)} aria-label={t('voice', L)}
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${voice.listening ? 'bg-[#7B1113] animate-pulse' : 'hover:bg-white/10'}`}>
            {voice.listening ? <MicOff size={15} /> : <Mic size={15} className="text-[#C8A951]" />}
          </button>
        )}
      </div>
      {q && (
        <div className={`mt-2 rounded-2xl overflow-hidden ${glass}`}>
          {results.length === 0 && <div className="px-4 py-3 text-sm text-white/60">{t('noResults', L)}</div>}
          {results.map((r) => (
            <button key={r.key} onClick={() => { r.go(); setQ(''); }} className="w-full text-left px-4 py-2.5 hover:bg-white/10 border-b border-white/5 last:border-0">
              <div className="text-sm font-semibold">{r.title}</div>
              <div className="text-[11px] text-white/55">{r.sub}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ on, title, onClick, children, extra }: { on?: boolean; title: string; onClick: () => void; children: React.ReactNode; extra?: boolean }) {
  return (
    <button title={title} aria-label={title} onClick={onClick}
      className={`w-11 h-11 rounded-full items-center justify-center ${extra ? 'hidden md:flex group-data-[open=true]:flex' : 'flex'} ${glass} ${on ? '!bg-[#C8A951] !text-[#2d2019]' : ''}`}>
      {children}
    </button>
  );
}

function RightTools() {
  const s = useStore((x) => x);
  const L = s.lang;
  const nextTime = s.timeMode === 'auto' ? 'day' : s.timeMode === 'day' ? 'night' : 'auto';
  const [more, setMore] = useState(false);
  const nextQ = s.quality === 'auto' ? 'low' : s.quality === 'low' ? 'high' : 'auto';
  const qLabel = t(s.quality === 'auto' ? 'qAuto' : s.quality === 'low' ? 'qLow' : 'qHigh', L);
  const share = async () => {
    const r = await shareCurrent('EECNAV 3D');
    if (r === 'copied') toast(t('copied', L)); else if (r === 'failed' && !navigator.share) toast(t('shareFailed', L));
  };
  return (
    <div data-open={more} className="group absolute top-3 right-3 flex flex-col gap-2 pointer-events-auto max-h-[calc(100%-11rem)] md:max-h-none overflow-y-auto">
      <ToolBtn extra title="Fullscreen" onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }}><Maximize size={18} /></ToolBtn>
      <ToolBtn extra title={t(s.timeMode, L)} onClick={() => setState({ timeMode: nextTime })}>
        {s.timeMode === 'auto' ? <Clock size={18} /> : s.timeMode === 'day' ? <Sun size={18} /> : <Moon size={18} />}
      </ToolBtn>
      <ToolBtn on={s.showNames} title={t('names', L)} onClick={() => setState({ showNames: !s.showNames })}><Tag size={18} /></ToolBtn>
      <ToolBtn extra title="தமிழ் / English" onClick={() => setState({ lang: L === 'en' ? 'ta' : 'en' })}><Languages size={18} /></ToolBtn>
      <ToolBtn on={s.routeFrom === 'gps'} title={t('myLocation', L)} onClick={() => setRouteFrom(s.routeFrom === 'gps' ? 'gate' : 'gps')}><LocateFixed size={18} /></ToolBtn>
      <ToolBtn title={t('share', L)} onClick={share}><Share2 size={18} /></ToolBtn>
      <ToolBtn on={s.showPins && s.pins.length > 0} title={t('pins', L)} onClick={() => setState({ showPins: !s.showPins, selectedPinId: null })}><CalendarDays size={18} /></ToolBtn>
      <ToolBtn extra on={s.quality !== 'auto'} title={qLabel} onClick={() => { setState({ quality: nextQ, lowQuality: nextQ === 'low' ? true : nextQ === 'high' ? false : s.lowQuality }); toast(t(nextQ === 'auto' ? 'qAuto' : nextQ === 'low' ? 'qLow' : 'qHigh', L)); }}>
        <span className="relative"><Gauge size={18} />{s.lowQuality && <span className="absolute -bottom-1.5 -right-2 text-[8px] font-black">LO</span>}</span>
      </ToolBtn>
      <Link to={twoDLink()} title={t('map2d', L)} className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${glass}`}><Layers size={18} /></Link>
      <button onClick={() => setMore(!more)} title="More" aria-label="More tools" className={`md:hidden w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${glass}`}>{more ? <X size={18} /> : <MoreHorizontal size={18} />}</button>
    </div>
  );
}

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

function RouteCard() {
  const now = useNow();
  const s = useStore((x) => x);
  const L = s.lang;
  const r = s.route!;
  const mins = Math.max(1, Math.round(r.distance / WALK_SPEED_MPS / 60));
  const eta = new Date(now + (r.distance / WALK_SPEED_MPS) * 1000);
  const fromValue = s.routeFrom === 'building' && s.routeFromBuildingId ? `b:${s.routeFromBuildingId}` : s.routeFrom;
  const onFrom = (v: string) => { if (v.startsWith('b:')) setRouteFrom('building', v.slice(2)); else setRouteFrom(v as 'gate' | 'gps'); };
  return (
    <div className="absolute top-16 left-3 right-16 md:right-auto md:w-[420px] pointer-events-auto">
      <div className={`rounded-2xl px-4 py-3 ${glass}`}>
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          <select value={fromValue} onChange={(e) => onFrom(e.target.value)} aria-label={t('from', L)}
            className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[11px] outline-none max-w-[150px]">
            <option className="text-black" value="gate">● {t('mainGate', L)}</option>
            <option className="text-black" value="gps">● {t('myLocation', L)}</option>
            {buildings.filter((b) => b.entranceNodeId != null && b.id !== s.routeTargetId).map((b) => (
              <option className="text-black" key={b.id} value={`b:${b.id}`}>{buildingLabel(b, L)}</option>
            ))}
          </select>
          <span>→</span>
          <span className="px-2 py-0.5 rounded-full bg-[#7B1113]">{s.routeTargetLabel}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-2 mt-2">
          <div>
            <div className="text-xl font-extrabold text-[#C8A951] whitespace-nowrap">{Math.round(r.distance)} m · {mins} {t('min', L)}<span ref={routeProgress} className="text-sm text-white/80" /></div>
            <div className="text-[11px] text-white/60">{t('eta', L)} {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMode('walk')} className="px-3 py-1.5 rounded-lg bg-[#C8A951] text-[#2d2019] text-xs font-bold whitespace-nowrap flex items-center gap-1"><Footprints size={12} />{t('walkRoute', L)}</button>
            <button onClick={() => setMode('preview')} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold whitespace-nowrap flex items-center gap-1"><Play size={12} />{t('preview', L)}</button>
            <button onClick={clearRoute} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold whitespace-nowrap">{t('clear', L)}</button>
          </div>
        </div>
        {s.routeFrom === 'gps' && !s.gpsOnCampus && <div className="mt-2 text-[11px] text-amber-300">{t('offCampus', L)}</div>}
      </div>
    </div>
  );
}

function BuildingCard() {
  const s = useStore((x) => x);
  const L = s.lang;
  const b = buildingById.get(s.selectedBuildingId!)!;
  const plan = indoorPlans.get(b.id);
  const isBlock = b.kind === 'block';
  return (
    <div className="absolute left-3 right-3 bottom-40 md:bottom-24 md:left-auto md:right-20 md:w-[360px] pointer-events-auto">
      <div className={`rounded-2xl p-4 ${glass}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#C8A951] font-bold flex items-center gap-1"><Building2 size={12} />{t('building', L)}</div>
            <div className="text-lg font-extrabold leading-tight">{buildingLabel(b, L)}</div>
            {isBlock && <div className="text-xs text-white/60 mt-0.5">{b.floors} {t(b.floorsEstimated ? 'floorsEst' : 'floorsCount', L)} · ~{Math.round(b.floors * FLOOR_HEIGHT)} m</div>}
          </div>
          <button onClick={() => setState({ selectedBuildingId: null })} aria-label="close"><X size={18} /></button>
        </div>
        {b.description && <p className="text-xs text-white/70 mt-2 line-clamp-3">{b.description}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => routeToBuilding(b.id, buildingLabel(b, L))} className="px-3 py-2 rounded-xl bg-[#7B1113] text-xs font-bold flex items-center gap-1.5"><Navigation size={14} />{t('directions', L)}</button>
          {plan && <button onClick={() => openIndoor(b.id, 0)} className="px-3 py-2 rounded-xl bg-[#C8A951] text-[#2d2019] text-xs font-bold flex items-center gap-1.5"><DoorOpen size={14} />{t('indoor', L)}</button>}
          <button onClick={() => setMode('walk')} className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold flex items-center gap-1.5"><Footprints size={14} />{t('walkHere', L)}</button>
        </div>
      </div>
    </div>
  );
}

function IndoorPanel() {
  const s = useStore((x) => x);
  const L = s.lang;
  const plan = indoorPlans.get(s.indoor!.buildingId)!;
  const b = buildingById.get(plan.buildingId)!;
  const floor = plan.floors[s.indoor!.level];
  const room = floor.rooms.find((r) => r.id === s.selectedRoomId);
  return (
    <div className="absolute left-3 right-3 bottom-40 md:bottom-24 md:left-auto md:right-20 md:w-[380px] pointer-events-auto">
      <div className={`rounded-2xl p-4 ${glass}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#C8A951] font-bold">{t('indoor', L)}</div>
            <div className="text-lg font-extrabold">{buildingLabel(b, L)} · {floor.name}</div>
          </div>
          <button onClick={() => setState({ indoor: null, selectedRoomId: null })} title={t('exitIndoor', L)} aria-label={t('exitIndoor', L)}><X size={18} /></button>
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {plan.floors.map((f) => (
            <button key={f.level} onClick={() => setState({ indoor: { buildingId: b.id, level: f.level }, selectedRoomId: null })}
              className={`w-9 h-9 rounded-lg text-xs font-bold ${f.level === floor.level ? 'bg-[#C8A951] text-[#2d2019]' : 'bg-white/10'}`}>
              {f.level === 0 ? 'G' : f.level}
            </button>
          ))}
        </div>
        {room ? (
          <div className="mt-3 rounded-xl bg-white/5 p-3">
            <div className="text-sm font-bold">{room.number} · {room.name}</div>
            <button onClick={() => routeToBuilding(b.id, `${room.number} · ${buildingLabel(b, L)}`)} className="mt-2 px-3 py-1.5 rounded-lg bg-[#7B1113] text-xs font-bold flex items-center gap-1.5"><Navigation size={12} />{t('directions', L)}</button>
          </div>
        ) : (
          <div className="mt-3 max-h-28 overflow-auto grid grid-cols-2 gap-1">
            {floor.rooms.filter((r) => r.type !== 'stairs' && r.type !== 'lift').map((r) => (
              <button key={r.id} onClick={() => setState({ selectedRoomId: r.id })} className="text-left text-[11px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 truncate">{r.number} · {r.name}</button>
            ))}
          </div>
        )}
        {plan.sample && <div className="mt-2 text-[10px] text-amber-300/90">{t('sample', L)}</div>}
      </div>
    </div>
  );
}

function PinCard() {
  const s = useStore((x) => x);
  const L = s.lang;
  const pin = s.pins.find((p) => p.id === s.selectedPinId);
  if (!pin) return null;
  const Icon = pin.kind === 'event' ? CalendarDays : Store;
  return (
    <div className="absolute left-3 right-3 bottom-40 md:bottom-24 md:left-auto md:right-20 md:w-[360px] pointer-events-auto">
      <div className={`rounded-2xl p-4 ${glass}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#C8A951] font-bold flex items-center gap-1"><Icon size={12} />{t(pin.kind, L)}
              {pin.live && <span className="ml-1 px-1.5 rounded-full bg-emerald-500/90 text-white normal-case tracking-normal">{t('liveNow', L)}</span>}</div>
            <div className="text-lg font-extrabold leading-tight">{pin.title}</div>
            <div className="text-xs text-white/60 mt-0.5">{pin.sub}</div>
          </div>
          <button onClick={() => setState({ selectedPinId: null })} aria-label="close"><X size={18} /></button>
        </div>
        {pin.detail && <p className="text-xs text-white/70 mt-2 line-clamp-3">{pin.detail}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {pin.nodeId != null && <button onClick={() => routeToNode(pin.nodeId!, pin.title)} className="px-3 py-2 rounded-xl bg-[#7B1113] text-xs font-bold flex items-center gap-1.5"><Navigation size={14} />{t('directions', L)}</button>}
          {pin.buildingId && <button onClick={() => { setState({ selectedPinId: null }); selectBuilding(pin.buildingId!); }} className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold flex items-center gap-1.5"><Building2 size={14} />{t('building', L)}</button>}
        </div>
      </div>
    </div>
  );
}

function ArHud() {
  const s = useStore((x) => x);
  const L = s.lang;
  const target = s.routeTargetId ? buildingById.get(s.routeTargetId) : undefined;
  const nodeId = target?.entranceNodeId;
  const full = nodeId != null ? `/ar?destination_node_id=${nodeId}&destination=${encodeURIComponent(target!.sourceName)}` : '/ar';
  return (
    <>
      <div className={`absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs text-center max-w-[90%] ${glass}`}>{t('arHint', L)}</div>
      <div ref={arArrow} style={{ display: 'none' }} className={`absolute top-32 left-1/2 -translate-x-1/2 flex-col items-center gap-1 px-4 py-3 rounded-2xl ${glass}`}>
        <div data-arrow className="w-12 h-12 rounded-full bg-[#7B1113] flex items-center justify-center transition-transform"><ArrowUp size={28} /></div>
        <div className="text-sm font-extrabold text-[#C8A951]"><span data-dist /> <span className="text-white/70 font-semibold text-[11px]">{t('arLeft', L)}</span></div>
        {s.routeTargetLabel && <div className="text-[11px] text-white/70 max-w-[180px] truncate">{s.routeTargetLabel}</div>}
      </div>
      <div className="absolute bottom-40 md:bottom-24 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
        <button onClick={() => setMode('orbit')} className={`px-4 py-2 rounded-xl text-xs font-bold ${glass}`}>{t('arExit', L)}</button>
        <Link to={full} className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C8A951] text-[#2d2019] shadow-xl">{t('arFull', L)}</Link>
      </div>
    </>
  );
}

function ModeBar() {
  const s = useStore((x) => x);
  const L = s.lang;
  const items = [
    { m: 'orbit' as const, icon: <MapIcon size={16} />, label: t('orbit', L) },
    { m: 'walk' as const, icon: <Footprints size={16} />, label: t('walk', L) },
    { m: 'drive' as const, icon: <Car size={16} />, label: t('drive', L) },
    { m: 'ar' as const, icon: <ScanEye size={16} />, label: t('ar', L) },
    { m: 'tour' as const, icon: s.mode === 'tour' ? <Square size={14} /> : <Play size={16} />, label: s.mode === 'tour' ? t('stopTour', L) : t('tour', L) },
  ];
  return (
    <div className="absolute bottom-24 md:bottom-6 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 pointer-events-auto">
      <div className={`flex gap-1 p-1 rounded-2xl ${glass}`}>
        {items.map((it) => {
          const active = s.mode === it.m || (it.m === 'orbit' && s.mode === 'preview');
          return (
            <button key={it.m} onClick={() => { if (it.m === 'ar') { if (s.mode === 'ar') setMode('orbit'); else enterAr(); } else setMode(it.m === 'tour' && s.mode === 'tour' ? 'orbit' : it.m); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${active ? 'bg-[#C8A951] text-[#2d2019]' : 'hover:bg-white/10'}`}>
              {it.icon}<span className="hidden sm:inline">{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
