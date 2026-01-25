const {
  RuleChain,
  RuleChainNode,
  Sensor,
  Device,
  TelemetryData,
  DataStream,
  DeviceState,
  DeviceStateInstance,
} = require('../models/initModels');
const deviceStateInstanceService = require('./deviceStateInstanceService');
const notificationManager = require('../utils/notificationManager');
const { parseDuration } = require('../utils/timeUtils');
const mqttPublisher = require('./mqttPublisherService');
const logger = require('../utils/logger');
const sequelize = require('../config/database');
const { Sequelize } = require('sequelize');
const RuleChainIndex = require('../ruleEngine/indexing/RuleChainIndex');
const { collectWithTimeout, withTimeout } = require('../utils/timeoutUtils');
const { TimeoutError, ERROR_CODES } = require('../utils/TimeoutError');
const timeoutMetrics = require('../utils/timeoutMetrics');
const config = require('../config');
// Ownership check function for middleware
const getRuleChainForOwnershipCheck = async (id) => {
  try {
    const ruleChain = await RuleChain.findByPk(id);
    if (!ruleChain) return null;
    return {
      organizationId: ruleChain.organizationId,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get a rule chain node with its organization ID for ownership checking
 * This implementation finds the organization ID through the RuleChain relationship
 * @param {Number} id - RuleChainNode ID
 * @returns {Promise<Object>} RuleChainNode with organizationId
 */
const getRuleChainNodeForOwnershipCheck = async (id) => {
  try {
    // First check if the node exists
    const ruleChainNode = await RuleChainNode.findByPk(id);

    if (!ruleChainNode) {
      console.log(`RuleChainNode with ID ${id} not found!`);
      return null;
    }

    // Get organization by direct SQL for reliability
    const query = `
      SELECT rc.organizationId
      FROM RuleChainNode rcn
      JOIN RuleChain rc ON rcn.ruleChainId = rc.id
      WHERE rcn.id = ?
      LIMIT 1
    `;

    const results = await sequelize.query(query, {
      replacements: [Number(id)],
      type: sequelize.QueryTypes.SELECT,
    });

    let organizationId = null;
    if (results && results.length > 0 && results[0].organizationId) {
      organizationId = Number(results[0].organizationId);
      console.log(`Organization ID for rule chain node ${id}: ${organizationId}`);

      return {
        id: ruleChainNode.id,
        organizationId: organizationId,
      };
    }

    // If no organization found, return node with null organizationId
    console.warn(
      `RuleChainNode ${id} is not associated with any organization. No organization association found.`
    );
    return {
      id: ruleChainNode.id,
      organizationId: null,
    };
  } catch (error) {
    logger.error('Error in getRuleChainNodeForOwnershipCheck:', error.message);
    return null;
  }
};

/**
 * Check if a rule chain node belongs to a specified organization
 * @param {Number} nodeId - RuleChainNode ID
 * @param {Number} organizationId - Organization ID
 * @returns {Promise<Boolean>} True if node belongs to organization
 */
const ruleChainNodeBelongsToOrganization = async (nodeId, organizationId) => {
  try {
    // First check if the node exists
    const node = await RuleChainNode.findByPk(nodeId);
    if (!node) {
      return false;
    }

    // Use direct SQL to check organizational ownership through RuleChain
    const query = `
      SELECT COUNT(*) as count
      FROM RuleChainNode rcn
      JOIN RuleChain rc ON rcn.ruleChainId = rc.id
      WHERE rcn.id = ? AND rc.organizationId = ?
    `;

    const results = await sequelize.query(query, {
      replacements: [Number(nodeId), Number(organizationId)],
      type: sequelize.QueryTypes.SELECT,
    });

    return results[0].count > 0;
  } catch (error) {
    logger.error(`Error in ruleChainNodeBelongsToOrganization:`, error);
    return false;
  }
};

// Attach the cross-organization check function to make it available for checkResourceOwnership
getRuleChainNodeForOwnershipCheck.resourceBelongsToOrganization =
  ruleChainNodeBelongsToOrganization;

class RuleChainService {
  // RuleChain operations
  async createChain(data) {
    try {
      const ruleChain = await RuleChain.create(data);
      return ruleChain;
    } catch (error) {
      throw error;
    }
  }

  async findAllChains(organizationId) {
    try {
      console.log('organizationId', organizationId);
      const ruleChains = await RuleChain.findAll({
        where: { organizationId },
        include: [
          {
            model: RuleChainNode,
            as: 'nodes',
          },
        ],
      });
      return ruleChains;
    } catch (error) {
      throw error;
    }
  }

  async findChainById(id) {
    try {
      const ruleChain = await RuleChain.findByPk(id, {
        include: [
          {
            model: RuleChainNode,
            as: 'nodes',
            separate: true,
            order: [
              [
                Sequelize.literal(`CASE 
                  WHEN type = 'filter' THEN 1 
                  WHEN type = 'transform' THEN 2 
                  WHEN type = 'action' THEN 3 
                  ELSE 4 
                END`),
                'ASC',
              ],
            ],
          },
        ],
      });
      return ruleChain;
    } catch (error) {
      throw error;
    }
  }

  async updateChain(id, data) {
    try {
      const ruleChain = await RuleChain.findByPk(id);
      if (!ruleChain) {
        throw new Error('Rule chain not found');
      }
      await ruleChain.update(data);
      return ruleChain;
    } catch (error) {
      throw error;
    }
  }

  async deleteChain(id) {
    try {
      const deleted = await RuleChain.destroy({
        where: { id },
      });
      return deleted;
    } catch (error) {
      throw error;
    }
  }

  // RuleChainNode operations
  async createNode(data) {
    try {
      // Check if a node with the same name exists in the same rule chain
      const existingNode = await RuleChainNode.findOne({
        where: {
          ruleChainId: data.ruleChainId,
          name: data.name,
        },
      });

      if (existingNode) {
        const error = new Error('A node with this name already exists in this rule chain');
        error.statusCode = 400;
        throw error;
      }

      const node = await RuleChainNode.create(data);
      return node;
    } catch (error) {
      throw error;
    }
  }

  async findAllNodes(ruleChainId) {
    try {
      const nodes = await RuleChainNode.findAll({
        where: { ruleChainId },
        include: [
          {
            model: RuleChainNode,
            as: 'nextNode',
          },
        ],
        order: [['name', 'ASC']], // Order by name
      });
      return nodes;
    } catch (error) {
      throw error;
    }
  }

  async findNodeById(id) {
    try {
      const node = await RuleChainNode.findByPk(id, {
        include: [
          {
            model: RuleChainNode,
            as: 'nextNode',
          },
        ],
      });
      return node;
    } catch (error) {
      throw error;
    }
  }

  async updateNode(id, data) {
    try {
      const node = await RuleChainNode.findByPk(id);
      if (!node) {
        throw new Error('Node not found');
      }

      // If name is being updated, check for uniqueness
      if (data.name && data.name !== node.name) {
        const existingNode = await RuleChainNode.findOne({
          where: {
            ruleChainId: node.ruleChainId,
            name: data.name,
            id: { [Sequelize.Op.ne]: id }, // Exclude current node
          },
        });

        if (existingNode) {
          const error = new Error('A node with this name already exists in this rule chain');
          error.statusCode = 400;
          throw error;
        }
      }

      await node.update(data);
      const updatedNode = await this.findNodeById(id);
      return updatedNode;
    } catch (error) {
      throw error;
    }
  }

  async deleteNode(id) {
    try {
      const deleted = await RuleChainNode.destroy({
        where: { id },
      });
      return deleted;
    } catch (error) {
      throw error;
    }
  }

  // Rule Chain Execution
  /**
   * Executes a rule chain with the provided data
   * @param {number} ruleChainId - The ID of the rule chain to execute
   * @param {Object} rawData - Object containing arrays of sensor and device data
   * @param {Array} rawData.sensorData - Array of sensor data objects with UUID
   * @param {Array} rawData.deviceData - Array of device data objects with UUID
   * @param {Object} rawData.meta - Metadata about partial data (optional)
   * @param {number} timeoutMs - Timeout for rule chain execution (optional)
   */
  async execute(ruleChainId, rawData, timeoutMs = null) {
    const timeout = timeoutMs || config.ruleEngine.timeouts.ruleChain;
    const startTime = Date.now();

    const executeFn = async () => {
      // Transform arrays into maps for efficient lookup
      let data = this._transformDataToMaps(rawData);

      // Get rule chain with nodes
      const ruleChain = await this.findChainById(ruleChainId);
      if (!ruleChain) throw new Error('Rule chain not found');
      if (!ruleChain.nodes || ruleChain.nodes.length === 0) {
        return { result: 'No nodes to execute' };
      }

      // Map nodes by id for quick lookup
      const nodesMap = {};
      ruleChain.nodes.forEach((node) => {
        nodesMap[node.id] = node;
      });

      // Start with first node
      let currentNode = ruleChain.nodes[0];
      const results = [];

      // Initialize nodeResults for categorized access
      const nodeResults = {
        filters: [],
        transformations: [],
        actions: [],
      };

      let allFiltersPassed = true;
      let transformationsCount = 0;
      let actionsExecuted = 0;

      // Execute nodes sequentially
      while (currentNode) {
        const nodeType = currentNode.type;
        const config = currentNode.config || '{}';
        let actionResult;

        switch (nodeType) {
          case 'filter':
            actionResult = this._evaluateCondition(data, config);
            const filterResult = {
              nodeId: currentNode.id,
              type: 'filter',
              passed: actionResult,
              config,
            };
            results.push(filterResult);

            // Add to categorized results
            nodeResults.filters.push({
              nodeId: currentNode.id,
              passed: actionResult,
              condition: config,
            });

            if (!actionResult) {
              allFiltersPassed = false;
              break;
            }
            break;

          case 'transform':
            data = this._transformData(data, config);
            const transformResult = {
              nodeId: currentNode.id,
              type: 'transform',
              newData: data,
              config,
            };
            results.push(transformResult);

            // Add to categorized results
            nodeResults.transformations.push({
              nodeId: currentNode.id,
              transformationType: config.type,
              dataSnapshot: { ...data },
            });
            transformationsCount++;
            break;

          case 'action':
            actionResult = await this._performAction(config, data);
            const actionExecutionResult = {
              nodeId: currentNode.id,
              type: 'action',
              actionResult,
              config,
            };
            results.push(actionExecutionResult);

            // Add to categorized results with enhanced device information
            nodeResults.actions.push({
              nodeId: currentNode.commandid,
              status: actionResult.status,
              SourceType: {
                deviceUuid: config.command.deviceUuid,
                value: config.command.value,
                deviceType: config.type,
              },
              command: config.command,
              timestamp: actionResult.timestamp,
              notificationSent: false, // Will be updated after notification is sent
            });
            actionsExecuted++;
            break;

          default:
            results.push({
              nodeId: currentNode.id,
              type: 'unknown',
              message: 'Unknown node type',
              config,
            });
        }

        if (nodeType === 'filter' && !actionResult) {
          break;
        }

        currentNode = currentNode.nextNodeId ? nodesMap[currentNode.nextNodeId] : null;
      }

      // Create summary information
      const summary = {
        totalNodes: results.length,
        filtersPassed: allFiltersPassed,
        transformationsApplied: transformationsCount,
        actionsExecuted: actionsExecuted,
      };

      // Return both new format and preserve original execution details
      return {
        ruleChainId,
        name: ruleChain.name,
        status: 'success',
        summary,
        nodeResults,
        executionDetails: {
          ruleChainId,
          executedNodes: results,
          finalData: data,
        },
        meta: rawData.meta || {},
      };
    };

    try {
      const result = await withTimeout(
        executeFn(),
        timeout,
        ERROR_CODES.RULE_CHAIN_TIMEOUT,
        {
          ruleChainId,
          timeoutMs: timeout,
          operation: 'rule_chain_execution'
        }
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error.isTimeout) {
        logger.error('Rule chain execution timed out', {
          ruleChainId,
          timeoutMs: timeout,
          duration,
          errorCode: error.code
        });

        timeoutMetrics.recordTimeout(error.code, duration);
        throw error;
      }

      throw error;
    }
  }

  /**
   * Transforms array-based data into UUID-keyed maps
   * @param {Object} rawData - The raw data with arrays
   * @returns {Object} Transformed data with UUID maps
   */
  _transformDataToMaps(rawData) {
    const transformArrayToMap = (array) => {
      if (!Array.isArray(array)) return {};
      return array.reduce((map, item) => {
        if (item.UUID) {
          map[item.UUID] = { ...item };
          delete map[item.UUID].UUID; // Remove UUID from values since it's now the key
        }
        return map;
      }, {});
    };

    return {
      sensorData: transformArrayToMap(rawData.sensorData),
      deviceData: transformArrayToMap(rawData.deviceData),
    };
  }

  // Helper methods for rule execution
  /**
   * Evaluates filter conditions against provided data
   * @param {Object} data - Combined sensor and device data maps
   * @param {Object} config - The filter configuration
   *
   * Input Data Format:
   * {
   *   sensorData: {
   *     "aaabbb123": { temperature: 32 },
   *     "cccddd456": { motion: true }
   *   },
   *   deviceData: {
   *     "eeefff789": { power: "on" },
   *     "ggghhh101112": { speed: "high" }
   *   }
   * }
   *
   * Expression Format:
   * {
   *   sourceType: "sensor",
   *   UUID: "aaabbb123",
   *   key: "temperature",
   *   operator: ">",
   *   value: 30
   * }
   *
   * Complex Expression Format (Nested AND/OR):
   * {
   *   type: "AND",
   *   expressions: [
   *     {
   *       sourceType: "sensor",
   *       UUID: "123",
   *       key: "temperature",
   *       operator: ">",
   *       value: 30
   *     },
   *     {
   *       type: "OR",
   *       expressions: [
   *         {
   *           sourceType: "sensor",
   *           UUID: "456",
   *           key: "motion",
   *           operator: "==",
   *           value: true
   *         },
   *         {
   *           sourceType: "device",
   *           UUID: "789",
   *           key: "power",
   *           operator: "==",
   *           value: "on"
   *         }
   *       ]
   *     }
   *   ]
   * }
   */
  _evaluateCondition(data, config) {
    // Handle complex expressions (AND/OR)
    if (config.type && config.expressions) {
      const results = config.expressions.map((expr) => this._evaluateCondition(data, expr));

      switch (config.type.toUpperCase()) {
        case 'AND':
          return results.every(Boolean);
        case 'OR':
          return results.some(Boolean);
        default:
          throw new Error(`Unknown expression type: ${config.type}`);
      }
    }

    // Handle simple expression
    const { sourceType, UUID, key, operator, value, duration } = config;

    // Get the appropriate data source
    const sourceMap = sourceType === 'sensor' ? data.sensorData : data.deviceData;
    if (!sourceMap) {
      return false;
    }

    // Get the specific source instance by UUID
    const sourceInstance = sourceMap[UUID];
    if (!sourceInstance) {
      return false;
    }

    const sourceValue = sourceInstance[key];
    const sourceTimestamp = sourceInstance['timestamp'];

    // Special operators that don't need sourceValue to be defined
    switch (operator) {
      case 'isNull':
        return sourceValue === null || sourceValue === undefined;
      case 'isNotNull':
        return sourceValue !== null && sourceValue !== undefined;
      case 'isEmpty':
        return (
          !sourceValue ||
          (Array.isArray(sourceValue) && sourceValue.length === 0) ||
          sourceValue === ''
        );
      case 'isNotEmpty':
        return (
          sourceValue &&
          (!Array.isArray(sourceValue) || sourceValue.length > 0) &&
          sourceValue !== ''
        );
    }

    // Handle undefined or null source values for other operators
    if (sourceValue === undefined || sourceValue === null) {
      return false;
    }

    // Type check operators
    switch (operator) {
      case 'isNumber':
        return typeof sourceValue === 'number' && !isNaN(sourceValue);
      case 'isString':
        return typeof sourceValue === 'string';
      case 'isBoolean':
        return typeof sourceValue === 'boolean';
      case 'isArray':
        return Array.isArray(sourceValue);
    }

    // Main operator switch
    switch (operator) {
      // Numeric comparisons
      case '>':
        return sourceValue > value;
      case '>=':
        return sourceValue >= value;
      case '<':
        return sourceValue < value;
      case '<=':
        return sourceValue <= value;
      case '==':
        return sourceValue == value;
      case '!=':
        return sourceValue != value;
      case 'between':
        return (
          Array.isArray(value) &&
          value.length === 2 &&
          sourceValue >= value[0] &&
          sourceValue <= value[1]
        );

      // String operations
      case 'contains':
        return String(sourceValue).includes(String(value));
      case 'notContains':
        return !String(sourceValue).includes(String(value));
      case 'startsWith':
        return String(sourceValue).startsWith(String(value));
      case 'endsWith':
        return String(sourceValue).endsWith(String(value));
      case 'matches':
        try {
          const regex = new RegExp(value);
          return regex.test(String(sourceValue));
        } catch (e) {
          throw new Error(`Invalid regular expression: ${value}`);
        }

      // Array operations
      case 'in':
        return Array.isArray(value) && value.includes(sourceValue);
      case 'notIn':
        return Array.isArray(value) && !value.includes(sourceValue);
      case 'hasAll':
        return (
          Array.isArray(sourceValue) &&
          Array.isArray(value) &&
          value.every((v) => sourceValue.includes(v))
        );
      case 'hasAny':
        return (
          Array.isArray(sourceValue) &&
          Array.isArray(value) &&
          value.some((v) => sourceValue.includes(v))
        );
      case 'hasNone':
        return (
          Array.isArray(sourceValue) &&
          Array.isArray(value) &&
          !value.some((v) => sourceValue.includes(v))
        );

      // Time operations
      case 'olderThan': {
        const sourceTime = new Date(sourceTimestamp).getTime();
        const compareTime = Date.now() - sourceTime; // elapsed time in ms

        // Example value: "10s", "5m", "2h", "1d"
        return compareTime > parseDuration(value);
      }

      case 'newerThan': {
        const sourceTime = new Date(sourceTimestamp).getTime();
        const compareTime = Date.now() - sourceTime; // elapsed time in ms
        return compareTime < parseDuration(value);
      }
      case 'inLast': {
        const sourceTime = new Date(sourceTimestamp).getTime();
        const compareTime = Date.now() - sourceTime; // elapsed time in ms
        return compareTime <= parseDuration(value);
      }
      case 'valueOlderThan': {
        const sourceTime = new Date(sourceTimestamp).getTime();
        const compareTime = Date.now() - sourceTime; // elapsed time in ms

        if (value === sourceValue) {
          return compareTime > parseDuration(duration);
        } else {
          return false;
        }
      }
      case 'valueNewerThan': {
        const sourceTime = new Date(sourceTimestamp).getTime();
        const compareTime = Date.now() - sourceTime; // elapsed time in ms

        if (value === sourceValue) {
          return compareTime < parseDuration(duration);
        } else {
          return false;
        }
      }
      case 'valueInLast': {
        const sourceTime = new Date(sourceTimestamp).getTime();
        const compareTime = Date.now() - sourceTime; // elapsed time in ms

        if (value === sourceValue) {
          return compareTime <= parseDuration(duration);
        } else {
          return false;
        }
      }

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  _transformData(sensorData, config) {
    const { key, operation, operand } = config;
    let val = sensorData[key];

    switch (operation) {
      case 'multiply':
        val *= operand;
        break;
      case 'add':
        val += operand;
        break;
      case 'subtract':
        val -= operand;
        break;
      case 'divide':
        val /= operand;
        break;
      default:
        break;
    }

    return { ...sensorData, [key]: val };
  }

  async _performAction(config, sensorData) {
    try {
      // Validate required configuration
      if (!config.command.deviceUuid) {
        throw new Error('Device UUID is required for action execution');
      }
      if (!config.command) {
        throw new Error('Command is required for action execution');
      }
      if (config.command.value === undefined) {
        throw new Error('Value is required for action execution');
      }

      // Return action execution result
      return {
        status: 'success',
        commandSent: config.command,
        timestamp: new Date().toISOString(),
        deviceInfo: {
          uuid: config.command.deviceUuid,
          type: config.type || 'unknown',
        },
        sensorData,
      };
    } catch (error) {
      logger.error('Error in _performAction:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Recursively extracts data requirements from rule expressions
   * @param {Object} expression - Rule expression object
   * @param {Map} sensorReqs - Map to collect sensor requirements
   * @param {Map} deviceReqs - Map to collect device requirements
   */
  _extractRequirements(expression, sensorReqs, deviceReqs) {
    if (expression.type && expression.expressions) {
      // Handle nested AND/OR expressions
      expression.expressions.forEach((expr) =>
        this._extractRequirements(expr, sensorReqs, deviceReqs)
      );
    } else {
      // Handle leaf node (actual condition)
      const { sourceType, UUID, key } = expression;
      if (!UUID || !key) return;

      if (sourceType === 'sensor') {
        if (!sensorReqs.has(UUID)) {
          sensorReqs.set(UUID, new Set());
        }
        sensorReqs.get(UUID).add(key);
      } else if (sourceType === 'device') {
        if (!deviceReqs.has(UUID)) {
          deviceReqs.set(UUID, new Set());
        }
        deviceReqs.get(UUID).add(key);
      }
    }
  }

  /**
   * Collects latest sensor values based on requirements with timeout
   * @param {Map} sensorReqs - Map of sensor UUIDs to required parameters
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<{data: Array, timeoutDetails: Object}>} Sensor data and timeout information
   */
  async _collectSensorData(sensorReqs, timeoutMs = null) {
    const timeout = timeoutMs || config.ruleEngine.timeouts.dataCollection;
    const sourceIds = Array.from(sensorReqs.keys());

    const collectionFn = async () => {
      const sensorData = [];

      for (const [UUID, parameters] of sensorReqs) {
        try {
          const sensor = await Sensor.findOne({ where: { UUID } });
          if (!sensor) continue;

          const sensorDataObject = { UUID };

          for (const param of parameters) {
            const telemetry = await TelemetryData.findOne({
              where: {
                sensorId: sensor.id,
                variableName: param,
              },
            });

            if (telemetry) {
              const latestStream = await DataStream.findOne({
                where: { telemetryDataId: telemetry.id },
                order: [['recievedAt', 'DESC']],
                limit: 1,
              });

              if (latestStream) {
                let value = latestStream.value;
                let receivedAt = latestStream.recievedAt;
                switch (telemetry.datatype) {
                  case 'number':
                    value = Number(value);
                    break;
                  case 'boolean':
                    value = value.toLowerCase() === 'true';
                    break;
                }
                sensorDataObject[param] = value;
                sensorDataObject['timestamp'] = receivedAt;
              }
            }
          }

          if (Object.keys(sensorDataObject).length > 1) {
            sensorData.push(sensorDataObject);
          }
        } catch (error) {
          logger.error(`Error collecting sensor data for UUID ${UUID}:`, error);
        }
      }

      return sensorData;
    };

    return collectWithTimeout(collectionFn, timeout, 'sensor', sourceIds);
  }

  /**
   * Collects latest device state values based on requirements with timeout
   * @param {Map} deviceReqs - Map of device UUIDs to required parameters
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<{data: Array, timeoutDetails: Object}>} Device data and timeout information
   */
  async _collectDeviceData(deviceReqs, timeoutMs = null) {
    const timeout = timeoutMs || config.ruleEngine.timeouts.dataCollection;
    const sourceIds = Array.from(deviceReqs.keys());

    const collectionFn = async () => {
      const deviceData = [];

      for (const [UUID, parameters] of deviceReqs) {
        try {
          const device = await Device.findOne({ where: { UUID } });
          if (!device) continue;

          const deviceDataObject = { UUID };

          for (const param of parameters) {
            const state = await DeviceState.findOne({
              where: {
                deviceId: device.id,
                stateName: param,
              },
            });

            if (state) {
              const latestInstance = await DeviceStateInstance.findOne({
                where: { deviceStateId: state.id },
                order: [['fromTimestamp', 'DESC']],
                limit: 1,
              });

              if (latestInstance) {
                deviceDataObject[param] = latestInstance.value;
                deviceDataObject['timestamp'] = latestInstance.fromTimestamp;
              }
            }
          }

          if (Object.keys(deviceDataObject).length > 1) {
            deviceData.push(deviceDataObject);
          }
        } catch (error) {
          logger.error(`Error collecting device data for UUID ${UUID}:`, error);
        }
      }

      return deviceData;
    };

    return collectWithTimeout(collectionFn, timeout, 'device', sourceIds);
  }

  /**
   * Triggers execution of all rule chains for an organization
   * @param {string} options.originProtocol - Protocol that triggered this (mqtt, coap, http)
   * @param {string} options.deviceUuid - Device UUID that triggered this (for CoAP notifications)
   * @returns {Promise} Results of rule chain executions
   */
  async trigger(sensorUUID = null, variableNames = []) {
    try {
      const ruleChainIds = await RuleChainIndex.getRuleChainsForSensor(sensorUUID, variableNames);
      if (!ruleChainIds.length) {
        console.log('No rule chains found for sensor UUID:', sensorUUID);
        return;
      }

      // Find all applicable rule chains
      const ruleChains = await RuleChain.findAll({
        where: { id: ruleChainIds },
        include: [
          {
            model: RuleChainNode,
            as: 'nodes',
            required: false
          },
        ],
      });
      
      console.log('Total rule chains to execute:', ruleChains.length);

      // Process each rule chain
      const results = [];
      for (const ruleChain of ruleChains) {
        try {
          // Skip if no nodes
          if (!ruleChain.nodes || ruleChain.nodes.length === 0) {
            results.push({
              ruleChainId: ruleChain.id,
              name: ruleChain.name,
              status: 'skipped',
              message: 'No nodes found',
            });
            continue;
          }

          // 2. Extract data requirements from node configs
          const sensorReqs = new Map();
          const deviceReqs = new Map();

          for (const node of ruleChain.nodes) {
            try {
              const config = node.config || '{}';
              this._extractRequirements(config, sensorReqs, deviceReqs);
            } catch (error) {
              logger.error(
                `Error parsing config for node ${node.id} in rule chain ${ruleChain.id}:`,
                error
              );
              // Continue with next node
            }
          }

          // 3. Collect required data with timeouts
          const ruleChainStartTime = Date.now();
          const dataCollectionTimeout = config.ruleEngine.timeouts.dataCollection;
          const ruleChainTimeout = config.ruleEngine.timeouts.ruleChain;

          const missingSources = [];
          const timeoutDetails = {};

          const [sensorResult, deviceResult] = await Promise.all([
            this._collectSensorData(sensorReqs, dataCollectionTimeout)
              .catch(err => {
                if (err.isTimeout) {
                  const sourceIds = Array.from(sensorReqs.keys());
                  missingSources.push(...sourceIds.map(id => `sensor:${id}`));
                  timeoutDetails.sensor = {
                    timedOut: true,
                    duration: err.context?.duration || dataCollectionTimeout
                  };
                  timeoutMetrics.recordTimeout(err.code, err.context?.duration || dataCollectionTimeout);
                  logger.warn('Sensor data collection timed out', {
                    ruleChainId: ruleChain.id,
                    sensorUUIDs: sourceIds,
                    timeoutMs: dataCollectionTimeout,
                    errorCode: err.code
                  });
                  return { data: [], timeoutDetails: { timedOut: true, duration: err.context?.duration || dataCollectionTimeout } };
                }
                throw err;
              }),
            this._collectDeviceData(deviceReqs, dataCollectionTimeout)
              .catch(err => {
                if (err.isTimeout) {
                  const sourceIds = Array.from(deviceReqs.keys());
                  missingSources.push(...sourceIds.map(id => `device:${id}`));
                  timeoutDetails.device = {
                    timedOut: true,
                    duration: err.context?.duration || dataCollectionTimeout
                  };
                  timeoutMetrics.recordTimeout(err.code, err.context?.duration || dataCollectionTimeout);
                  logger.warn('Device data collection timed out', {
                    ruleChainId: ruleChain.id,
                    deviceUUIDs: sourceIds,
                    timeoutMs: dataCollectionTimeout,
                    errorCode: err.code
                  });
                  return { data: [], timeoutDetails: { timedOut: true, duration: err.context?.duration || dataCollectionTimeout } };
                }
                throw err;
              })
          ]);

          const sensorData = sensorResult.data || sensorResult;
          const deviceData = deviceResult.data || deviceResult;

          if (sensorResult.timeoutDetails) {
            timeoutDetails.sensor = sensorResult.timeoutDetails;
            if (sensorResult.timeoutDetails.timedOut) {
              const sourceIds = Array.from(sensorReqs.keys());
              missingSources.push(...sourceIds.map(id => `sensor:${id}`));
              timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, sensorResult.timeoutDetails.duration);
            }
          }
          if (deviceResult.timeoutDetails) {
            timeoutDetails.device = deviceResult.timeoutDetails;
            if (deviceResult.timeoutDetails.timedOut) {
              const sourceIds = Array.from(deviceReqs.keys());
              missingSources.push(...sourceIds.map(id => `device:${id}`));
              timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, deviceResult.timeoutDetails.duration);
            }
          }

          // 4. Build execution context with metadata
          const executionContext = {
            sensorData,
            deviceData,
            meta: {
              partialData: missingSources.length > 0,
              missingSources,
              timeoutDetails,
              executionStart: ruleChainStartTime
            }
          };

          // 5. Execute rule chain with timeout
          const remainingTime = ruleChainTimeout - (Date.now() - ruleChainStartTime);
          const executionResult = await this.execute(ruleChain.id, executionContext, Math.max(remainingTime, 1000));
          results.push({
            ruleChainId: ruleChain.id,
            name: ruleChain.name,
            status: 'success',
            result: executionResult,
          });
          // trigger device state instance
          const deviceStateInstance = executionResult.nodeResults.actions;
          if (deviceStateInstance) {
            for (const action of deviceStateInstance) {
              try {
                // Transform action data to match required format
                const stateChangeData = {
                  deviceUuid: action.command.deviceUuid,
                  stateName: action.command.stateName,
                  value: action.command.value,
                  initiatedBy: 'rule_chain',
                  metadata: {
                    ruleChainId: ruleChain.id,
                    ruleChainName: ruleChain.name,
                    nodeId: action.nodeId,
                  },
                };

                // Call createInstance with the transformed data
                const result = await deviceStateInstanceService.createInstance(stateChangeData);

                // Queue notification with the returned metadata
                if (result.metadata) {
                  await notificationManager.queueStateChangeNotification(
                    {
                      ...result.metadata,
                      triggeredBy: 'rule_chain',
                      ruleChainDetails: stateChangeData.metadata,
                    },
                    null, // default priority
                    true // broadcast to all since it's system-initiated
                  );

                  // Update action with notification status
                  action.notificationSent = true;
                  action.notificationDetails = {
                    triggeredBy: 'rule_chain',
                    priority: 'normal',
                    broadcast: true,
                  };
                }
              } catch (error) {
                logger.error(
                  `Error processing device state change for action ${action.nodeId}:`,
                  error
                );
                action.notificationSent = false;
                action.error = error.message;
              }
            }
          }
        } catch (error) {
          const duration = Date.now() - ruleChainStartTime;

          if (error.isTimeout) {
            logger.error('Rule chain execution timed out', {
              ruleChainId: ruleChain.id,
              ruleChainName: ruleChain.name,
              timeoutMs: ruleChainTimeout,
              duration,
              errorCode: error.code,
              context: error.context
            });

            timeoutMetrics.recordTimeout(error.code, duration);
            results.push({
              ruleChainId: ruleChain.id,
              name: ruleChain.name,
              status: 'timeout',
              error: error.message,
              errorCode: error.code,
              duration
            });
          } else {
            logger.error('Rule chain execution failed', {
              ruleChainId: ruleChain.id,
              ruleChainName: ruleChain.name,
              error: error.message,
              duration
            });

            results.push({
              ruleChainId: ruleChain.id,
              name: ruleChain.name,
              status: 'error',
              error: error.message,
              duration
            });
          }
        }
      }
      /*
      //commented out for now to avoid duplicate publishing
      
      // 🎯 Publish rule chain execution results based on origin protocol
      const originProtocol = options.originProtocol || 'http';
      const deviceUuid = options.deviceUuid;

      process.nextTick(async () => {
        try {
          const ruleChainResult = {
            organizationId,
            totalRuleChains: ruleChains.length,
            results,
            timestamp: new Date().toISOString(),
          };

          // Conditionally publish based on origin protocol
          if (originProtocol === 'mqtt') {
            // Publish to MQTT for MQTT-originated requests
            await mqttPublisher.publishRuleChainResult(ruleChainResult, organizationId);
            logger.debug(
              `Rule chain execution results published to MQTT for organization ${organizationId}`
            );
          } else if (originProtocol === 'coap' && deviceUuid) {
            // Notify CoAP observers for CoAP-originated requests
            const coapPublisher = require('./coapPublisherService');
            await coapPublisher.notifyObservers(deviceUuid, {
              event: 'rule_chain_result',
              deviceUuid: deviceUuid,
              organizationId: organizationId,
              ruleChains: ruleChainResult,
              timestamp: new Date().toISOString(),
            });
            logger.debug(
              `Rule chain execution results notified to CoAP observers for device ${deviceUuid}`
            );
          } else if (originProtocol === 'http') {
            // For HTTP requests, publish to both MQTT and CoAP (if deviceUuid available)
            // This allows HTTP-triggered rule chains to notify all subscribers
            await mqttPublisher.publishRuleChainResult(ruleChainResult, organizationId);
            logger.debug(
              `Rule chain execution results published to MQTT for organization ${organizationId} (HTTP trigger)`
            );

            if (deviceUuid) {
              const coapPublisher = require('./coapPublisherService');
              await coapPublisher.notifyObservers(deviceUuid, {
                event: 'rule_chain_result',
                deviceUuid: deviceUuid,
                organizationId: organizationId,
                ruleChains: ruleChainResult,
                timestamp: new Date().toISOString(),
              });
              logger.debug(
                `Rule chain execution results notified to CoAP observers for device ${deviceUuid} (HTTP trigger)`
              );
            }
          } else {
            // Unknown protocol - default to MQTT
            logger.warn(`Unknown origin protocol ${originProtocol}, defaulting to MQTT publish`);
            await mqttPublisher.publishRuleChainResult(ruleChainResult, organizationId);
          }
        } catch (error) {
          logger.error(`Failed to publish rule chain results: ${error.message}`);
        }
      });
      */
      return {
        totalRuleChains: ruleChains.length,
        results,
      };
    } catch (error) {
      throw new Error(`Rule chain trigger failed: ${error.message}`);
    }
  }
}

module.exports = {
  ruleChainService: new RuleChainService(),
  getRuleChainForOwnershipCheck,
  getRuleChainNodeForOwnershipCheck,
};
