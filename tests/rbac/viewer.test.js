const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Organization, OrganizationUser, Sensor, Area } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Viewer RBAC Tests', () => {
  let authToken;
  let viewer;
  let viewerRole;
  let testOrg;
  let testArea;
  let testSensor;
  
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test organization
    testOrg = await Organization.create({
      name: 'Viewer Test Organization',
      status: true,
      detail: 'Test organization for Viewer RBAC testing',
      isParent: true
    });
    
    // Create test area
    testArea = await Area.create({
      name: 'Viewer Test Area',
      organizationId: testOrg.id
    });
    
    // Create test sensor
    testSensor = await Sensor.create({
      name: 'Viewer Test Sensor',
      description: 'Test sensor for Viewer RBAC testing',
      status: true
    });
    
    // Get the Viewer role
    viewerRole = await Role.findOne({
      where: { name: 'Viewer' }
    });
    
    // Create test user with Viewer role
    viewer = await User.create({
      userName: 'Viewer Test',
      email: 'viewer@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W', // Password: test123
      status: true
    });
    
    // Assign Viewer role to user for the test organization
    await OrganizationUser.create({
      userId: viewer.id,
      organizationId: testOrg.id,
      role: viewerRole.id,
      status: 'active'
    });
    
    // Generate JWT token for the viewer
    authToken = jwt.sign(
      { id: viewer.id, email: viewer.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await OrganizationUser.destroy({ where: { userId: viewer.id } });
    await User.destroy({ where: { id: viewer.id } });
    await Sensor.destroy({ where: { id: testSensor.id } });
    await Area.destroy({ where: { id: testArea.id } });
    await Organization.destroy({ where: { id: testOrg.id } });
  });
  
  // Test for view permissions
  describe('View Permissions', () => {
    it('should allow Viewer to view devices in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/devices?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
    
    it('should allow Viewer to view sensors in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/sensors?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
    
    it('should allow Viewer to view areas in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/organization/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
  
  // Test for write permission restrictions
  describe('Write Permission Restrictions', () => {
    it('should NOT allow Viewer to create a new device', async () => {
      const newDeviceData = {
        name: 'New Test Device',
        description: 'Test device that should not be created',
        status: true,
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newDeviceData);
      
      // Expect a 403 Forbidden status
      expect(response.status).toBe(403);
    });
    
    it('should NOT allow Viewer to update a sensor', async () => {
      const updateData = {
        description: 'This update should fail',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/sensors/${testSensor.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      // Expect a 403 Forbidden status
      expect(response.status).toBe(403);
    });
    
    it('should NOT allow Viewer to delete an area', async () => {
      const response = await request(app)
        .delete(`/api/v1/areas/${testArea.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Expect a 403 Forbidden status
      expect(response.status).toBe(403);
    });
  });
  
  // Test for permission-based functionality
  describe('Permission-Based Functionality', () => {
    it('should NOT allow Viewer to get role information', async () => {
      const response = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Expect a 403 Forbidden status
      expect(response.status).toBe(403);
    });
    
    it('should NOT allow Viewer to access user role assignments', async () => {
      const response = await request(app)
        .get(`/api/v1/user-roles/${viewer.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Expect a 403 Forbidden status
      expect(response.status).toBe(403);
    });
  });
}); 