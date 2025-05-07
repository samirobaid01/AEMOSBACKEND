import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socketService';
import apiClient from '../utils/api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../../../shared/types/models';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationEvent {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  // Calculate unread count
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // Fetch notifications on auth change
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, user]);

  // Setup socket listeners for real-time notifications
  useEffect(() => {
    if (isAuthenticated) {
      // Listen for new notifications
      socketService.on('notification', handleNewNotification);
      
      // Listen for specific event types that should create notifications
      socketService.on('device-status', handleDeviceStatusEvent);
      socketService.on('sensor-alert', handleSensorAlertEvent);
      socketService.on('system', handleSystemEvent);
      
      return () => {
        // Clean up listeners
        socketService.off('notification', handleNewNotification);
        socketService.off('device-status', handleDeviceStatusEvent);
        socketService.off('sensor-alert', handleSensorAlertEvent);
        socketService.off('system', handleSystemEvent);
      };
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
        'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewNotification = (data: NotificationEvent) => {
    // Create a notification object from the event
    const notification: Notification = {
      id: data.id,
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
      createdAt: data.timestamp
    };
    
    // Add to state
    setNotifications(prev => [notification, ...prev]);
    
    // Also show a browser notification if supported
    showBrowserNotification(notification);
  };

  const handleDeviceStatusEvent = (data: any) => {
    if (!user) return;
    
    // Create notification for device status change
    const notification: Notification = {
      id: `device-${data.deviceId}-${Date.now()}`,
      userId: user.id,
      title: 'Device Status Changed',
      message: `Device ${data.deviceName} is now ${data.newStatus}`,
      type: data.newStatus === 'online' ? 'success' : 
            data.newStatus === 'offline' ? 'error' : 'warning',
      read: false,
      createdAt: data.timestamp || new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev]);
    showBrowserNotification(notification);
  };

  const handleSensorAlertEvent = (data: any) => {
    if (!user) return;
    
    // Create notification for sensor alert
    const notification: Notification = {
      id: `sensor-${data.sensorId}-${Date.now()}`,
      userId: user.id,
      title: 'Sensor Alert',
      message: data.message || `Sensor value ${data.value} exceeds threshold ${data.threshold}`,
      type: data.alertType === 'threshold-exceeded' ? 'warning' : 'error',
      read: false,
      createdAt: data.timestamp || new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev]);
    showBrowserNotification(notification);
  };

  const handleSystemEvent = (data: any) => {
    if (!user) return;
    
    // Create notification for system event
    const notification: Notification = {
      id: `system-${Date.now()}`,
      userId: user.id,
      title: 'System Notification',
      message: data.message,
      type: data.type === 'maintenance' ? 'info' : 
            data.severity === 'critical' ? 'error' : 'warning',
      read: false,
      createdAt: data.timestamp || new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev]);
    showBrowserNotification(notification);
  };

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setError(null);
      
      // Update in backend
      await apiClient.put(`/notifications/${notificationId}/read`);
      
      // Update locally
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
        'Failed to mark notification as read';
      setError(errorMessage);
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setError(null);
      
      // Update in backend
      await apiClient.put('/notifications/read-all');
      
      // Update locally
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
        'Failed to mark all notifications as read';
      setError(errorMessage);
      console.error('Error marking all notifications as read:', err);
    }
  };

  const removeNotification = async (notificationId: string) => {
    try {
      setError(null);
      
      // Delete from backend
      await apiClient.delete(`/notifications/${notificationId}`);
      
      // Update locally
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
        'Failed to remove notification';
      setError(errorMessage);
      console.error('Error removing notification:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        removeNotification,
        loading,
        error
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 