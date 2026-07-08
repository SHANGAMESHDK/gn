import { apiClient } from './axios';

export const GPSAPI = {
  getNearestNode: async (latitude: number, longitude: number) => {
    const response = await apiClient.get('/gps/nearest', { params: { latitude, longitude } });
    return response.data;
  },
  getRouteFromGPS: async (latitude: number, longitude: number, destination: number) => {
    const response = await apiClient.get('/gps/route', { params: { latitude, longitude, destination } });
    return response.data;
  },
  checkHealth: async () => {
    const response = await apiClient.get('/gps/health');
    return response.data;
  }
};
