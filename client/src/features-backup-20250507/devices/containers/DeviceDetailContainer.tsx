import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DeviceDetailView from '../components/DeviceDetailView';
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

const DeviceDetailContainer: React.FC = () => {
  const navigate = useNavigate();
  const { deviceId } = useParams<{ deviceId: string }>();

  const { data: device, isLoading, error } = useQuery<Device, Error>({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      const response = await apiClient.get(`/devices/${deviceId}`);
      return response.data;
    },
    enabled: !!deviceId,
  });

  const handleBack = () => {
    navigate('/devices');
  };

  const handleEdit = (id: string) => {
    navigate(`/devices/${id}/edit`);
  };

  return (
    <DeviceDetailView
      device={device}
      isLoading={isLoading}
      error={error?.message}
      onBack={handleBack}
      onEdit={handleEdit}
    />
  );
};

export default DeviceDetailContainer; 