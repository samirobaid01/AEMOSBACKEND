import type { Device, DeviceStats, DeviceListResponse, DeviceListFilters } from '../../types/device';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import apiClient from '../../utils/api/apiClient';

export const deviceService = {
  getDevices: async (filters: DeviceListFilters): Promise<ApiResponse<DeviceListResponse>> => {
    return apiClient.get('/devices', {
      params: {
        page: filters.page + 1,
        limit: filters.rowsPerPage,
        search: filters.search || undefined,
      },
    });
  },

  getDevice: async (id: string): Promise<ApiResponse<Device>> => {
    return apiClient.get(`/devices/${id}`);
  },

  getDeviceStats: async (): Promise<ApiResponse<DeviceStats>> => {
    return apiClient.get('/devices/stats');
  },

  createDevice: async (device: Omit<Device, 'id'>): Promise<ApiResponse<Device>> => {
    return apiClient.post('/devices', device);
  },

  updateDevice: async (id: string, device: Partial<Device>): Promise<ApiResponse<Device>> => {
    return apiClient.put(`/devices/${id}`, device);
  },

  deleteDevice: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/devices/${id}`);
  },

  getDeviceSensors: async (deviceId: string): Promise<ApiResponse<PaginatedResponse<Device>>> => {
    return apiClient.get(`/devices/${deviceId}/sensors`);
  },
}; 