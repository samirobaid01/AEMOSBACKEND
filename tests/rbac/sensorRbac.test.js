const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Organization, OrganizationUser, Sensor, Area, AreaSensor } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Sensor RBAC Tests', () => {
  let orgAdminToken;
  let systemAdminToken;
  let viewerToken;
  let wrongOrgAdminToken;
  let testOrg;
  let testOrgTwo;
  let testSensor;
  let testArea;
  let testAreaTwo;
  
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test organizations
    testOrg = await Organization.create({
      name: 'Sensor RBAC Test Organization',
      status: true,
      detail: 'Test organization for Sensor RBAC testing',
      isParent: true
    });
    
    testOrgTwo = await Organization.create({
      name: 'Sensor RBAC Test Organization Two',
      status: true,
      detail: 'Second test organization for Sensor RBAC testing',
      isParent: true
    });
    
    // Create test areas for both organizations
    testArea = await Area.create({
      name: 'Test Area for Sensor RBAC',
      organizationId: testOrg.id
    });
    
    testAreaTwo = await Area.create({
      name: 'Test Area Two for Sensor RBAC',
      organizationId: testOrgTwo.id
    });
    
    // Create test sensor
    testSensor = await Sensor.create({
      name: 'Test Sensor for RBAC',
      description: 'Sensor used for RBAC testing',
      status: true,
      uuid: '12345678-1234-1234-1234-123456789012'
    });
    
    // Associate sensor with area to establish organization relationship
    await AreaSensor.create({
      areaId: testArea.id,
      sensorId: testSensor.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Get roles
    const orgAdminRole = await Role.findOne({ where: { name: 'Org Admin' } });
    const systemAdminRole = await Role.findOne({ where: { name: 'System Admin' } });
    const viewerRole = await Role.findOne({ where: { name: 'Viewer' } });
    
    // Create test users
    const orgAdmin = await User.create({
      userName: 'Sensor RBAC Org Admin',
      email: 'sensor-orgadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W', // Password: test123
      status: true
    });
    
    const systemAdmin = await User.create({
      userName: 'Sensor RBAC System Admin',
      email: 'sensor-sysadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    const viewer = await User.create({
      userName: 'Sensor RBAC Viewer',
      email: 'sensor-viewer@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    const wrongOrgAdmin = await User.create({
      userName: 'Sensor RBAC Wrong Org Admin',
      email: 'sensor-wrong-orgadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    // Assign roles
    await OrganizationUser.create({
      userId: orgAdmin.id,
      organizationId: testOrg.id,
      role: orgAdminRole.id,
      status: 'active'
    });
    
    await OrganizationUser.create({
      userId: systemAdmin.id,
      organizationId: testOrg.id,
      role: systemAdminRole.id,
      status: 'active'
    });
    
    await OrganizationUser.create({
      userId: viewer.id,
      organizationId: testOrg.id,
      role: viewerRole.id,
      status: 'active'
    });
    
    await OrganizationUser.create({
      userId: wrongOrgAdmin.id,
      organizationId: testOrgTwo.id,
      role: orgAdminRole.id,
      status: 'active'
    });
    
    // Generate JWT tokens
    orgAdminToken = jwt.sign(
      { id: orgAdmin.id, email: orgAdmin.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    systemAdminToken = jwt.sign(
      { id: systemAdmin.id, email: systemAdmin.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    viewerToken = jwt.sign(
      { id: viewer.id, email: viewer.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    wrongOrgAdminToken = jwt.sign(
      { id: wrongOrgAdmin.id, email: wrongOrgAdmin.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  });
  
  // Clean up after all tests
  afterAll(async () => {
    // Delete test data in the correct order
    await AreaSensor.destroy({ where: { sensorId: testSensor.id } });
    await Sensor.destroy({ where: { id: testSensor.id } });
    await Area.destroy({ where: { organizationId: [testOrg.id, testOrgTwo.id] } });
    await OrganizationUser.destroy({ where: { organizationId: [testOrg.id, testOrgTwo.id] } });
    await Organization.destroy({ where: { id: [testOrg.id, testOrgTwo.id] } });
    await User.destroy({ where: { email: ['sensor-orgadmin@test.com', 'sensor-sysadmin@test.com', 'sensor-viewer@test.com', 'sensor-wrong-orgadmin@test.com'] } });
  });
  
  // Test cases
  describe('Get Sensor Tests', () => {
    it('should allow Org Admin to get a sensor in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/sensors/${testSensor.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.sensor.id).toBe(testSensor.id);
    });
    
    it('should allow System Admin to get any sensor', async () => {
      const response = await request(app)
        .get(`/api/v1/sensors/${testSensor.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.sensor.id).toBe(testSensor.id);
    });
    
    it('should allow Viewer to get a sensor in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/sensors/${testSensor.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.sensor.id).toBe(testSensor.id);
    });
    
    it('should NOT allow Org Admin from another organization to get the sensor', async () => {
      const response = await request(app)
        .get(`/api/v1/sensors/${testSensor.id}?organizationId=${testOrgTwo.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`);
      
      expect(response.status).toBe(403);
    });
    
    it('should require organizationId parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/sensors/${testSensor.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(400); // Bad Request
    });
  });
  
  describe('Create and Update Sensor Tests', () => {
    it('should allow Org Admin to create a sensor in their organization', async () => {
      const newSensorData = {
        name: 'New Test Sensor for RBAC',
        description: 'Another sensor for RBAC testing',
        status: true,
        organizationId: testOrg.id,
        areaId: testArea.id
      };
      
      const response = await request(app)
        .post('/api/v1/sensors')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(newSensorData);
      
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.sensor.name).toBe(newSensorData.name);
      
      // Clean up
      const createdSensorId = response.body.data.sensor.id;
      await AreaSensor.destroy({ where: { sensorId: createdSensorId } });
      await Sensor.destroy({ where: { id: createdSensorId } });
    });
    
    it('should allow Org Admin to update a sensor in their organization', async () => {
      const updateData = {
        name: 'Updated Sensor Name',
        description: 'Updated by RBAC test',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/sensors/${testSensor.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.sensor.name).toBe(updateData.name);
    });
    
    it('should NOT allow Viewer to update a sensor in their organization', async () => {
      const updateData = {
        name: 'Should Not Update',
        description: 'Attempted by Viewer',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/sensors/${testSensor.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should NOT allow Org Admin from another organization to update the sensor', async () => {
      const updateData = {
        name: 'Should Not Update',
        description: 'Attempted by Wrong Org Admin',
        organizationId: testOrgTwo.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/sensors/${testSensor.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });
  
  describe('Delete Sensor Tests', () => {
    // Test for permission checks without actually deleting (to avoid foreign key issues)  
    it('should NOT allow Viewer to delete a sensor', async () => {
      const response = await request(app)
        .delete(`/api/v1/sensors/${testSensor.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should NOT allow Org Admin from another organization to delete the sensor', async () => {
      const response = await request(app)
        .delete(`/api/v1/sensors/${testSensor.id}?organizationId=${testOrgTwo.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });
}); 