import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Buildings } from './Buildings';
import { Ground } from './Ground';
import { Trees } from './Trees';
import { RouteLine } from './RouteLine';
import { Labels } from './Labels';
import { Pins } from './Pins';
import { IndoorView } from './IndoorView';
import { Environment } from './Environment';
import { CameraRig } from './CameraRig';
import { Walker } from './Walker';
import { Car } from './Car';
import { GpsDot } from './GpsDot';
import { ArCamera } from './ArCamera';
import { ArGhosts } from './ArGhosts';
import { getState, setState, useStore } from '../store';
import { labelPortal } from './labelPortal';

export default function CampusCanvas() {
  const mode = useStore((s) => s.mode);
  const low = useStore((s) => s.lowQuality);
  const auto = (v: boolean) => { if (getState().quality === 'auto' && getState().lowQuality !== v) setState({ lowQuality: v }); };
  return (
    <div className="absolute inset-0">
    <Canvas
      shadows={!low}
      dpr={low ? 1 : [1, 1.75]}
      camera={{ position: [170, 190, 200], fov: 50, near: 0.5, far: 4000 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      onPointerMissed={(e) => { if ((e.target as HTMLElement | null)?.tagName === 'CANVAS' && mode === 'orbit') setState({ selectedBuildingId: null, selectedRoomId: null, selectedPinId: null }); }}
    >
      <PerformanceMonitor bounds={() => [28, 55]} flipflops={3} onDecline={() => auto(true)} onIncline={() => auto(false)} onFallback={() => auto(true)} />
      <Suspense fallback={null}>
        <Environment />
        {mode === 'ar' ? <ArGhosts /> : (
          <>
            <Ground />
            <Buildings />
            <Trees />
          </>
        )}
        <IndoorView />
        <RouteLine />
        <GpsDot />
        <Labels />
        <Pins />
        {mode === 'walk' ? <Walker /> : mode === 'drive' ? <Car /> : mode === 'ar' ? <ArCamera /> : <CameraRig />}
      </Suspense>
      <AdaptiveDpr pixelated />
    </Canvas>
    <div ref={labelPortal} className="absolute inset-0 pointer-events-none overflow-hidden z-10" />
    </div>
  );
}
