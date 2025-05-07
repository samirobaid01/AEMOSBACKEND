import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DeviceListFilters } from '../../types/device';
import { useDevices } from '../../hooks/useDevices';
import { DeviceList } from '../../components/devices/DeviceList';

export const DeviceListContainer: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DeviceListFilters>({
    page: 0,
    rowsPerPage: 10,
    search: '',
  });

  const {
    devices,
    totalCount,
    isLoading,
    error,
    deleteDevice,
  } = useDevices(filters);

  const handlePageChange = (_: unknown, newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      page: 0,
      rowsPerPage: parseInt(event.target.value, 10),
    }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      page: 0,
      search: event.target.value,
    }));
  };

  const handleDeviceClick = (id: string) => {
    navigate(`/devices/${id}`);
  };

  const handleAddDevice = () => {
    navigate('/devices/new');
  };

  const handleEditDevice = (id: string) => {
    navigate(`/devices/${id}/edit`);
  };

  const handleDeleteDevice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await deleteDevice.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting device:', error);
        alert('Failed to delete device. Please try again.');
      }
    }
  };

  return (
    <DeviceList
      devices={devices}
      totalCount={totalCount}
      filters={filters}
      isLoading={isLoading}
      error={error}
      onPageChange={handlePageChange}
      onRowsPerPageChange={handleRowsPerPageChange}
      onSearchChange={handleSearchChange}
      onRefresh={() => setFilters(prev => ({ ...prev }))}
      onDeviceClick={handleDeviceClick}
      onAddDevice={handleAddDevice}
      onEditDevice={handleEditDevice}
      onDeleteDevice={handleDeleteDevice}
    />
  );
}; 