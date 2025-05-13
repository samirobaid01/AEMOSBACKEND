const { Area, Organization } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');

// Get all areas
const getAllAreas = async () => {
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
const getAreasByOrganization = async (organizationId) => {
  try {
    return await Area.findAll({
      where: {
        organizationId: Number(organizationId)
      }
    });
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

// Delete an area
const deleteArea = async (id) => {
  const area = await Area.findByPk(id);
  
  if (!area) {
    return false;
  }
  
  await area.destroy();
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

module.exports = {
  getAllAreas,
  getAreaById,
  getAreasByOrganization,
  createArea,
  updateArea,
  deleteArea,
  getAreaForOwnershipCheck,
  areaBelongsToOrganization
}; 