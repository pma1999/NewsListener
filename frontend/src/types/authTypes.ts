export interface UserCreateData {
  email: string;
  password: string;
  full_name?: string;
}

export interface UserResponseData {
  id: number;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  credits: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
} 