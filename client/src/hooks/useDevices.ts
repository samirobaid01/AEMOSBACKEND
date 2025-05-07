import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Device, DeviceListFilters } from '../types/device';
import { deviceService } from '../services/api/deviceService';

export const useDevices = (filters: DeviceListFilters) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['devices', filters],
    queryFn: () => deviceService.getDevices(filters),
  });

  const addDevice = useMutation({
    mutationFn: deviceService.createDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const updateDevice = useMutation({
    mutationFn: ({ id, device }: { id: string; device: Partial<Device> }) =>
      deviceService.updateDevice(id, device),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const deleteDevice = useMutation({
    mutationFn: deviceService.deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  return {
    devices: data?.data.devices || [],
    totalCount: data?.data.totalCount || 0,
    isLoading,
    error,
    addDevice,
    updateDevice,
    deleteDevice,
  };
}; 