import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Button } from '@mui/material';
import { sensorService } from '../../services/api/sensorService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { StatusChip } from '../../components/common/StatusChip';

export const SensorDetailContainer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: sensorResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sensor', id],
    queryFn: () => sensorService.getSensor(id!),
    enabled: !!id,
  });

  const sensor = sensorResponse?.data;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !sensor) {
    return <ErrorAlert message="Failed to load sensor details" />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">{sensor.name}</Typography>
        <Button variant="outlined" onClick={() => navigate('/sensors')}>
          Back to Sensors
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Typography variant="h6">Sensor Information</Typography>
          <StatusChip status={sensor.status} />
        </Box>

        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">Type</Typography>
            <Typography>{sensor.type}</Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">Location</Typography>
            <Typography>{sensor.location}</Typography>
          </Box>

          {sensor.lastReading !== undefined && (
            <Box>
              <Typography variant="body2" color="text.secondary">Last Reading</Typography>
              <Typography>
                {sensor.lastReading} {sensor.unit}
              </Typography>
            </Box>
          )}

          {(sensor.minThreshold !== undefined || sensor.maxThreshold !== undefined) && (
            <Box>
              <Typography variant="body2" color="text.secondary">Thresholds</Typography>
              <Typography>
                {sensor.minThreshold !== undefined && `Min: ${sensor.minThreshold}`}
                {sensor.minThreshold !== undefined && sensor.maxThreshold !== undefined && ' | '}
                {sensor.maxThreshold !== undefined && `Max: ${sensor.maxThreshold}`}
                {sensor.unit && ` ${sensor.unit}`}
              </Typography>
            </Box>
          )}

          <Box>
            <Typography variant="body2" color="text.secondary">Last Updated</Typography>
            <Typography>
              {new Date(sensor.updatedAt).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}; 