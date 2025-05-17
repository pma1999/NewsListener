import axios from 'axios';
import { useAuthStore, SESSION_EXPIRED_MESSAGE } from '../store/authStore'; // Import the auth store and message

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

// Add a response interceptor to handle global 401 errors for session expiration
apiClient.interceptors.response.use(
  (response) => response, // Simply return response for successful requests
  async (error) => {
    const originalRequest = error.config;
    const store = useAuthStore.getState();

    // Check for 401 Unauthorized
    if (error.response?.status === 401) {
      // Exclude auth endpoints like login and register to prevent loops
      // These paths are relative to the apiClient's baseURL
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login/access-token') || 
                             originalRequest.url?.includes('/auth/register');

      if (!isAuthEndpoint && store.isAuthenticated) { // Only logout if was authenticated
        console.warn('Session expired or token invalid. Logging out.');
        store.logoutAndMarkSessionExpired(); // Uses default message
        // No need to redirect here; ProtectedRoute will handle it based on store state change.
      }
    }
    return Promise.reject(error); // Important to reject error so it can be caught by the calling function if needed
  }
);

export default apiClient; 