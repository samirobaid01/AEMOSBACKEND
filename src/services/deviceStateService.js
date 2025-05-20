const { Device, DeviceState } = require('../models/initModels');
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

class DeviceStateService {
  async getAllDeviceStates(deviceId) {
    return await DeviceState.findAll({
      where: { deviceId },
      include: [{
        model: Device,
        as: 'device',
        attributes: ['name', 'uuid']
      }]
    });
  }

  async getDeviceStateById(id) {
    const state = await DeviceState.findByPk(id, {
      include: [{
        model: Device,
        as: 'device',
        attributes: ['name', 'uuid']
      }]
    });
    
    if (!state) {
      throw new ApiError(404, 'Device state not found');
    }
    
    return state;
  }

  async createDeviceState(deviceId, data) {
    // Check if device exists
    const device = await Device.findByPk(deviceId);
    if (!device) {
      throw new ApiError(404, 'Device not found');
    }

    // Check if state with same name already exists for this device
    const existingState = await DeviceState.findOne({
      where: {
        deviceId,
        stateName: data.stateName
      }
    });

    if (existingState) {
      throw new ApiError(409, `State '${data.stateName}' already exists for this device`);
    }

    // Convert allowedValues array to JSON string if it exists
    const stateData = {
      ...data,
      deviceId,
      allowedValues: data.allowedValues ? JSON.stringify(data.allowedValues) : null
    };

    return await DeviceState.create(stateData);
  }

  async updateDeviceState(id, data) {
    const state = await this.getDeviceStateById(id);
    
    // If changing stateName, check for uniqueness
    if (data.stateName && data.stateName !== state.stateName) {
      const existingState = await DeviceState.findOne({
        where: {
          deviceId: state.deviceId,
          stateName: data.stateName
        }
      });

      if (existingState) {
        throw new ApiError(409, `State '${data.stateName}' already exists for this device`);
      }
    }

    // Convert allowedValues array to JSON string if it exists
    const updateData = {
      ...data,
      allowedValues: data.allowedValues ? JSON.stringify(data.allowedValues) : undefined
    };

    await state.update(updateData);
    return await this.getDeviceStateById(id);
  }

  async deleteDeviceState(id) {
    const state = await this.getDeviceStateById(id);
    await state.destroy();
    return true;
  }

  async getDeviceStateByName(deviceId, stateName) {
    const state = await DeviceState.findOne({
      where: {
        deviceId,
        stateName
      }
    });

    if (!state) {
      throw new ApiError(404, `State '${stateName}' not found for this device`);
    }

    return state;
  }
}

module.exports = new DeviceStateService();