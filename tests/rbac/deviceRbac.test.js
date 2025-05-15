const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Organization, OrganizationUser, Device, Area, AreaDevice } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Device RBAC Tests', () => {
  let orgAdminToken;
  let systemAdminToken;
  let viewerToken;
  let wrongOrgAdminToken;
  let testOrg;
  let testOrgTwo;
  let testDevice;
  let testArea;
  
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test organizations
    testOrg = await Organization.create({
      name: 'Device RBAC Test Organization',
      status: true,
      detail: 'Test organization for Device RBAC testing',
      isParent: true
    });
    
    testOrgTwo = await Organization.create({
      name: 'Device RBAC Test Organization Two',
      status: true,
      detail: 'Second test organization for Device RBAC testing',
      isParent: true
    });
    
    // Create test area
    testArea = await Area.create({
      name: 'Test Area for Device RBAC',
      organizationId: testOrg.id
    });
    
    // Create test device
    testDevice = await Device.create({
      name: 'Test Device for RBAC',
      description: 'Device used for RBAC testing',
      status: true
    });
    
    // Associate device with area
    await AreaDevice.create({
      areaId: testArea.id,
      deviceId: testDevice.id
    });
    
    // Get roles
    const orgAdminRole = await Role.findOne({ where: { name: 'Org Admin' } });
    const systemAdminRole = await Role.findOne({ where: { name: 'System Admin' } });
    const viewerRole = await Role.findOne({ where: { name: 'Viewer' } });
    
    // Create test users
    const orgAdmin = await User.create({
      userName: 'Device RBAC Org Admin',
      email: 'device-orgadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W', // Password: test123
      status: true
    });
    
    const systemAdmin = await User.create({
      userName: 'Device RBAC System Admin',
      email: 'device-sysadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    const viewer = await User.create({
      userName: 'Device RBAC Viewer',
      email: 'device-viewer@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    const wrongOrgAdmin = await User.create({
      userName: 'Device RBAC Wrong Org Admin',
      email: 'device-wrong-orgadmin@test.com',
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
    await AreaDevice.destroy({ where: { deviceId: testDevice.id } });
    await Device.destroy({ where: { id: testDevice.id } });
    await Area.destroy({ where: { id: testArea.id } });
    await OrganizationUser.destroy({ where: { organizationId: [testOrg.id, testOrgTwo.id] } });
    await Organization.destroy({ where: { id: [testOrg.id, testOrgTwo.id] } });
    await User.destroy({ where: { email: ['device-orgadmin@test.com', 'device-sysadmin@test.com', 'device-viewer@test.com', 'device-wrong-orgadmin@test.com'] } });
  });
  
  // Test cases
  describe('Get Device Tests', () => {
    it('should allow Org Admin to get a device in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDevice.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device.id).toBe(testDevice.id);
    });
    
    it('should allow System Admin to get any device', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDevice.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device.id).toBe(testDevice.id);
    });
    
    it('should allow Viewer to get a device in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDevice.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device.id).toBe(testDevice.id);
    });
    
    it('should NOT allow Org Admin from another organization to get the device', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDevice.id}?organizationId=${testOrgTwo.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`);
      
      expect(response.status).toBe(403); // Forbidden or 404 Not Found
    });
    
    it('should require organizationId parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(400); // Bad Request
    });
  });
  
  describe('Create and Update Device Tests', () => {
    it('should allow Org Admin to create a device in their organization', async () => {
      const newDeviceData = {
        name: 'New Test Device for RBAC',
        description: 'Another device for RBAC testing',
        status: true,
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(newDeviceData);
      
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device.name).toBe(newDeviceData.name);
      
      // Clean up
      const createdDeviceId = response.body.data.device.id;
      await Device.destroy({ where: { id: createdDeviceId } });
    });
    
    it('should allow Org Admin to update a device in their organization', async () => {
      const updateData = {
        name: 'Updated Device Name',
        description: 'Updated by RBAC test',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device.name).toBe(updateData.name);
    });
    
    it('should NOT allow Viewer to update a device in their organization', async () => {
      const updateData = {
        name: 'Should Not Update',
        description: 'Attempted by Viewer',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should NOT allow Org Admin from another organization to update the device', async () => {
      const updateData = {
        name: 'Should Not Update',
        description: 'Attempted by Wrong Org Admin',
        organizationId: testOrgTwo.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });
  
  describe('Delete Device Tests', () => {
    it('should NOT allow Viewer to delete a device', async () => {
      const response = await request(app)
        .delete(`/api/v1/devices/${testDevice.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should NOT allow Org Admin from another organization to delete the device', async () => {
      const response = await request(app)
        .delete(`/api/v1/devices/${testDevice.id}?organizationId=${testOrgTwo.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });
}); 