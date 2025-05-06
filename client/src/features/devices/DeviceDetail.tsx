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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
} from '@mui/icons-material';
import apiClient from '../../api/apiClient';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'maintenance';
  location: string;
  description: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  lastConnection: string;
  lastMaintenance: string;
  organizationId: string;
  sensors: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    lastReading: {
      value: number;
      unit: string;
      timestamp: string;
    } | null;
  }>;
  telemetry: Array<{
    timestamp: string;
    cpu: number;
    memory: number;
    storage: number;
    temperature: number;
  }>;
}

const DeviceDetail: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const {
    data: device,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      const response = await apiClient.get(`/devices/${deviceId}`);
      return response.data.data as Device;
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleSensorClick = (sensorId: string) => {
    navigate(`/sensors/${sensorId}`);
  };

  const handleToggleDeviceStatus = () => {
    // This would trigger API call to toggle device status
    console.log('Toggle device status');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !device) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading device details. The device may have been deleted or you don't have permission to view it.
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
            onClick={() => navigate('/devices')}
          >
            Back to Devices
          </Button>
          <Typography variant="h4">{device.name}</Typography>
          <Chip 
            label={device.status} 
            color={getStatusColor(device.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"} 
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={device.status === 'online' ? <ToggleOffIcon /> : <ToggleOnIcon />}
            onClick={handleToggleDeviceStatus}
          >
            {device.status === 'online' ? 'Turn Off' : 'Turn On'}
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
            onClick={() => navigate(`/devices/${deviceId}/edit`)}
          >
            Edit
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Sensors" />
          <Tab label="Telemetry" />
          <Tab label="Maintenance" />
          <Tab label="Logs" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Device Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 2fr', gap: 2 }}>
                <Typography variant="subtitle2">ID:</Typography>
                <Typography variant="body2">{device.id}</Typography>
                
                <Typography variant="subtitle2">Type:</Typography>
                <Typography variant="body2">{device.type}</Typography>
                
                <Typography variant="subtitle2">Model:</Typography>
                <Typography variant="body2">{device.model || 'N/A'}</Typography>
                
                <Typography variant="subtitle2">Serial Number:</Typography>
                <Typography variant="body2">{device.serialNumber || 'N/A'}</Typography>
                
                <Typography variant="subtitle2">Location:</Typography>
                <Typography variant="body2">{device.location}</Typography>
                
                <Typography variant="subtitle2">Installation Date:</Typography>
                <Typography variant="body2">
                  {device.installationDate 
                    ? new Date(device.installationDate).toLocaleDateString() 
                    : 'N/A'}
                </Typography>
                
                <Typography variant="subtitle2">Last Connection:</Typography>
                <Typography variant="body2">
                  {new Date(device.lastConnection).toLocaleString()}
                </Typography>
                
                <Typography variant="subtitle2">Last Maintenance:</Typography>
                <Typography variant="body2">
                  {device.lastMaintenance 
                    ? new Date(device.lastMaintenance).toLocaleDateString() 
                    : 'N/A'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Description</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {device.description || 'No description available.'}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Connected Sensors</Typography>
                <Button size="small" onClick={() => setTabValue(1)}>
                  View All
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {device.sensors.slice(0, 4).map((sensor) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={sensor.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => handleSensorClick(sensor.id)}
                    >
                      <CardContent>
                        <Typography variant="subtitle1">{sensor.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sensor.type}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Chip 
                            label={sensor.status} 
                            color={getStatusColor(sensor.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"} 
                            size="small" 
                          />
                          {sensor.lastReading && (
                            <Typography variant="body2">
                              {sensor.lastReading.value} {sensor.lastReading.unit}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Connected Sensors</Typography>
            <Button 
              variant="contained" 
              size="small"
              onClick={() => navigate(`/devices/${deviceId}/add-sensor`)}
            >
              Add Sensor
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List>
            {device.sensors.length === 0 ? (
              <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                No sensors connected to this device.
              </Typography>
            ) : (
              device.sensors.map((sensor) => (
                <ListItem
                  key={sensor.id}
                  sx={{ 
                    '&:hover': { bgcolor: 'action.hover' },
                    cursor: 'pointer',
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                  onClick={() => handleSensorClick(sensor.id)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {sensor.name}
                        <Chip 
                          label={sensor.status} 
                          color={getStatusColor(sensor.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"} 
                          size="small" 
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" component="span">
                          {sensor.type}
                        </Typography>
                        {sensor.lastReading && (
                          <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                            Last reading: {sensor.lastReading.value} {sensor.lastReading.unit}
                            {' '}({new Date(sensor.lastReading.timestamp).toLocaleString()})
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sensors/${sensor.id}/edit`);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show delete confirmation
                        console.log('Delete sensor:', sensor.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Device Telemetry</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Device telemetry data visualization will be implemented here.
          </Typography>
        </Paper>
      )}

      {tabValue === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Maintenance History</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Maintenance history and scheduling will be implemented here.
          </Typography>
        </Paper>
      )}

      {tabValue === 4 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Device Logs</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Device logs and event history will be implemented here.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default DeviceDetail; 