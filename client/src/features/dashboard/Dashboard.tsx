import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
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
import apiClient from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';

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
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Welcome back, {user?.firstName || user?.userName}! Here's an overview of your environmental monitoring system.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Device Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Device Status
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary">
                      {deviceStats?.total || 0}
                    </Typography>
                    <Typography variant="body1">Total Devices</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main">
                      {deviceStats?.online || 0}
                    </Typography>
                    <Typography variant="body1">Online</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error.main">
                      {deviceStats?.offline || 0}
                    </Typography>
                    <Typography variant="body1">Offline</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="warning.main">
                      {deviceStats?.warning || 0}
                    </Typography>
                    <Typography variant="body1">Warning</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" href="/devices">
                View Devices
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Sensor Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sensor Status
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary">
                      {sensorStats?.total || 0}
                    </Typography>
                    <Typography variant="body1">Total Sensors</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main">
                      {sensorStats?.active || 0}
                    </Typography>
                    <Typography variant="body1">Active</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="text.secondary">
                      {sensorStats?.inactive || 0}
                    </Typography>
                    <Typography variant="body1">Inactive</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error.main">
                      {sensorStats?.alerts || 0}
                    </Typography>
                    <Typography variant="body1">Alerts</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" href="/sensors">
                View Sensors
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Alerts */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
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
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
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
      </Grid>
    </Box>
  );
};

export default Dashboard; 