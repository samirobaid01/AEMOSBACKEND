import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, MenuItem } from '@mui/material';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { StatusChip } from '../../components/common/StatusChip';
import type { SensorListFilters } from '../../types/sensor';
import { useLocation } from 'react-router-dom';
import { disableWalkthroughCompletely } from '../../utils/walkthroughHelpers';
import { getAccessToken, getRefreshToken } from '../../utils/api/apiClient';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { fetchSensors, setFilters } from '../../state/slices/sensorSlice';

const ROWS_PER_PAGE = 10;

export const SensorListContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sensors, totalCount, loading, error, filters } = useAppSelector((state) => state.sensors);
  const location = useLocation();

  // Set initial filters and fetch data
  useEffect(() => {
    console.log('[Sensors Debug] Initializing component and fetching sensors with filters:', filters);
    dispatch(fetchSensors(filters));
  }, [dispatch, filters]);

  // Check authentication status on mount
  useEffect(() => {
    console.log('[Sensors Auth Debug] Checking authentication on mount');
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    
    console.log('[Sensors Auth Debug] Access token:', accessToken ? 'exists' : 'missing');
    console.log('[Sensors Auth Debug] Refresh token:', refreshToken ? 'exists' : 'missing');
    
    // Prevent automatic logout by storing the current page
    try {
      sessionStorage.setItem('last_page', '/sensors');
    } catch (e) {
      console.error('[Sensors Auth Debug] Error storing last page:', e);
    }
  }, []);

  // Fix for walkthrough issue - disable walkthrough on component mount
  useEffect(() => {
    console.log('Disabling walkthrough to prevent page reload issues');
    disableWalkthroughCompletely();
  }, []);

  // Add diagnostic logging
  useEffect(() => {
    console.log('SensorListContainer mounted');
    console.log('Current path:', location.pathname);
    console.log('Loading state:', loading);
    console.log('Error state:', error);
    
    return () => {
      console.log('SensorListContainer unmounted');
    };
  }, [location.pathname, loading, error]);

  // Log whenever the sensors data changes
  useEffect(() => {
    if (sensors) {
      console.log('[Sensors Debug] Sensors data received:', sensors.length, 'sensors');
      console.log('[Sensors Debug] First few sensors:', sensors.slice(0, 3));
    }
  }, [sensors]);

  // Error handling with recovery
  useEffect(() => {
    if (error) {
      console.error('[Sensors Error Debug] Error loading sensors:', error);
      
      // Try to determine if it's an auth error
      const errorMessage = error.toString().toLowerCase();
      const isAuthError = errorMessage.includes('unauthorized') || 
                          errorMessage.includes('authentication') || 
                          errorMessage.includes('401');
      
      if (isAuthError) {
        console.warn('[Sensors Auth Debug] Authentication error detected');
      }
    }
  }, [error]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = {
      ...filters,
      search: event.target.value,
      page: 0, // Reset page when search changes
    };
    console.log('[Sensors Debug] Search changed, new filters:', newFilters);
    dispatch(setFilters(newFilters));
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const status = event.target.value as 'active' | 'inactive' | 'error' | '';
    const newFilters = {
      ...filters,
      status: status ? [status] : undefined,
      page: 0,
    };
    console.log('[Sensors Debug] Status changed, new filters:', newFilters);
    dispatch(setFilters(newFilters));
  };

  if (loading) {
    console.log('Rendering loading spinner');
    return <LoadingSpinner />;
  }

  if (error) {
    console.log('Rendering error alert:', error);
    return <ErrorAlert message="Failed to load sensors" />;
  }

  console.log('[Sensors Debug] Rendering sensor list, count:', sensors?.length);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Sensors</Typography>
      </Box>

      <Box mb={3} display="flex" gap={2}>
        <TextField
          label="Search sensors"
          variant="outlined"
          size="small"
          value={filters.search || ''}
          onChange={handleSearchChange}
          sx={{ minWidth: 200 }}
        />
        <TextField
          select
          label="Status"
          variant="outlined"
          size="small"
          value={filters.status?.[0] || ''}
          onChange={handleStatusChange}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
          <MenuItem value="error">Error</MenuItem>
        </TextField>
      </Box>

      {!sensors || sensors.length === 0 ? (
        <Typography color="text.secondary" align="center">
          No sensors found
        </Typography>
      ) : (
        <Box 
          display="grid" 
          gridTemplateColumns={{
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          }}
          gap={2}
        >
          {sensors.map((sensor) => (
            <Box
              key={sensor.id}
              component="article"
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                height: '100%',
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h6" gutterBottom>
                  {sensor.name}
                </Typography>
                <StatusChip status={sensor.status} />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type: {sensor.type}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Location: {sensor.location}
              </Typography>
              {sensor.lastReading !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Last Reading: {sensor.lastReading} {sensor.unit}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}; 