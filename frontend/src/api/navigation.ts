import { apiClient } from './axios';

export const NavigationAPI = {
  getRoute: async (source: number, destination: number) => {
    const response = await apiClient.get('/navigation/route', { params: { source, destination } });
    return response.data;
  },
  getRouteByName: async (source: string, destination: string) => {
    const response = await apiClient.get('/navigation/route-by-name', { params: { source, destination } });
    return response.data;
  },
  getRouteFromGPS: async (latitude: number, longitude: number, destination: number) => {
    const response = await apiClient.get('/navigation/route-from-gps', { params: { latitude, longitude, destination } });
    return response.data;
  },
  getNearestNode: async (latitude: number, longitude: number) => {
    const response = await apiClient.get('/navigation/nearest-node', { params: { latitude, longitude } });
    return response.data;
  },
  search: async (keyword: string) => {
    const response = await apiClient.get('/navigation/search', { params: { keyword } });
    return response.data;
  },
  getSuggestions: async () => {
    const response = await apiClient.get('/navigation/suggestions');
    return response.data;
  },
  getGraphStatistics: async () => {
    const response = await apiClient.get('/navigation/graph');
    return response.data;
  }
};
