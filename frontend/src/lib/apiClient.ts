import axios from 'axios';
import { useAuthStore } from '../store/authStore'; // Import the auth store

// Log the raw environment variable value from Vite
console.log('[Debug] VITE_API_BASE_URL from import.meta.env:', import.meta.env.VITE_API_BASE_URL);

// Base URL for the API. Default to local development if not set.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Log the final API_BASE_URL being used
console.log('[Debug] Final API_BASE_URL for Axios:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// You can add response interceptors here for e.g. handling global 401 errors
// apiClient.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
//       // Here you could try to refresh the token if you have a refresh token mechanism
//       // For now, we'll just log out or redirect
//       useAuthStore.getState().logout(); 
//       // window.location.href = '/login'; // Or use react-router for navigation
//       return Promise.reject(error);
//     }
//     return Promise.reject(error);
//   }
// );

export default apiClient; 