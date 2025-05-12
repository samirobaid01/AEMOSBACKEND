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
  return await Area.findByPk(id, {
    include: [
      {
        model: Organization,
        as: 'Organization'
      }
    ]
  });
};

// Get areas by organization ID
const getAreasByOrganization = async (organizationId) => {
  return await Area.findAll({
    where: {
      organizationId
    }
  });
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

module.exports = {
  getAllAreas,
  getAreaById,
  getAreasByOrganization,
  createArea,
  updateArea,
  deleteArea
}; 