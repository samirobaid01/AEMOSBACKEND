const express = require('express');
const deviceRoutes = require('./deviceRoutes');
const organizationRoutes = require('./organizationRoutes');
const areaRoutes = require('./areaRoutes');
const sensorRoutes = require('./sensorRoutes');
const telemetryRoutes = require('./telemetryRoutes');
const dataStreamRoutes = require('./dataStreamRoutes');
const authRoutes = require('./authRoutes');
const sequelize = require('../config/database');

const router = express.Router();

// Middleware to restrict routes to localhost only
const localhostOnly = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('localhost');
  
  // Allow access only from localhost and in development environment
  if ((isLocalhost || process.env.NODE_ENV === 'development') && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'This endpoint is restricted to localhost only'
  });
};

// Basic health check route
router.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date(),
    services: {
      database: { status: 'checking' }
    }
  };
  
  try {
    await sequelize.authenticate();
    checks.services.database.status = 'ok';
  } catch (error) {
    checks.services.database.status = 'error';
    checks.services.database.message = error.message;
    checks.status = 'error';
  }
  
  const statusCode = checks.status === 'ok' ? 200 : 500;
  res.status(statusCode).json(checks);
});

router.get('/health/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Insomnia export endpoint - localhost only
router.get('/insomnia', localhostOnly, (req, res) => {
  // Base URL for the API
  const baseUrl = '/api/v1';
  
  const routes = {
    auth: [
      { 
        method: 'POST', 
        path: '/auth/login', 
        description: 'Login and get JWT token', 
        auth: false,
        params: {
          email: "user@example.com",
          password: "password123"
        }
      },
      {
        method: 'POST',
        path: '/auth/signup',
        description: 'Create a new user account',
        auth: false,
        params: {
          userName: "John Doe",
          email: "user@example.com",
          password: "password123",
          phoneNumber: "1234567890",
          notifyByEmail: true,
          notifyBySMS: false,
          notifyByMessage: false,
          smsNumber: "1234567890",
          detail: "User details",
          termsAndConditions: true,
          notifyUser: true
        }
      },
      { 
        method: 'POST', 
        path: '/auth/refresh-token', 
        description: 'Refresh access token using refresh token', 
        auth: false,
        params: {
          refreshToken: "your_refresh_token_here"
        } 
      },
      { 
        method: 'POST', 
        path: '/auth/logout', 
        description: 'Logout and invalidate token', 
        auth: true 
      },
      { 
        method: 'GET', 
        path: '/auth/me', 
        description: 'Get current user information', 
        auth: true 
      },
    ],
    organizations: [
      { 
        method: 'GET', 
        path: '/organizations', 
        description: 'Get all organizations', 
        auth: true 
      },
      { 
        method: 'POST', 
        path: '/organizations', 
        description: 'Create a new organization', 
        auth: true,
        params: {
          name: "Organization Name",
          parentId: null,
          status: true,
          detail: "Organization details",
          paymentMethods: "Credit Card, PayPal",
          image: "example-logo-url",
          address: "123 Main St, City, Country",
          zip: "12345",
          email: "org@example.com",
          isParent: true,
          contactNumber: "123-456-7890"
        }
      },
      { 
        method: 'GET', 
        path: '/organizations/:id', 
        description: 'Get organization by ID', 
        auth: true 
      },
      { 
        method: 'PATCH', 
        path: '/organizations/:id', 
        description: 'Update organization', 
        auth: true,
        params: {
          name: "Updated Organization Name",
          status: true,
          detail: "Updated details"
        }
      },
      { 
        method: 'DELETE', 
        path: '/organizations/:id', 
        description: 'Delete organization', 
        auth: true 
      },
    ],
    areas: [
      { 
        method: 'GET', 
        path: '/areas', 
        description: 'Get all areas', 
        auth: true 
      },
      { 
        method: 'POST', 
        path: '/areas', 
        description: 'Create a new area', 
        auth: true,
        params: {
          name: "Area Name",
          organizationId: 1,
          description: "Area description",
          status: true
        }
      },
      { 
        method: 'GET', 
        path: '/areas/:id', 
        description: 'Get area by ID', 
        auth: true 
      },
      { 
        method: 'PATCH', 
        path: '/areas/:id', 
        description: 'Update area', 
        auth: true,
        params: {
          name: "Updated Area Name",
          description: "Updated description",
          status: true
        }
      },
      { 
        method: 'DELETE', 
        path: '/areas/:id', 
        description: 'Delete area', 
        auth: true 
      },
      { 
        method: 'GET', 
        path: '/areas/organization/:organizationId', 
        description: 'Get areas by organization', 
        auth: true 
      },
    ],
    sensors: [
      { 
        method: 'GET', 
        path: '/sensors', 
        description: 'Get all sensors', 
        auth: true 
      },
      { 
        method: 'POST', 
        path: '/sensors', 
        description: 'Create a new sensor', 
        auth: true,
        params: {
          name: "Sensor Name",
          areaId: 1,
          type: "Temperature",
          status: true,
          description: "Sensor description",
          metadata: {
            range: "-40C to 80C",
            precision: "0.1C"
          }
        }
      },
      { 
        method: 'GET', 
        path: '/sensors/:id', 
        description: 'Get sensor by ID', 
        auth: true 
      },
      { 
        method: 'PATCH', 
        path: '/sensors/:id', 
        description: 'Update sensor', 
        auth: true,
        params: {
          name: "Updated Sensor Name",
          type: "Temperature",
          status: true,
          description: "Updated description"
        }
      },
      { 
        method: 'DELETE', 
        path: '/sensors/:id', 
        description: 'Delete sensor', 
        auth: true 
      },
    ],
    telemetry: [
      { 
        method: 'GET', 
        path: '/telemetry', 
        description: 'Get all telemetry data', 
        auth: true 
      },
      { 
        method: 'POST', 
        path: '/telemetry', 
        description: 'Create telemetry data', 
        auth: true,
        params: {
          variableName: "temperature",
          datatype: "float",
          sensorId: 1
        }
      },
      { 
        method: 'GET', 
        path: '/telemetry/:id', 
        description: 'Get telemetry data by ID', 
        auth: true 
      },
      { 
        method: 'PATCH', 
        path: '/telemetry/:id', 
        description: 'Update telemetry data', 
        auth: true,
        params: {
          variableName: "updatedTemperature",
          datatype: "float"
        }
      },
      { 
        method: 'DELETE', 
        path: '/telemetry/:id', 
        description: 'Delete telemetry data', 
        auth: true 
      },
      { 
        method: 'GET', 
        path: '/telemetry/sensor/:sensorId', 
        description: 'Get telemetry by sensor ID', 
        auth: true 
      },
    ],
    datastreams: [
      { 
        method: 'GET', 
        path: '/datastreams', 
        description: 'Get all data streams', 
        auth: true 
      },
      { 
        method: 'POST', 
        path: '/datastreams', 
        description: 'Create a new data stream', 
        auth: true,
        params: {
          value: "25.6",
          telemetryDataId: 1,
          recievedAt: new Date().toISOString()
        }
      },
      { 
        method: 'GET', 
        path: '/datastreams/:id', 
        description: 'Get data stream by ID', 
        auth: true 
      },
      { 
        method: 'PATCH', 
        path: '/datastreams/:id', 
        description: 'Update data stream', 
        auth: true,
        params: {
          value: "26.1"
        }
      },
      { 
        method: 'DELETE', 
        path: '/datastreams/:id', 
        description: 'Delete data stream', 
        auth: true 
      },
      { 
        method: 'GET', 
        path: '/datastreams/telemetry/:telemetryDataId', 
        description: 'Get data streams by telemetry data ID', 
        auth: true 
      },
    ],
    devices: [
      { 
        method: 'GET', 
        path: '/devices', 
        description: 'Get all devices', 
        auth: true 
      },
      { 
        method: 'POST', 
        path: '/devices', 
        description: 'Create a new device', 
        auth: true,
        params: {
          name: "Device Name",
          serialNumber: "ABC123XYZ",
          organizationId: 1,
          type: "Gateway",
          status: true,
          firmware: "v1.2.3",
          description: "Device description",
          configuration: {
            ipAddress: "192.168.1.100",
            macAddress: "AA:BB:CC:DD:EE:FF"
          }
        }
      },
      { 
        method: 'GET', 
        path: '/devices/:id', 
        description: 'Get device by ID', 
        auth: true 
      },
      { 
        method: 'PATCH', 
        path: '/devices/:id', 
        description: 'Update device', 
        auth: true,
        params: {
          name: "Updated Device Name",
          firmware: "v1.3.0",
          status: true,
          description: "Updated description",
          configuration: {
            ipAddress: "192.168.1.101"
          }
        }
      },
      { 
        method: 'DELETE', 
        path: '/devices/:id', 
        description: 'Delete device', 
        auth: true 
      },
    ]
  };
  
  // Flatten routes for processing
  const flatRoutes = Object.values(routes).flat();
  
  // Generate Insomnia export
  const resources = [];
  const workspaceId = `wrk_${Math.random().toString(36).substring(2, 15)}`;
  
  // Add workspace
  resources.push({
    _id: workspaceId,
    name: 'AEMOS API',
    description: 'AEMOS API Endpoints',
    created: Date.now(),
    modified: Date.now(),
    scope: 'collection',
    _type: 'workspace'
  });
  
  // Add environment
  const envId = `env_${Math.random().toString(36).substring(2, 15)}`;
  resources.push({
    _id: envId,
    name: 'Base Environment',
    data: {
      base_url: baseUrl,
      token: ''
    },
    color: null,
    isPrivate: false,
    metaSortKey: 1,
    modified: Date.now(),
    parentId: workspaceId,
    _type: 'environment'
  });

  // Create folder for each category
  const folderIds = {};
  Object.keys(routes).forEach((category, index) => {
    const folderId = `fld_${Math.random().toString(36).substring(2, 15)}`;
    folderIds[category] = folderId;
    
    resources.push({
      _id: folderId,
      parentId: workspaceId,
      modified: Date.now(),
      created: Date.now(),
      name: category.charAt(0).toUpperCase() + category.slice(1),
      description: `${category.charAt(0).toUpperCase() + category.slice(1)} API endpoints`,
      environment: {},
      metaSortKey: (index + 1) * 1000,
      _type: 'request_group'
    });
  });
  
  // Add each endpoint as a request within appropriate folder
  Object.entries(routes).forEach(([category, categoryRoutes]) => {
    categoryRoutes.forEach((route, index) => {
      const requestId = `req_${Math.random().toString(36).substring(2, 15)}`;
      resources.push({
        _id: requestId,
        parentId: folderIds[category],
        modified: Date.now(),
        created: Date.now(),
        url: baseUrl + route.path,
        name: `${route.method} ${route.path}`,
        description: route.description,
        method: route.method,
        body: {
          mimeType: 'application/json',
          text: (route.method === 'POST' || route.method === 'PATCH') && route.params 
            ? JSON.stringify(route.params, null, 2) 
            : ''
        },
        parameters: [],
        headers: [
          {
            name: 'Content-Type',
            value: 'application/json',
            description: ''
          },
          ...(route.auth ? [{
            name: 'Authorization',
            value: 'Bearer {{ token }}',
            description: ''
          }] : [])
        ],
        authentication: {},
        metaSortKey: (index + 1) * 100,
        isPrivate: false,
        settingStoreCookies: true,
        settingSendCookies: true,
        settingDisableRenderRequestBody: false,
        settingEncodeUrl: true,
        settingRebuildPath: true,
        settingFollowRedirects: 'global',
        _type: 'request'
      });
    });
  });
  
  const insomniaExport = {
    _type: 'export',
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: 'aemos-api-exporter',
    resources
  };
  
  // Set response headers for file download
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=aemos-api-insomnia.json');
  
  res.status(200).json(insomniaExport);
});

// Authentication routes
router.use('/auth', authRoutes);

// API v1 routes
router.use('/devices', deviceRoutes);
router.use('/organizations', organizationRoutes);
router.use('/areas', areaRoutes);
router.use('/sensors', sensorRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/datastreams', dataStreamRoutes);

// Handle undefined routes
router.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server!`
  });
});

module.exports = router; 