import { useState, useEffect } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

// Helper to calculate distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371;
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c * 1000; 
}
function deg2rad(deg: number) {
  return deg * (Math.PI/180);
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
      setState(prevState => {
        if (prevState.latitude && prevState.longitude) {
           const dist = getDistanceFromLatLonInM(prevState.latitude, prevState.longitude, position.coords.latitude, position.coords.longitude);
           // Ignore updates less than 2 meters to avoid jitter shaking in AR/Map
           if (dist < 2.0) {
              return prevState;
           }
        }
        
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        };
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

    return () => {
      navigator.geolocation.clearWatch(watcherId);
    };
  }, []);

  return state;
}
