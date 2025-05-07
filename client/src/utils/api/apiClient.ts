import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../../types/api';

// Use the exact base URL from the curl example
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1/';

// Create custom instance type with transformed response
type CustomInstance = {
  get<T = any>(url: string, config?: any): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>>;
} & AxiosInstance;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
}) as unknown as CustomInstance;

// Token management
const TOKEN_KEY = 'aemos_access_token';
const REFRESH_TOKEN_KEY = 'aemos_refresh_token';

export const getAccessToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  // Add debug logging
  console.log(`[Auth Debug] Getting access token: ${token ? 'Token exists' : 'No token'}`);
  return token;
};

export const getRefreshToken = (): string | null => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  // Add debug logging
  console.log(`[Auth Debug] Getting refresh token: ${refreshToken ? 'Token exists' : 'No token'}`);
  return refreshToken;
};

export const setAuthTokens = (accessToken: string, refreshToken: string): void => {
  console.log('[Auth Debug] Setting auth tokens');
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
};

export const clearTokens = (): void => {
  debugger;
  console.log('[Auth Debug] Clearing auth tokens');
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  delete apiClient.defaults.headers.common['Authorization'];
};

// Helper function to check if a token is expired
const isTokenExpired = (token: string): boolean => {
  if (!token) return true;
  
  try {
    // Get the expiration time
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const isExpired = now >= expirationTime;
    
    console.log(`[Auth Debug] Token expiration check: expires at ${new Date(expirationTime).toISOString()}, now is ${new Date(now).toISOString()}, isExpired: ${isExpired}`);
    
    return isExpired;
  } catch (error) {
    console.error('[Auth Debug] Error parsing token:', error);
    return true; // If we can't parse it, assume it's expired
  }
};

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Debug log the request
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    
    const token = getAccessToken();
    if (token) {
      // Check if token is expired
      if (isTokenExpired(token)) {
        console.warn('[Auth Debug] Access token is expired, will need refresh');
      }
      
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[Auth Debug] No access token found for request');
    }
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Add back the response interceptor for proper data handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Debug log successful response
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    
    // Return the response directly as we expect it from the API
    return response;
  },
  async (error) => {
    // Debug log error response
    console.error(
      `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response?.status}`, 
      error.response?.data
    );
    
    return Promise.reject(error);
  }
);

export default apiClient; 