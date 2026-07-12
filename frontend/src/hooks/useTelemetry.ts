import { useEffect, useRef, useState } from 'react';
import { useGeolocation } from './useGeolocation';
import { apiClient } from '../api/axios';

export function useTelemetry(enabled = true) {
  const getDeviceId = () => {
    let id = sessionStorage.getItem('telemetry_device_id');
    if (!id) {
      id = 'device_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('telemetry_device_id', id);
    }
    return id;
  };

  const [deviceId, setDeviceId] = useState(getDeviceId());

  // Periodically check if deviceId in sessionStorage has changed (e.g., when sharing location)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentId = sessionStorage.getItem('telemetry_device_id');
      if (currentId && currentId !== deviceId) {
        setDeviceId(currentId);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deviceId]);

  const location = useGeolocation();
  const lastPingTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !location.latitude || !location.longitude) return;

    const now = Date.now();
    // Throttle to one ping every 10 seconds
    if (now - lastPingTime.current < 10000) return;

    lastPingTime.current = now;

    apiClient.post('/telemetry/location', {
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
