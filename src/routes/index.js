const express = require('express');
const deviceRoutes = require('./deviceRoutes');
const organizationRoutes = require('./organizationRoutes');
const areaRoutes = require('./areaRoutes');
const sensorRoutes = require('./sensorRoutes');
const authRoutes = require('./authRoutes');
const config = require('../config');
// TODO: Import other routes as you create them
// const userRoutes = require('./userRoutes');
// const organizationRoutes = require('./organizationRoutes');
// etc.

const router = express.Router();

// API health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AEMOS API is running'
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// API v1 routes
router.use('/devices', deviceRoutes);
router.use('/organizations', organizationRoutes);
router.use('/areas', areaRoutes);
router.use('/sensors', sensorRoutes);
// TODO: Mount other routes as you create them
// router.use('/users', userRoutes);
// router.use('/organizations', organizationRoutes);
// etc.

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

// Route documentation endpoint - localhost only
router.get('/routes', localhostOnly, (req, res) => {
  const routes = [
    // Auth routes
    { method: 'POST', path: '/api/auth/login', description: 'Login and get JWT token', auth: false },
    { method: 'POST', path: '/api/auth/logout', description: 'Logout and invalidate token', auth: true },
    { method: 'GET', path: '/api/auth/me', description: 'Get current user information', auth: true },
    
    // Organization routes
    { method: 'GET', path: '/api/organizations', description: 'Get all organizations', auth: true },
    { method: 'POST', path: '/api/organizations', description: 'Create a new organization', auth: true },
    { method: 'GET', path: '/api/organizations/:id', description: 'Get organization by ID', auth: true },
    { method: 'PATCH', path: '/api/organizations/:id', description: 'Update organization', auth: true },
    { method: 'DELETE', path: '/api/organizations/:id', description: 'Delete organization', auth: true },
    
    // Area routes
    { method: 'GET', path: '/api/areas', description: 'Get all areas', auth: true },
    { method: 'POST', path: '/api/areas', description: 'Create a new area', auth: true },
    { method: 'GET', path: '/api/areas/:id', description: 'Get area by ID', auth: true },
    { method: 'PATCH', path: '/api/areas/:id', description: 'Update area', auth: true },
    { method: 'DELETE', path: '/api/areas/:id', description: 'Delete area', auth: true },
    { method: 'GET', path: '/api/areas/organization/:organizationId', description: 'Get areas by organization', auth: true },
    
    // Sensor routes
    { method: 'GET', path: '/api/sensors', description: 'Get all sensors', auth: true },
    { method: 'POST', path: '/api/sensors', description: 'Create a new sensor', auth: true },
    { method: 'GET', path: '/api/sensors/:id', description: 'Get sensor by ID', auth: true },
    { method: 'PATCH', path: '/api/sensors/:id', description: 'Update sensor', auth: true },
    { method: 'DELETE', path: '/api/sensors/:id', description: 'Delete sensor', auth: true },
    
    // Telemetry data routes
    { method: 'GET', path: '/api/sensors/telemetry', description: 'Get all telemetry data', auth: true },
    { method: 'POST', path: '/api/sensors/telemetry', description: 'Create telemetry data', auth: true },
    { method: 'GET', path: '/api/sensors/telemetry/:id', description: 'Get telemetry data by ID', auth: true },
    { method: 'PATCH', path: '/api/sensors/telemetry/:id', description: 'Update telemetry data', auth: true },
    { method: 'DELETE', path: '/api/sensors/telemetry/:id', description: 'Delete telemetry data', auth: true },
    { method: 'GET', path: '/api/sensors/:sensorId/telemetry', description: 'Get telemetry by sensor ID', auth: true },
    
    // Device routes
    { method: 'GET', path: '/api/devices', description: 'Get all devices', auth: true },
    { method: 'POST', path: '/api/devices', description: 'Create a new device', auth: true },
    { method: 'GET', path: '/api/devices/:id', description: 'Get device by ID', auth: true },
    { method: 'PATCH', path: '/api/devices/:id', description: 'Update device', auth: true },
    { method: 'DELETE', path: '/api/devices/:id', description: 'Delete device', auth: true }
  ];

  res.status(200).json({
    status: 'success',
    results: routes.length,
    data: {
      routes
    }
  });
});

// Insomnia export endpoint - localhost only
router.get('/insomnia', localhostOnly, (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/api`;
  
  const routes = [
    // Auth routes
    { method: 'POST', path: '/auth/login', description: 'Login and get JWT token', auth: false },
    { method: 'POST', path: '/auth/logout', description: 'Logout and invalidate token', auth: true },
    { method: 'GET', path: '/auth/me', description: 'Get current user information', auth: true },
    
    // Organization routes
    { method: 'GET', path: '/organizations', description: 'Get all organizations', auth: true },
    { method: 'POST', path: '/organizations', description: 'Create a new organization', auth: true },
    { method: 'GET', path: '/organizations/:id', description: 'Get organization by ID', auth: true },
    { method: 'PATCH', path: '/organizations/:id', description: 'Update organization', auth: true },
    { method: 'DELETE', path: '/organizations/:id', description: 'Delete organization', auth: true },
    
    // Area routes
    { method: 'GET', path: '/areas', description: 'Get all areas', auth: true },
    { method: 'POST', path: '/areas', description: 'Create a new area', auth: true },
    { method: 'GET', path: '/areas/:id', description: 'Get area by ID', auth: true },
    { method: 'PATCH', path: '/areas/:id', description: 'Update area', auth: true },
    { method: 'DELETE', path: '/areas/:id', description: 'Delete area', auth: true },
    { method: 'GET', path: '/areas/organization/:organizationId', description: 'Get areas by organization', auth: true },
    
    // Sensor routes
    { method: 'GET', path: '/sensors', description: 'Get all sensors', auth: true },
    { method: 'POST', path: '/sensors', description: 'Create a new sensor', auth: true },
    { method: 'GET', path: '/sensors/:id', description: 'Get sensor by ID', auth: true },
    { method: 'PATCH', path: '/sensors/:id', description: 'Update sensor', auth: true },
    { method: 'DELETE', path: '/sensors/:id', description: 'Delete sensor', auth: true },
    
    // Telemetry data routes
    { method: 'GET', path: '/sensors/telemetry', description: 'Get all telemetry data', auth: true },
    { method: 'POST', path: '/sensors/telemetry', description: 'Create telemetry data', auth: true },
    { method: 'GET', path: '/sensors/telemetry/:id', description: 'Get telemetry data by ID', auth: true },
    { method: 'PATCH', path: '/sensors/telemetry/:id', description: 'Update telemetry data', auth: true },
    { method: 'DELETE', path: '/sensors/telemetry/:id', description: 'Delete telemetry data', auth: true },
    { method: 'GET', path: '/sensors/:sensorId/telemetry', description: 'Get telemetry by sensor ID', auth: true },
    
    // Device routes
    { method: 'GET', path: '/devices', description: 'Get all devices', auth: true },
    { method: 'POST', path: '/devices', description: 'Create a new device', auth: true },
    { method: 'GET', path: '/devices/:id', description: 'Get device by ID', auth: true },
    { method: 'PATCH', path: '/devices/:id', description: 'Update device', auth: true },
    { method: 'DELETE', path: '/devices/:id', description: 'Delete device', auth: true }
  ];
  
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
  
  // Add each endpoint as a request
  routes.forEach(route => {
    const requestId = `req_${Math.random().toString(36).substring(2, 15)}`;
    resources.push({
      _id: requestId,
      parentId: workspaceId,
      modified: Date.now(),
      created: Date.now(),
      url: `{{ base_url }}${route.path}`,
      name: `${route.method} ${route.path}`,
      description: route.description,
      method: route.method,
      body: {
        mimeType: 'application/json',
        text: route.method === 'POST' || route.method === 'PATCH' ? '{}' : ''
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
      metaSortKey: Date.now(),
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

// Handle undefined routes - use this instead of catch-all wildcard
router.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server!`
  });
});

module.exports = router;