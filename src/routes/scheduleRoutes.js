// Only import rule engine if not disabled
let ruleEngine = null;
if (process.env.DISABLE_RULE_ENGINE !== 'true') {
  try {
    const ruleEngineModule = require('../ruleEngine');
    ruleEngine = ruleEngineModule.ruleEngine;
  } catch (error) {
    console.warn('Rule engine not available in scheduleRoutes:', error.message);
  }
}

const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { checkResourceOwnership } = require('../middlewares/permission');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @desc    Get all schedules for organization
 * @route   GET /api/v1/schedules
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const schedules = ruleEngine.getSchedulesByOrganization(organizationId);
    
    res.status(200).json({
      status: 'success',
      results: schedules.length,
      data: {
        schedules
      }
    });
  } catch (error) {
    logger.error('Error getting schedules:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get schedules'
    });
  }
});

/**
 * @desc    Get schedule by ID
 * @route   GET /api/v1/schedules/:id
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = ruleEngine.getSchedule(id);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Schedule not found'
      });
    }
    
    // Check if user has access to this schedule
    if (schedule.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        schedule
      }
    });
  } catch (error) {
    logger.error('Error getting schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get schedule'
    });
  }
});

/**
 * @desc    Create a new schedule
 * @route   POST /api/v1/schedules
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const scheduleConfig = {
      ...req.body,
      organizationId: req.user.organizationId,
      id: req.body.id || `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    };
    
    const schedule = ruleEngine.addSchedule(scheduleConfig);
    
    res.status(201).json({
      status: 'success',
      data: {
        schedule
      }
    });
  } catch (error) {
    logger.error('Error creating schedule:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create schedule'
    });
  }
});

/**
 * @desc    Update a schedule
 * @route   PUT /api/v1/schedules/:id
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = ruleEngine.getSchedule(id);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Schedule not found'
      });
    }
    
    // Check if user has access to this schedule
    if (schedule.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    const updatedSchedule = ruleEngine.updateSchedule(id, req.body);
    
    res.status(200).json({
      status: 'success',
      data: {
        schedule: updatedSchedule
      }
    });
  } catch (error) {
    logger.error('Error updating schedule:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update schedule'
    });
  }
});

/**
 * @desc    Delete a schedule
 * @route   DELETE /api/v1/schedules/:id
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = ruleEngine.getSchedule(id);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Schedule not found'
      });
    }
    
    // Check if user has access to this schedule
    if (schedule.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    ruleEngine.removeSchedule(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete schedule'
    });
  }
});

/**
 * @desc    Enable a schedule
 * @route   PUT /api/v1/schedules/:id/enable
 * @access  Private
 */
router.put('/:id/enable', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = ruleEngine.getSchedule(id);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Schedule not found'
      });
    }
    
    // Check if user has access to this schedule
    if (schedule.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    const updatedSchedule = ruleEngine.enableSchedule(id);
    
    res.status(200).json({
      status: 'success',
      data: {
        schedule: updatedSchedule
      }
    });
  } catch (error) {
    logger.error('Error enabling schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to enable schedule'
    });
  }
});

/**
 * @desc    Disable a schedule
 * @route   PUT /api/v1/schedules/:id/disable
 * @access  Private
 */
router.put('/:id/disable', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = ruleEngine.getSchedule(id);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Schedule not found'
      });
    }
    
    // Check if user has access to this schedule
    if (schedule.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    const updatedSchedule = ruleEngine.disableSchedule(id);
    
    res.status(200).json({
      status: 'success',
      data: {
        schedule: updatedSchedule
      }
    });
  } catch (error) {
    logger.error('Error disabling schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to disable schedule'
    });
  }
});

/**
 * @desc    Manually trigger a schedule
 * @route   POST /api/v1/schedules/:id/trigger
 * @access  Private
 */
router.post('/:id/trigger', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = ruleEngine.getSchedule(id);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Schedule not found'
      });
    }
    
    // Check if user has access to this schedule
    if (schedule.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    await ruleEngine.manuallyTriggerSchedule(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Schedule triggered successfully'
    });
  } catch (error) {
    logger.error('Error triggering schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger schedule'
    });
  }
});

/**
 * @desc    Get schedule statistics
 * @route   GET /api/v1/schedules/stats
 * @access  Private
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = ruleEngine.getScheduleStats();
    
    // Filter stats to only show schedules for user's organization
    const organizationSchedules = stats.scheduleDetails.filter(
      schedule => schedule.organizationId === req.user.organizationId
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        ...stats,
        scheduleDetails: organizationSchedules
      }
    });
  } catch (error) {
    logger.error('Error getting schedule stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get schedule statistics'
    });
  }
});

module.exports = router; 