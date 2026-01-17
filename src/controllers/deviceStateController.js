const deviceStateService = require('../services/deviceStateService');
const deviceService = require('../services/deviceService');
const { ApiError } = require('../middlewares/errorHandler');
const roleService = require('../services/roleService');
const logger = require('../utils/logger');

// Get all device state types
const getAllStateTypes = async (req, res, next) => {
  try {
    const { deviceType } = req.query;
    console.log(`Getting all device state types${deviceType ? ` for device type: ${deviceType}` : ''}`);
    
    const stateTypes = await deviceStateService.getAllStateTypes(deviceType);
    
    res.status(200).json({
      status: 'success',
      results: stateTypes.length,
      data: { stateTypes }
    });
  } catch (error) {
    console.error('Error in getAllStateTypes:', error);
    next(error);
  }
};

// Create a new state type
const createStateType = async (req, res, next) => {
  try {
    const stateTypeData = req.body;
    console.log(`Creating new device state type: ${stateTypeData.name}`);
    
    const stateType = await deviceStateService.createStateType(stateTypeData);
    
    res.status(201).json({
      status: 'success',
      data: { stateType }
    });
  } catch (error) {
    console.error('Error in createStateType:', error);
    next(error);
  }
};

// Get current state for a device
const getCurrentDeviceState = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { organizationId } = req.query;
    console.log(`Getting current state for device ${deviceId} in organization ${organizationId}`);
    
    // Check if device exists and belongs to organization
    // Note: This check should be handled by the checkResourceOwnership middleware
    const device = await deviceService.getDeviceById(deviceId);
    
    if (!device) {
      return next(new ApiError(404, `Device with ID ${deviceId} not found`));
    }
    
    const state = await deviceStateService.getCurrentDeviceState(deviceId);
    
    res.status(200).json({
      status: 'success',
      data: { state }
    });
  } catch (error) {
    console.error('Error in getCurrentDeviceState:', error);
    next(error);
  }
};

// Get device state history
const getDeviceStateHistory = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { limit, startDate, endDate, organizationId } = req.query;
    console.log(`Getting state history for device ${deviceId} in organization ${organizationId}`);
    
    // Check if device exists and belongs to organization
    // Note: This check should be handled by the checkResourceOwnership middleware
    const device = await deviceService.getDeviceById(deviceId);
    
    if (!device) {
      return next(new ApiError(404, `Device with ID ${deviceId} not found`));
    }
    
    const states = await deviceStateService.getDeviceStateHistory(
      deviceId, 
      limit ? parseInt(limit) : 1000,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.status(200).json({
      status: 'success',
      results: states.length,
      data: { states }
    });
  } catch (error) {
    console.error('Error in getDeviceStateHistory:', error);
    next(error);
  }
};

// Create a new device state
const createDeviceState = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    logger.info(`Creating device state for device ${deviceId}:`, req.body);
    const state = await deviceStateService.createDeviceState(deviceId, req.body);
    res.status(201).json({
      status: 'success',
      data: state
    });
  } catch (error) {
    logger.error('Error in createDeviceState:', error);
    next(error);
  }
};

// Create a state transition rule
const createStateTransition = async (req, res, next) => {
  try {
    const transitionData = req.body;
    console.log(`Creating state transition rule from state ${transitionData.fromStateId} to ${transitionData.toStateId} for device type ${transitionData.deviceType}`);
    
    const transition = await deviceStateService.createStateTransition(transitionData);
    
    res.status(201).json({
      status: 'success',
      data: { transition }
    });
  } catch (error) {
    console.error('Error in createStateTransition:', error);
    next(error);
  }
};

const getAllDeviceStates = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const states = await deviceStateService.getAllDeviceStates(deviceId);
    res.status(200).json({
      status: 'success',
      data: states
    });
  } catch (error) {
    logger.error('Error in getAllDeviceStates:', error);
    next(error);
  }
};

const getDeviceStateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const state = await deviceStateService.getDeviceStateById(id);
    res.status(200).json({
      status: 'success',
      data: state
    });
  } catch (error) {
    logger.error('Error in getDeviceStateById:', error);
    next(error);
  }
};

const updateDeviceState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const state = await deviceStateService.updateDeviceState(id, req.body);
    res.status(200).json({
      status: 'success',
      data: state
    });
  } catch (error) {
    logger.error('Error in updateDeviceState:', error);
    next(error);
  }
};

const deleteDeviceState = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deviceStateService.deleteDeviceState(id);
    res.status(200).json({
      status: 'success',
      message: 'Device state deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteDeviceState:', error);
    next(error);
  }
};

module.exports = {
  getAllStateTypes,
  createStateType,
  getCurrentDeviceState,
  getDeviceStateHistory,
  createDeviceState,
  createStateTransition,
  getAllDeviceStates,
  getDeviceStateById,
  updateDeviceState,
  deleteDeviceState
}; 