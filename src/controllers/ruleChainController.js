const ruleChainService = require('../services/ruleChainService');
const { 
  createRuleChainSchema, 
  updateRuleChainSchema,
  createRuleChainNodeSchema,
  updateRuleChainNodeSchema 
} = require('../validators/ruleChainValidators');
const { ApiError } = require('../middlewares/errorHandler');

class RuleChainController {
  // RuleChain operations
  async findAllChains(req, res) {
    try {
      const { organizationId } = req.query;
      const ruleChains = await ruleChainService.findAllChains(organizationId);

      res.json({
        status: 'success',
        data: ruleChains
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async createChain(req, res) {
    try {
      const { error, value } = createRuleChainSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.details[0].message
        });
      }

      const ruleChain = await ruleChainService.createChain(value);

      res.status(201).json({
        status: 'success',
        data: ruleChain
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async findChainById(req, res) {
    try {
      const ruleChain = await ruleChainService.findChainById(req.params.id);
      
      if (!ruleChain) {
        return res.status(404).json({
          status: 'error',
          message: 'Rule chain not found'
        });
      }

      res.json({
        status: 'success',
        data: ruleChain
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async updateChain(req, res) {
    try {
      const { error, value } = updateRuleChainSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.details[0].message
        });
      }

      const ruleChain = await ruleChainService.findChainById(req.params.id);
      if (!ruleChain) {
        return res.status(404).json({
          status: 'error',
          message: 'Rule chain not found'
        });
      }

      const updatedRuleChain = await ruleChainService.updateChain(req.params.id, value);

      res.json({
        status: 'success',
        data: updatedRuleChain
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async deleteChain(req, res) {
    try {
      const ruleChain = await ruleChainService.findChainById(req.params.id);
      if (!ruleChain) {
        return res.status(404).json({
          status: 'error',
          message: 'Rule chain not found'
        });
      }

      await ruleChainService.deleteChain(req.params.id);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // RuleChainNode operations
  async createNode(req, res) {
    try {
      const { error, value } = createRuleChainNodeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.details[0].message
        });
      }

      const node = await ruleChainService.createNode(value);
      res.status(201).json({
        status: 'success',
        data: node
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async findAllNodes(req, res) {
    try {
      const { ruleChainId } = req.params;
      const nodes = await ruleChainService.findAllNodes(ruleChainId);
      res.json({
        status: 'success',
        data: nodes
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async findNodeById(req, res) {
    try {
      const node = await ruleChainService.findNodeById(req.params.id);
      if (!node) {
        return res.status(404).json({
          status: 'error',
          message: 'Node not found'
        });
      }

      res.json({
        status: 'success',
        data: node
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async updateNode(req, res) {
    try {
      const { error, value } = updateRuleChainNodeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.details[0].message
        });
      }

      const node = await ruleChainService.findNodeById(req.params.id);
      if (!node) {
        return res.status(404).json({
          status: 'error',
          message: 'Node not found'
        });
      }

      const updatedNode = await ruleChainService.updateNode(req.params.id, value);
      res.json({
        status: 'success',
        data: updatedNode
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async deleteNode(req, res) {
    try {
      const node = await ruleChainService.findNodeById(req.params.id);
      if (!node) {
        return res.status(404).json({
          status: 'error',
          message: 'Node not found'
        });
      }

      await ruleChainService.deleteNode(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new RuleChainController(); 