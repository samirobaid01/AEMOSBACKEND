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
  _evaluateCondition(sensorData, config) {
    const { key, operator, value } = config;
    const sensorValue = sensorData[key];

    switch (operator) {
      case '>': return sensorValue > value;
      case '>=': return sensorValue >= value;
      case '<': return sensorValue < value;
      case '<=': return sensorValue <= value;
      case '==': return sensorValue == value;
      case '!=': return sensorValue != value;
      default: return false;
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
