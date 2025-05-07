import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid as MuiGrid,
  Box,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Grid = MuiGrid as any; // Temporary type assertion to fix Grid issues

interface Sensor {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  lastReading: string;
  unit: string;
  value: number;
}

interface SensorListViewProps {
  sensors: Sensor[];
  isLoading?: boolean;
  error?: string | null;
  onAddSensor: () => void;
  onViewSensor: (id: string) => void;
}

const SensorListView: React.FC<SensorListViewProps> = ({
  sensors,
  isLoading,
  error,
  onAddSensor,
  onViewSensor,
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Sensors
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddSensor}
        >
          Add Sensor
        </Button>
      </Box>

      <Grid container spacing={3}>
        {sensors.map((sensor) => (
          <Grid item xs={12} sm={6} md={4} key={sensor.id}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => onViewSensor(sensor.id)}
            >
              <Typography variant="h6" gutterBottom>
                {sensor.name}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                {sensor.type}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Last Reading:
                </Typography>
                <Typography>
                  {sensor.value} {sensor.unit}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(sensor.lastReading).toLocaleString()}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default SensorListView; 