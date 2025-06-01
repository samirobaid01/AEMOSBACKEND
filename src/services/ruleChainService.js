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
const sequelize = require('sequelize');
const { Sequelize } = require('sequelize');
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
                'ASC'
              ]
            ]
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
      const [updated] = await RuleChainNode.update(data, {
        where: { id },
      });
      if (updated) {
        const updatedNode = await this.findNodeById(id);
        return updatedNode;
      }
      throw new Error('Node not found');
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
   */
  async execute(ruleChainId, rawData) {
    try {
      // Transform arrays into maps for efficient lookup
      const data = this._transformDataToMaps(rawData);

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
        actions: []
      };

      let allFiltersPassed = true;
      let transformationsCount = 0;
      let actionsExecuted = 0;

      // Execute nodes sequentially
      while (currentNode) {
        const nodeType = currentNode.type;
        const config = JSON.parse(currentNode.config || '{}');
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
              condition: config
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
              dataSnapshot: { ...data }
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
              nodeId: currentNode.id,
              status: actionResult.status,
              SourceType: {
                deviceUuid: config.deviceUuid,
                value: config.value,
                deviceType: config.deviceType
              },
              command: config.command,
              timestamp: actionResult.timestamp,
              notificationSent: false // Will be updated after notification is sent
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
        actionsExecuted: actionsExecuted
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
        }
      };
    } catch (error) {
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
    const { sourceType, UUID, key, operator, value } = config;

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
        const sourceTime = new Date(sourceValue).getTime();
        const compareTime = Date.now() - value * 1000; // value in seconds
        return sourceTime < compareTime;
      }
      case 'newerThan': {
        const sourceTime = new Date(sourceValue).getTime();
        const compareTime = Date.now() - value * 1000; // value in seconds
        return sourceTime > compareTime;
      }
      case 'inLast': {
        const sourceTime = new Date(sourceValue).getTime();
        const compareTime = Date.now() - value * 1000; // value in seconds
        return sourceTime >= compareTime;
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
          type: config.type || 'unknown'
        },
        sensorData
      };
    } catch (error) {
      console.error('Error in _performAction:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
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
   * Collects latest sensor values based on requirements
   * @param {Map} sensorReqs - Map of sensor UUIDs to required parameters
   * @returns {Array} Array of sensor data objects
   */
  async _collectSensorData(sensorReqs) {
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
              // Convert value based on telemetry datatype
              let value = latestStream.value;
              switch (telemetry.datatype) {
                case 'number':
                  value = Number(value);
                  break;
                case 'boolean':
                  value = value.toLowerCase() === 'true';
                  break;
                // String and other types remain as is
              }
              sensorDataObject[param] = value;
            }
          }
        }

        if (Object.keys(sensorDataObject).length > 1) {
          // > 1 because UUID is always there
          sensorData.push(sensorDataObject);
        }
      } catch (error) {
        console.error(`Error collecting sensor data for UUID ${UUID}:`, error);
        // Continue with next sensor
      }
    }

    return sensorData;
  }

  /**
   * Collects latest device state values based on requirements
   * @param {Map} deviceReqs - Map of device UUIDs to required parameters
   * @returns {Array} Array of device data objects
   */
  async _collectDeviceData(deviceReqs) {
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
            }
          }
        }

        if (Object.keys(deviceDataObject).length > 1) {
          // > 1 because UUID is always there
          deviceData.push(deviceDataObject);
        }
      } catch (error) {
        console.error(`Error collecting device data for UUID ${UUID}:`, error);
        // Continue with next device
      }
    }

    return deviceData;
  }

  /**
   * Triggers execution of all rule chains for an organization
   * @param {number} ruleChainId - Optional specific rule chain ID, if null executes all org rules
   * @param {number} organizationId - Organization ID
   * @returns {Promise} Results of rule chain executions
   */
  async trigger(organizationId) {
    try {
      // Find all applicable rule chains
      const whereClause = {
        organizationId,
      };

      if (organizationId) {
        whereClause.organizationId = organizationId;
      }

        const ruleChains = await RuleChain.findAll({
          where: whereClause,
          include: [
            {
              model: RuleChainNode,
              as: 'nodes',
            },
          ],
        });

        if (!ruleChains || ruleChains.length === 0) {
          throw new Error(`No rule chains found for organization ${organizationId}`);
        }

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
              const config = JSON.parse(node.config || '{}');
              this._extractRequirements(config, sensorReqs, deviceReqs);
            } catch (error) {
              console.error(
                `Error parsing config for node ${node.id} in rule chain ${ruleChain.id}:`,
                error
              );
              // Continue with next node
            }
          }

          // 3. Collect required data
          const [sensorData, deviceData] = await Promise.all([
            this._collectSensorData(sensorReqs),
            this._collectDeviceData(deviceReqs),
          ]);

          // 4. Execute rule chain with collected data
          const rawData = {
            sensorData,
            deviceData,
          };

          const executionResult = await this.execute(ruleChain.id, rawData);
          results.push({
            ruleChainId: ruleChain.id,
            name: ruleChain.name,
            status: 'success',
            result: executionResult,
          });
          // trigger device state instance
          const deviceStateInstance = executionResult.nodeResults.actions;
          if(deviceStateInstance){
            for(const action of deviceStateInstance){
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
                    nodeId: action.nodeId
                  }
                };
                
                // Call createInstance with the transformed data
                const result = await deviceStateInstanceService.createInstance(stateChangeData);
                
                // Queue notification with the returned metadata
                if (result.metadata) {
                  await notificationManager.queueStateChangeNotification(
                    {
                      ...result.metadata,
                      triggeredBy: 'rule_chain',
                      ruleChainDetails: stateChangeData.metadata
                    },
                    null,  // default priority
                    true   // broadcast to all since it's system-initiated
                  );
                  
                  // Update action with notification status
                  action.notificationSent = true;
                  action.notificationDetails = {
                    triggeredBy: 'rule_chain',
                    priority: 'normal',
                    broadcast: true
                  };
                }
              } catch (error) {
                console.error(`Error processing device state change for action ${action.nodeId}:`, error);
                action.notificationSent = false;
                action.error = error.message;
              }
            }
          }
        } catch (error) {
          results.push({
            ruleChainId: ruleChain.id,
            name: ruleChain.name,
            status: 'error',
            error: error.message,
          });
          // Continue with next rule chain
        }
      }

      return {
        organizationId,
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
};
