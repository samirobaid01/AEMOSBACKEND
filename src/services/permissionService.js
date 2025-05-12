const { Permission, Role, RolePermission, User, OrganizationUser } = require('../models/initModels');
const { sequelize } = require('../models/initModels');

/**
 * Get all permissions
 * @returns {Promise<Array>} Array of permissions
 */
async function getAllPermissions() {
  return await Permission.findAll();
}

/**
 * Get permissions for a specific role
 * @param {Number} roleId - ID of the role
 * @returns {Promise<Array>} Array of permissions for the role
 */
async function getPermissionsByRoleId(roleId) {
  const role = await Role.findByPk(roleId, {
    include: [{ model: Permission }]
  });
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  return role.Permissions;
}

/**
 * Get effective permissions for a user
 * @param {Number} userId - ID of the user
 * @param {Number} organizationId - ID of the organization (optional)
 * @returns {Promise<Array>} Array of effective permissions
 */
async function getUserEffectivePermissions(userId, organizationId = null) {
  const query = {
    attributes: ['Permission.id', 'Permission.name', 'Permission.description'],
    include: [
      {
        model: Role,
        required: true,
        include: [
          {
            model: OrganizationUser,
            where: { userId },
            required: true
          }
        ]
      }
    ],
    group: ['Permission.id']
  };
  
  if (organizationId) {
    query.include[0].include[0].where.organizationId = organizationId;
  }
  
  const permissions = await Permission.findAll(query);
  return permissions;
}

/**
 * Check if a user has a specific permission
 * @param {Number} userId - ID of the user
 * @param {String} permissionName - Name of the permission to check
 * @param {Number} organizationId - ID of the organization (optional)
 * @returns {Promise<Boolean>} True if user has permission
 */
async function userHasPermission(userId, permissionName, organizationId = null) {
  const query = `
    SELECT COUNT(*) as count
    FROM User u
    JOIN OrganizationUser ou ON u.id = ou.userId
    JOIN Role r ON ou.role = r.id
    JOIN RolePermission rp ON r.id = rp.roleId
    JOIN Permission p ON rp.permissionId = p.id
    WHERE u.id = :userId AND p.name = :permissionName
    ${organizationId ? 'AND ou.organizationId = :organizationId' : ''}
  `;
  
  const params = { userId, permissionName };
  if (organizationId) {
    params.organizationId = organizationId;
  }
  
  const [results] = await sequelize.query(query, { 
    replacements: params,
    type: sequelize.QueryTypes.SELECT 
  });
  
  return results.count > 0;
}

/**
 * Add permission to a role
 * @param {Number} roleId - ID of the role
 * @param {Number} permissionId - ID of the permission
 * @returns {Promise<Object>} Created role-permission association
 */
async function addPermissionToRole(roleId, permissionId) {
  return await RolePermission.create({
    roleId,
    permissionId
  });
}

/**
 * Remove permission from a role
 * @param {Number} roleId - ID of the role
 * @param {Number} permissionId - ID of the permission
 * @returns {Promise<Number>} Number of deleted records
 */
async function removePermissionFromRole(roleId, permissionId) {
  return await RolePermission.destroy({
    where: {
      roleId,
      permissionId
    }
  });
}

module.exports = {
  getAllPermissions,
  getPermissionsByRoleId,
  getUserEffectivePermissions,
  userHasPermission,
  addPermissionToRole,
  removePermissionFromRole
}; 