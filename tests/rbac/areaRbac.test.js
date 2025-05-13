const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Organization, OrganizationUser, Area } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Area RBAC Tests', () => {
  let orgAdminToken;
  let systemAdminToken;
  let viewerToken;
  let wrongOrgAdminToken;
  let testOrg;
  let testOrgTwo;
  let testArea;
  
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test organizations
    testOrg = await Organization.create({
      name: 'Area RBAC Test Organization',
      status: true,
      detail: 'Test organization for Area RBAC testing',
      isParent: true
    });
    
    testOrgTwo = await Organization.create({
      name: 'Area RBAC Test Organization Two',
      status: true,
      detail: 'Second test organization for Area RBAC testing',
      isParent: true
    });
    
    // Create test area
    testArea = await Area.create({
      name: 'Test Area for RBAC',
      organizationId: testOrg.id
    });
    
    // Get roles
    const orgAdminRole = await Role.findOne({ where: { name: 'Org Admin' } });
    const systemAdminRole = await Role.findOne({ where: { name: 'System Admin' } });
    const viewerRole = await Role.findOne({ where: { name: 'Viewer' } });
    
    // Create test users
    const orgAdmin = await User.create({
      userName: 'Area RBAC Org Admin',
      email: 'area-orgadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W', // Password: test123
      status: true
    });
    
    const systemAdmin = await User.create({
      userName: 'Area RBAC System Admin',
      email: 'area-sysadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    const viewer = await User.create({
      userName: 'Area RBAC Viewer',
      email: 'area-viewer@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    const wrongOrgAdmin = await User.create({
      userName: 'Area RBAC Wrong Org Admin',
      email: 'area-wrong-orgadmin@test.com',
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
    await Area.destroy({ where: { id: testArea.id } });
    await OrganizationUser.destroy({ where: { organizationId: [testOrg.id, testOrgTwo.id] } });
    await Organization.destroy({ where: { id: [testOrg.id, testOrgTwo.id] } });
    await User.destroy({ where: { email: ['area-orgadmin@test.com', 'area-sysadmin@test.com', 'area-viewer@test.com', 'area-wrong-orgadmin@test.com'] } });
  });
  
  // Test cases
  describe('Get Area Tests', () => {
    it('should allow Org Admin to get an area in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/${testArea.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.area.id).toBe(testArea.id);
    });
    
    it('should allow System Admin to get any area', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/${testArea.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.area.id).toBe(testArea.id);
    });
    
    it('should allow Viewer to get an area in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/${testArea.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.area.id).toBe(testArea.id);
    });
    
    it('should NOT allow Org Admin from another organization to get the area', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/${testArea.id}?organizationId=${testOrgTwo.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`);
      
      expect(response.status).toBe(403); // Forbidden or 404 Not Found
    });
    
    it('should require organizationId parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/${testArea.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(400); // Bad Request
    });
    
    it('should allow Org Admin to get areas by organization', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/organization/${testOrg.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data.areas)).toBe(true);
      
      // Check if test area is in the response
      const foundArea = response.body.data.areas.find(area => area.id === testArea.id);
      expect(foundArea).toBeTruthy();
    });
  });
  
  describe('Create and Update Area Tests', () => {
    it('should allow Org Admin to create an area in their organization', async () => {
      const newAreaData = {
        name: 'New Test Area for RBAC',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .post('/api/v1/areas')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(newAreaData);
      
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.area.name).toBe(newAreaData.name);
      
      // Clean up
      const createdAreaId = response.body.data.area.id;
      await Area.destroy({ where: { id: createdAreaId } });
    });
    
    it('should allow Org Admin to update an area in their organization', async () => {
      const updateData = {
        name: 'Updated Area Name',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/areas/${testArea.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.area.name).toBe(updateData.name);
    });
    
    it('should NOT allow Viewer to update an area in their organization', async () => {
      const updateData = {
        name: 'Should Not Update',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/areas/${testArea.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should NOT allow Org Admin from another organization to update the area', async () => {
      const updateData = {
        name: 'Should Not Update',
        organizationId: testOrgTwo.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/areas/${testArea.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });
  
  describe('Delete Area Tests', () => {
    // Create a temporary area to test deletion
    let tempArea;
    
    beforeAll(async () => {
      tempArea = await Area.create({
        name: 'Temporary Area for Deletion Test',
        organizationId: testOrg.id
      });
    });
    
    afterAll(async () => {
      // Just in case deletion test fails
      await Area.destroy({ where: { id: tempArea.id } });
    });
    
    it('should allow Org Admin to delete an area in their organization', async () => {
      const response = await request(app)
        .delete(`/api/v1/areas/${tempArea.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(204);
    });
    
    it('should NOT allow Viewer to delete an area', async () => {
      const response = await request(app)
        .delete(`/api/v1/areas/${testArea.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should NOT allow Org Admin from another organization to delete the area', async () => {
      const response = await request(app)
        .delete(`/api/v1/areas/${testArea.id}?organizationId=${testOrgTwo.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });
}); 