import { useState, useEffect, useCallback, useRef } from 'react';

// Math to calculate true compass heading from alpha, beta, gamma when device is held in various orientations
function computeCompassHeading(alpha: number, beta: number, gamma: number): number {
  const degToRad = Math.PI / 180;
  
  const _alpha = alpha * degToRad;
  const _beta = beta * degToRad;
  const _gamma = gamma * degToRad;
  
  const cY = Math.cos(_gamma);
  const cZ = Math.cos(_alpha);
  const sX = Math.sin(_beta);
  const sY = Math.sin(_gamma);
  const sZ = Math.sin(_alpha);

  // Calculate Vx and Vy components
  const Vx = -cZ * sY - sZ * sX * cY;
  const Vy = -sZ * sY + cZ * sX * cY;

  // Calculate compass heading
  let compassHeading = Math.atan(Vx / Vy);

  // Convert compass heading to use whole unit circle
  if (Vy < 0) {
    compassHeading += Math.PI;
  } else if (Vx < 0) {
    compassHeading += 2 * Math.PI;
  }

  return compassHeading * (180 / Math.PI);
}

export function useDeviceOrientation() {
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [needsPermission, setNeedsPermission] = useState<boolean>(false);
  
  // Smoothing state
  const lastHeadingRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setNeedsPermission(true);
    } else {
      setPermissionGranted(true);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          setNeedsPermission(false);
          setError(null);
        } else {
          setError('Permission denied for device orientation.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to request orientation permission');
      }
    }
  }, []);

  useEffect(() => {
    if (!permissionGranted) return;

    let rafId: number;

    const handleOrientation = (event: DeviceOrientationEvent | any) => {
      let rawHeading: number | null = null;

      // iOS Native Compass Heading
      if (event.webkitCompassHeading !== undefined) {
        rawHeading = event.webkitCompassHeading;
      } 
      // Android / W3C Absolute Orientation Math
      else if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        // If event is not absolute, it's relative and useless for a compass. 
        // We ensure we listen to 'deviceorientationabsolute' on Android.
        rawHeading = computeCompassHeading(event.alpha, event.beta, event.gamma);
      }

      if (rawHeading !== null) {
        // Low-pass filter for smooth AR rendering
        if (lastHeadingRef.current === null) {
          lastHeadingRef.current = rawHeading;
        } else {
          // Handle 360 wrap around smoothly
          let diff = rawHeading - lastHeadingRef.current;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          
          // Smoothing factor: lower = smoother but more lag. 0.15 is a good balance for AR.
          const smoothing = 0.15;
          lastHeadingRef.current = (lastHeadingRef.current + diff * smoothing + 360) % 360;
        }
        
        // Use requestAnimationFrame to avoid triggering too many React renders per second
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setHeading(lastHeadingRef.current);
        });
      }
    };

    // Listen to standard event (contains webkitCompassHeading on iOS)
    window.addEventListener('deviceorientation', handleOrientation, true);
    
    // Listen to absolute event (contains true alpha/beta/gamma on Android)
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      }
      cancelAnimationFrame(rafId);
    };
  }, [permissionGranted]);

  return { heading, error, requestPermission, needsPermission, permissionGranted };
}
