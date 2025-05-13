const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Organization, OrganizationUser } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Organization RBAC Tests', () => {
  let orgAdminToken;
  let systemAdminToken;
  let viewerToken;
  let wrongOrgAdminToken;
  let testOrg;
  let testOrgTwo;
  
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test organizations
    testOrg = await Organization.create({
      name: 'Organization RBAC Test Organization',
      status: true,
      detail: 'Test organization for Organization RBAC testing',
      isParent: true
    });
    
    testOrgTwo = await Organization.create({
      name: 'Organization RBAC Test Organization Two',
      status: true,
      detail: 'Second test organization for Organization RBAC testing',
      isParent: true
    });
    
    // Get roles
    const orgAdminRole = await Role.findOne({ where: { name: 'Org Admin' } });
    const systemAdminRole = await Role.findOne({ where: { name: 'System Admin' } });
    const viewerRole = await Role.findOne({ where: { name: 'Viewer' } });
    
    // Create test users
    const orgAdmin = await User.create({
      userName: 'Organization RBAC Org Admin',
      email: 'org-orgadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W', // Password: test123
      status: true
    });
    
    const systemAdmin = await User.create({
      userName: 'Organization RBAC System Admin',
      email: 'org-sysadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    const viewer = await User.create({
      userName: 'Organization RBAC Viewer',
      email: 'org-viewer@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W',
      status: true
    });
    
    const wrongOrgAdmin = await User.create({
      userName: 'Organization RBAC Wrong Org Admin',
      email: 'org-wrong-orgadmin@test.com',
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
    await OrganizationUser.destroy({ where: { organizationId: [testOrg.id, testOrgTwo.id] } });
    await Organization.destroy({ where: { id: [testOrg.id, testOrgTwo.id] } });
    await User.destroy({ where: { email: ['org-orgadmin@test.com', 'org-sysadmin@test.com', 'org-viewer@test.com', 'org-wrong-orgadmin@test.com'] } });
  });
  
  // Test cases
  describe('Get Organization Tests', () => {
    it('should allow Org Admin to get their organization details', async () => {
      const response = await request(app)
        .get(`/api/v1/organizations/${testOrg.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization.id).toBe(testOrg.id);
    });
    
    it('should allow System Admin to get any organization', async () => {
      const response = await request(app)
        .get(`/api/v1/organizations/${testOrgTwo.id}?organizationId=${testOrgTwo.id}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization.id).toBe(testOrgTwo.id);
    });
    
    it('should NOT allow Viewer to get their organization details due to permission restrictions', async () => {
      const response = await request(app)
        .get(`/api/v1/organizations/${testOrg.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(403); // Viewer lacks organization.view permission in this environment
    });
    
    it('should NOT allow Org Admin to get details of another organization', async () => {
      const response = await request(app)
        .get(`/api/v1/organizations/${testOrg.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });
  
  describe('Update Organization Tests', () => {
    it('should allow Org Admin to update their organization', async () => {
      const updateData = {
        name: 'Updated Organization Name',
        detail: 'Updated by RBAC test',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization.name).toBe(updateData.name);
    });
    
    it('should NOT allow Viewer to update their organization', async () => {
      const updateData = {
        name: 'Should Not Update',
        detail: 'Attempted by Viewer',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should NOT allow Org Admin to update another organization', async () => {
      const updateData = {
        name: 'Should Not Update',
        detail: 'Attempted by Wrong Org Admin',
        organizationId: testOrg.id
      };
      
      const response = await request(app)
        .patch(`/api/v1/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });
  
  describe('Create Organization Tests', () => {
    it('should NOT allow Org Admin to create a new organization due to permission restrictions', async () => {
      const newOrgData = {
        name: 'New Organization from RBAC Test',
        status: true,
        detail: 'Created by RBAC test',
        isParent: false
      };
      
      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send(newOrgData);
      
      expect(response.status).toBe(403); // In this environment, only System Admin can create organizations
    });
    
    it('should allow System Admin to create a new organization', async () => {
      const newOrgData = {
        name: 'New Organization from System Admin RBAC Test',
        status: true,
        detail: 'Created by System Admin in RBAC test',
        isParent: false
      };
      
      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(newOrgData);
      
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization.name).toBe(newOrgData.name);
      
      // Clean up
      const createdOrgId = response.body.data.organization.id;
      await Organization.destroy({ where: { id: createdOrgId } });
    });
  });
  
  describe('Delete Organization Tests', () => {
    // Create a temporary organization to test deletion
    let tempOrg;
    
    beforeAll(async () => {
      tempOrg = await Organization.create({
        name: 'Temporary Organization for Deletion Test',
        status: true,
        detail: 'Will be deleted in test',
        isParent: false
      });
      
      // Add the org admin to this organization too
      const orgAdminUser = await User.findOne({ where: { email: 'org-orgadmin@test.com' } });
      const orgAdminRole = await Role.findOne({ where: { name: 'Org Admin' } });
      
      await OrganizationUser.create({
        userId: orgAdminUser.id,
        organizationId: tempOrg.id,
        role: orgAdminRole.id,
        status: 'active'
      });
    });
    
    afterAll(async () => {
      // Just in case deletion test fails
      await OrganizationUser.destroy({ where: { organizationId: tempOrg.id } });
      await Organization.destroy({ where: { id: tempOrg.id } });
    });
    
    it('should NOT allow Org Admin to delete an organization due to permission restrictions', async () => {
      const response = await request(app)
        .delete(`/api/v1/organizations/${tempOrg.id}?organizationId=${tempOrg.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(response.status).toBe(403); // In this environment, only System Admin can delete organizations
    });
    
    it('should NOT allow Viewer to delete an organization', async () => {
      const response = await request(app)
        .delete(`/api/v1/organizations/${testOrg.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should NOT allow Org Admin to delete another organization', async () => {
      const response = await request(app)
        .delete(`/api/v1/organizations/${testOrg.id}?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${wrongOrgAdminToken}`);
      
      expect(response.status).toBe(403); // Forbidden
    });
    
    it('should allow System Admin to delete an organization', async () => {
      // Create a new organization that the System Admin will delete
      const deleteTestOrg = await Organization.create({
        name: 'Organization to be deleted by System Admin',
        status: true,
        detail: 'Will be deleted by System Admin',
        isParent: false
      });
      
      const response = await request(app)
        .delete(`/api/v1/organizations/${deleteTestOrg.id}?organizationId=${deleteTestOrg.id}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);
      
      expect(response.status).toBe(204);
      
      // Clean up in case the test fails
      await Organization.destroy({ where: { id: deleteTestOrg.id } });
    });
  });
}); 