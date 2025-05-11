# Socket Broadcast Configuration

This document explains the socket broadcast configuration options for the AEMOS backend.

## Global Broadcast Toggle

The AEMOS system now supports a configurable option to enable or disable global socket broadcasts. This feature helps optimize performance by reducing unnecessary socket messages when global broadcasts are not needed.

### Configuration

The `broadcastAll` flag is controlled by an environment variable:

```
ENABLE_BROADCAST_ALL=true|false
```

By default, this feature is disabled (`false`). When disabled, the system will:

1. Only send notifications to specific rooms/targets
2. Skip global broadcasts to all connected clients
3. Still maintain target-specific notifications

### Usage

#### In Controllers

When sending notifications from controllers:

```javascript
// Will respect the broadcastAll configuration
notificationManager.queueDataStreamNotification(dataStream, 'normal');

// Force global broadcast regardless of configuration
notificationManager.queueDataStreamNotification(dataStream, 'normal', true);

// For immediate notifications
notificationManager.sendImmediateNotification(dataStream, true); // Force broadcast
```

#### In Services

When using the notification service:

```javascript
// Will respect the broadcastAll configuration
notificationService.sendSocketNotification(userId, 'event-name', data);

// Force broadcast regardless of configuration
notificationService.sendSocketNotification(userId, 'event-name', data, true);
```

### Performance Considerations

- Enabling `broadcastAll` will increase the number of socket messages sent to clients
- In high-throughput scenarios, consider disabling this feature
- For development and testing, it's often useful to enable this feature

### Throttling and Buffering

The notification system includes built-in throttling and buffering to prevent overwhelming clients:

- Notifications are buffered by telemetry ID
- Batched notifications are sent at configurable intervals
- High-priority notifications can bypass the buffer

## Configuration Options

All notification settings can be found in `src/config/features.js` under the `notifications` section:

```javascript
notifications: {
  broadcastAll: process.env.ENABLE_BROADCAST_ALL === 'true',
  bufferSize: parseInt(process.env.NOTIFICATION_BUFFER_SIZE || 1000, 10),
  broadcastInterval: parseInt(process.env.NOTIFICATION_INTERVAL || 1000, 10)
}
``` 