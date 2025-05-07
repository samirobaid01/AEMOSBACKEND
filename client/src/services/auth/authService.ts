import type { User } from '../../types/user';
import type { ApiResponse } from '../../types/api';
import apiClient from '../../utils/api/apiClient';
import {
  setAuthTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../../utils/api/apiClient';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (response.data) {
      setAuthTokens(response.data.accessToken, response.data.refreshToken);
    }
    return response;
  },

  register: async (data: RegisterData): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    if (response.data) {
      setAuthTokens(response.data.accessToken, response.data.refreshToken);
    }
    return response;
  },

  logout: async (): Promise<void> => {
    const token = getRefreshToken();
    if (token) {
      try {
        await apiClient.post('/auth/logout', { token });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
    debugger;
    clearTokens();
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.get('/auth/me');
  },

  isAuthenticated: (): boolean => {
    return !!getAccessToken();
  },

  refreshToken: async (): Promise<ApiResponse<{ accessToken: string }>> => {
    const token = getRefreshToken();
    if (!token) {
      throw new Error('No refresh token available');
    }
    return apiClient.post('/auth/refresh-token', { token });
  },

  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    return apiClient.put('/auth/profile', data);
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> => {
    return apiClient.put('/auth/change-password', data);
  },
}; 