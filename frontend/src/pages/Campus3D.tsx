import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLiveWeather } from '../hooks/useLiveWeather';
import { setState, useStore } from '../campus3d/store';
import { toLocal } from '../campus3d/geo';
import { bounds } from '../campus3d/data';
import { t } from '../campus3d/i18n';
import { Overlay } from '../campus3d/ui/Overlay';

// three.js and the scene load only when this page opens.
const CampusCanvas = lazy(() => import('../campus3d/scene/CampusCanvas'));

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export function Campus3D() {
  const lang = useStore((s) => s.lang);
  const geo = useGeolocation();
  const weather = useLiveWeather();
  const webgl = useMemo(() => hasWebGL(), []);

  useEffect(() => {
    if (geo.latitude == null || geo.longitude == null) return;
    const p = toLocal(geo.latitude, geo.longitude);
    const on = p[0] > bounds.minX && p[0] < bounds.maxX && p[1] > bounds.minZ && p[1] < bounds.maxZ;
    setState({ gps: p, gpsOnCampus: on });
  }, [geo.latitude, geo.longitude]);

  useEffect(() => { if (weather) setState({ rain: weather.isRaining }); }, [weather]);

  if (!webgl) return <Navigate to="/map" replace />;
  return (
    <div className="relative flex-1 w-full h-full min-h-[calc(100vh-5rem)] md:min-h-screen bg-[#bfe3ff] overflow-hidden">
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-[#7B1113] font-bold">{t('loading', lang)}</div>}>
        <CampusCanvas />
      </Suspense>
      <Overlay />
    </div>
  );
}
