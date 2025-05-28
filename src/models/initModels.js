const sequelize = require('../config/database');
const Device = require('./Device');
const Organization = require('./Organization');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const Area = require('./Area');
const Sensor = require('./Sensor');
const AreaDevice = require('./AreaDevice');
const AreaSensor = require('./AreaSensor');
const Notification = require('./Notification');
const OrganizationUser = require('./OrganizationUser');
const PaymentCard = require('./PaymentCard');
const RuleChain = require('./RuleChain');
const RuleChainNode = require('./RuleChainNode');
const TelemetryData = require('./TelemetryData');
const Ticket = require('./Ticket');
const DataStream = require('./DataStream');
const DeviceToken = require('./DeviceToken');
const DeviceState = require('./DeviceState');
const DeviceStateInstance = require('./DeviceStateInstance');

// Define all the associations
const initAssociations = () => {
  // Organization associations
  Organization.hasMany(Area, { foreignKey: 'organizationId' });
  Organization.hasMany(Notification, { foreignKey: 'organizationId' });
  Organization.hasMany(PaymentCard, { foreignKey: 'organizationId' });
  Organization.hasMany(RuleChain, { foreignKey: 'organizationId' });
  Organization.hasMany(Role, { foreignKey: 'organizationId' });
  
  // User associations
  User.hasMany(Ticket, { foreignKey: 'assignedTo' });

  // Role associations 
  Role.belongsTo(Organization, { foreignKey: 'organizationId' });
  Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId' });
  Role.hasMany(OrganizationUser, { foreignKey: 'role' });
  
  // Permission associations
  Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId' });
  
  // Area associations
  Area.belongsTo(Organization, { foreignKey: 'organizationId' });
  Area.belongsTo(Area, { foreignKey: 'parentArea', as: 'parent' });
  Area.hasMany(Area, { foreignKey: 'parentArea', as: 'children' });
  
  // AreaDevice associations
  Area.belongsToMany(Device, { through: AreaDevice, foreignKey: 'areaId' });
  Device.belongsToMany(Area, { through: AreaDevice, foreignKey: 'deviceId' });
  
  // AreaSensor associations
  Area.belongsToMany(Sensor, { through: AreaSensor, foreignKey: 'areaId' });
  Sensor.belongsToMany(Area, { through: AreaSensor, foreignKey: 'sensorId' });
  
  // Notification associations
  Notification.belongsTo(Organization, { foreignKey: 'organizationId' });
  Notification.hasMany(Ticket, { foreignKey: 'notificationId' });
  
  // OrganizationUser associations
  User.belongsToMany(Organization, { through: OrganizationUser, foreignKey: 'userId' });
  Organization.belongsToMany(User, { through: OrganizationUser, foreignKey: 'organizationId' });
  OrganizationUser.belongsTo(Role, { foreignKey: 'role' });
  
  // PaymentCard associations
  PaymentCard.belongsTo(Organization, { foreignKey: 'organizationId' });
  
  // RuleChain associations
  RuleChain.belongsTo(Organization, { foreignKey: 'organizationId' });
  RuleChain.hasMany(RuleChainNode, { foreignKey: 'ruleChainId', as: 'nodes' });

  // RuleChainNode associations
  RuleChainNode.belongsTo(RuleChain, { foreignKey: 'ruleChainId' });
  RuleChainNode.belongsTo(RuleChainNode, { foreignKey: 'nextNodeId', as: 'nextNode' });
  RuleChainNode.hasMany(RuleChainNode, { foreignKey: 'nextNodeId', as: 'previousNodes' });
  
  // TelemetryData associations
  TelemetryData.belongsTo(Sensor, { foreignKey: 'sensorId' });
  Sensor.hasMany(TelemetryData, { foreignKey: 'sensorId' });
  
  // Ticket associations
  Ticket.belongsTo(Notification, { foreignKey: 'notificationId' });
  Ticket.belongsTo(User, { foreignKey: 'assignedTo' });
  
  // DataStream associations
  DataStream.belongsTo(TelemetryData, { foreignKey: 'telemetryDataId' });
  TelemetryData.hasMany(DataStream, { foreignKey: 'telemetryDataId' });
  
  // DeviceToken associations
  DeviceToken.belongsTo(Sensor, { foreignKey: 'sensorId' });
  Sensor.hasMany(DeviceToken, { foreignKey: 'sensorId' });
  
  // Device State associations
  DeviceState.belongsTo(Device, {
    foreignKey: 'deviceId',
    as: 'device'
  });
  Device.hasMany(DeviceState, {
    foreignKey: 'deviceId',
    as: 'states'
  });

  // DeviceStateInstance associations
  DeviceState.hasMany(DeviceStateInstance, {
    foreignKey: 'deviceStateId',
    as: 'instances'
  });
  DeviceStateInstance.belongsTo(DeviceState, {
    foreignKey: 'deviceStateId',
    as: 'state'
  });
};

// Initialize all models and associations
const initModels = async () => {
  try {
    initAssociations();
    console.log('Models initialized successfully');
  } catch (error) {
    console.error('Error initializing models:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  initModels,
  Device,
  Organization,
  User,
  Role,
  Permission,
  RolePermission,
  Area,
  Sensor,
  AreaDevice,
  AreaSensor,
  Notification,
  OrganizationUser,
  PaymentCard,
  RuleChain,
  RuleChainNode,
  TelemetryData,
  Ticket,
  DataStream,
  DeviceToken,
  DeviceState,
  DeviceStateInstance
}; 