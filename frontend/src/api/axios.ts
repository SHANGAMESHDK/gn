import axios from 'axios';

// Use environment variable if available (e.g., for production), otherwise default to local proxy '/api'
export const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});
