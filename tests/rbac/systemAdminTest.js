const request = require('supertest');
const app = require('../../src/app');
const { User, Role, Permission, RolePermission, OrganizationUser, Organization } = require('../../src/models/initModels');
const { sequelize } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('System Admin RBAC Tests', () => {
  let authToken;
  let systemAdmin;
  let sysAdminRole;
  let testOrg;
  
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test organization
    testOrg = await Organization.create({
      name: 'Test Organization',
      status: true,
      detail: 'Test organization for RBAC testing',
      isParent: true
    });
    
    // Get the System Admin role
    sysAdminRole = await Role.findOne({
      where: { name: 'System Admin' }
    });
    
    // Create test user with System Admin role
    systemAdmin = await User.create({
      userName: 'System Admin Test',
      email: 'sysadmin@test.com',
      password: '$2a$10$XpC2EvZC7fVC0ExLnUJBK.d2H9bIYfZ2f0D2.60DjrCW3Y8YQfD9W', // Password: test123
      status: true
    });
    
    // Assign System Admin role to user
    await OrganizationUser.create({
      userId: systemAdmin.id,
      organizationId: testOrg.id,
      role: sysAdminRole.id,
      status: 'active'
    });
    
    // Generate JWT token for the system admin
    authToken = jwt.sign(
      { id: systemAdmin.id, email: systemAdmin.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await OrganizationUser.destroy({ where: { userId: systemAdmin.id } });
    await User.destroy({ where: { id: systemAdmin.id } });
    await Organization.destroy({ where: { id: testOrg.id } });
  });
  
  // Test for organization management
  describe('Organization Management', () => {
    it('should allow System Admin to view all organizations', async () => {
      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should allow System Admin to create an organization', async () => {
      const newOrg = {
        name: 'New Test Organization',
        status: true,
        detail: 'Created by System Admin test'
      };
      
      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrg);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Clean up
      await Organization.destroy({ where: { name: newOrg.name } });
    });
  });
  
  // Test for device management
  describe('Device Management', () => {
    it('should allow System Admin to view all devices', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  // Test for area management
  describe('Area Management', () => {
    it('should allow System Admin to view all areas', async () => {
      const response = await request(app)
        .get('/api/v1/areas')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  // Test for role management
  describe('Role Management', () => {
    it('should allow System Admin to view all roles', async () => {
      const response = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should allow System Admin to manage permissions', async () => {
      // Create a test role
      const testRole = await Role.create({
        name: 'Test Role for Permissions',
        organizationId: testOrg.id
      });
      
      // Get a permission
      const permission = await Permission.findOne({
        where: { name: 'device.view' }
      });
      
      // Add permission to role
      const response = await request(app)
        .post(`/api/v1/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ permissionId: permission.id });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Clean up
      await RolePermission.destroy({ where: { roleId: testRole.id } });
      await Role.destroy({ where: { id: testRole.id } });
    });
  });
}); 