# AEMOS API Overview

This document outlines the API contracts and boundaries between the frontend and backend components of the AEMOS platform.

## API Design Principles

1. **RESTful Design**: The API follows REST principles with resource-based URLs and appropriate HTTP methods
2. **JSON Payloads**: All requests and responses use JSON format
3. **JWT Authentication**: Protected endpoints require a valid JWT token
4. **Consistent Response Format**: All responses follow a consistent structure
5. **Versioning**: API routes are versioned (`/api/v1/...`)
6. **Input Validation**: All endpoints validate input data and return appropriate error messages
7. **Rate Limiting**: To prevent abuse, API requests are rate-limited
8. **Pagination**: List endpoints support pagination for large data sets

## Authentication

### Authentication Flow

1. **Login**: `POST /api/v1/auth/login`
2. **Registration**: `POST /api/v1/auth/signup`
3. **Token Refresh**: `POST /api/v1/auth/refresh-token`
4. **Logout**: `POST /api/v1/auth/logout`

### JWT Token Format

Tokens include the following claims:
- `sub`: User ID
- `role`: User role
- `org`: Organization ID
- `exp`: Expiration timestamp
- `iat`: Issued-at timestamp

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "count": 10,
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

## API Resources

### Organizations

- `GET /api/v1/organizations` - List organizations
- `GET /api/v1/organizations/:id` - Get organization details
- `POST /api/v1/organizations` - Create organization
- `PUT /api/v1/organizations/:id` - Update organization
- `DELETE /api/v1/organizations/:id` - Delete organization
- `GET /api/v1/organizations/:id/users` - List organization users
- `POST /api/v1/organizations/:id/users` - Add user to organization

### Areas

- `GET /api/v1/areas` - List areas
- `GET /api/v1/areas/:id` - Get area details
- `POST /api/v1/areas` - Create area
- `PUT /api/v1/areas/:id` - Update area
- `DELETE /api/v1/areas/:id` - Delete area
- `GET /api/v1/areas/:id/devices` - List area devices
- `GET /api/v1/areas/:id/sensors` - List area sensors

### Devices

- `GET /api/v1/devices` - List devices
- `GET /api/v1/devices/:id` - Get device details
- `POST /api/v1/devices` - Register device
- `PUT /api/v1/devices/:id` - Update device
- `DELETE /api/v1/devices/:id` - Delete device
- `GET /api/v1/devices/:id/sensors` - List device sensors
- `GET /api/v1/devices/:id/telemetry` - Get device telemetry data

### Sensors

- `GET /api/v1/sensors` - List sensors
- `GET /api/v1/sensors/:id` - Get sensor details
- `POST /api/v1/sensors` - Create sensor
- `PUT /api/v1/sensors/:id` - Update sensor
- `DELETE /api/v1/sensors/:id` - Delete sensor
- `GET /api/v1/sensors/:id/telemetry` - Get sensor telemetry data
- `POST /api/v1/sensors/:id/thresholds` - Set sensor thresholds

### Users

- `GET /api/v1/users` - List users
- `GET /api/v1/users/:id` - Get user details
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update current user profile

### Notifications

- `GET /api/v1/notifications` - List notifications
- `PUT /api/v1/notifications/:id/read` - Mark notification as read
- `PUT /api/v1/notifications/read-all` - Mark all notifications as read
- `DELETE /api/v1/notifications/:id` - Delete notification

## WebSocket Events

In addition to the REST API, real-time events are delivered via WebSocket.

### Connection

- Client connects to the server's socket.io endpoint
- Authentication is performed using the JWT token
- Client joins rooms based on user context (user ID, org ID, etc.)

### Events from Server to Client

- `notification` - Generic notification
- `device-status` - Device status changes
- `sensor-alert` - Sensor threshold alerts
- `system` - System-wide notifications

### Events from Client to Server

- `join` - Join notification rooms
- `acknowledge` - Acknowledge receipt of a notification

## Type Definitions

Type definitions for requests and responses are shared between frontend and backend via the `/shared/types` directory, ensuring consistent data structures across the application.

See `shared/types/models.ts` for detailed type definitions. 