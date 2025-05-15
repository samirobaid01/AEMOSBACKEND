const { Role, Permission, RolePermission } = require('../../src/models/initModels');

describe('RBAC System Basic Tests', () => {
  test('System contains required roles', async () => {
    const roles = await Role.findAll({
      where: {
        name: ['System Admin', 'Org Admin', 'Supervisor', 'Viewer']
      }
    });
    
    expect(roles.length).toBeGreaterThan(0);
    
    // Check that we have all our expected roles
    const roleNames = roles.map(r => r.name);
    expect(roleNames).toContain('System Admin');
    expect(roleNames).toContain('Org Admin');
    expect(roleNames).toContain('Supervisor');
    expect(roleNames).toContain('Viewer');
  });
  
  test('Permissions exist in the system', async () => {
    const permissions = await Permission.findAll();
    expect(permissions.length).toBeGreaterThan(0);
    
    // Check some key permissions
    const permissionNames = permissions.map(p => p.name);
    expect(permissionNames).toContain('device.view');
    expect(permissionNames).toContain('organization.view');
    expect(permissionNames).toContain('role.assign');
  });
  
  test('RolePermission mappings exist', async () => {
    const rolePermissions = await RolePermission.findAll();
    expect(rolePermissions.length).toBeGreaterThan(0);
  });
  
  test('System Admin has permission.manage permission', async () => {
    // Get System Admin role
    const sysAdminRole = await Role.findOne({
      where: { name: 'System Admin' }
    });
    
    // Get permission.manage permission
    const managePermission = await Permission.findOne({
      where: { name: 'permission.manage' }
    });
    
    // Check mapping exists
    const mapping = await RolePermission.findOne({
      where: {
        roleId: sysAdminRole.id,
        permissionId: managePermission.id
      }
    });
    
    expect(mapping).toBeTruthy();
  });
  
  test('Viewer role has device.view but not device.create', async () => {
    // Get Viewer role
    const viewerRole = await Role.findOne({
      where: { name: 'Viewer' }
    });
    
    // Get permissions
    const viewPermission = await Permission.findOne({
      where: { name: 'device.view' }
    });
    
    const createPermission = await Permission.findOne({
      where: { name: 'device.create' }
    });
    
    // Check view mapping exists
    const viewMapping = await RolePermission.findOne({
      where: {
        roleId: viewerRole.id,
        permissionId: viewPermission.id
      }
    });
    
    // Check create mapping doesn't exist
    const createMapping = await RolePermission.findOne({
      where: {
        roleId: viewerRole.id,
        permissionId: createPermission.id
      }
    });
    
    expect(viewMapping).toBeTruthy();
    expect(createMapping).toBeFalsy();
  });
}); 