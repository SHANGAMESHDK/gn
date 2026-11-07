import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { Buildings } from './Buildings';
import { Ground } from './Ground';
import { Trees } from './Trees';
import { RouteLine } from './RouteLine';
import { Labels } from './Labels';
import { IndoorView } from './IndoorView';
import { Environment } from './Environment';
import { CameraRig } from './CameraRig';
import { Walker } from './Walker';
import { Car } from './Car';
import { GpsDot } from './GpsDot';
import { setState, useStore } from '../store';
import { labelPortal } from './labelPortal';

export default function CampusCanvas() {
  const mode = useStore((s) => s.mode);
  return (
    <div className="absolute inset-0">
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [170, 190, 200], fov: 50, near: 0.5, far: 4000 }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      onPointerMissed={(e) => { if ((e.target as HTMLElement | null)?.tagName === 'CANVAS' && mode === 'orbit') setState({ selectedBuildingId: null, selectedRoomId: null }); }}
    >
      <Suspense fallback={null}>
        <Environment />
        <Ground />
        <Buildings />
        <Trees />
        <IndoorView />
        <RouteLine />
        <GpsDot />
        <Labels />
        {mode === 'walk' ? <Walker /> : mode === 'drive' ? <Car /> : <CameraRig />}
      </Suspense>
      <AdaptiveDpr pixelated />
    </Canvas>
    <div ref={labelPortal} className="absolute inset-0 pointer-events-none overflow-hidden z-10" />
    </div>
  );
}
