const { RuleChain, RuleChainNode } = require('../models/initModels');

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
      ruleChain.nodes.forEach(node => {
        nodesMap[node.id] = node;
      });

      // Start with first node
      let currentNode = ruleChain.nodes[0];
      const results = [];

      // Execute nodes sequentially
      while (currentNode) {
        const nodeType = currentNode.type;
        const config = JSON.parse(currentNode.config || '{}');
        let actionResult;

        switch (nodeType) {
          case 'filter':
            actionResult = this._evaluateCondition(data, config);
            results.push({ 
              nodeId: currentNode.id, 
              type: 'filter', 
              passed: actionResult,
              config 
            });
            if (!actionResult) {
              break;
            }
            break;

          case 'transform':
            data = this._transformData(data, config);
            results.push({ 
              nodeId: currentNode.id, 
              type: 'transform', 
              newData: data,
              config 
            });
            break;

          case 'action':
            actionResult = await this._performAction(config, data);
            results.push({ 
              nodeId: currentNode.id, 
              type: 'action', 
              actionResult,
              config 
            });
            break;

          default:
            results.push({ 
              nodeId: currentNode.id, 
              type: 'unknown', 
              message: 'Unknown node type',
              config 
            });
        }

        if (nodeType === 'filter' && !actionResult) {
          break;
        }

        currentNode = currentNode.nextNodeId ? nodesMap[currentNode.nextNodeId] : null;
      }

      return {
        ruleChainId,
        executedNodes: results,
        finalData: data
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
      deviceData: transformArrayToMap(rawData.deviceData)
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
      const results = config.expressions.map(expr => this._evaluateCondition(data, expr));
      
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
        return !sourceValue || (Array.isArray(sourceValue) && sourceValue.length === 0) || sourceValue === '';
      case 'isNotEmpty':
        return sourceValue && (!Array.isArray(sourceValue) || sourceValue.length > 0) && sourceValue !== '';
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
      case '>': return sourceValue > value;
      case '>=': return sourceValue >= value;
      case '<': return sourceValue < value;
      case '<=': return sourceValue <= value;
      case '==': return sourceValue == value;
      case '!=': return sourceValue != value;
      case 'between': 
        return Array.isArray(value) && 
               value.length === 2 && 
               sourceValue >= value[0] && 
               sourceValue <= value[1];

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
        return Array.isArray(sourceValue) && 
               Array.isArray(value) && 
               value.every(v => sourceValue.includes(v));
      case 'hasAny': 
        return Array.isArray(sourceValue) && 
               Array.isArray(value) && 
               value.some(v => sourceValue.includes(v));
      case 'hasNone': 
        return Array.isArray(sourceValue) && 
               Array.isArray(value) && 
               !value.some(v => sourceValue.includes(v));

      // Time operations
      case 'olderThan': {
        const sourceTime = new Date(sourceValue).getTime();
        const compareTime = Date.now() - (value * 1000); // value in seconds
        return sourceTime < compareTime;
      }
      case 'newerThan': {
        const sourceTime = new Date(sourceValue).getTime();
        const compareTime = Date.now() - (value * 1000); // value in seconds
        return sourceTime > compareTime;
      }
      case 'inLast': {
        const sourceTime = new Date(sourceValue).getTime();
        const compareTime = Date.now() - (value * 1000); // value in seconds
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
      case 'multiply': val *= operand; break;
      case 'add': val += operand; break;
      case 'subtract': val -= operand; break;
      case 'divide': val /= operand; break;
      default: break;
    }

    return { ...sensorData, [key]: val };
  }

  async _performAction(config, sensorData) {
    // For now, just simulate action execution
    // In real implementation, this would integrate with device control system
    return {
      status: 'success',
      commandSent: config.command || null,
      timestamp: new Date().toISOString(),
      sensorData
    };
  }
}

module.exports = {
  ruleChainService: new RuleChainService(),
  getRuleChainForOwnershipCheck,
};
