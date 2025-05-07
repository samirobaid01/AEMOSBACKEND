import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Button } from '@mui/material';
import { deviceService } from '../../services/api/deviceService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { StatusChip } from '../../components/common/StatusChip';
import { useSensors } from '../../hooks/useSensors';
import type { Device } from '../../types/device';

export const DeviceDetailContainer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: deviceResponse,
    isLoading: isLoadingDevice,
    error: deviceError,
  } = useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceService.getDevice(id!),
    enabled: !!id,
  });

  const device: Device | undefined = deviceResponse?.data;

  const {
    sensors,
    isLoading: isLoadingSensors,
  } = useSensors({
    page: 0,
    rowsPerPage: 10,
    deviceId: id,
  });

  const isLoading = isLoadingDevice || isLoadingSensors;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (deviceError || !device) {
    return <ErrorAlert message="Failed to load device details" />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">{device.name}</Typography>
        <Button variant="outlined" onClick={() => navigate('/devices')}>
          Back to Devices
        </Button>
      </Box>

      <Box display="flex" flexDirection="column" gap={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Device Information</Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Box mt={1}>
                <StatusChip status={device.status as 'online' | 'offline' | 'warning'} />
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Location</Typography>
              <Typography>{device.location}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Last Updated</Typography>
              <Typography>
                {new Date(device.lastConnection).toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Connected Sensors</Typography>
              <Typography>{sensors?.data.totalCount || 0}</Typography>
            </Box>
          </Box>
        </Paper>

        {sensors?.data.sensors && sensors.data.sensors.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Connected Sensors</Typography>
            <Box 
              display="grid" 
              gridTemplateColumns={{
                xs: '1fr',
                sm: '1fr 1fr',
                md: '1fr 1fr 1fr'
              }}
              gap={2}
            >
              {sensors.data.sensors.map((sensor) => (
                <Paper key={sensor.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1">{sensor.name}</Typography>
                  <Box mt={1}>
                    <StatusChip status={sensor.status} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Last Reading: {sensor.lastReading} {sensor.unit}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
}; 