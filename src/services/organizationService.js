const { Organization } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { sequelize } = require('../models/initModels');
const { Op } = require('sequelize');

// Get all organizations
const getAllOrganizations = async (includeInactive = false) => {
  const query = {
    include: [{
      model: Organization,
      as: 'children'
    }]
  };
  
  // Only include active organizations by default
  if (!includeInactive) {
    query.where = {
      status: {
        [Op.notIn]: ['inactive', 'archived']
      }
    };
  }
  
  return await Organization.findAll(query);
};

// Get a single organization by ID
const getOrganizationById = async (id) => {
  return await Organization.findByPk(id, {
    include: [{
      model: Organization,
      as: 'children'
    }]
  });
};

// Create a new organization
const createOrganization = async (organizationData) => {
  // Set timestamps if not provided
  const now = new Date();
  if (!organizationData.createdAt) {
    organizationData.createdAt = now;
  }
  if (!organizationData.updatedAt) {
    organizationData.updatedAt = now;
  }
  
  // Set default status if not provided
  if (!organizationData.status) {
    organizationData.status = 'pending';
  }
  
  return await Organization.create(organizationData);
};

// Update an organization
const updateOrganization = async (id, organizationData) => {
  // Update timestamp
  organizationData.updatedAt = new Date();
  
  const organization = await Organization.findByPk(id);
  
  if (!organization) {
    return null;
  }
  
  await organization.update(organizationData);
  return organization;
};

// Delete an organization (soft delete)
const deleteOrganization = async (id) => {
  const organization = await Organization.findByPk(id);
  
  if (!organization) {
    return false;
  }
  
  // Instead of deleting, set status to inactive
  await organization.update({
    status: 'archived',
    updatedAt: new Date()
  });
  return true;
};

/**
 * Get organization for ownership check
 * @param {Number} id - Organization ID
 * @returns {Promise<Object|null>} Organization with its ID
 */
const getOrganizationForOwnershipCheck = async (id) => {
  try {
    const organization = await Organization.findByPk(id, {
      attributes: ['id']
    });
    
    if (!organization) {
      return null;
    }
    
    // For organizations, the organizationId is its own id
    return {
      id: organization.id,
      organizationId: organization.id
    };
  } catch (error) {
    console.error(`Error in getOrganizationForOwnershipCheck: ${error.message}`);
    return null;
  }
};

/**
 * Get parent organization of an organization
 * @param {Number} id - Organization ID
 * @returns {Promise<Number|null>} Parent organization ID or null
 */
const getParentOrganization = async (id) => {
  try {
    const organization = await Organization.findByPk(id, {
      attributes: ['parentId']
    });
    
    if (!organization) {
      return null;
    }
    
    return organization.parentId;
  } catch (error) {
    console.error(`Error in getParentOrganization: ${error.message}`);
    return null;
  }
};

/**
 * Get organizations by their IDs
 * @param {Array} ids - Array of organization IDs
 * @returns {Promise<Array>} Array of organizations
 */
const getOrganizationsByIds = async (ids) => {
  if (!ids || ids.length === 0) {
    return [];
  }
  
  const query = {
    where: {
      id: {
        [Op.in]: ids
      }
    },
    include: [{
      model: Organization,
      as: 'children'
    }]
  };
  
  return await Organization.findAll(query);
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationForOwnershipCheck,
  getParentOrganization,
  getOrganizationsByIds
}; 