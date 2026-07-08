import { useState, useEffect } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({
        ...s,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      setState(s => ({
        ...s,
        error: error.message,
        loading: false,
      }));
    };

    // For better accuracy while navigating
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const watcherId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    
    // Initial fetch to get it quickly
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

    // Fallback polling: Force refresh every 3 seconds for stubborn devices/simulators
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(handleSuccess, (err) => {
        // Only log errors on poll, don't overwrite watchPosition state unless necessary
        console.warn("GPS Poll error:", err.message);
      }, options);
    }, 3000);

    return () => {
      navigator.geolocation.clearWatch(watcherId);
      clearInterval(intervalId);
    };
  }, []);

  return state;
}
