const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership, checkOrgPermission } = require('../middlewares/permission');
const { ruleChainService, getRuleChainForOwnershipCheck, getRuleChainNodeForOwnershipCheck } = require('../services/ruleChainService');
const validate = require('../middlewares/validate');
const { querySchema } = require('../validators/ruleChainValidators');
const { body, param } = require('express-validator');
const { ApiError } = require('../middlewares/errorHandler');
const Joi = require('joi');

// Only import rule engine if not disabled
let ruleEngine = null;
if (process.env.DISABLE_RULE_ENGINE !== 'true') {
  try {
    const ruleEngineModule = require('../ruleEngine');
    ruleEngine = ruleEngineModule.ruleEngine;
  } catch (error) {
    console.warn('Rule engine not available in ruleChainRoutes:', error.message);
  }
}

// Request handlers
const getAllChains = async (req, res) => {
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
};

const createChain = async (req, res) => {
  try {
    const ruleChain = await ruleChainService.createChain(req.body);
    
    res.status(201).json({
      status: 'success',
      data: ruleChain
    });

    process.nextTick(() => {
      try {
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
};

const getChainById = async (req, res) => {
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
};

const updateChain = async (req, res) => {
  try {
    const ruleChain = await ruleChainService.updateChain(req.params.id, req.body);
    
    res.json({
      status: 'success',
      data: ruleChain
    });

    process.nextTick(() => {
      try {
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
};

const deleteChain = async (req, res) => {
  try {
    const ruleChain = await ruleChainService.findChainById(req.params.id);
    
    await ruleChainService.deleteChain(req.params.id);
    
    res.status(204).send();

    if (ruleChain) {
      process.nextTick(() => {
        try {
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
        } catch (error) {
          console.error('Error emitting rule chain deleted event:', error);
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getAllNodes = async (req, res) => {
  try {
    const nodes = await ruleChainService.findAllNodes(req.params.ruleChainId);
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
};

const createNode = async (req, res) => {
  try {
    const node = await ruleChainService.createNode(req.body);
    
    res.status(201).json({
      status: 'success',
      data: node
    });

    process.nextTick(() => {
      try {
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
};

const getNodeById = async (req, res) => {
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
};

const updateNode = async (req, res) => {
  try {
    const node = await ruleChainService.updateNode(req.params.id, req.body);
    
    res.json({
      status: 'success',
      data: node
    });

    process.nextTick(() => {
      try {
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
};

const deleteNode = async (req, res) => {
  try {
    const node = await ruleChainService.findNodeById(req.params.id);
    
    await ruleChainService.deleteNode(req.params.id);
    
    res.status(204).send();

    if (node) {
      process.nextTick(() => {
        try {
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
        } catch (error) {
          console.error('Error emitting node deleted event:', error);
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const executeChain = async (req, res) => {
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
};

const triggerChain = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;
    
    const targetOrganizationId = organizationId || req.user?.organizationId || 1;
    
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
};

// ========== SCHEDULE CONTROLLER FUNCTIONS ==========

const getScheduleInfo = async (req, res) => {
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
};

const enableSchedule = async (req, res) => {
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
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const disableSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRuleChain = await ruleChainService.disableSchedule(id);

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
};

const updateSchedule = async (req, res) => {
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
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getScheduledRuleChains = async (req, res) => {
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
};

const manualTriggerScheduled = async (req, res) => {
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
};

// RuleChain routes
router
  .route('/')
  .get(
    authenticate,
    checkPermission('rule.view'),
    validate(querySchema, { query: true }),
    getAllChains
  )
  .post(
    authenticate,
    checkPermission('rule.create'),
    createChain
  );

// ========== SCHEDULE ROUTES - Must be before ANY parameterized routes ==========

// Get all scheduled rule chains
router.get(
  '/scheduled',
  authenticate,
  checkPermission('rule.view'),
  getScheduledRuleChains
);

// Get schedule information for a specific rule chain
router.get(
  '/:id/schedule',
  authenticate,
  checkPermission('rule.view'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  getScheduleInfo
);

// Enable scheduling for a rule chain
router.put(
  '/:id/schedule/enable',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  enableSchedule
);

// Disable scheduling for a rule chain
router.put(
  '/:id/schedule/disable',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  disableSchedule
);

// Update schedule settings for a rule chain
router.patch(
  '/:id/schedule',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  updateSchedule
);

// Manually trigger a scheduled rule chain
router.post(
  '/:id/schedule/trigger',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  manualTriggerScheduled
);

// ========== PARAMETERIZED ROUTES (must come after specific routes) ==========

router
  .route('/:id')
  .get(
    authenticate,
    checkPermission('rule.view'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    getChainById
  )
  .patch(
    authenticate,
    checkPermission('rule.update'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    updateChain
  )
  .delete(
    authenticate,
    checkPermission('rule.delete'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    deleteChain
  );

// RuleChainNode routes
router.get(
  '/:ruleChainId/nodes',
  authenticate,
  checkPermission('rule.view'),
  checkResourceOwnership(getRuleChainForOwnershipCheck, 'ruleChainId'),
  getAllNodes
);

router.post(
  '/nodes',
  authenticate,
  checkPermission('rule.update'),
  (req, res, next) => {
    req.params.id = req.body.ruleChainId;
    next();
  },
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  createNode
);

router
  .route('/nodes/:id')
  .get(
    authenticate,
    checkPermission('rule.view'),
    checkResourceOwnership(getRuleChainNodeForOwnershipCheck),
    getNodeById
  )
  .patch(
    authenticate,
    checkPermission('rule.update'),
    checkResourceOwnership(getRuleChainNodeForOwnershipCheck),
    updateNode
  )
  .delete(
    authenticate,
    checkPermission('rule.delete'),
    checkResourceOwnership(getRuleChainNodeForOwnershipCheck),
    deleteNode
  );

// Execute route
router.post(
  '/:id/execute',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  executeChain
);

// Trigger route
router.post(
  '/:id/trigger',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  triggerChain
);

module.exports = router;
