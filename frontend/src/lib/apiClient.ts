import axios from 'axios';

// Base URL for the API. Default to local development if not set.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// You can add interceptors here for request or response handling if needed later
// apiClient.interceptors.request.use(...);
// apiClient.interceptors.response.use(...);

export default apiClient; 