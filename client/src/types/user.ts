export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userName: string;
  role: 'admin' | 'user';
  preferences: {
    language: string;
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  lastLogin: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  firstName?: string;
  lastName?: string;
  userName: string;
} 