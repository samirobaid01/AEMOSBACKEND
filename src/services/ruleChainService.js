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
  async execute(ruleChainId, sensorData) {
    try {
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
            actionResult = this._evaluateCondition(sensorData, config);
            results.push({ 
              nodeId: currentNode.id, 
              type: 'filter', 
              passed: actionResult,
              config 
            });
            if (!actionResult) {
              // Stop execution on filter fail
              break;
            }
            break;

          case 'transform':
            sensorData = this._transformData(sensorData, config);
            results.push({ 
              nodeId: currentNode.id, 
              type: 'transform', 
              newData: sensorData,
              config 
            });
            break;

          case 'action':
            actionResult = await this._performAction(config, sensorData);
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

        // Stop chain execution if filter failed
        if (nodeType === 'filter' && !actionResult) {
          break;
        }

        // Move to next node
        currentNode = currentNode.nextNodeId ? nodesMap[currentNode.nextNodeId] : null;
      }

      return {
        ruleChainId,
        executedNodes: results,
        finalSensorData: sensorData
      };
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for rule execution
  /**
   * Evaluates filter conditions against sensor data
   * @param {Object} sensorData - The sensor data to evaluate
   * @param {Object} config - The filter configuration
   * 
   * Supported Operators:
   * Numeric Comparisons:
   * - ">" : Greater than
   * - ">=" : Greater than or equal
   * - "<" : Less than
   * - "<=" : Less than or equal
   * - "==" : Equal to
   * - "!=" : Not equal to
   * - "between" : Value is between two numbers (inclusive), value should be [min, max]
   * 
   * String Operations:
   * - "contains" : String contains value
   * - "notContains" : String does not contain value
   * - "startsWith" : String starts with value
   * - "endsWith" : String ends with value
   * - "matches" : String matches regular expression
   * 
   * Array Operations:
   * - "in" : Value is in array
   * - "notIn" : Value is not in array
   * - "hasAll" : Array contains all values
   * - "hasAny" : Array contains any of the values
   * - "hasNone" : Array contains none of the values
   * - "isEmpty" : Array or string is empty
   * - "isNotEmpty" : Array or string is not empty
   * 
   * Type Checks:
   * - "isNull" : Value is null
   * - "isNotNull" : Value is not null
   * - "isNumber" : Value is a number
   * - "isString" : Value is a string
   * - "isBoolean" : Value is a boolean
   * - "isArray" : Value is an array
   * 
   * Time Operations:
   * - "olderThan" : Timestamp is older than value (in seconds)
   * - "newerThan" : Timestamp is newer than value (in seconds)
   * - "inLast" : Timestamp is within last n seconds
   * 
   * Simple Expression Format:
   * {
   *   key: "temperature",
   *   operator: ">",
   *   value: 30
   * }
   * 
   * Complex Expression Format (Nested AND/OR):
   * {
   *   type: "AND",
   *   expressions: [...]
   * }
   */
  _evaluateCondition(sensorData, config) {
    // Handle complex expressions (AND/OR)
    if (config.type && config.expressions) {
      const results = config.expressions.map(expr => this._evaluateCondition(sensorData, expr));
      
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
    const { key, operator, value } = config;
    const sensorValue = sensorData[key];

    // Special operators that don't need sensorValue to be defined
    switch (operator) {
      case 'isNull':
        return sensorValue === null || sensorValue === undefined;
      case 'isNotNull':
        return sensorValue !== null && sensorValue !== undefined;
      case 'isEmpty':
        return !sensorValue || (Array.isArray(sensorValue) && sensorValue.length === 0) || sensorValue === '';
      case 'isNotEmpty':
        return sensorValue && (!Array.isArray(sensorValue) || sensorValue.length > 0) && sensorValue !== '';
    }

    // Handle undefined or null sensor values for other operators
    if (sensorValue === undefined || sensorValue === null) {
      return false;
    }

    // Type check operators
    switch (operator) {
      case 'isNumber':
        return typeof sensorValue === 'number' && !isNaN(sensorValue);
      case 'isString':
        return typeof sensorValue === 'string';
      case 'isBoolean':
        return typeof sensorValue === 'boolean';
      case 'isArray':
        return Array.isArray(sensorValue);
    }

    // Main operator switch
    switch (operator) {
      // Numeric comparisons
      case '>': return sensorValue > value;
      case '>=': return sensorValue >= value;
      case '<': return sensorValue < value;
      case '<=': return sensorValue <= value;
      case '==': return sensorValue == value;
      case '!=': return sensorValue != value;
      case 'between': 
        return Array.isArray(value) && 
               value.length === 2 && 
               sensorValue >= value[0] && 
               sensorValue <= value[1];

      // String operations
      case 'contains': 
        return String(sensorValue).includes(String(value));
      case 'notContains': 
        return !String(sensorValue).includes(String(value));
      case 'startsWith': 
        return String(sensorValue).startsWith(String(value));
      case 'endsWith': 
        return String(sensorValue).endsWith(String(value));
      case 'matches': 
        try {
          const regex = new RegExp(value);
          return regex.test(String(sensorValue));
        } catch (e) {
          throw new Error(`Invalid regular expression: ${value}`);
        }

      // Array operations
      case 'in': 
        return Array.isArray(value) && value.includes(sensorValue);
      case 'notIn': 
        return Array.isArray(value) && !value.includes(sensorValue);
      case 'hasAll': 
        return Array.isArray(sensorValue) && 
               Array.isArray(value) && 
               value.every(v => sensorValue.includes(v));
      case 'hasAny': 
        return Array.isArray(sensorValue) && 
               Array.isArray(value) && 
               value.some(v => sensorValue.includes(v));
      case 'hasNone': 
        return Array.isArray(sensorValue) && 
               Array.isArray(value) && 
               !value.some(v => sensorValue.includes(v));

      // Time operations
      case 'olderThan': {
        const sensorTime = new Date(sensorValue).getTime();
        const compareTime = Date.now() - (value * 1000); // value in seconds
        return sensorTime < compareTime;
      }
      case 'newerThan': {
        const sensorTime = new Date(sensorValue).getTime();
        const compareTime = Date.now() - (value * 1000); // value in seconds
        return sensorTime > compareTime;
      }
      case 'inLast': {
        const sensorTime = new Date(sensorValue).getTime();
        const compareTime = Date.now() - (value * 1000); // value in seconds
        return sensorTime >= compareTime;
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
