const areaService = require('../services/areaService');
const { ApiError } = require('../middlewares/errorHandler');

// Get all areas
const getAllAreas = async (req, res, next) => {
  try {
    const areas = await areaService.getAllAreas();
    res.status(200).json({
      status: 'success',
      results: areas.length,
      data: {
        areas
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single area by ID
const getAreaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await areaService.getAreaById(id);
    
    if (!area) {
      return next(new ApiError(404, `Area with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        area
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get areas by organization ID
const getAreasByOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const areas = await areaService.getAreasByOrganization(organizationId);
    
    res.status(200).json({
      status: 'success',
      results: areas.length,
      data: {
        areas
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new area
const createArea = async (req, res, next) => {
  try {
    const area = await areaService.createArea(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        area
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update an area
const updateArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await areaService.updateArea(id, req.body);
    
    if (!area) {
      return next(new ApiError(404, `Area with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        area
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete an area
const deleteArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await areaService.deleteArea(id);
    
    if (!result) {
      return next(new ApiError(404, `Area with ID ${id} not found`));
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
  getAllAreas,
  getAreaById,
  getAreasByOrganization,
  createArea,
  updateArea,
  deleteArea
}; 