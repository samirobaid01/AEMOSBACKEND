import React from 'react';
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { DeviceStats as DeviceStatsType } from '../../types/device';
import { DevicesOutlined as DevicesIcon } from '@mui/icons-material';

interface DeviceStatsProps {
  stats?: {
    total: number;
    online: number;
    offline: number;
    warning: number;
  };
  isLoading?: boolean;
  error?: string | null;
  onViewDevices: () => void;
}

export const DeviceStats: React.FC<DeviceStatsProps> = ({ stats, isLoading, error, onViewDevices }) => {
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
    <Paper elevation={2} sx={{ p: 2 }} data-tour="devices">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <DevicesIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Device Statistics</Typography>
      </Box>
      
      {stats ? (
        <>
          <Typography variant="body1" gutterBottom>
            Total Devices: {stats.total}
          </Typography>
          <Typography variant="body1" color="success.main" gutterBottom>
            Online: {stats.online}
          </Typography>
          <Typography variant="body1" color="error.main" gutterBottom>
            Offline: {stats.offline}
          </Typography>
          <Typography variant="body1" color="warning.main">
            Warning: {stats.warning}
          </Typography>
        </>
      ) : (
        <Typography variant="body1" color="text.secondary">
          No device statistics available
        </Typography>
      )}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" size="small" onClick={onViewDevices}>
          View Devices
        </Button>
      </Box>
    </Paper>
  );
}; 