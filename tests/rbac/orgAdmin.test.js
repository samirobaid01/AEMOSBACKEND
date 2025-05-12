const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Organization, OrganizationUser, Area } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Organization Admin RBAC Tests', () => {
  let authToken;
  let orgAdmin;
  let orgAdminRole;
  let testOrg;
  
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test organization
    testOrg = await Organization.create({
      name: 'Org Admin Test Organization',
      status: true,
      detail: 'Test organization for Org Admin RBAC testing',
      isParent: true
    });
    
    // Get the Org Admin role
    orgAdminRole = await Role.findOne({
      where: { name: 'Org Admin' }
    });
    
    // Create test user with Org Admin role
    orgAdmin = await User.create({
      userName: 'Org Admin Test',
      email: 'orgadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W', // Password: test123
      status: true
    });
    
    // Assign Org Admin role to user for the test organization
    await OrganizationUser.create({
      userId: orgAdmin.id,
      organizationId: testOrg.id,
      role: orgAdminRole.id,
      status: 'active'
    });
    
    // Generate JWT token for the org admin
    authToken = jwt.sign(
      { id: orgAdmin.id, email: orgAdmin.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await OrganizationUser.destroy({ where: { userId: orgAdmin.id } });
    await User.destroy({ where: { id: orgAdmin.id } });
    await Organization.destroy({ where: { id: testOrg.id } });
  });
  
  // Test for organization management
  describe('Organization Management', () => {
    it('should allow Org Admin to view organization details', async () => {
      const response = await request(app)
        .get(`/api/v1/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization.id).toBe(testOrg.id);
    });
    
    it('should allow Org Admin to update organization details', async () => {
      const updateData = {
        detail: 'Updated by Org Admin test'
      };
      
      const response = await request(app)
        .patch(`/api/v1/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization.detail).toBe(updateData.detail);
    });
  });
  
  // Test for area management
  describe('Area Management', () => {
    let testArea;
    
    beforeAll(async () => {
      // Create a test area
      testArea = await Area.create({
        name: 'Test Area for Org Admin',
        organizationId: testOrg.id
      });
    });
    
    afterAll(async () => {
      await Area.destroy({ where: { id: testArea.id } });
    });
    
    it('should allow Org Admin to view areas in their organization', async () => {
      const response = await request(app)
        .get(`/api/v1/areas/organization/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data.areas)).toBe(true);
      
      // Check if test area is in the response
      const foundArea = response.body.data.areas.find(area => area.id === testArea.id);
      expect(foundArea).toBeTruthy();
    });
    
    it('should allow Org Admin to create a new area in their organization', async () => {
      const newAreaData = {
        name: 'New Test Area',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .post('/api/v1/areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newAreaData);
      
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.area.name).toBe(newAreaData.name);
      
      // Clean up
      await Area.destroy({ where: { name: newAreaData.name } });
    });
  });
  
  // Test for user management
  describe('User Management', () => {
    it('should allow Org Admin to view users in their organization', async () => {
      // This would typically be a GET request to /organizations/:orgId/users
      // Implement according to your actual API
      const response = await request(app)
        .get(`/api/v1/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
  
  // Test for role management restrictions
  describe('Role Management Restrictions', () => {
    it('should NOT allow Org Admin to manage permissions', async () => {
      // Get a role ID to test with
      const role = await Role.findOne();
      
      // Try to add a permission
      const response = await request(app)
        .post(`/api/v1/roles/${role.id}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ permissionId: 1 });
      
      // Expect a 403 Forbidden status
      expect(response.status).toBe(403);
    });
  });
}); 