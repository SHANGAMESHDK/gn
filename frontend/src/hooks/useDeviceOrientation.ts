import { useState, useEffect, useCallback } from 'react';

export function useDeviceOrientation() {
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [needsPermission, setNeedsPermission] = useState<boolean>(false);

  // Check if we need explicit permission (iOS 13+)
  useEffect(() => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setNeedsPermission(true);
    } else {
      // Android / Older iOS don't need explicit interaction
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

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let currentHeading = null;

      // iOS specific absolute heading
      if ('webkitCompassHeading' in event) {
        currentHeading = (event as any).webkitCompassHeading;
      } 
      // Standard absolute heading
      else if (event.absolute && event.alpha !== null) {
        // alpha is 0 at East, we need 0 at North. Usually 360 - alpha maps correctly if absolute
        currentHeading = 360 - event.alpha;
      } 
      // Fallback for non-absolute alpha (often relative to where phone started)
      else if (event.alpha !== null) {
        currentHeading = 360 - event.alpha; 
      }

      if (currentHeading !== null) {
        setHeading(currentHeading);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [permissionGranted]);

  return { heading, error, requestPermission, needsPermission, permissionGranted };
}
