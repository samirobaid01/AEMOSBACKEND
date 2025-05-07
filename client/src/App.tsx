import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useAppSelector } from './state/hooks';
import { useSyncAuthState, logMigrationStatus } from './utils/migrationHelpers';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './containers/dashboard/DashboardContainer';
import { DeviceListContainer as DeviceList } from './containers/devices/DeviceListContainer';
import { DeviceDetailContainer as DeviceDetail } from './containers/devices/DeviceDetailContainer';
import { SensorListContainer as SensorList } from './containers/sensors/SensorListContainer';
import { SensorDetailContainer as SensorDetail } from './containers/sensors/SensorDetailContainer';
import NotificationCenterContainer from './containers/notifications/NotificationCenterContainer';
import { SettingsContainer as Settings } from './containers/settings/SettingsContainer';
import MainLayout from './layouts/MainLayout';
import theme from './theme';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected route component using Redux
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAppSelector(state => state.auth);
  const location = useLocation();

  // Add diagnostic logging
  console.log('ProtectedRoute Debug:');
  console.log('Current path:', location.pathname);
  console.log('Auth state:', { isAuthenticated, loading });

  if (loading) {
    console.log('Auth loading, showing loading indicator');
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to /login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  console.log('Authenticated, rendering protected content');
  return <>{children}</>;
};

// App Root component that uses the sync helper
const AppRoot = () => {
  // Sync auth state between Context and Redux during migration
  useSyncAuthState();
  
  // Log migration progress in development
  if (import.meta.env.DEV) {
    logMigrationStatus();
  }
  
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<DeviceList />} />
          <Route path="devices/:deviceId" element={<DeviceDetail />} />
          <Route path="sensors" element={<SensorList />} />
          <Route path="sensors/:sensorId" element={<SensorDetail />} />
          <Route path="notifications" element={<NotificationCenterContainer />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        {/* Keep AuthProvider temporarily during migration */}
        <AuthProvider>
          <NotificationProvider>
            <AppRoot />
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
