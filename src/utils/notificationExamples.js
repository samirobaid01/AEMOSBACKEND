/**
 * Examples of how to use the notification service in different contexts
 * Note: This file is for documentation purposes only and not used in production
 */

const notificationService = require('../services/notificationService');

/**
 * Example: Sensor threshold alert
 * 
 * This example shows how to send an alert when a sensor value exceeds a threshold
 */
async function sensorThresholdExceeded(sensorData, threshold, organization, area, device) {
  // Prepare notification data
  const notificationData = {
    message: `Sensor ${sensorData.sensorName} value ${sensorData.value} exceeds threshold ${threshold}`,
    event: 'sensor-alert',
    data: {
      sensorId: sensorData.sensorId,
      value: sensorData.value,
      threshold: threshold,
      deviceId: device.id,
      areaId: area.id,
      organizationId: organization.id,
      timestamp: new Date(),
      alertType: 'threshold-exceeded'
    },
    // Target all relevant stakeholders
    targets: [
      `user-${organization.ownerId}`,     // Organization admin
      `area-${area.id}`,                  // All users monitoring this area
      `device-${device.id}`,              // All users monitoring this device
      `org-${organization.id}`            // All organization members
    ],
    // Send via all available channels if critical
    socket: true,                          // Realtime socket notification
    email: sensorData.value > threshold * 1.5, // Email only if significantly above threshold
    sms: sensorData.value > threshold * 2   // SMS only if critical
  };
  
  // Send the notification
  const result = await notificationService.sendNotification(notificationData);
  return result;
}

/**
 * Example: Device status change notification
 * 
 * This example shows how to notify users when a device goes offline
 */
async function deviceStatusChanged(device, oldStatus, newStatus, organization) {
  // Get users who should be notified
  const deviceAdmins = await getDeviceAdmins(device.id); // This would be your function to get relevant users
  
  // Prepare common notification data
  const isOffline = newStatus === 'offline';
  const message = `Device ${device.name} is now ${newStatus}`;
  
  // Send individual notifications to each admin
  for (const admin of deviceAdmins) {
    await notificationService.sendNotification({
      user: admin,
      message,
      event: 'device-status',
      data: {
        deviceId: device.id,
        oldStatus,
        newStatus,
        timestamp: new Date()
      },
      socket: true,       // Always send via socket
      email: isOffline,   // Email only if device went offline
      sms: false          // No SMS for status changes
    });
  }
  
  // Also broadcast to all users monitoring this organization
  return notificationService.sendSocketNotification(
    `org-${organization.id}`,
    'device-status',
    {
      deviceId: device.id,
      deviceName: device.name,
      oldStatus,
      newStatus,
      timestamp: new Date()
    }
  );
}

/**
 * Example: System notification
 * 
 * This example shows how to send a system-wide notification to all users
 */
function systemMaintenance(maintenanceInfo) {
  return notificationService.sendNotification({
    message: `System maintenance scheduled: ${maintenanceInfo.description}`,
    event: 'system',
    data: {
      type: 'maintenance',
      startTime: maintenanceInfo.startTime,
      endTime: maintenanceInfo.endTime,
      affectedServices: maintenanceInfo.services,
      severity: maintenanceInfo.severity
    },
    // No specific targets = broadcast to all
    socket: true,
    // No user object provided = no email/SMS
  });
}

/**
 * Example: User notification
 * 
 * This example shows how to send a targeted notification to a specific user
 */
function userAccountUpdated(user, changedFields) {
  return notificationService.sendNotification({
    user,
    message: `Your account information has been updated: ${changedFields.join(', ')}`,
    event: 'account-update',
    data: {
      updatedFields: changedFields,
      timestamp: new Date()
    },
    // Only send to this specific user
    targets: `user-${user.id}`,
    socket: true,
    email: user.notifyByEmail,
    sms: false
  });
}

module.exports = {
  sensorThresholdExceeded,
  deviceStatusChanged,
  systemMaintenance,
  userAccountUpdated
}; 