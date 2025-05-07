import React from 'react';
import Box from '@mui/material/Box';
import { Grid as MuiGrid } from '@mui/material';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { DeviceStats } from '../../../components/dashboard/DeviceStats';
import { SensorStats } from '../../../components/dashboard/SensorStats';
import { WeatherInfo } from '../../../components/dashboard/WeatherInfo';
import { RecentAlerts } from '../../../components/dashboard/RecentAlerts';
import type { 
  DeviceStats as DeviceStatsType, 
  SensorStats as SensorStatsType, 
  WeatherData, 
  Alert, 
  WeatherError 
} from '../../../types/dashboard';

interface DashboardViewProps {
  deviceStats?: DeviceStatsType;
  sensorStats?: SensorStatsType;
  weatherData?: WeatherData;
  recentAlerts?: Alert[];
  isLoading?: boolean;
  error?: WeatherError | null;
  onViewDevices: () => void;
  onViewSensors: () => void;
}

const Grid = MuiGrid as any; // Temporary type assertion to fix Grid issues

const DashboardView: React.FC<DashboardViewProps> = ({
  deviceStats,
  sensorStats,
  weatherData,
  recentAlerts,
  isLoading,
  error,
  onViewDevices,
  onViewSensors
}) => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Box sx={{ flexGrow: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <DeviceStats 
              stats={deviceStats} 
              isLoading={isLoading} 
              error={error?.message} 
              onViewDevices={onViewDevices}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <SensorStats 
              stats={sensorStats} 
              isLoading={isLoading} 
              error={error?.message}
              onViewSensors={onViewSensors}
            />
          </Grid>
          
          <Grid item xs={12} md={8}>
            <RecentAlerts 
              alerts={recentAlerts} 
              isLoading={isLoading} 
              error={error?.message}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <WeatherInfo 
              data={weatherData} 
              isLoading={isLoading} 
              error={error}
            />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default DashboardView; 