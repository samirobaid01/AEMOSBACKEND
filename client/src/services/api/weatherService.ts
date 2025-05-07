import type { WeatherData } from '../../types/weather';
import type { ApiResponse } from '../../types/api';
import apiClient from '../../utils/api/apiClient';

export const weatherService = {
  getCurrentWeather: async (latitude: number, longitude: number): Promise<ApiResponse<WeatherData>> => {
    return apiClient.get('/weather/current', {
      params: { latitude, longitude },
    });
  },

  getForecast: async (latitude: number, longitude: number, days: number = 3): Promise<ApiResponse<WeatherData>> => {
    return apiClient.get('/weather/forecast', {
      params: { latitude, longitude, days },
    });
  },
}; 