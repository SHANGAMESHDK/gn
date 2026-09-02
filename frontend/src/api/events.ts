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
  },

  createEvent: async (event: Omit<CampusEvent, 'id'> | CampusEvent): Promise<CampusEvent> => {
    const response = await apiClient.post('/events/', event);
    return response.data;
  },

  updateEvent: async (id: string, event: CampusEvent): Promise<CampusEvent> => {
    const response = await apiClient.put(`/events/${id}`, event);
    return response.data;
  },

  deleteEvent: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/events/${id}`);
    return response.data;
  }
};
