const express = require('express');
const deviceRoutes = require('./deviceRoutes');
const deviceTokenRoutes = require('./deviceTokenRoutes');
const organizationRoutes = require('./organizationRoutes');
const areaRoutes = require('./areaRoutes');
const sensorRoutes = require('./sensorRoutes');
const telemetryRoutes = require('./telemetryRoutes');
const dataStreamRoutes = require('./dataStreamRoutes');
const authRoutes = require('./authRoutes');
const roleRoutes = require('./roleRoutes');
const permissionRoutes = require('./permissionRoutes');
const userRoleRoutes = require('./userRoleRoutes');
const reportRoutes = require('./reportRoutes');
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
  // Base URL variable for Insomnia without trailing slash
  const baseUrlVar = '{{ base_url }}';
  
  const routes = {
    auth: [
      { 
        method: 'POST', 
        path: '/auth/login', 
        description: 'Login and get JWT token', 
        auth: false,
        params: {
          email: "samiradmin@yopmail.com",
          password: "1234Abcd"
        },
        // Add the response handling script to set the token variable
        responseBehavior: {
          setBearerToken: true
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
        },
        // Add the response handling script to set the token variable
        responseBehavior: {
          setBearerToken: true
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
        description: 'Get all organizations (filtered by user access for non-System Admins)', 
        auth: true,
        permissions: ['organization.view']
      },
      { 
        method: 'POST', 
        path: '/organizations', 
        description: 'Create a new organization', 
        auth: true,
        permissions: ['organization.create'],
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
        description: 'Get organization by ID (requires organization ownership)', 
        auth: true,
        permissions: ['organization.view'],
        query: {
          organizationId: "same as :id parameter"
        }
      },
      { 
        method: 'PATCH', 
        path: '/organizations/:id', 
        description: 'Update organization (requires organization ownership)', 
        auth: true,
        permissions: ['organization.update'],
        params: {
          name: "Updated Organization Name",
          status: true,
          detail: "Updated details",
          organizationId: "same as :id parameter"
        }
      },
      { 
        method: 'DELETE', 
        path: '/organizations/:id', 
        description: 'Delete organization (requires organization ownership)', 
        auth: true,
        permissions: ['organization.delete'],
        query: {
          organizationId: "same as :id parameter"
        }
      },
    ],
    areas: [
      { 
        method: 'GET', 
        path: '/areas', 
        description: 'Get all areas filtered by organization', 
        auth: true,
        permissions: ['area.view'],
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'POST', 
        path: '/areas', 
        description: 'Create a new area', 
        auth: true,
        permissions: ['area.create'],
        params: {
          name: "Area Name",
          organizationId: 1,
          parentArea: null,
          image: "example-image-url",
          uuid: "550e8400-e29b-41d4-a716-446655440000"
        },
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'GET', 
        path: '/areas/:id', 
        description: 'Get area by ID (requires organization ownership)', 
        auth: true,
        permissions: ['area.view'],
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'PATCH', 
        path: '/areas/:id', 
        description: 'Update area (requires organization ownership)', 
        auth: true,
        permissions: ['area.update'],
        params: {
          name: "Updated Area Name",
          organizationId: 1,
          parentArea: null,
          image: "updated-image-url"
        },
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'DELETE', 
        path: '/areas/:id', 
        description: 'Delete area (requires organization ownership)', 
        auth: true,
        permissions: ['area.delete'],
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'GET', 
        path: '/areas/organization/:organizationId', 
        description: 'Get areas by organization (validates organization access)', 
        auth: true,
        permissions: ['area.view']
      },
    ],
    sensors: [
      { 
        method: 'GET', 
        path: '/sensors', 
        description: 'Get all sensors for a specific organization', 
        auth: true,
        permissions: ['sensor.view'],
        params: null,
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'POST', 
        path: '/sensors', 
        description: 'Create a new sensor', 
        auth: true,
        permissions: ['sensor.create'],
        params: {
          name: "Sensor Name",
          description: "Sensor description",
          status: true,
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          organizationId: 1
        },
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'GET', 
        path: '/sensors/:id', 
        description: 'Get sensor by ID (requires organization ownership)', 
        auth: true,
        permissions: ['sensor.view'],
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'PATCH', 
        path: '/sensors/:id', 
        description: 'Update sensor (requires organization ownership)', 
        auth: true,
        permissions: ['sensor.update'],
        params: {
          name: "Updated Sensor Name",
          description: "Updated description",
          status: true,
          organizationId: 1
        },
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'DELETE', 
        path: '/sensors/:id', 
        description: 'Delete sensor (requires organization ownership)', 
        auth: true,
        permissions: ['sensor.delete'],
        query: {
          organizationId: 1
        }
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
        description: 'Get all devices for a specific organization', 
        auth: true,
        permissions: ['device.view'],
        params: null,
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'POST', 
        path: '/devices', 
        description: 'Create a new device', 
        auth: true,
        permissions: ['device.create'],
        params: {
          name: "Device Name",
          description: "Device description",
          status: true,
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          organizationId: 1
        },
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'GET', 
        path: '/devices/:id', 
        description: 'Get device by ID (requires organization ownership)', 
        auth: true,
        permissions: ['device.view'],
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'PATCH', 
        path: '/devices/:id', 
        description: 'Update device (requires organization ownership)', 
        auth: true,
        permissions: ['device.update'],
        params: {
          name: "Updated Device Name",
          description: "Updated description",
          status: true,
          organizationId: 1
        },
        query: {
          organizationId: 1
        }
      },
      { 
        method: 'DELETE', 
        path: '/devices/:id', 
        description: 'Delete device (requires organization ownership)', 
        auth: true,
        permissions: ['device.delete'],
        query: {
          organizationId: 1
        }
      },
    ],
    roles: [
      {
        method: 'GET',
        path: '/roles',
        description: 'Get all roles (System Admin can see all, others can only see their organization roles)',
        auth: true,
        permissions: ['role.view'],
        query: {
          organizationId: 1
        }
      },
      {
        method: 'POST',
        path: '/roles',
        description: 'Create a new role',
        auth: true,
        permissions: ['role.assign'],
        params: {
          name: "Custom Role",
          description: "Custom role description",
          organizationId: 1
        },
        query: {
          organizationId: 1
        }
      },
      {
        method: 'GET',
        path: '/roles/:id',
        description: 'Get role by ID',
        auth: true,
        permissions: ['role.view']
      },
      {
        method: 'PUT',
        path: '/roles/:id',
        description: 'Update a role',
        auth: true,
        permissions: ['role.assign'],
        params: {
          name: "Updated Role Name",
          description: "Updated role description"
        }
      },
      {
        method: 'DELETE',
        path: '/roles/:id',
        description: 'Delete a role',
        auth: true,
        permissions: ['role.assign']
      },
      {
        method: 'GET',
        path: '/roles/organization/:organizationId',
        description: 'Get roles for an organization',
        auth: true,
        permissions: ['role.view']
      },
      {
        method: 'GET',
        path: '/roles/:id/permissions',
        description: 'Get permissions for a role',
        auth: true,
        permissions: ['role.view']
      },
      {
        method: 'POST',
        path: '/roles/:id/permissions',
        description: 'Add permission to a role',
        auth: true,
        permissions: ['permission.manage'],
        params: {
          permissionId: 1
        }
      },
      {
        method: 'DELETE',
        path: '/roles/:id/permissions/:permissionId',
        description: 'Remove permission from a role',
        auth: true,
        permissions: ['permission.manage']
      }
    ],
    permissions: [
      {
        method: 'GET',
        path: '/permissions',
        description: 'Get all permissions',
        auth: true,
        permissions: ['permission.view']
      },
      {
        method: 'GET',
        path: '/permissions/:id',
        description: 'Get permission by ID',
        auth: true,
        permissions: ['permission.view']
      }
    ],
    userRoles: [
      {
        method: 'GET',
        path: '/user-roles',
        description: 'Get all user roles',
        auth: true,
        permissions: ['role.view']
      },
      {
        method: 'POST',
        path: '/user-roles',
        description: 'Assign role to user',
        auth: true,
        permissions: ['role.assign'],
        params: {
          userId: 1,
          roleId: 1,
          organizationId: 1
        }
      },
      {
        method: 'DELETE',
        path: '/user-roles/:userId/:roleId',
        description: 'Remove role from user',
        auth: true,
        permissions: ['role.assign']
      }
    ],
    reports: [
      { 
        method: 'GET', 
        path: '/reports/device-status', 
        description: 'Active/Inactive Devices by Organization', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/sensor-telemetry', 
        description: 'Sensor Telemetry Data Summary (Last 24 Hours)', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/organization-hierarchy', 
        description: 'Organization Hierarchy Report', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/user-activity', 
        description: 'User Activity Report (By Notification Status)', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/area-utilization', 
        description: 'Area Utilization Report (Devices & Sensors)', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/payment-method', 
        description: 'Payment Method Analysis', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/rule-chain-execution', 
        description: 'Rule Chain Execution Report', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/sensor-anomaly', 
        description: 'Sensor Data Anomaly Detection', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/user-role-distribution', 
        description: 'User Role Distribution Report', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      },
      { 
        method: 'GET', 
        path: '/reports/ticket-resolution', 
        description: 'Ticket Resolution Performance', 
        auth: true,
        query: {
          organizationId: 1,
          page: 1,
          limit: 20
        }
      }
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
      // Use URL without trailing slash
      base_url: "http://localhost:3000/api/v1",
      token: '',
      system_admin_token: '-- System Admin JWT Token --',
      org_admin_token: '-- Org Admin JWT Token --',
      supervisor_token: '-- Supervisor JWT Token --',
      viewer_token: '-- Viewer JWT Token --'
    },
    color: null,
    isPrivate: false,
    metaSortKey: 1,
    modified: Date.now(),
    parentId: workspaceId,
    _type: 'environment'
  });

  // Add login token handler script
  const tokenHandlerId = `req_token_handler_${Math.random().toString(36).substring(2, 15)}`;
  resources.push({
    _id: tokenHandlerId,
    parentId: workspaceId,
    modified: Date.now(),
    created: Date.now(),
    url: '',
    name: '🔑 Token Handler Documentation',
    description: `# Automatic Token Handling

This collection includes automatic token handling for authentication:

1. When you login with \`POST /auth/login\`, the response token is automatically saved to the environment
2. The token is then used in all subsequent requests that require authentication
3. You can switch between different role tokens using the environment variables:
   - {{ token }}: Current token set from login
   - {{ system_admin_token }}: For System Admin access
   - {{ org_admin_token }}: For Organization Admin access
   - {{ supervisor_token }}: For Supervisor access
   - {{ viewer_token }}: For Viewer access

## Testing Different Roles

To test different roles, you can:

1. Login as a user with the desired role
2. The token will be automatically saved
3. Or manually set one of the predefined role tokens in the environment

## URLs and Environment Variables

All request URLs use the environment variable \`{{ base_url }}\`. You can easily change the base URL in your environment settings to point to different servers (development, staging, production).`,
    method: 'GET',
    body: {},
    parameters: [],
    headers: [],
    authentication: {},
    metaSortKey: -100,
    isPrivate: false,
    _type: 'request'
  });

  // Add README file
  const readmeId = `req_readme_${Math.random().toString(36).substring(2, 15)}`;
  resources.push({
    _id: readmeId,
    parentId: workspaceId,
    modified: Date.now(),
    created: Date.now(),
    url: '',
    name: '📚 RBAC & Authorization',
    description: `# AEMOS API RBAC System

## Role-Based Access Control

This API implements role-based access control (RBAC) with organization-based resource isolation:

### Roles
- **System Admin**: Full access to all system functionalities across all organizations
- **Org Admin**: Full access within their organization only
- **Supervisor**: View access and report generation capabilities within their organization
- **Viewer**: Read-only access to system data within their organization

### Key Authorization Concepts

1. **Permission Requirements**: Each endpoint requires specific permissions (e.g., 'device.view', 'device.update')
2. **Organization-Based Access**: Regular users can only access resources within their own organization
3. **System Admin Exception**: System Admins can access all resources regardless of organization
4. **JWT Tokens**: Authentication tokens contain user permissions and roles

### Using this Collection

1. Login with your credentials to automatically get a token, or use the environment variables to switch between different role tokens:
   - {{ token }}: Your current token (automatically set from login)
   - {{ system_admin_token }}: For System Admin access
   - {{ org_admin_token }}: For Organization Admin access
   - {{ supervisor_token }}: For Supervisor access
   - {{ viewer_token }}: For Viewer access

2. All resource-specific endpoints (GET /resource/:id, PATCH /resource/:id, DELETE /resource/:id) check both:
   - If the user has the appropriate permission
   - If the resource belongs to the user's organization (unless System Admin)

3. List endpoints (GET /resources) automatically filter results by organization for non-System Admin users`,
    method: 'GET',
    body: {},
    parameters: [],
    headers: [],
    authentication: {},
    metaSortKey: 0,
    isPrivate: false,
    _type: 'request'
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
  
  // Add Examples folder
  const examplesFolderId = `fld_examples_${Math.random().toString(36).substring(2, 15)}`;
  resources.push({
    _id: examplesFolderId,
    parentId: workspaceId,
    modified: Date.now(),
    created: Date.now(),
    name: '💡 Examples',
    description: 'Example flows demonstrating RBAC and organization-based access',
    environment: {},
    metaSortKey: 900,
    _type: 'request_group'
  });
  
  // Add example requests
  const examples = [
    {
      name: 'System Admin: Access Any Device',
      description: `# System Admin Access\n\nThis request demonstrates how a System Admin can access any device across all organizations.\n\n1. Set the 'Authorization' header to use the System Admin token\n2. The System Admin can view any device regardless of organization\n3. No additional checks are needed beyond having the 'device.view' permission`,
      method: 'GET',
      url: `${baseUrlVar}/devices/1`,
      headers: [
        { name: 'Authorization', value: 'Bearer {{ system_admin_token }}' }
      ]
    },
    {
      name: 'Org Admin: Access Within Organization',
      description: `# Organization-Based Access\n\nThis request demonstrates how an Org Admin is restricted to devices within their organization.\n\n1. Set the 'Authorization' header to use the Org Admin token\n2. The request will only succeed if Device ID 1 belongs to the Org Admin's organization\n3. If it belongs to another organization, a 403 Forbidden error is returned\n\nThis showcases the organization-based access control mechanism.`,
      method: 'GET',
      url: `${baseUrlVar}/devices/1`,
      headers: [
        { name: 'Authorization', value: 'Bearer {{ org_admin_token }}' }
      ]
    },
    {
      name: 'Viewer: Limited Permissions',
      description: `# Permission-Based Access\n\nThis request demonstrates permission-based restrictions for a Viewer role.\n\n1. A Viewer can view devices in their organization (/devices/1) successfully\n2. But attempting to update or delete will fail with 403 Forbidden\n\nThis showcases the permission-based access control aspect of the RBAC system.`,
      method: 'GET',
      url: `${baseUrlVar}/devices/1`,
      headers: [
        { name: 'Authorization', value: 'Bearer {{ viewer_token }}' }
      ]
    }
  ];
  
  examples.forEach((example, index) => {
    const exampleId = `req_example_${index}_${Math.random().toString(36).substring(2, 15)}`;
    resources.push({
      _id: exampleId,
      parentId: examplesFolderId,
      modified: Date.now(),
      created: Date.now(),
      url: example.url,
      name: example.name,
      description: example.description,
      method: example.method,
      headers: [
        {
          name: 'Content-Type',
          value: 'application/json',
          description: ''
        },
        ...example.headers
      ],
      body: {},
      parameters: [],
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
  
  // Add each endpoint as a request within appropriate folder
  Object.entries(routes).forEach(([category, categoryRoutes]) => {
    categoryRoutes.forEach((route, index) => {
      const requestId = `req_${Math.random().toString(36).substring(2, 15)}`;
      
      // Build endpoint description with permission info
      let fullDescription = route.description || '';
      
      if (route.permissions && route.permissions.length > 0) {
        fullDescription += `\n\nRequired Permissions: ${route.permissions.join(', ')}`;
        fullDescription += `\n\nAccess Control:\n- System Admin: Full access to all resources\n- Other roles: Access limited to resources within their organization`;
      }
      
      // Add automatic token handling for login and refresh token endpoints
      let testScript = '';
      
      if (route.responseBehavior && route.responseBehavior.setBearerToken) {
        testScript = `
// Auto-extract and set bearer token from response
const response = pm.response.json();
if (response.token) {
  // Store the token value
  pm.environment.set('token', response.token);
  console.log('Token automatically saved: ' + response.token.substring(0, 10) + '...');
}`;
      }
      
      // Construct the URL correctly by removing leading slash from route path
      // This prevents issues like "http:///path" when combining with base_url
      const routePath = route.path.startsWith('/') ? route.path.substring(1) : route.path;
      
      // Create query parameters array
      const parameters = [];
      
      // Add organizationId as a query parameter with default value of 1 for resource endpoints 
      // that require organization context (like areas, devices, sensors)
      if (route.query && route.query.organizationId) {
        parameters.push({
          name: 'organizationId',
          value: String(route.query.organizationId),
          description: 'Organization ID for filtering and access control'
        });
      }
      
      resources.push({
        _id: requestId,
        parentId: folderIds[category],
        modified: Date.now(),
        created: Date.now(),
        url: `${baseUrlVar}/${routePath}`,
        name: `${route.method} ${route.path}`,
        description: fullDescription,
        method: route.method,
        body: {
          mimeType: 'application/json',
          text: (route.method === 'POST' || route.method === 'PATCH' || route.method === 'PUT') && route.params 
            ? JSON.stringify(route.params, null, 2) 
            : ''
        },
        parameters: parameters, // Use the parameters array here
        headers: [
          {
            name: 'Content-Type',
            value: 'application/json',
            description: ''
          },
          // Explicitly add Authorization header if auth is required
          ...(route.auth ? [{
            name: 'Authorization',
            value: 'Bearer {{token}}',
            description: 'JWT Authentication token'
          }] : [])
        ],
        authentication: {}, // No built-in authentication, use explicit header
        metaSortKey: (index + 1) * 100,
        isPrivate: false,
        settingStoreCookies: true,
        settingSendCookies: true,
        settingDisableRenderRequestBody: false,
        settingEncodeUrl: true,
        settingRebuildPath: true,
        settingFollowRedirects: 'global',
        _type: 'request',
        // Add the test script if it exists
        ...(testScript ? { 
          tests: testScript
        } : {})
      });
    });
  });
  
  // Also fix the example URLs
  resources.forEach(resource => {
    if (resource.url && resource.url.includes(baseUrlVar)) {
      // Extract the path part after baseUrlVar
      const match = resource.url.match(new RegExp(`${baseUrlVar}(/.+)`));
      if (match && match[1]) {
        // Clean up the path to avoid double slashes
        const path = match[1].startsWith('/') ? match[1].substring(1) : match[1];
        resource.url = `${baseUrlVar}/${path}`;
      }
    }
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
router.use('/device-tokens', deviceTokenRoutes);
router.use('/devices', deviceRoutes);
router.use('/organizations', organizationRoutes);
router.use('/areas', areaRoutes);
router.use('/sensors', sensorRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/datastreams', dataStreamRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/user-roles', userRoleRoutes);
router.use('/reports', reportRoutes);

// Handle undefined routes
router.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server!`
  });
});

module.exports = router; 