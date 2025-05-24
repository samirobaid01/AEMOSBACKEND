const { Device, DeviceState, DeviceStateInstance } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');

class DeviceStateInstanceService {
  async createInstance(data, userId) {
    const { deviceUuid, stateName, value, initiatedBy } = data;

    // Find device by UUID
    const device = await Device.findOne({
      where: { uuid: deviceUuid }
    });

    if (!device) {
      throw new ApiError(404, 'Device not found');
    }

    // Find device state by device ID and state name
    const deviceState = await DeviceState.findOne({
      where: {
        deviceId: device.id,
        stateName
      }
    });

    if (!deviceState) {
      throw new ApiError(404, `State '${stateName}' not found for this device`);
    }

    // Validate value against allowedValues if defined
    if (deviceState.allowedValues) {
      const allowedValues = JSON.parse(deviceState.allowedValues);
      if (Array.isArray(allowedValues) && !allowedValues.includes(value)) {
        throw new ApiError(400, `Value '${value}' is not allowed for this state. Allowed values: ${allowedValues.join(', ')}`);
      }
    }

    // Get current state instance if exists
    const currentInstance = await DeviceStateInstance.findOne({
      where: {
        deviceStateId: deviceState.id,
        toTimestamp: null
      }
    });

    // Close current state instance if exists
    if (currentInstance) {
      await currentInstance.update({
        toTimestamp: new Date()
      });
    }

    // Create new state instance
    const instance = await DeviceStateInstance.create({
      deviceStateId: deviceState.id,
      value,
      fromTimestamp: new Date(),
      initiatedBy: initiatedBy || 'user',
      initiatorId: userId
    });

    // Return both instance and metadata for notifications
    return {
      instance,
      metadata: {
        deviceId: device.id,
        deviceUuid: device.uuid,
        deviceName: device.name,
        deviceType: device.deviceType,
        isCritical: device.isCritical,
        stateName,
        oldValue: currentInstance ? currentInstance.value : null,
        newValue: value,
        initiatedBy: initiatedBy || 'user',
        initiatorId: userId
      }
    };
  }

  async closeCurrentInstance(deviceStateId) {
    const now = new Date();
    await DeviceStateInstance.update(
      { toTimestamp: now },
      {
        where: {
          deviceStateId,
          toTimestamp: null
        }
      }
    );
  }

  async getCurrentInstance(deviceStateId) {
    return await DeviceStateInstance.findOne({
      where: {
        deviceStateId,
        toTimestamp: null
      },
      order: [['fromTimestamp', 'DESC']],
      include: [{
        model: DeviceState,
        as: 'state',
        include: [{
          model: Device,
          as: 'device',
          attributes: ['name', 'uuid']
        }]
      }]
    });
  }

  async getInstanceHistory(deviceStateId, limit = 10) {
    return await DeviceStateInstance.findAll({
      where: { deviceStateId },
      order: [['fromTimestamp', 'DESC']],
      limit,
      include: [{
        model: DeviceState,
        as: 'state',
        include: [{
          model: Device,
          as: 'device',
          attributes: ['name', 'uuid']
        }]
      }]
    });
  }
}

module.exports = new DeviceStateInstanceService(); 