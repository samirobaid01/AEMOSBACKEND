import React from 'react';
import { useNavigate } from 'react-router-dom';
import DeviceListView from '../../../components/devices/DeviceListView';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  description?: string;
  location?: string;
  firmware?: string;
  ipAddress?: string;
  macAddress?: string;
}

const DeviceListContainer: React.FC = () => {
  const navigate = useNavigate();

  const { data: devices = [], isLoading, error } = useQuery<Device[], Error>({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await apiClient.get('/devices');
      return response.data;
    }
  });

  const handleViewDevice = (id: string) => {
    navigate(`/devices/${id}`);
  };

  const handleEditDevice = (id: string) => {
    navigate(`/devices/${id}/edit`);
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      await apiClient.delete(`/devices/${id}`);
      // Optionally invalidate and refetch
      // queryClient.invalidateQueries(['devices']);
    } catch (error) {
      console.error('Failed to delete device:', error);
    }
  };

  return (
    <DeviceListView
      devices={devices}
      isLoading={isLoading}
      error={error?.message}
      onViewDevice={handleViewDevice}
      onEditDevice={handleEditDevice}
      onDeleteDevice={handleDeleteDevice}
    />
  );
};

export default DeviceListContainer; 