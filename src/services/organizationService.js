const { Organization } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');

// Get all organizations
const getAllOrganizations = async () => {
  return await Organization.findAll({
    include: [{
      model: Organization,
      as: 'children'
    }]
  });
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

// Delete an organization
const deleteOrganization = async (id) => {
  const organization = await Organization.findByPk(id);
  
  if (!organization) {
    return false;
  }
  
  await organization.destroy();
  return true;
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization
}; 