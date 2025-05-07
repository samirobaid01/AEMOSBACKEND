import React from 'react';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { WbSunny as WeatherIcon } from '@mui/icons-material';
import type { WeatherData, WeatherError } from '../../types/dashboard';

interface WeatherInfoProps {
  data?: WeatherData;
  isLoading?: boolean;
  error?: WeatherError | null;
}

export const WeatherInfo: React.FC<WeatherInfoProps> = ({
  data,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{error.message}</Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <WeatherIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Weather Information</Typography>
      </Box>
      
      {data ? (
        <>
          <Typography variant="h4" gutterBottom>
            {data.temperature}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Humidity: {data.humidity}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Conditions: {data.conditions}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Forecast: {data.forecast}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </Typography>
        </>
      ) : (
        <Typography variant="body1" color="text.secondary">
          Weather information not available
        </Typography>
      )}
    </Paper>
  );
}; 