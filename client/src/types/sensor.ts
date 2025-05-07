export interface Sensor {
  id: string;
  name: string;
  type: string;
  deviceId: string;
  location: string;
  status: 'active' | 'inactive' | 'error';
  lastReading?: number;
  unit?: string;
  minThreshold?: number;
  maxThreshold?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SensorStats {
  total: number;
  active: number;
  inactive: number;
  alerts: number;
}

export interface SensorListResponse {
  sensors: Sensor[];
  totalCount: number;
}

export interface SensorListFilters {
  page: number;
  rowsPerPage: number;
  search?: string;
  deviceId?: string;
  status?: ('active' | 'inactive' | 'error')[];
} 