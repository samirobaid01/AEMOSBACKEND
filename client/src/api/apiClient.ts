import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// API base URL
// In development, use the full URL to the backend
// In production, use the relative path (will be handled by the server)
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:3000/api/v1' 
  : '/api/v1';

// Authentication token storage keys
const ACCESS_TOKEN_KEY = 'aemos_access_token';
const REFRESH_TOKEN_KEY = 'aemos_refresh_token';

/**
 * Create an Axios instance with default configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

/**
 * Get the stored access token
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Get the stored refresh token
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Set the access token in local storage
 */
export const setAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

/**
 * Set the refresh token in local storage
 */
export const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

/**
 * Clear authentication tokens from storage
 */
export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Set auth tokens after successful login or registration
 */
export const setAuthTokens = (accessToken: string, refreshToken: string): void => {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
};

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
// Queue of failed requests to retry after token refresh
let failedQueue: any[] = [];

/**
 * Process the queue of failed requests
 */
const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  
  failedQueue = [];
};

/**
 * Request interceptor to add auth token to requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle token refresh
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // If error is not 401 or request already retried, reject
    if (
      !error.response || 
      error.response.status !== 401 || 
      (originalRequest as any)?._retry
    ) {
      return Promise.reject(error);
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Mark original request as retried
    (originalRequest as any)._retry = true;

    // If already refreshing, add to queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;
    const refreshToken = getRefreshToken();

    // If no refresh token, reject and redirect to login
    if (!refreshToken) {
      isRefreshing = false;
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Try to refresh token
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      setAuthTokens(accessToken, newRefreshToken);
      
      // Update authorization header for original request
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }
      
      // Process queue with new token
      processQueue(null, accessToken);
      isRefreshing = false;
      
      // Retry original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      isRefreshing = false;
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient; 