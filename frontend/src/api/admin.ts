import { apiClient } from './axios';

export interface BuildingOverride {
  id: string;
  height?: number;
  color?: string;
  Name?: string;
  walkable?: boolean;
}

export const AdminAPI = {
  getStatus: async () => {
    const response = await apiClient.get('/admin/status');
    return response.data;
  },
  getStatistics: async () => {
    const response = await apiClient.get('/admin/statistics');
    return response.data;
  },
  reloadGraph: async () => {
    const response = await apiClient.post('/admin/reload');
    return response.data;
  },
  addCustomNode: async (node: any) => {
    const response = await apiClient.post('/admin/custom-node', node);
    return response.data;
  },
  addCustomEdge: async (edge: any) => {
    const response = await apiClient.post('/admin/custom-edge', edge);
    return response.data;
  },
  clearCustomGraph: async () => {
    const response = await apiClient.delete('/admin/custom-graph');
    return response.data;
  },
  customNodeOverride: async (override: any) => {
    const response = await apiClient.post('/admin/custom-node-override', override);
    return response.data;
  },
  customEdgeOverride: async (override: any) => {
    const response = await apiClient.post('/admin/custom-edge-override', override);
    return response.data;
  },
  customBuildingOverride: async (override: BuildingOverride) => {
    const response = await apiClient.post('/buildings/override', override);
    return response.data;
  },
  getConnectivity: async () => {
    const response = await apiClient.get('/admin/connectivity');
    return response.data;
  },
  getGraphInfo: async () => {
    const response = await apiClient.get('/admin/graph');
    return response.data;
  },
  getNodeInfo: async (nodeId: number) => {
    const response = await apiClient.get(`/admin/node/${nodeId}`);
    return response.data;
  },
  getEdgeInfo: async (source: number, destination: number) => {
    const response = await apiClient.get(`/admin/edge/${source}/${destination}`);
    return response.data;
  },
  getSettings: async () => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },
  updateSettings: async (settings: any) => {
    const response = await apiClient.post('/admin/settings', settings);
    return response.data;
  }
};
