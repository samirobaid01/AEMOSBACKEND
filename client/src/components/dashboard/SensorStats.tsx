import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { SensorsOutlined as SensorIcon } from '@mui/icons-material';
import type { SensorStats as SensorStatsType } from '../../types/dashboard';

interface SensorStatsProps {
  stats?: SensorStatsType;
  isLoading?: boolean;
  error?: string | null;
  onViewSensors: () => void;
}

export const SensorStats: React.FC<SensorStatsProps> = ({
  stats,
  isLoading,
  error,
  onViewSensors,
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
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2 }} data-tour="sensors">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SensorIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Sensor Statistics</Typography>
      </Box>
      
      {stats ? (
        <>
          <Typography variant="body1" gutterBottom>
            Total Sensors: {stats.total}
          </Typography>
          <Typography variant="body1" color="success.main" gutterBottom>
            Active: {stats.active}
          </Typography>
          <Typography variant="body1" color="error.main" gutterBottom>
            Inactive: {stats.inactive}
          </Typography>
          <Typography variant="body1" color="warning.main">
            Alerting: {stats.alerting}
          </Typography>
        </>
      ) : (
        <Typography variant="body1" color="text.secondary">
          No sensor statistics available
        </Typography>
      )}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" size="small" onClick={onViewSensors}>
          View Sensors
        </Button>
      </Box>
    </Paper>
  );
}; 