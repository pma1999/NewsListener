import apiClient from '../lib/apiClient'; // Import global apiClient
import { UserCreateData, UserResponseData, LoginCredentials, TokenResponse } from '../types/authTypes';
// import { config as appConfig } from '../config'; // REMOVE - No longer needed if using global apiClient directly for all paths

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Base URL for the API - REMOVED
// const API_V1_STR = '/api/v1'; // API version string, consistent with backend settings - REMOVED

// REMOVE: const authApi = axios.create({
//   baseURL: `${appConfig.apiBaseUrl}/auth`, // Use centralized config, append /auth
// });

export const registerUser = async (userData: UserCreateData): Promise<UserResponseData> => {
  // Assuming the global apiClient's baseURL is the API root (e.g., http://localhost:8000/api/v1)
  // The full path would be /api/v1/auth/register
  const response = await apiClient.post<UserResponseData>('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials: LoginCredentials): Promise<TokenResponse> => {
  // Backend expects JSON for /login/access-token as per auth.py
  // The full path would be /api/v1/auth/login/access-token
  const response = await apiClient.post<TokenResponse>('/auth/login/access-token', credentials);
  return response.data;
};

export const fetchCurrentUser = async (): Promise<UserResponseData> => { // REMOVE token argument
  // The global apiClient's request interceptor should add the Authorization header
  // The full path would be /api/v1/auth/users/me
  const response = await apiClient.get<UserResponseData>('/auth/users/me'); // REMOVE headers argument
  return response.data;
}; 