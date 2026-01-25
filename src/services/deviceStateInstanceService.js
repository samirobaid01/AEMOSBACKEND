const { Device, DeviceState, DeviceStateInstance } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const metricsManager = require('../utils/metricsManager');
const sequelize = require('../config/database');
const logger = require('../utils/logger');

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

    // Record device state change metric
    try {
      const getOrganizationId = async (deviceId) => {
        try {
          const query = `
            SELECT a.organizationId
            FROM AreaDevice ad
            JOIN Area a ON ad.areaId = a.id
            WHERE ad.deviceId = ?
            LIMIT 1
          `;
          const results = await sequelize.query(query, {
            replacements: [deviceId],
            type: sequelize.QueryTypes.SELECT
          });
          return results && results.length > 0 ? String(results[0].organizationId) : 'unknown';
        } catch (err) {
          return 'unknown';
        }
      };

      const organizationId = await getOrganizationId(device.id);
      metricsManager.incrementCounter('device_state_changes_total', {
        organizationId: organizationId
      });
    } catch (err) {
      logger.warn('Failed to record device state change metric', { error: err.message });
    }

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