import { useEffect, useRef } from 'react';
import { useGeolocation } from './useGeolocation';
import axios from 'axios';

// Generate a random ID for this session if one doesn't exist
const getDeviceId = () => {
  let id = sessionStorage.getItem('telemetry_device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('telemetry_device_id', id);
  }
  return id;
};

const TELEMETRY_API_URL = 'http://localhost:8000/telemetry/location';

export function useTelemetry(enabled: boolean = true) {
  const location = useGeolocation();
  const deviceId = getDeviceId();
  const lastPingTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !location.latitude || !location.longitude) return;

    const now = Date.now();
    // Throttle to one ping every 10 seconds
    if (now - lastPingTime.current < 10000) return;

    lastPingTime.current = now;

    axios.post(TELEMETRY_API_URL, {
      device_id: deviceId,
      lat: location.latitude,
      lng: location.longitude,
    }).catch(err => {
      console.warn("Failed to ping telemetry", err.message);
    });
  }, [location.latitude, location.longitude, enabled, deviceId]);

  return {
    deviceId,
    isBroadcasting: enabled && !!location.latitude
  };
}
