import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useAppSelector } from './store/hooks';
import { useSyncAuthState, logMigrationStatus } from './utils/migrationHelpers';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Dashboard from './features/dashboard/Dashboard';
import DeviceList from './features/devices/DeviceList';
import DeviceDetail from './features/devices/DeviceDetail';
import SensorList from './features/sensors/SensorList';
import SensorDetail from './features/sensors/SensorDetail';
import NotificationCenter from './features/notifications/NotificationCenter';
import Settings from './features/settings/Settings';
import MainLayout from './layouts/MainLayout';

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

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2e7d32', // Green for environmental theme
    },
    secondary: {
      main: '#0288d1', // Blue for water-related theme
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

// Protected route component using Redux
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAppSelector(state => state.auth);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
          <Route path="notifications" element={<NotificationCenter />} />
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
