import type { Alert, AlertListResponse, AlertListFilters } from '../../types/alert';
import type { ApiResponse } from '../../types/api';
import apiClient from '../../utils/api/apiClient';

export const alertService = {
  getAlerts: async (filters: AlertListFilters): Promise<ApiResponse<AlertListResponse>> => {
    return apiClient.get('/alerts', {
      params: {
        page: filters.page + 1,
        limit: filters.rowsPerPage,
        search: filters.search || undefined,
        severity: filters.severity?.join(','),
        deviceId: filters.deviceId,
        sensorId: filters.sensorId,
        read: filters.read,
      },
    });
  },

  getRecentAlerts: async (limit: number = 5): Promise<ApiResponse<Alert[]>> => {
    return apiClient.get('/alerts/recent', {
      params: { limit },
    });
  },

  getAlert: async (id: string): Promise<ApiResponse<Alert>> => {
    return apiClient.get(`/alerts/${id}`);
  },

  markAsRead: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.put(`/alerts/${id}/read`);
  },

  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    return apiClient.put('/alerts/read-all');
  },

  deleteAlert: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/alerts/${id}`);
  },
}; 