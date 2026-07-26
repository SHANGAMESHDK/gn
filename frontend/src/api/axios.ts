import axios from 'axios';

// Force using the local proxy to reach our new backend code
export const baseURL = '/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});
