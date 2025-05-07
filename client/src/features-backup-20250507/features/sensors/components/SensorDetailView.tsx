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
  SensorsOutlined as SensorIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';

const Grid = MuiGrid as any; // Temporary type assertion to fix Grid issues

interface SensorReading {
  timestamp: string;
  value: number;
}

interface Sensor {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  lastReading: string;
  unit: string;
  value: number;
  description?: string;
  location?: string;
  readings?: SensorReading[];
}

interface SensorDetailViewProps {
  sensor?: Sensor;
  isLoading?: boolean;
  error?: string | null;
  onBack: () => void;
  onEdit: (id: string) => void;
}

const SensorDetailView: React.FC<SensorDetailViewProps> = ({
  sensor,
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

  if (!sensor) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Sensor not found</Alert>
      </Container>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'error':
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
          Sensor Details
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SensorIcon sx={{ mr: 2 }} />
              <Typography variant="h5" component="h2">
                {sensor.name}
              </Typography>
              <Chip
                label={sensor.status}
                color={getStatusColor(sensor.status) as any}
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
              <Typography component="dd" sx={{ mb: 2 }}>{sensor.type}</Typography>

              <Typography component="dt" color="text.secondary">Last Reading</Typography>
              <Typography component="dd" sx={{ mb: 2 }}>
                {sensor.value} {sensor.unit} ({new Date(sensor.lastReading).toLocaleString()})
              </Typography>

              {sensor.description && (
                <>
                  <Typography component="dt" color="text.secondary">Description</Typography>
                  <Typography component="dd" sx={{ mb: 2 }}>{sensor.description}</Typography>
                </>
              )}

              {sensor.location && (
                <>
                  <Typography component="dt" color="text.secondary">Location</Typography>
                  <Typography component="dd" sx={{ mb: 2 }}>{sensor.location}</Typography>
                </>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Reading History
            </Typography>
            {sensor.readings && sensor.readings.length > 0 ? (
              <Box sx={{ height: 300, mt: 2 }}>
                {/* Add your chart component here */}
              </Box>
            ) : (
              <Typography color="text.secondary">No reading history available</Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default SensorDetailView; 