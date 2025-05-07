import type { Sensor, SensorListResponse, SensorListFilters } from '../../types/sensor';
import type { ApiResponse } from '../../types/api';
import apiClient from '../../utils/api/apiClient';

export const sensorService = {
  getSensors: async (filters: SensorListFilters): Promise<ApiResponse<SensorListResponse>> => {
    return apiClient.get('/sensors', {
      params: {
        page: filters.page + 1,
        limit: filters.rowsPerPage,
        search: filters.search || undefined,
        status: filters.status?.join(','),
        deviceId: filters.deviceId,
      },
    });
  },

  getSensor: async (id: string): Promise<ApiResponse<Sensor>> => {
    return apiClient.get(`/sensors/${id}`);
  },

  createSensor: async (sensor: Omit<Sensor, 'id'>): Promise<ApiResponse<Sensor>> => {
    return apiClient.post('/sensors', sensor);
  },

  updateSensor: async (id: string, sensor: Partial<Sensor>): Promise<ApiResponse<Sensor>> => {
    return apiClient.put(`/sensors/${id}`, sensor);
  },

  deleteSensor: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/sensors/${id}`);
  },
}; 