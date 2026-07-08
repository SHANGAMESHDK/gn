import { apiClient } from './axios';

export const StallsAPI = {
  getAllStalls: async () => {
    const response = await apiClient.get('/stalls/');
    return response.data;
  },
  getStallById: async (stallId: number) => {
    const response = await apiClient.get(`/stalls/${stallId}`);
    return response.data;
  },
  searchStalls: async (keyword: string) => {
    const response = await apiClient.get(`/stalls/search/${keyword}`);
    return response.data;
  },
  getRouteToStall: async (stallId: number, sourceId: number) => {
    const response = await apiClient.get(`/stalls/${stallId}/route`, { params: { source: sourceId } });
    return response.data;
  },
  getAllCategories: async () => {
    const response = await apiClient.get('/stalls/categories/all');
    return response.data;
  },
  filterByCategory: async (category: string) => {
    const response = await apiClient.get(`/stalls/category/${category}`);
    return response.data;
  },
  createStall: async (stall: any) => {
    const response = await apiClient.post('/stalls/create', stall);
    return response.data;
  },
  updateStall: async (stall: any) => {
    const response = await apiClient.post('/stalls/update', stall);
    return response.data;
  },
  deleteStall: async (stallId: number) => {
    const response = await apiClient.delete(`/stalls/${stallId}`);
    return response.data;
  }
};
