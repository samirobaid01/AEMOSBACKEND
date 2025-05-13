const { Area, Organization } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

// Get all areas
const getAllAreas = async (includeInactive = false) => {
  try {
    // Check if the association exists
    const hasAssociation = Area.associations && Area.associations.Organization;
    
    const query = {};
    
    // Only include active areas by default
    if (!includeInactive) {
      query.where = {
        status: {
          [Op.notIn]: ['inactive', 'archived']
        }
      };
    }
    
    // Only include the Organization if the association exists
    if (hasAssociation) {
      query.include = [
        {
          model: Organization,
          as: 'Organization'
        }
      ];
    }
    
    return await Area.findAll(query);
  } catch (error) {
    // Log the error and return an empty array instead of throwing
    console.error('Error in getAllAreas service:', error.message);
    return [];
  }
};

// Get a single area by ID
const getAreaById = async (id) => {
  try {
    // Check if the association exists
    const hasAssociation = Area.associations && Area.associations.Organization;
    
    const query = {};
    
    // Only include the Organization if the association exists
    if (hasAssociation) {
      query.include = [
        {
          model: Organization,
          as: 'Organization'
        }
      ];
    }
    
    return await Area.findByPk(id, query);
  } catch (error) {
    console.error('Error in getAreaById service:', error.message);
    throw new ApiError(500, 'Unable to fetch area: ' + error.message);
  }
};

// Get areas by organization ID
const getAreasByOrganization = async (organizationId, includeInactive = false) => {
  try {
    const query = {
      where: {
        organizationId: Number(organizationId)
      }
    };
    
    // Only include active areas by default
    if (!includeInactive) {
      query.where.status = {
        [Op.notIn]: ['inactive', 'archived']
      };
    }
    
    return await Area.findAll(query);
  } catch (error) {
    console.error(`Error in getAreasByOrganization: ${error.message}`);
    return [];
  }
};

// Create a new area
const createArea = async (areaData) => {
  // Generate UUID if not provided
  if (!areaData.uuid) {
    areaData.uuid = uuidv4();
  }
  
  // Set default status if not provided
  if (!areaData.status) {
    areaData.status = 'under_review';
  }
  
  return await Area.create(areaData);
};

// Update an area
const updateArea = async (id, areaData) => {
  const area = await Area.findByPk(id);
  
  if (!area) {
    return null;
  }
  
  await area.update(areaData);
  return area;
};

// Delete an area (soft delete)
const deleteArea = async (id) => {
  const area = await Area.findByPk(id);
  
  if (!area) {
    return false;
  }
  
  // Instead of deleting, set status to inactive
  await area.update({
    status: 'archived'
  });
  return true;
};

/**
 * Get an area with just its organization ID for ownership checking
 * @param {Number} id - Area ID
 * @returns {Promise<Object>} Area with organizationId
 */
const getAreaForOwnershipCheck = async (id) => {
  try {
    const area = await Area.findByPk(id, {
      attributes: ['id', 'organizationId'],
      raw: true
    });
    
    if (!area) {
      console.log(`Area with ID ${id} not found!`);
      return null;
    }
    
    return {
      id: area.id,
      organizationId: Number(area.organizationId)
    };
  } catch (error) {
    console.error('Error in getAreaForOwnershipCheck:', error.message);
    return null;
  }
};

/**
 * Check if an area belongs to a specific organization
 * @param {Number} areaId - Area ID
 * @param {Number} organizationId - Organization ID
 * @returns {Promise<Boolean>} True if area belongs to organization
 */
const areaBelongsToOrganization = async (areaId, organizationId) => {
  try {
    const area = await getAreaForOwnershipCheck(areaId);
    if (!area) {
      return false;
    }
    
    return area.organizationId === Number(organizationId);
  } catch (error) {
    console.error(`Error in areaBelongsToOrganization: ${error.message}`);
    return false;
  }
};

/**
 * Get areas by multiple organization IDs
 * @param {Array} organizationIds - Organization IDs to filter by
 * @param {Boolean} includeInactive - Whether to include inactive areas
 * @returns {Promise<Array>} Array of areas
 */
const getAreasByOrganizationIds = async (organizationIds, includeInactive = false) => {
  try {
    if (!organizationIds || organizationIds.length === 0) {
      return [];
    }
    
    // Convert all IDs to numbers
    const orgIds = organizationIds.map(id => Number(id));
    
    const query = {
      where: {
        organizationId: {
          [Op.in]: orgIds
        }
      }
    };
    
    // Only include active areas by default
    if (!includeInactive) {
      query.where.status = {
        [Op.notIn]: ['inactive', 'archived']
      };
    }
    
    // Include organization data
    const hasAssociation = Area.associations && Area.associations.Organization;
    if (hasAssociation) {
      query.include = [
        {
          model: Organization,
          as: 'Organization'
        }
      ];
    }
    
    return await Area.findAll(query);
  } catch (error) {
    console.error(`Error in getAreasByOrganizationIds: ${error.message}`);
    return [];
  }
};

module.exports = {
  getAllAreas,
  getAreaById,
  getAreasByOrganization,
  createArea,
  updateArea,
  deleteArea,
  getAreaForOwnershipCheck,
  areaBelongsToOrganization,
  getAreasByOrganizationIds
}; 