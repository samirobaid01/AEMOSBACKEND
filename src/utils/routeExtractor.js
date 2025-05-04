const listEndpoints = (app) => {
  const endpoints = [];
  
  const stack = app._router.stack;
  const basePath = '/api';
  
  // Helper to extract routes from a stack recursively
  const extractRoutes = (stack, parent = '') => {
    stack.forEach((middleware) => {
      if (middleware.route) {
        // Routes registered directly
        const route = middleware.route;
        const methods = Object.keys(route.methods).filter(m => route.methods[m]);
        
        methods.forEach(method => {
          endpoints.push({
            method: method.toUpperCase(),
            path: basePath + parent + route.path,
            handler: `${route.stack[0].name || 'anonymous'}`
          });
        });
      } else if (middleware.name === 'router') {
        // Router middleware
        const routerPath = parent + (middleware.regexp.toString().match(/^\/\^\\(\/?[^\/]*)/)?.[1] || '');
        
        extractRoutes(middleware.handle.stack, routerPath);
      } else if (middleware.name === 'bound dispatch' && middleware.handle.stack) {
        // Router middleware in a different format
        const routerPath = parent + middleware.path;
        
        extractRoutes(middleware.handle.stack, routerPath);
      }
    });
  };
  
  extractRoutes(stack);
  
  return endpoints;
};

// Generate Insomnia-compatible JSON for export
const generateInsomniaExport = (endpoints, baseUrl = 'http://localhost:3000') => {
  const resources = [];
  const workspaceId = `wrk_${generateId()}`;
  
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
  const envId = `env_${generateId()}`;
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
  endpoints.forEach(endpoint => {
    const requestId = `req_${generateId()}`;
    resources.push({
      _id: requestId,
      parentId: workspaceId,
      modified: Date.now(),
      created: Date.now(),
      url: `{{ base_url }}${endpoint.path}`,
      name: `${endpoint.method} ${endpoint.path}`,
      description: '',
      method: endpoint.method,
      body: {},
      parameters: [],
      headers: [
        {
          name: 'Content-Type',
          value: 'application/json',
          description: ''
        },
        {
          name: 'Authorization',
          value: 'Bearer {{ token }}',
          description: ''
        }
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
  
  return {
    _type: 'export',
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: 'aemos-api-exporter',
    resources
  };
};

// Generate a random ID for Insomnia resources
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

module.exports = {
  listEndpoints,
  generateInsomniaExport
}; 