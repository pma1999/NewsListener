import axios from 'axios';
import { UserCreateData, UserResponseData, LoginCredentials, TokenResponse } from '../types/authTypes';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Base URL for the API
const API_V1_STR = '/api/v1'; // API version string, consistent with backend settings

const authApi = axios.create({
  baseURL: `${API_BASE_URL}${API_V1_STR}/auth`,
});

export const registerUser = async (userData: UserCreateData): Promise<UserResponseData> => {
  const response = await authApi.post<UserResponseData>('/register', userData);
  return response.data;
};

export const loginUser = async (credentials: LoginCredentials): Promise<TokenResponse> => {
  // Backend expects JSON for /login/access-token as per auth.py
  const response = await authApi.post<TokenResponse>('/login/access-token', credentials);
  return response.data;
};

export const fetchCurrentUser = async (token: string): Promise<UserResponseData> => {
  const response = await authApi.get<UserResponseData>('/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}; 