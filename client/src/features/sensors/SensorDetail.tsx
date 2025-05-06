import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Tabs,
  Tab,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  DeviceHub as DeviceHubIcon,
} from '@mui/icons-material';
import apiClient from '../../api/apiClient';

interface Sensor {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  deviceId: string;
  deviceName: string;
  location: string;
  description: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  minValue: number;
  maxValue: number;
  currentValue: number | null;
  unit: string;
  lastCalibration: string;
  lastReading: {
    value: number;
    unit: string;
    timestamp: string;
  } | null;
  readings: Array<{
    value: number;
    timestamp: string;
  }>;
}

const SensorDetail: React.FC = () => {
  const { sensorId } = useParams<{ sensorId: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const {
    data: sensor,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sensor', sensorId],
    queryFn: async () => {
      const response = await apiClient.get(`/sensors/${sensorId}`);
      return response.data.data as Sensor;
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'error':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleCalibrateClick = () => {
    // This would trigger calibration flow
    console.log('Calibrate sensor');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !sensor) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading sensor details. The sensor may have been deleted or you don't have permission to view it.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/sensors')}
          >
            Back to Sensors
          </Button>
          <Typography variant="h4">{sensor.name}</Typography>
          <Chip 
            label={sensor.status} 
            color={getStatusColor(sensor.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"} 
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            onClick={handleCalibrateClick}
          >
            Calibrate
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<EditIcon />}
            onClick={() => navigate(`/sensors/${sensorId}/edit`)}
          >
            Edit
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Readings" />
          <Tab label="Alerts" />
          <Tab label="Calibration History" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Sensor Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 2fr', gap: 2 }}>
                <Typography variant="subtitle2">ID:</Typography>
                <Typography variant="body2">{sensor.id}</Typography>
                
                <Typography variant="subtitle2">Type:</Typography>
                <Typography variant="body2">{sensor.type}</Typography>
                
                <Typography variant="subtitle2">Model:</Typography>
                <Typography variant="body2">{sensor.model || 'N/A'}</Typography>
                
                <Typography variant="subtitle2">Serial Number:</Typography>
                <Typography variant="body2">{sensor.serialNumber || 'N/A'}</Typography>
                
                <Typography variant="subtitle2">Location:</Typography>
                <Typography variant="body2">{sensor.location}</Typography>
                
                <Typography variant="subtitle2">Range:</Typography>
                <Typography variant="body2">
                  {sensor.minValue} - {sensor.maxValue} {sensor.unit}
                </Typography>
                
                <Typography variant="subtitle2">Installation Date:</Typography>
                <Typography variant="body2">
                  {sensor.installationDate 
                    ? new Date(sensor.installationDate).toLocaleDateString() 
                    : 'N/A'}
                </Typography>
                
                <Typography variant="subtitle2">Last Calibration:</Typography>
                <Typography variant="body2">
                  {sensor.lastCalibration 
                    ? new Date(sensor.lastCalibration).toLocaleDateString() 
                    : 'N/A'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader 
                title="Connected Device" 
                avatar={<DeviceHubIcon />}
                action={
                  <Button 
                    size="small" 
                    onClick={() => navigate(`/devices/${sensor.deviceId}`)}
                  >
                    View Device
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 2fr', gap: 2 }}>
                  <Typography variant="subtitle2">Device:</Typography>
                  <Typography variant="body2">{sensor.deviceName || 'None'}</Typography>
                  
                  <Typography variant="subtitle2">Device ID:</Typography>
                  <Typography variant="body2">
                    {sensor.deviceId || 'Not connected to any device'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader title="Current Reading" />
              <Divider />
              <CardContent>
                {sensor.lastReading ? (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h2" gutterBottom>
                      {sensor.lastReading.value} {sensor.lastReading.unit}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {new Date(sensor.lastReading.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body1" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No readings available for this sensor.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Description</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {sensor.description || 'No description available.'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Sensor Readings</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Sensor reading history and visualization will be implemented here.
          </Typography>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Alert History</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Sensor alert history will be implemented here.
          </Typography>
        </Paper>
      )}

      {tabValue === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Calibration History</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Sensor calibration history will be implemented here.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SensorDetail; 