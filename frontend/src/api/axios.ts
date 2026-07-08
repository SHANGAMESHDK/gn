import axios from 'axios';

// Using 127.0.0.1 instead of localhost avoids IPv6 resolution issues on some Windows machines
export const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});
