const { Role, Permission, OrganizationUser, User, Organization } = require('../models/initModels');
const permissionService = require('./permissionService');
const { sequelize } = require('../models/initModels');

/**
 * Get all roles
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of roles
 */
async function getAllRoles(options = {}) {
  try {
    return await Role.findAll(options);
  } catch (error) {
    console.error('Error in roleService.getAllRoles:', error.message);
    return [];
  }
}

/**
 * Get a role by ID
 * @param {Number} id - ID of the role
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Role object
 */
async function getRoleById(id, options = {}) {
  return await Role.findByPk(id, options);
}

/**
 * Get roles for an organization
 * @param {Number} organizationId - ID of the organization
 * @returns {Promise<Array>} Array of roles for the organization
 */
async function getRolesByOrganizationId(organizationId) {
  return await Role.findAll({
    where: {
      organizationId
    }
  });
}

/**
 * Get system roles (not tied to any organization)
 * @returns {Promise<Array>} Array of system roles
 */
async function getSystemRoles() {
  return await Role.findAll({
    where: {
      organizationId: null
    }
  });
}

/**
 * Get roles for a user
 * @param {Number} userId - ID of the user
 * @returns {Promise<Array>} Array of user roles
 */
async function getUserRoles(userId) {
  const organizationUsers = await OrganizationUser.findAll({
    where: { userId },
    include: [
      { 
        model: Role,
        attributes: ['id', 'name', 'organizationId']
      }
    ]
  });
  
  return organizationUsers.map(ou => ou.Role);
}

/**
 * Create a new role
 * @param {Object} roleData - Role data
 * @returns {Promise<Object>} Created role
 */
async function createRole(roleData) {
  return await Role.create(roleData);
}

/**
 * Update a role
 * @param {Number} roleId - ID of the role
 * @param {Object} roleData - Updated role data
 * @returns {Promise<Object>} Updated role
 */
async function updateRole(roleId, roleData) {
  const role = await Role.findByPk(roleId);
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  return await role.update(roleData);
}

/**
 * Delete a role
 * @param {Number} roleId - ID of the role
 * @returns {Promise<Number>} Number of deleted records
 */
async function deleteRole(roleId) {
  return await Role.destroy({
    where: {
      id: roleId
    }
  });
}

/**
 * Assign a role to a user for an organization
 * @param {Number} userId - ID of the user
 * @param {Number} roleId - ID of the role
 * @param {Number} organizationId - ID of the organization
 * @returns {Promise<Object>} Updated or created organization user record
 */
async function assignRoleToUser(userId, roleId, organizationId) {
  // Check if user exists
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check if role exists
  const role = await Role.findByPk(roleId);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Find or create the organization user record
  const [orgUser, created] = await OrganizationUser.findOrCreate({
    where: {
      userId,
      organizationId
    },
    defaults: {
      role: roleId,
      status: 'active'
    }
  });
  
  // If record already exists, update the role
  if (!created) {
    await orgUser.update({ role: roleId });
  }
  
  return orgUser;
}

/**
 * Remove a role from a user for an organization
 * @param {Number} userId - ID of the user
 * @param {Number} organizationId - ID of the organization
 * @returns {Promise<Number>} Number of deleted records
 */
async function removeUserRole(userId, organizationId) {
  return await OrganizationUser.destroy({
    where: {
      userId,
      organizationId
    }
  });
}

/**
 * Check if a user is a System Admin
 * @param {Number} userId - ID of the user
 * @returns {Promise<Boolean>} True if user is a System Admin
 */
async function userIsSystemAdmin(userId) {
  const query = `
    SELECT COUNT(*) as count
    FROM User u
    JOIN OrganizationUser ou ON u.id = ou.userId
    JOIN Role r ON ou.role = r.id
    WHERE u.id = :userId AND r.name = 'System Admin'
  `;
  
  const [result] = await sequelize.query(query, { 
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT 
  });
  
  return result.count > 0;
}

/**
 * Get all organizations a user belongs to
 * @param {Number} userId - ID of the user
 * @returns {Promise<Array>} Array of organizations
 */
async function getUserOrganizations(userId) {
  try {
    console.log(`Getting organizations for user ${userId}`);
    
    // Use raw SQL query instead of ORM association to avoid potential issues
    const query = `
      SELECT o.*
      FROM Organization o
      JOIN OrganizationUser ou ON o.id = ou.organizationId
      WHERE ou.userId = :userId
    `;
    
    const organizations = await sequelize.query(query, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
      model: Organization,
      mapToModel: true
    });
    
    console.log(`Found ${organizations.length} organizations for user ${userId}`);
    return organizations;
  } catch (error) {
    console.error(`Error in getUserOrganizations: ${error.message}`);
    console.error(error.stack);
    return [];
  }
}

module.exports = {
  getAllRoles,
  getRoleById,
  getRolesByOrganizationId,
  getSystemRoles,
  getUserRoles,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  removeUserRole,
  userIsSystemAdmin,
  getUserOrganizations
}; 