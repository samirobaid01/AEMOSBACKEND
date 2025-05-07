import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertService } from '../services/api/alertService';
import type { AlertListFilters } from '../types/alert';

export const useAlerts = (filters: AlertListFilters) => {
  const queryClient = useQueryClient();

  const {
    data: alerts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => alertService.getAlerts(filters),
  });

  const {
    data: recentAlerts,
    isLoading: isLoadingRecent,
  } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: () => alertService.getRecentAlerts(),
  });

  const markAsRead = useMutation({
    mutationFn: alertService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['recentAlerts'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: alertService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['recentAlerts'] });
    },
  });

  const deleteAlert = useMutation({
    mutationFn: alertService.deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['recentAlerts'] });
    },
  });

  return {
    alerts,
    recentAlerts,
    isLoading: isLoading || isLoadingRecent,
    error,
    markAsRead,
    markAllAsRead,
    deleteAlert,
  };
}; 