import { useRef, useState } from 'react';
import { setState } from '../store';

/** On-screen joystick for touch devices (also works with a mouse). */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 44;
  const update = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let x = cx - (r.left + r.width / 2), y = cy - (r.top + r.height / 2);
    const l = Math.hypot(x, y);
    if (l > R) { x = (x / l) * R; y = (y / l) * R; }
    setKnob({ x, y });
    setState({ joystick: { x: x / R, y: y / R } });
  };
  const end = () => { setKnob({ x: 0, y: 0 }); setState({ joystick: { x: 0, y: 0 } }); };
  return (
    <div
      ref={base}
      className="w-32 h-32 rounded-full bg-black/30 border-2 border-white/40 backdrop-blur-sm touch-none select-none relative"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); update(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') update(e.clientX, e.clientY); }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="absolute left-1/2 top-1/2 w-12 h-12 -ml-6 -mt-6 rounded-full bg-white/80 shadow-lg" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white/70 text-xs">▲</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white/70 text-xs">▼</span>
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white/70 text-xs">◀</span>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/70 text-xs">▶</span>
    </div>
  );
}
