import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sensorService } from '../services/api/sensorService';
import type { Sensor, SensorListFilters } from '../types/sensor';

export const useSensors = (filters: SensorListFilters) => {
  const queryClient = useQueryClient();

  const {
    data: sensors,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sensors', filters],
    queryFn: () => sensorService.getSensors(filters),
  });

  const addSensor = useMutation({
    mutationFn: sensorService.createSensor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
    },
  });

  const updateSensor = useMutation({
    mutationFn: ({ id, sensor }: { id: string; sensor: Partial<Sensor> }) =>
      sensorService.updateSensor(id, sensor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
    },
  });

  const deleteSensor = useMutation({
    mutationFn: sensorService.deleteSensor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
    },
  });

  return {
    sensors,
    isLoading,
    error,
    addSensor,
    updateSensor,
    deleteSensor,
  };
}; 