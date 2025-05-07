import { useQuery } from '@tanstack/react-query';
import { weatherService } from '../services/api/weatherService';

interface UseWeatherOptions {
  latitude: number;
  longitude: number;
  days?: number;
}

export const useWeather = ({ latitude, longitude, days = 3 }: UseWeatherOptions) => {
  const {
    data: currentWeather,
    isLoading: isLoadingCurrent,
    error: currentError,
  } = useQuery({
    queryKey: ['currentWeather', latitude, longitude],
    queryFn: () => weatherService.getCurrentWeather(latitude, longitude),
  });

  const {
    data: forecast,
    isLoading: isLoadingForecast,
    error: forecastError,
  } = useQuery({
    queryKey: ['forecast', latitude, longitude, days],
    queryFn: () => weatherService.getForecast(latitude, longitude, days),
  });

  return {
    currentWeather,
    forecast,
    isLoading: isLoadingCurrent || isLoadingForecast,
    error: currentError || forecastError,
  };
}; 