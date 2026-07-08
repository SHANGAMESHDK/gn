import { apiClient } from './axios';

export const SearchAPI = {
  globalSearch: async (keyword: string) => {
    try {
      const [navRes, buildRes, stallRes] = await Promise.all([
        apiClient.get('/navigation/search', { params: { keyword } }).catch(() => ({ data: { count: 0, results: [] } })),
        apiClient.get('/buildings/search', { params: { keyword } }).catch(() => ({ data: { count: 0, results: [] } })),
        apiClient.get(`/stalls/search/${keyword}`).catch(() => ({ data: { count: 0, results: [] } }))
      ]);

      return {
        navigation: navRes.data,
        buildings: buildRes.data,
        stalls: stallRes.data
      };
    } catch (error) {
      console.error("Global search failed:", error);
      throw error;
    }
  }
};
