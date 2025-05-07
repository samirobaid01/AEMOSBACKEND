// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  TOKEN_KEY: 'aemos_token',
  REFRESH_TOKEN_KEY: 'aemos_refresh_token',
  TOKEN_EXPIRY: 3600, // 1 hour in seconds
  REFRESH_TOKEN_EXPIRY: 2592000, // 30 days in seconds
} as const;

// Pagination Configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100] as const,
  MAX_PAGES_SHOWN: 5,
} as const;

// Date Format Configuration
export const DATE_CONFIG = {
  DEFAULT_FORMAT: 'MMMM dd, yyyy',
  TIME_FORMAT: 'HH:mm:ss',
  DATETIME_FORMAT: 'MMMM dd, yyyy HH:mm:ss',
  RELATIVE_TIME_THRESHOLD: 7, // days
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  DEFAULT_MODE: 'light' as const,
  STORAGE_KEY: 'aemos_theme',
  PRIMARY_COLOR: '#1976d2',
  SECONDARY_COLOR: '#dc004e',
  SUCCESS_COLOR: '#4caf50',
  ERROR_COLOR: '#f44336',
  WARNING_COLOR: '#ff9800',
  INFO_COLOR: '#2196f3',
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_NOTIFICATIONS: true,
  ENABLE_WEATHER: true,
  ENABLE_ANALYTICS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_LANGUAGE_SELECTION: true,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again later.',
} as const;

// Validation Configuration
export const VALIDATION_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/,
  EMAIL_PATTERN: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes in seconds
  MAX_ITEMS: 100,
  STORAGE_PREFIX: 'aemos_cache_',
} as const; 