const { 
  Device, 
  DeviceState, 
  DeviceStateType, 
  DeviceStateTransition,
  User,
  sequelize 
} = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * Get all state types
 * @param {String} deviceType - Optional filter by device type
 * @returns {Promise<Array>} Array of state types
 */
const getAllStateTypes = async (deviceType = null) => {
  try {
    const query = {};
    
    // If deviceType is provided, filter by it
    if (deviceType) {
      query.where = {
        deviceType: deviceType
      };
    }
    
    return await DeviceStateType.findAll(query);
  } catch (error) {
    console.error('Error in getAllStateTypes service:', error.message);
    return [];
  }
};

/**
 * Get a single state type by ID
 * @param {Number} id - State type ID
 * @returns {Promise<Object>} State type object or null
 */
const getStateTypeById = async (id) => {
  try {
    return await DeviceStateType.findByPk(id);
  } catch (error) {
    console.error('Error in getStateTypeById service:', error.message);
    return null;
  }
};

/**
 * Create a new state type
 * @param {Object} stateTypeData - State type data
 * @returns {Promise<Object>} Created state type
 */
const createStateType = async (stateTypeData) => {
  return await DeviceStateType.create(stateTypeData);
};

/**
 * Get current state for a device
 * @param {Number} deviceId - Device ID
 * @returns {Promise<Object>} Current device state or null
 */
const getCurrentDeviceState = async (deviceId) => {
  try {
    return await DeviceState.findOne({
      where: { 
        deviceId, 
        isCurrent: true 
      },
      include: [
        {
          model: DeviceStateType,
          attributes: ['id', 'name', 'valueType', 'description']
        }
      ]
    });
  } catch (error) {
    console.error(`Error getting current state for device ${deviceId}:`, error.message);
    return null;
  }
};

/**
 * Get device state history
 * @param {Number} deviceId - Device ID
 * @param {Number} limit - Max number of records to return
 * @param {Date} startDate - Start date for history filter
 * @param {Date} endDate - End date for history filter
 * @returns {Promise<Array>} Array of device states
 */
const getDeviceStateHistory = async (deviceId, limit = 100, startDate = null, endDate = null) => {
  try {
    const query = {
      where: { deviceId },
      include: [
        {
          model: DeviceStateType,
          attributes: ['id', 'name', 'valueType', 'description']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limit
    };

    // Add date range filters if provided
    if (startDate || endDate) {
      query.where.createdAt = {};
      
      if (startDate) {
        query.where.createdAt.$gte = startDate;
      }
      
      if (endDate) {
        query.where.createdAt.$lte = endDate;
      }
    }

    return await DeviceState.findAll(query);
  } catch (error) {
    console.error(`Error getting state history for device ${deviceId}:`, error.message);
    return [];
  }
};

/**
 * Create a new device state
 * @param {Object} stateData - Device state data
 * @returns {Promise<Object>} Created device state
 */
const createDeviceState = async (stateData) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if device exists
    const device = await Device.findByPk(stateData.deviceId);
    if (!device) {
      throw new ApiError(404, `Device with ID ${stateData.deviceId} not found`);
    }
    
    // Check if state type exists
    const stateType = await DeviceStateType.findByPk(stateData.stateTypeId);
    if (!stateType) {
      throw new ApiError(404, `State type with ID ${stateData.stateTypeId} not found`);
    }
    
    // If this is set to be the current state, check for state transition validity
    if (stateData.isCurrent) {
      const currentState = await getCurrentDeviceState(stateData.deviceId);
      
      if (currentState) {
        // Check if this transition is allowed
        const isValidTransition = await isAllowedTransition(
          device.deviceType,
          currentState.stateTypeId,
          stateData.stateTypeId
        );
        
        if (!isValidTransition) {
          throw new ApiError(400, `Transition from state ${currentState.stateTypeId} to ${stateData.stateTypeId} is not allowed for ${device.deviceType} devices`);
        }
        
        // Update transition time if we have a current state
        const startTime = new Date(currentState.createdAt);
        const endTime = new Date();
        stateData.transitionTimeMs = endTime.getTime() - startTime.getTime();
      }
    }
    
    // Create the new state
    const deviceState = await DeviceState.create(stateData, { transaction });
    
    // Update the device with the new state if needed
    if (stateData.isCurrent) {
      await device.update({
        updatedAt: new Date(),
        lastHeartbeat: new Date()
      }, { transaction });
    }
    
    await transaction.commit();
    return deviceState;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Check if a state transition is allowed
 * @param {String} deviceType - Device type
 * @param {Number} fromStateId - From state ID
 * @param {Number} toStateId - To state ID
 * @returns {Promise<Boolean>} True if transition is allowed
 */
const isAllowedTransition = async (deviceType, fromStateId, toStateId) => {
  // If same state, always allowed
  if (fromStateId === toStateId) {
    return true;
  }
  
  try {
    const transition = await DeviceStateTransition.findOne({
      where: {
        deviceType,
        fromStateId,
        toStateId
      }
    });
    
    // If no rule defined, allow by default
    if (!transition) {
      return true;
    }
    
    return transition.isAllowed;
  } catch (error) {
    console.error('Error checking state transition:', error.message);
    return false;
  }
};

/**
 * Create a state transition rule
 * @param {Object} transitionData - Transition data
 * @returns {Promise<Object>} Created transition rule
 */
const createStateTransition = async (transitionData) => {
  return await DeviceStateTransition.create(transitionData);
};

module.exports = {
  getAllStateTypes,
  getStateTypeById,
  createStateType,
  getCurrentDeviceState,
  getDeviceStateHistory,
  createDeviceState,
  isAllowedTransition,
  createStateTransition
}; 