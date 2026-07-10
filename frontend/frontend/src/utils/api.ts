import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor - Handle errors (SILENT MODE FOR DEVELOPMENT)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Silently reject without showing notifications
    // This allows the app to work with empty states when backend is not available
    return Promise.reject(error);
  }
);

export default api;
