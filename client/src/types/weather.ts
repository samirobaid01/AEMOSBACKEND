export interface WeatherData {
  temperature: string;
  humidity: string;
  conditions: string;
  forecast: string;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  lastUpdated: string;
}

export interface WeatherError {
  message: string;
  code: string;
} 