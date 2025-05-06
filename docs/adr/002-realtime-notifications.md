# ADR 002: Real-time Notifications with Socket.io

## Status
Accepted

## Date
2023-05-07

## Context
AEMOS requires real-time notifications for environmental monitoring alerts, device status changes, and user interactions. We need a reliable, scalable solution for delivering real-time updates to connected clients that works well with our modular monolithic architecture.

## Decision
We will implement real-time notifications using Socket.io with a room-based targeting system.

Key components:
1. Backend Socket.io server integrated with Express
2. Frontend Socket.io client with reconnection handling
3. Room-based subscription model for targeted notifications
4. Multi-channel delivery (socket, email, SMS) with consistent API

## Consequences

### Positive
- WebSocket protocol with fallback options ensures reliable delivery
- Room-based targeting allows efficient message routing
- Consistent API for multi-channel notifications simplifies usage
- Built-in reconnection handling improves reliability
- Socket.io scales horizontally with Redis adapter (future option)

### Negative
- Adds complexity to system architecture
- Requires managing socket connections and authentication
- May increase server resource usage compared to polling
- Client must handle reconnection scenarios

## Implementation Details

### Backend
- Socket.io server initialized with HTTP server in `server.js`
- Socket manager utility for handling connections and events
- Notification service with socket, email, and SMS channels
- Room-based targeting (users, organizations, areas, devices)

### Frontend
- Socket.io client connecting to backend
- Socket service handling connection lifecycle
- Event system for reacting to notifications
- Room joining based on user context

### Security
- JWT authentication for socket connections
- Validation of room subscriptions
- Rate limiting for socket connections and events

### Scalability
- Room-based targeting for efficient message routing
- Future option to add Redis adapter for horizontal scaling 