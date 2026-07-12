import { apiClient } from './axios';

export const BuildingsAPI = {
  getAllBuildings: async () => {
    const response = await apiClient.get('/buildings/');
    return response.data;
  },
  searchBuildings: async (keyword: string) => {
    const response = await apiClient.get('/buildings/search', { params: { keyword } });
    return response.data;
  },
  getBuildingByName: async (buildingName: string) => {
    const response = await apiClient.get(`/buildings/${buildingName}`);
    return response.data;
  },
  getSuggestions: async () => {
    const response = await apiClient.get('/buildings/suggestions/all');
    return response.data;
  },
  updateBuildingOverride: async (data: any) => {
    const response = await apiClient.post('/buildings/override', data);
    return response.data;
  }
};
