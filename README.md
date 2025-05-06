# 🌿 AEMOS – Automated Environmental Monitoring & Operations System

## Overview

**AEMOS** is a real-time monitoring and control system designed for **smart hydroponic and aquaponic farming**. It enables growers and agricultural organizations to remotely monitor environmental parameters, control devices, receive automated alerts, and manage operational tasks efficiently.

This system is built to support **multi-organization setups**, allowing scalability across farms, greenhouses, or research facilities with hierarchical control and access.

---

## 🌱 Key Features

- **Real-Time Monitoring** of sensors (e.g., pH, EC, temperature, humidity, water level)
- **Device Control** for pumps, lights, fans, heaters, etc.
- **Rule-Based Notifications** and automated alerts
- **Telemetry Data Logging** for analysis and optimization
- **User & Role Management** with organization-level access control
- **Ticketing System** for issue tracking and farm management
- **Multi-Area Configuration** within each organization
- **Mobile & Web Integration Ready**

---

## 🛠 Tech Stack (Planned / Partial)

- **Backend**: MySQL (Schema provided), Node.js / FastAPI
- **Frontend**: React
- **APIs**: REST or GraphQL
- **Deployment**: Docker, AWS
- **IoT Integration**: MQTT, HTTP/WebSockets for device communication (future milestone)

---

## 📂 Current Contents

This repository currently includes:

- 💾 **SQL schema** for the complete backend data model
- 🧩 **Entity relationships** including Users, Devices, Sensors, Areas, Organizations
- 🔐 Foundations for access control and multi-tenancy

---

## 🚧 Project Status

This is an active, work-in-progress project. Contributions and feedback are welcome as we expand to full-stack development.

---

## 📌 Use Case

Ideal for:

- Hydroponic and aquaponic farms
- Urban agriculture systems
- Research labs and greenhouses
- Scalable agri-tech platforms

---

## 📫 Contact / Collaboration

For collaboration, queries, or suggestions, please open an issue or reach out via GitHub.

---

## License

This project is open-source and available under the [MIT License](LICENSE).

# AEMOS Backend API

A state-of-the-art RESTful API for the AEMOS platform, providing endpoints to manage devices, organizations, users, sensors, and more.

## Technologies Used

- **Node.js & Express**: Fast, unopinionated, minimalist web framework for Node.js
- **Sequelize ORM**: Modern ORM for MySQL, providing robust data modeling and associations
- **MySQL**: Relational database for storing application data
- **JWT Authentication**: Secure authentication and authorization
- **Error Handling**: Custom error handling middleware
- **Logging**: Winston logger for application monitoring
- **Validation**: Joi validation for request data
- **Testing**: Jest & Supertest for unit and integration testing
- **Code Quality**: ESLint & Prettier for code formatting and linting
- **Real-time Notifications**: Socket.io for instant notifications and alerts

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL server

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/samirobaid01/AEMOSBACKEND.git
   cd AEMOSBACKEND
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
/
├── src/
│   ├── server.js             # Entry point that launches Express app
│   ├── app.js                # Configures middleware, routes, error handling
│   ├── config/               # Environment variables and configuration
│   ├── models/               # Sequelize model definitions
│   ├── repositories/         # Data access layer
│   ├── services/             # Business logic
│   ├── controllers/          # Route handlers
│   ├── routes/               # API route definitions
│   ├── middlewares/          # Custom middlewares
│   └── utils/                # Utility functions
├── migrations/               # Database migrations
├── seeders/                  # Database seeds
└── tests/                    # Test files
```

## API Documentation

The API provides endpoints for:

- Authentication (login, register, refresh token)
- User management
- Organization management
- Device management
- Sensor data
- Areas and locations
- Notifications and tickets

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Real-time Notifications

The API uses Socket.io for real-time communication, allowing for instant notifications and alerts.

### Socket Client Connection

```javascript
// Client-side example (using socket.io-client)
const socket = io('http://localhost:3000');

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // Handle notification (e.g., display toast, update UI)
});

// Listen for specific event types
socket.on('alert', (data) => {
  console.log('New alert:', data);
  // Handle alert (e.g., display warning dialog)
});

// Join rooms for targeted notifications
socket.emit('join', [userId, orgId, areaId]);
```

### Notification Types

The system supports various notification types:

- **System notifications**: Server status, maintenance alerts
- **Device alerts**: Threshold exceeded, device offline
- **User events**: Account updates, permission changes
- **Organization events**: New users, configuration changes

### Server Implementation

The notification system is implemented with a flexible architecture:

- **Centralized notification service**: Send notifications through multiple channels (socket, email, SMS)
- **Room-based targeting**: Notifications can target specific users, organizations, or areas
- **Multi-channel support**: Notifications can be sent through any combination of channels

## Running Tests

```bash
npm test                 # Run all tests
npm test:unit            # Run unit tests
npm test:integration     # Run integration tests
```

## License

This project is licensed under the ISC License.
