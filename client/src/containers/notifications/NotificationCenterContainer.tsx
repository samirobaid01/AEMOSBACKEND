import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationCenterView from '../../components/notifications/NotificationCenterView'; //' ../../features/notifications/components/NotificationCenterView';
import apiClient from '../../utils/api/apiClient';

interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  timestamp: string;
  read: boolean;
}

const NotificationCenterContainer: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery<Notification[], Error>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications');
      return response.data;
    }
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleDeleteNotification = (id: string) => {
    deleteNotification.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <NotificationCenterView
      notifications={notifications}
      isLoading={isLoading}
      error={error?.message}
      onDeleteNotification={handleDeleteNotification}
      onMarkAllAsRead={handleMarkAllAsRead}
    />
  );
};

export default NotificationCenterContainer; 