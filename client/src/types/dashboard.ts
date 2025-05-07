export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  warning: number;
}

export interface SensorStats {
  total: number;
  active: number;
  inactive: number;
  alerting: number;
}

export interface WeatherData {
  temperature: string;
  humidity: string;
  conditions: string;
  forecast: string;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'error';
}

export type WeatherError = {
  code: string;
  message: string;
}; 