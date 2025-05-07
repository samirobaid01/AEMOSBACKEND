import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { 
  getAccessToken, 
  setAuthTokens, 
  clearTokens 
} from '../utils/api/apiClient';
import socketService from '../services/socketService';
import type { User } from '../../../shared/types/models';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  error: string | null;
}

interface RegisterData {
  userName: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  termsAndConditions: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          setLoading(false);
          return;
        }

        // Fetch current user profile
        const response = await apiClient.get('/users/me');
        if (response.data.success) {
          setUser(response.data.data);
          
          // Initialize socket with auth token
          socketService.init();
          
          // Join user-specific rooms
          if (response.data.data.id) {
            socketService.joinRooms([
              `user-${response.data.data.id}`,
              response.data.data.organizationId ? 
                `org-${response.data.data.organizationId}` : ''
            ].filter(Boolean));
          }
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        debugger;
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });

      // Handle the token format that comes from the server
      const { token, user } = response.data.data;
      
      // Save token (only using access token in this app)
      setAuthTokens(token, token);
      
      // Set user data
      setUser(user);
      
      // Initialize socket connection
      socketService.init();
      
      // Join user-specific notification rooms
      if (user.id) {
        socketService.joinRooms([
          `user-${user.id}`,
          user.organizationId ? `org-${user.organizationId}` : ''
        ].filter(Boolean));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
        'Failed to login. Please check your credentials.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiClient.post('/auth/signup', userData);

      // Handle the token format that comes from the server
      const { token, user } = response.data.data;
      
      // Save token (only using access token in this app)
      setAuthTokens(token, token);
      
      // Set user data
      setUser(user);
      
      // Initialize socket connection
      socketService.init();
      
      // Join user-specific rooms
      if (user.id) {
        socketService.joinRooms([
          `user-${user.id}`,
          user.organizationId ? `org-${user.organizationId}` : ''
        ].filter(Boolean));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
        'Registration failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Disconnect socket
    socketService.disconnect();
    
    // Clear auth tokens
    debugger;
    clearTokens();
    
    // Clear user data
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 