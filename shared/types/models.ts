/**
 * Shared type definitions for AEMOS models
 * These types are used across both frontend and backend
 */

export interface User {
  id: string;
  userName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isActive: boolean;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  notifyByEmail?: boolean;
  notifyBySMS?: boolean;
  lastLogin?: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  timezone?: string;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  name: string;
  description?: string;
  type: string;
  serialNumber?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastConnection?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sensor {
  id: string;
  name: string;
  description?: string;
  deviceId: string;
  type: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  alarmThresholdMin?: number;
  alarmThresholdMax?: number;
  warningThresholdMin?: number;
  warningThresholdMax?: number;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryData {
  id: string;
  sensorId: string;
  value: number;
  timestamp: string;
  status?: 'normal' | 'warning' | 'alarm';
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUser {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedToId?: string;
  organizationId: string;
  createdById: string;
  deviceId?: string;
  sensorId?: string;
  areaId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
} 