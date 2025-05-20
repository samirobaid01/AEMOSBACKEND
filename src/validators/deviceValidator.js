const Joi = require('joi');

// Device validation schemas
const allowedStatuses = ['active', 'inactive', 'pending', 'maintenance', 'faulty', 'retired'];
const allowedDeviceTypes = ['actuator', 'controller', 'gateway', 'sensor_hub', 'hybrid'];
const allowedControlTypes = ['binary', 'percentage', 'multistate', 'custom'];
const allowedProtocols = ['wifi', 'ble', 'lorawan', 'zigbee', 'modbus', 'mqtt', 'http', 'coap'];
const deviceSchema = {
  create: Joi.object({
    name: Joi.string().max(50).required(),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...allowedStatuses).default('pending'),
    uuid: Joi.string().uuid().allow('', null),
    organizationId: Joi.number().integer().required(),
    deviceType: Joi.string().valid(...allowedDeviceTypes).default('actuator'),
    controlType: Joi.string().valid(...allowedControlTypes).default('binary'),
    minValue: Joi.number().allow(null),
    maxValue: Joi.number().allow(null),
    defaultState: Joi.string().max(50).allow('', null),
    communicationProtocol: Joi.string().valid(...allowedProtocols).allow(null),
    isCritical: Joi.boolean().default(false),
    metadata: Joi.object().allow(null),
    capabilities: Joi.object().allow(null),
    areaId: Joi.number().integer().allow(null), // Optional area ID for creating device-area association
    controlModes: Joi.string().allow(null)
  }),
  update: Joi.object({
    name: Joi.string().max(50),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...allowedStatuses),
    uuid: Joi.string().uuid().allow('', null),
    organizationId: Joi.number().integer().required(),
    deviceType: Joi.string().valid(...allowedDeviceTypes),
    controlType: Joi.string().valid(...allowedControlTypes),
    minValue: Joi.number().allow(null),
    maxValue: Joi.number().allow(null),
    defaultState: Joi.string().max(50).allow('', null),
    communicationProtocol: Joi.string().valid(...allowedProtocols).allow(null),
    isCritical: Joi.boolean(),
    metadata: Joi.object().allow(null),
    capabilities: Joi.object().allow(null),
    areaId: Joi.number().integer().allow(null) // Optional area ID for updating device-area association
  }),
  query: Joi.object({
    organizationId: Joi.number().integer().required()
  })
};

module.exports = {
  deviceSchema
}; 