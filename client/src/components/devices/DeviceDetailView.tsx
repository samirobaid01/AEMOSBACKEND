import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid as MuiGrid,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  DevicesOutlined as DeviceIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  description?: string;
  location?: string;
  firmware?: string;
  ipAddress?: string;
  macAddress?: string;
}

interface DeviceDetailViewProps {
  device?: Device;
  isLoading?: boolean;
  error?: string | null;
  onBack: () => void;
  onEdit: (id: string) => void;
}

const Grid = MuiGrid as any; // Temporary type assertion to fix Grid issues

const DeviceDetailView: React.FC<DeviceDetailViewProps> = ({
  device,
  isLoading,
  error,
  onBack,
  onEdit,
}) => {
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!device) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Device not found</Alert>
      </Container>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Button
          startIcon={<BackIcon />}
          onClick={onBack}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Device Details
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DeviceIcon sx={{ mr: 2 }} />
              <Typography variant="h5" component="h2">
                {device.name}
              </Typography>
              <Chip
                label={device.status}
                color={getStatusColor(device.status) as any}
                sx={{ ml: 2 }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Basic Information
            </Typography>
            <Box component="dl" sx={{ mt: 2 }}>
              <Typography component="dt" color="text.secondary">Type</Typography>
              <Typography component="dd" sx={{ mb: 2 }}>{device.type}</Typography>

              <Typography component="dt" color="text.secondary">Last Seen</Typography>
              <Typography component="dd" sx={{ mb: 2 }}>
                {new Date(device.lastSeen).toLocaleString()}
              </Typography>

              {device.description && (
                <>
                  <Typography component="dt" color="text.secondary">Description</Typography>
                  <Typography component="dd" sx={{ mb: 2 }}>{device.description}</Typography>
                </>
              )}

              {device.location && (
                <>
                  <Typography component="dt" color="text.secondary">Location</Typography>
                  <Typography component="dd" sx={{ mb: 2 }}>{device.location}</Typography>
                </>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Technical Details
            </Typography>
            <Box component="dl" sx={{ mt: 2 }}>
              {device.firmware && (
                <>
                  <Typography component="dt" color="text.secondary">Firmware Version</Typography>
                  <Typography component="dd" sx={{ mb: 2 }}>{device.firmware}</Typography>
                </>
              )}

              {device.ipAddress && (
                <>
                  <Typography component="dt" color="text.secondary">IP Address</Typography>
                  <Typography component="dd" sx={{ mb: 2 }}>{device.ipAddress}</Typography>
                </>
              )}

              {device.macAddress && (
                <>
                  <Typography component="dt" color="text.secondary">MAC Address</Typography>
                  <Typography component="dd" sx={{ mb: 2 }}>{device.macAddress}</Typography>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default DeviceDetailView; 