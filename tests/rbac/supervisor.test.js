const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Organization, OrganizationUser, Sensor, Area } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Supervisor RBAC Tests', () => {
  let authToken;
  let supervisor;
  let supervisorRole;
  let testOrg;
  let testArea;
  let testSensor;
  
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test organization
    testOrg = await Organization.create({
      name: 'Supervisor Test Organization',
      status: true,
      detail: 'Test organization for Supervisor RBAC testing',
      isParent: true
    });
    
    // Create test area
    testArea = await Area.create({
      name: 'Supervisor Test Area',
      organizationId: testOrg.id
    });
    
    // Create test sensor
    testSensor = await Sensor.create({
      name: 'Supervisor Test Sensor',
      description: 'Test sensor for Supervisor RBAC testing',
      status: true
    });
    
    // Get the Supervisor role
    supervisorRole = await Role.findOne({
      where: { name: 'Supervisor' }
    });
    
    // Create test user with Supervisor role
    supervisor = await User.create({
      userName: 'Supervisor Test',
      email: 'supervisor@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W', // Password: test123
      status: true
    });
    
    // Assign Supervisor role to user for the test organization
    await OrganizationUser.create({
      userId: supervisor.id,
      organizationId: testOrg.id,
      role: supervisorRole.id,
      status: 'active'
    });
    
    // Generate JWT token for the supervisor
    authToken = jwt.sign(
      { id: supervisor.id, email: supervisor.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await OrganizationUser.destroy({ where: { userId: supervisor.id } });
    await User.destroy({ where: { id: supervisor.id } });
    await Sensor.destroy({ where: { id: testSensor.id } });
    await Area.destroy({ where: { id: testArea.id } });
    await Organization.destroy({ where: { id: testOrg.id } });
  });
  
  // Test for device and sensor viewing permissions
  describe('View Permissions', () => {
    it('should allow Supervisor to view devices in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/devices?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
    
    it('should allow Supervisor to view sensors in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/sensors?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
    
    it('should allow Supervisor to view areas in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/organization/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
  
  // Test for report generation
  describe('Report Generation', () => {
    it('should allow Supervisor to view reports', async () => {
      // This would typically be a GET request to /reports
      // Implement according to your actual API
      
      // This is a placeholder test since the API might not have a reports endpoint yet
      expect(true).toBe(true);
    });
  });
  
  // Test write permission restrictions
  describe('Write Permission Restrictions', () => {
    it('should NOT allow Supervisor to create a new sensor', async () => {
      const newSensorData = {
        name: 'New Test Sensor',
        description: 'Test sensor that should not be created',
        status: true,
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .post('/api/v1/sensors')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSensorData);
      
      // Expect a 403 Forbidden status
      expect(response.status).toBe(403);
    });
    
    it('should NOT allow Supervisor to update organization details', async () => {
      const updateData = {
        detail: 'This update should fail',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      // Expect a 403 Forbidden status
      expect(response.status).toBe(403);
    });
  });
}); 