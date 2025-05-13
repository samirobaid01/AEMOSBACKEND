const organizationService = require('../services/organizationService');
const { ApiError } = require('../middlewares/errorHandler');

// Get all organizations
const getAllOrganizations = async (req, res, next) => {
  try {
    let organizations;
    
    // If user is a system admin, get all organizations
    if (req.isSystemAdmin) {
      organizations = await organizationService.getAllOrganizations();
    } else {
      // Otherwise, filter by the organizations the user belongs to
      if (req.userOrganizationIds && req.userOrganizationIds.length > 0) {
        organizations = await organizationService.getOrganizationsByIds(req.userOrganizationIds);
      } else {
        organizations = [];
      }
    }
    
    res.status(200).json({
      status: 'success',
      results: organizations.length,
      data: {
        organizations
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single organization by ID
const getOrganizationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organization = await organizationService.getOrganizationById(id);
    
    if (!organization) {
      return next(new ApiError(404, `Organization with ID ${id} not found`));
    }
    
    // Access is already checked by middleware, so just return the organization
    res.status(200).json({
      status: 'success',
      data: {
        organization
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new organization
const createOrganization = async (req, res, next) => {
  try {
    const organization = await organizationService.createOrganization(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        organization
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update an organization
const updateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organization = await organizationService.updateOrganization(id, req.body);
    
    if (!organization) {
      return next(new ApiError(404, `Organization with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        organization
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete an organization
const deleteOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await organizationService.deleteOrganization(id);
    
    if (!result) {
      return next(new ApiError(404, `Organization with ID ${id} not found`));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization
}; 