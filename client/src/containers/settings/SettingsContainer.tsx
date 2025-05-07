import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Paper } from '@mui/material';
import apiClient from '../../utils/api/apiClient';

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export const SettingsContainer: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const response = await apiClient.get('/settings');
      return response.data as UserSettings;
    }
  });
  
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      const response = await apiClient.patch('/settings', newSettings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    }
  });
  
  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    updateSettings.mutate(newSettings);
  };
  
  if (isLoading) {
    return <Box>Loading settings...</Box>;
  }
  
  if (error) {
    return <Box>Error loading settings. Please try again.</Box>;
  }
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>
      
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          User Preferences
        </Typography>
        
        {/* Settings UI would go here */}
        <Typography color="text.secondary">
          Settings interface placeholder. This would include notification preferences, theme settings,
          language options, and other user-configurable settings.
        </Typography>
      </Paper>
    </Box>
  );
}; 