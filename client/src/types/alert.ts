export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  deviceId?: string;
  sensorId?: string;
  read: boolean;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertListResponse {
  alerts: Alert[];
  totalCount: number;
}

export interface AlertListFilters {
  page: number;
  rowsPerPage: number;
  search?: string;
  severity?: ('info' | 'warning' | 'error')[];
  deviceId?: string;
  sensorId?: string;
  read?: boolean;
} 