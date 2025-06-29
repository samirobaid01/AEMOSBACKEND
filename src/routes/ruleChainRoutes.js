const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership } = require('../middlewares/permission');
const { getRuleChainForOwnershipCheck, getRuleChainNodeForOwnershipCheck } = require('../services/ruleChainService');
const ruleChainController = require('../controllers/ruleChainController');
const validate = require('../middlewares/validate');
const { querySchema } = require('../validators/ruleChainValidators');

// RuleChain routes
router
  .route('/')
  .get(
    authenticate,
    checkPermission('rule.view'),
    validate(querySchema, { query: true }),
    ruleChainController.getAllChains
  )
  .post(
    authenticate,
    checkPermission('rule.create'),
    ruleChainController.createChain
  );

// ========== SCHEDULE ROUTES - Must be before ANY parameterized routes ==========

// Get all scheduled rule chains
router.get(
  '/scheduled',
  authenticate,
  checkPermission('rule.view'),
  ruleChainController.getScheduledRuleChains
);

// Get schedule information for a specific rule chain
router.get(
  '/:id/schedule',
  authenticate,
  checkPermission('rule.view'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  ruleChainController.getScheduleInfo
);

// Enable scheduling for a rule chain
router.put(
  '/:id/schedule/enable',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  ruleChainController.enableSchedule
);

// Disable scheduling for a rule chain
router.put(
  '/:id/schedule/disable',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  ruleChainController.disableSchedule
);

// Update schedule settings for a rule chain
router.patch(
  '/:id/schedule',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  ruleChainController.updateSchedule
);

// Manually trigger a scheduled rule chain
router.post(
  '/:id/schedule/trigger',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  ruleChainController.manualTriggerScheduled
);

// ========== DEBUG ENDPOINTS (for development/troubleshooting) ==========

// Get ScheduleManager stats and status
router.get(
  '/debug/schedule-stats',
  authenticate,
  checkPermission('rule.view'),
  async (req, res) => {
    try {
      // Import rule engine
      const ruleEngineModule = require('../ruleEngine');
      const ruleEngine = ruleEngineModule.ruleEngine;
      
      if (!ruleEngine.isInitialized) {
        return res.status(503).json({
          status: 'error',
          message: 'Rule engine not initialized'
        });
      }

      const stats = ruleEngine.getScheduleStats();
      
      res.json({
        status: 'success',
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Manually sync a specific rule chain schedule
router.post(
  '/:id/debug/sync-schedule',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Import rule engine
      const ruleEngineModule = require('../ruleEngine');
      const ruleEngine = ruleEngineModule.ruleEngine;
      
      if (!ruleEngine.isInitialized) {
        return res.status(503).json({
          status: 'error',
          message: 'Rule engine not initialized'
        });
      }

      await ruleEngine.syncScheduleFromDatabase(parseInt(id));
      
      res.json({
        status: 'success',
        message: `Schedule synced for rule chain ${id}`,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Refresh all schedules from database
router.post(
  '/debug/refresh-all-schedules',
  authenticate,
  checkPermission('rule.update'),
  async (req, res) => {
    try {
      // Import rule engine
      const ruleEngineModule = require('../ruleEngine');
      const ruleEngine = ruleEngineModule.ruleEngine;
      
      if (!ruleEngine.isInitialized) {
        return res.status(503).json({
          status: 'error',
          message: 'Rule engine not initialized'
        });
      }

      await ruleEngine.scheduleManager.refreshDatabaseSchedules();
      
      const stats = ruleEngine.getScheduleStats();
      
      res.json({
        status: 'success',
        message: 'All schedules refreshed from database',
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// ========== PARAMETERIZED ROUTES (must come after specific routes) ==========

router
  .route('/:id')
  .get(
    authenticate,
    checkPermission('rule.view'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    ruleChainController.getChainById
  )
  .patch(
    authenticate,
    checkPermission('rule.update'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    ruleChainController.updateChain
  )
  .delete(
    authenticate,
    checkPermission('rule.delete'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    ruleChainController.deleteChain
  );

// RuleChainNode routes
router.get(
  '/:ruleChainId/nodes',
  authenticate,
  checkPermission('rule.view'),
  checkResourceOwnership(getRuleChainForOwnershipCheck, 'ruleChainId'),
  ruleChainController.getAllNodes
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
  ruleChainController.createNode
);

router
  .route('/nodes/:id')
  .get(
    authenticate,
    checkPermission('rule.view'),
    checkResourceOwnership(getRuleChainNodeForOwnershipCheck),
    ruleChainController.getNodeById
  )
  .patch(
    authenticate,
    checkPermission('rule.update'),
    checkResourceOwnership(getRuleChainNodeForOwnershipCheck),
    ruleChainController.updateNode
  )
  .delete(
    authenticate,
    checkPermission('rule.delete'),
    checkResourceOwnership(getRuleChainNodeForOwnershipCheck),
    ruleChainController.deleteNode
  );

// Execute route
router.post(
  '/:id/execute',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  ruleChainController.executeChain
);

// Trigger route
router.post(
  '/:id/trigger',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  ruleChainController.triggerChain
);

// Debug endpoints for schedule troubleshooting
router.get('/debug/:id/schedule-info', ruleChainController.debugScheduleInfo);
router.post('/debug/:id/trigger-schedule', ruleChainController.debugManualTriggerSchedule);
router.get('/debug/schedule-manager/stats', ruleChainController.debugScheduleManagerStats);
router.post('/debug/:id/sync-from-db', ruleChainController.debugSyncScheduleFromDB);
router.post('/debug/refresh-all-schedules', ruleChainController.debugRefreshAllSchedules);
router.post('/debug/trigger-auto-sync', ruleChainController.debugTriggerAutoSync);

module.exports = router;
