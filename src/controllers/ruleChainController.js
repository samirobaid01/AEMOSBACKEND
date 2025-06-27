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

  // ========== SCHEDULE MANAGEMENT CONTROLLERS ==========

  /**
   * Get schedule information for a rule chain
   * GET /api/v1/rule-chains/:id/schedule
   */
  async getScheduleInfo(req, res) {
    try {
      const { id } = req.params;
      const scheduleInfo = await ruleChainService.ruleChainService.getScheduleInfo(id);

      res.json({
        status: 'success',
        data: scheduleInfo
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Enable scheduling for a rule chain
   * PUT /api/v1/rule-chains/:id/schedule/enable
   */
  async enableSchedule(req, res) {
    try {
      const { id } = req.params;
      const { cronExpression, timezone, priority, maxRetries, retryDelay, metadata } = req.body;

      // Validate required fields
      if (!cronExpression) {
        return res.status(400).json({
          status: 'error',
          message: 'Cron expression is required'
        });
      }

      const options = {
        timezone: timezone || 'UTC',
        priority: priority || 0,
        maxRetries: maxRetries || 0,
        retryDelay: retryDelay || 0,
        metadata: metadata || null
      };

      const updatedRuleChain = await ruleChainService.ruleChainService.enableSchedule(id, cronExpression, options);

      res.json({
        status: 'success',
        message: 'Schedule enabled successfully',
        data: updatedRuleChain
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Disable scheduling for a rule chain
   * PUT /api/v1/rule-chains/:id/schedule/disable
   */
  async disableSchedule(req, res) {
    try {
      const { id } = req.params;
      const updatedRuleChain = await ruleChainService.ruleChainService.disableSchedule(id);

      res.json({
        status: 'success',
        message: 'Schedule disabled successfully',
        data: updatedRuleChain
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Update schedule settings for a rule chain
   * PATCH /api/v1/rule-chains/:id/schedule
   */
  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const scheduleData = req.body;

      // Validate that at least one schedule field is provided
      const allowedFields = ['cronExpression', 'timezone', 'priority', 'maxRetries', 'retryDelay', 'scheduleMetadata'];
      const hasValidField = allowedFields.some(field => scheduleData[field] !== undefined);

      if (!hasValidField) {
        return res.status(400).json({
          status: 'error',
          message: 'At least one schedule field must be provided'
        });
      }

      const updatedRuleChain = await ruleChainService.ruleChainService.updateSchedule(id, scheduleData);

      res.json({
        status: 'success',
        message: 'Schedule updated successfully',
        data: updatedRuleChain
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Get all scheduled rule chains
   * GET /api/v1/rule-chains/scheduled
   */
  async getScheduledRuleChains(req, res) {
    try {
      const { organizationId } = req.query;
      const scheduledRuleChains = await ruleChainService.ruleChainService.getScheduledRuleChains(organizationId);

      res.json({
        status: 'success',
        results: scheduledRuleChains.length,
        data: scheduledRuleChains
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Manually trigger a scheduled rule chain
   * POST /api/v1/rule-chains/:id/schedule/trigger
   */
  async manualTriggerScheduled(req, res) {
    try {
      const { id } = req.params;
      
      // First verify the rule chain exists and has scheduling enabled
      const scheduleInfo = await ruleChainService.ruleChainService.getScheduleInfo(id);
      
      if (!scheduleInfo.scheduleEnabled) {
        return res.status(400).json({
          status: 'error',
          message: 'Rule chain does not have scheduling enabled'
        });
      }

      // Get the rule chain to extract organizationId
      const ruleChain = await ruleChainService.ruleChainService.findChainById(id);
      if (!ruleChain) {
        return res.status(404).json({
          status: 'error',
          message: 'Rule chain not found'
        });
      }

      // Trigger the specific rule chain
      const executionResult = await ruleChainService.ruleChainService.trigger(ruleChain.organizationId, id);

      // Update execution statistics
      const success = executionResult.results.every(result => result.status === 'success');
      await ruleChainService.ruleChainService.updateExecutionStats(id, success);

      res.json({
        status: 'success',
        message: 'Rule chain triggered manually',
        data: executionResult
      });
    } catch (error) {
      // Update failure stats
      try {
        await ruleChainService.ruleChainService.updateExecutionStats(req.params.id, false, error);
      } catch (statsError) {
        console.error('Failed to update failure stats:', statsError);
      }

      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // ========== END SCHEDULE MANAGEMENT ==========
}

module.exports = new RuleChainController(); 