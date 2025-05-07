export interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  location: string;
  lastConnection: string;
  sensors: number;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  warning: number;
}

export interface DeviceListResponse {
  devices: Device[];
  totalCount: number;
}

export interface DeviceListFilters {
  page: number;
  rowsPerPage: number;
  search: string;
} 