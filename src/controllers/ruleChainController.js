const { ruleChainService } = require('../services/ruleChainService');
const { 
  createRuleChainSchema, 
  updateRuleChainSchema,
  createRuleChainNodeSchema,
  updateRuleChainNodeSchema 
} = require('../validators/ruleChainValidators');
const { ApiError } = require('../middlewares/errorHandler');

// Import rule engine with error handling
let ruleEngine = null;
if (process.env.DISABLE_RULE_ENGINE !== 'true') {
  try {
    const ruleEngineModule = require('../ruleEngine');
    ruleEngine = ruleEngineModule.ruleEngine;
  } catch (error) {
    console.warn('Rule engine not available in ruleChainController:', error.message);
  }
}

class RuleChainController {
  // ========== RULE CHAIN OPERATIONS ==========
  
  async getAllChains(req, res) {
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

      // Emit rule engine event asynchronously
      process.nextTick(async () => {
        try {
          if (ruleEngine) {
            ruleEngine.emitRuleChainUpdated({
              ruleChainId: ruleChain.id,
              organizationId: ruleChain.organizationId,
              action: 'created',
              timestamp: new Date(),
              metadata: {
                triggeredBy: req.user?.id || 'unknown',
                source: 'api'
              }
            });

            // 🔥 NEW: Sync schedule with ScheduleManager if scheduling is enabled
            if (ruleChain.scheduleEnabled && ruleChain.cronExpression) {
              try {
                await ruleEngine.syncScheduleFromDatabase(ruleChain.id);
                console.log(`✅ Schedule synced for new rule chain: ${ruleChain.name} (${ruleChain.cronExpression})`);
              } catch (scheduleError) {
                console.error(`❌ Failed to sync schedule for new rule chain ${ruleChain.id}:`, scheduleError);
              }
            }
          }
        } catch (error) {
          console.error('Error emitting rule chain created event:', error);
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async getChainById(req, res) {
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

      const existingChain = await ruleChainService.findChainById(req.params.id);
      if (!existingChain) {
        return res.status(404).json({
          status: 'error',
          message: 'Rule chain not found'
        });
      }

      const ruleChain = await ruleChainService.updateChain(req.params.id, value);
      
      res.json({
        status: 'success',
        data: ruleChain
      });

      // Emit rule engine event asynchronously
      process.nextTick(async () => {
        try {
          if (ruleEngine) {
            ruleEngine.emitRuleChainUpdated({
              ruleChainId: ruleChain.id,
              organizationId: ruleChain.organizationId,
              action: 'updated',
              timestamp: new Date(),
              metadata: {
                triggeredBy: req.user?.id || 'unknown',
                source: 'api'
              }
            });

            // 🔥 NEW: Sync schedule with ScheduleManager if scheduling is enabled
            if (ruleChain.scheduleEnabled && ruleChain.cronExpression) {
              try {
                await ruleEngine.syncScheduleFromDatabase(ruleChain.id);
                console.log(`✅ Schedule synced for updated rule chain: ${ruleChain.name} (${ruleChain.cronExpression})`);
              } catch (scheduleError) {
                console.error(`❌ Failed to sync schedule for updated rule chain ${ruleChain.id}:`, scheduleError);
              }
            }
          }
        } catch (error) {
          console.error('Error emitting rule chain updated event:', error);
        }
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

      // Emit rule engine event asynchronously
      process.nextTick(() => {
        try {
          if (ruleEngine) {
            ruleEngine.emitRuleChainDeleted({
              ruleChainId: ruleChain.id,
              organizationId: ruleChain.organizationId,
              action: 'deleted',
              timestamp: new Date(),
              metadata: {
                triggeredBy: req.user?.id || 'unknown',
                source: 'api'
              }
            });
          }
        } catch (error) {
          console.error('Error emitting rule chain deleted event:', error);
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // ========== RULE CHAIN NODE OPERATIONS ==========

  async getAllNodes(req, res) {
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

      // Emit rule engine event asynchronously
      process.nextTick(() => {
        try {
          if (ruleEngine) {
            ruleEngine.emitRuleChainUpdated({
              ruleChainId: node.ruleChainId,
              organizationId: req.user?.organizationId || 1,
              action: 'node_created',
              nodeId: node.id,
              timestamp: new Date(),
              metadata: {
                triggeredBy: req.user?.id || 'unknown',
                source: 'api'
              }
            });
          }
        } catch (error) {
          console.error('Error emitting node created event:', error);
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async getNodeById(req, res) {
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

      const existingNode = await ruleChainService.findNodeById(req.params.id);
      if (!existingNode) {
        return res.status(404).json({
          status: 'error',
          message: 'Node not found'
        });
      }

      const node = await ruleChainService.updateNode(req.params.id, value);
      
      res.json({
        status: 'success',
        data: node
      });

      // Emit rule engine event asynchronously
      process.nextTick(() => {
        try {
          if (ruleEngine) {
            ruleEngine.emitRuleChainUpdated({
              ruleChainId: node.ruleChainId,
              organizationId: req.user?.organizationId || 1,
              action: 'node_updated',
              nodeId: node.id,
              timestamp: new Date(),
              metadata: {
                triggeredBy: req.user?.id || 'unknown',
                source: 'api'
              }
            });
          }
        } catch (error) {
          console.error('Error emitting node updated event:', error);
        }
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

      // Emit rule engine event asynchronously
      process.nextTick(() => {
        try {
          if (ruleEngine) {
            ruleEngine.emitRuleChainUpdated({
              ruleChainId: node.ruleChainId,
              organizationId: req.user?.organizationId || 1,
              action: 'node_deleted',
              nodeId: node.id,
              timestamp: new Date(),
              metadata: {
                triggeredBy: req.user?.id || 'unknown',
                source: 'api'
              }
            });
          }
        } catch (error) {
          console.error('Error emitting node deleted event:', error);
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // ========== RULE CHAIN EXECUTION ==========

  async executeChain(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      if (!data) {
        return res.status(400).json({
          status: 'error',
          message: 'Sensor data is required'
        });
      }

      const result = await ruleChainService.execute(id, data);
      
      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async triggerChain(req, res) {
    try {
      const { id } = req.params;
      const { organizationId } = req.query;
      
      const targetOrganizationId = organizationId || req.user?.organizationId || 1;
      
      if (ruleEngine) {
        ruleEngine.emitManualTrigger({
          organizationId: targetOrganizationId,
          ruleChainId: id ? parseInt(id) : null,
          triggeredBy: req.user?.id || 'unknown',
          timestamp: new Date(),
          metadata: {
            source: 'manual_api',
            triggeredVia: 'api_endpoint'
          }
        });
      }
      
      res.json({
        status: 'success',
        message: 'Rule chain trigger initiated',
        data: {
          organizationId: targetOrganizationId,
          ruleChainId: id ? parseInt(id) : null,
          triggeredBy: req.user?.id || 'unknown',
          triggeredAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // ========== SCHEDULE MANAGEMENT ==========

  async getScheduleInfo(req, res) {
    try {
      const { id } = req.params;
      const scheduleInfo = await ruleChainService.getScheduleInfo(id);

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

      const updatedRuleChain = await ruleChainService.enableSchedule(id, cronExpression, options);

      res.json({
        status: 'success',
        message: 'Schedule enabled successfully',
        data: updatedRuleChain
      });

      // 🔥 NEW: Sync with ScheduleManager immediately
      process.nextTick(async () => {
        try {
          if (ruleEngine) {
            await ruleEngine.syncScheduleFromDatabase(parseInt(id));
            console.log(`✅ Schedule enabled and synced for rule chain: ${updatedRuleChain.name} (${cronExpression})`);
          }
        } catch (scheduleError) {
          console.error(`❌ Failed to sync enabled schedule for rule chain ${id}:`, scheduleError);
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async disableSchedule(req, res) {
    try {
      const { id } = req.params;
      const updatedRuleChain = await ruleChainService.disableSchedule(id);

      res.json({
        status: 'success',
        message: 'Schedule disabled successfully',
        data: updatedRuleChain
      });

      // 🔥 NEW: Sync with ScheduleManager immediately
      process.nextTick(async () => {
        try {
          if (ruleEngine) {
            await ruleEngine.syncScheduleFromDatabase(parseInt(id));
            console.log(`✅ Schedule disabled and synced for rule chain: ${updatedRuleChain.name}`);
          }
        } catch (scheduleError) {
          console.error(`❌ Failed to sync disabled schedule for rule chain ${id}:`, scheduleError);
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

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

      const updatedRuleChain = await ruleChainService.updateSchedule(id, scheduleData);

      res.json({
        status: 'success',
        message: 'Schedule updated successfully',
        data: updatedRuleChain
      });

      // 🔥 NEW: Sync with ScheduleManager immediately
      process.nextTick(async () => {
        try {
          if (ruleEngine) {
            await ruleEngine.syncScheduleFromDatabase(parseInt(id));
            console.log(`✅ Schedule updated and synced for rule chain: ${updatedRuleChain.name}`);
          }
        } catch (scheduleError) {
          console.error(`❌ Failed to sync updated schedule for rule chain ${id}:`, scheduleError);
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async getScheduledRuleChains(req, res) {
    try {
      const { organizationId } = req.query;
      const scheduledRuleChains = await ruleChainService.getScheduledRuleChains(organizationId);

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

  async manualTriggerScheduled(req, res) {
    try {
      const { id } = req.params;
      
      // First verify the rule chain exists and has scheduling enabled
      const scheduleInfo = await ruleChainService.getScheduleInfo(id);
      
      if (!scheduleInfo.scheduleEnabled) {
        return res.status(400).json({
          status: 'error',
          message: 'Rule chain does not have scheduling enabled'
        });
      }

      // Get the rule chain to extract organizationId
      const ruleChain = await ruleChainService.findChainById(id);
      if (!ruleChain) {
        return res.status(404).json({
          status: 'error',
          message: 'Rule chain not found'
        });
      }

      // Trigger the specific rule chain
      const executionResult = await ruleChainService.trigger(ruleChain.organizationId, id);

      // Update execution statistics
      const success = executionResult.results.every(result => result.status === 'success');
      await ruleChainService.updateExecutionStats(id, success);

      res.json({
        status: 'success',
        message: 'Rule chain triggered manually',
        data: executionResult
      });
    } catch (error) {
      // Update failure stats
      try {
        await ruleChainService.updateExecutionStats(req.params.id, false, error);
      } catch (statsError) {
        console.error('Failed to update failure stats:', statsError);
      }

      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // ========== LEGACY METHODS (keeping for compatibility) ==========
  
  // Alias methods for backward compatibility
  async findAllChains(req, res) {
    return this.getAllChains(req, res);
  }

  async findChainById(req, res) {
    return this.getChainById(req, res);
  }

  async findAllNodes(req, res) {
    return this.getAllNodes(req, res);
  }

  async findNodeById(req, res) {
    return this.getNodeById(req, res);
  }
}

module.exports = new RuleChainController(); 