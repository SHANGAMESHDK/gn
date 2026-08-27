import { apiClient } from './axios';

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  building_id: string;
  time: string;
  organizer: string;
  tags: string[];
  is_live: boolean;
}

export const EventsAPI = {
  getLiveEvents: async (): Promise<CampusEvent[]> => {
    const response = await apiClient.get('/events/live');
    return response.data;
  },

  getEventsByBuilding: async (buildingName: string): Promise<CampusEvent[]> => {
    const response = await apiClient.get(`/events/building/${encodeURIComponent(buildingName)}`);
    return response.data;
  },

  getAllEvents: async (): Promise<CampusEvent[]> => {
    const response = await apiClient.get('/events/all');
    return response.data;
  }
};
