import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid as MuiGrid,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Alert,
  Button,
} from '@mui/material';
import apiClient from '../../utils/api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { openWalkthrough } from '../../state/slices/walkthroughSlice';
import Walkthrough from '../../components/Walkthrough';
import { disableWalkthroughCompletely } from '../../utils/walkthroughHelpers';

const Grid = MuiGrid as any; // Temporary type assertion to fix Grid issues

// Placeholder for device stats data structure
type DeviceStats = {
  total: number;
  online: number;
  offline: number;
  warning: number;
};

// Placeholder for sensor data structure
type SensorStats = {
  total: number;
  active: number;
  inactive: number;
  alerts: number;
};

// Define the WeatherData interface
interface WeatherData {
  temperature: string;
  humidity: string;
  conditions: string;
  forecast: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { enabled, completed } = useAppSelector((state: any) => state.walkthrough);
  
  // Disable walkthrough to fix page reload issues
  useEffect(() => {
    // Check if we should keep walkthrough disabled
    const isWalkthroughDisabled = localStorage.getItem('walkthrough_disabled') === 'true';
    if (isWalkthroughDisabled) {
      console.log('Walkthrough detected as disabled, not showing');
      return;
    }
    
    // Optional: uncomment this to completely disable walkthrough
    // disableWalkthroughCompletely();
  }, []);
  
  // Modified walkthrough logic - only show in dashboard, prevent on other pages
  useEffect(() => {
    // Only open if explicitly on dashboard page (not when redirected from other pages)
    const isDirectDashboardVisit = window.location.pathname === '/';
    
    if (isAuthenticated && enabled && !completed && isDirectDashboardVisit) {
      // Slight delay to ensure UI is fully loaded
      const timer = setTimeout(() => {
        console.log('Opening walkthrough for dashboard page');
        dispatch(openWalkthrough());
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, enabled, completed, dispatch]);
  
  // Fetch device stats
  const {
    data: deviceStats,
    isLoading: isLoadingDevices,
    error: deviceError
  } = useQuery({
    queryKey: ['deviceStats'],
    queryFn: async () => {
      const response = await apiClient.get('/devices/stats');
      return response.data.data as DeviceStats;
    },
    enabled: !!user,
  });

  // Fetch sensor stats
  const {
    data: sensorStats,
    isLoading: isLoadingSensors,
    error: sensorError
  } = useQuery({
    queryKey: ['sensorStats'],
    queryFn: async () => {
      const response = await apiClient.get('/sensors/stats');
      return response.data.data as SensorStats;
    },
    enabled: !!user,
  });

  // Fetch recent alerts
  const {
    data: recentAlerts,
    isLoading: isLoadingAlerts,
    error: alertsError
  } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: async () => {
      const response = await apiClient.get('/alerts/recent?limit=5');
      return response.data.data;
    },
    enabled: !!user,
  });

  // Placeholder for weather data
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    // This would be replaced with actual weather API integration
    const fetchWeather = async () => {
      try {
        // Simulate fetching weather data
        const weatherData: WeatherData = {
          temperature: '22°C',
          humidity: '65%',
          conditions: 'Partly Cloudy',
          forecast: 'Sunny conditions expected for the next 3 days'
        };
        setWeatherData(weatherData);
      } catch (error) {
        setWeatherError('Unable to fetch weather data');
      }
    };

    fetchWeather();
  }, []);

  // Handle loading states
  if (isLoadingDevices || isLoadingSensors || isLoadingAlerts) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Handle error states
  if (deviceError || sensorError || alertsError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading dashboard data. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom data-tour="dashboard">
        Dashboard
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Welcome back, {user?.firstName || user?.userName}! Here's an overview of your environmental monitoring system.
      </Typography>
      
      <MuiGrid container spacing={3}>
        {/* Device Status */}
        <MuiGrid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }} data-tour="devices">
            <Typography variant="h6" gutterBottom>
              Device Status
            </Typography>
            <MuiGrid container spacing={2}>
              <MuiGrid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary">
                      {deviceStats?.total || 0}
                    </Typography>
                    <Typography variant="body1">Total Devices</Typography>
                  </CardContent>
                </Card>
              </MuiGrid>
              <MuiGrid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main">
                      {deviceStats?.online || 0}
                    </Typography>
                    <Typography variant="body1">Online</Typography>
                  </CardContent>
                </Card>
              </MuiGrid>
              <MuiGrid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error.main">
                      {deviceStats?.offline || 0}
                    </Typography>
                    <Typography variant="body1">Offline</Typography>
                  </CardContent>
                </Card>
              </MuiGrid>
              <MuiGrid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="warning.main">
                      {deviceStats?.warning || 0}
                    </Typography>
                    <Typography variant="body1">Warning</Typography>
                  </CardContent>
                </Card>
              </MuiGrid>
            </MuiGrid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" href="/devices">
                View Devices
              </Button>
            </Box>
          </Paper>
        </MuiGrid>
        
        {/* Sensor Status */}
        <MuiGrid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }} data-tour="sensors">
            <Typography variant="h6" gutterBottom>
              Sensor Status
            </Typography>
            <MuiGrid container spacing={2}>
              <MuiGrid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary">
                      {sensorStats?.total || 0}
                    </Typography>
                    <Typography variant="body1">Total Sensors</Typography>
                  </CardContent>
                </Card>
              </MuiGrid>
              <MuiGrid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main">
                      {sensorStats?.active || 0}
                    </Typography>
                    <Typography variant="body1">Active</Typography>
                  </CardContent>
                </Card>
              </MuiGrid>
              <MuiGrid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="text.secondary">
                      {sensorStats?.inactive || 0}
                    </Typography>
                    <Typography variant="body1">Inactive</Typography>
                  </CardContent>
                </Card>
              </MuiGrid>
              <MuiGrid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error.main">
                      {sensorStats?.alerts || 0}
                    </Typography>
                    <Typography variant="body1">Alerts</Typography>
                  </CardContent>
                </Card>
              </MuiGrid>
            </MuiGrid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" href="/sensors">
                View Sensors
              </Button>
            </Box>
          </Paper>
        </MuiGrid>
        
        {/* Recent Alerts */}
        <MuiGrid size={{ xs: 12, md: 8 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ p: 2 }} data-tour="notifications">
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            {recentAlerts && recentAlerts.length > 0 ? (
              <Stack spacing={2}>
                {recentAlerts.map((alert: any) => (
                  <Alert 
                    key={alert.id} 
                    severity={alert.severity as 'error' | 'warning' | 'info'} 
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2">{alert.title}</Typography>
                      <Typography variant="body2">{alert.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(alert.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                  </Alert>
                ))}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                No recent alerts. Everything is running smoothly!
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" href="/notifications">
                View All Alerts
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Weather & Environment */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }} data-tour="settings">
            <Typography variant="h6" gutterBottom>
              Weather & Environment
            </Typography>
            {weatherError && (
              <Alert severity="error">{weatherError}</Alert>
            )}
            {weatherData && (
              <Box>
                <Card sx={{ mb: 2 }}>
                  <CardHeader title="Current Conditions" />
                  <Divider />
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      {weatherData.temperature}
                    </Typography>
                    <Typography variant="body1">
                      Humidity: {weatherData.humidity}
                    </Typography>
                    <Typography variant="body1">
                      Conditions: {weatherData.conditions}
                    </Typography>
                  </CardContent>
                </Card>
                <Typography variant="body2" color="text.secondary">
                  Forecast: {weatherData.forecast}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </MuiGrid>
      </MuiGrid>
      {/* Walkthrough component */}
      <Walkthrough />
    </Box>
  );
};

export default Dashboard; 