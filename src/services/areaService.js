const { Area, Organization } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');

// Get all areas
const getAllAreas = async () => {
  return await Area.findAll({
    include: [
      {
        model: Organization,
        as: 'Organization'
      }
    ]
  });
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