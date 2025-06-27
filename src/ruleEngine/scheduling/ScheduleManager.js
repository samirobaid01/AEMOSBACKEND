const cron = require('node-cron');
const { EventTypes } = require('../../events/EventTypes');
const logger = require('../../utils/logger');

/**
 * Schedule Manager - Handles cron-based rule execution scheduling
 * Manages time-based triggers for rule chains
 */
class ScheduleManager {
  constructor(ruleEngineEventBus) {
    this.eventBus = ruleEngineEventBus;
    this.schedules = new Map(); // Map<scheduleId, ScheduleInfo>
    this.cronJobs = new Map(); // Map<scheduleId, CronJob>
    
    this.scheduleStats = {
      totalSchedules: 0,
      activeSchedules: 0,
      executedSchedules: 0,
      failedSchedules: 0,
      lastExecutedAt: null
    };
    
    logger.info('ScheduleManager initialized');
  }

  /**
   * Add a new cron-based schedule
   * @param {Object} scheduleConfig 
   */
  addSchedule(scheduleConfig) {
    const {
      id = `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, // Auto-generate ID if not provided
      name,
      cronExpression,
      organizationId,
      ruleChainIds = [], // Optional: specific rule chains
      enabled = true,
      metadata = {}
    } = scheduleConfig;

    try {
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      // Check if schedule already exists
      if (this.schedules.has(id)) {
        throw new Error(`Schedule with ID ${id} already exists`);
      }

      // Create schedule info
      const scheduleInfo = {
        id,
        name,
        cronExpression,
        organizationId,
        ruleChainIds,
        enabled,
        metadata,
        createdAt: new Date(),
        lastExecutedAt: null,
        executionCount: 0,
        failureCount: 0
      };

      // Store schedule
      this.schedules.set(id, scheduleInfo);
      this.scheduleStats.totalSchedules++;

      // Create and start cron job if enabled
      if (enabled) {
        this._createCronJob(scheduleInfo);
      }

      logger.info(`Schedule added: ${name} (${cronExpression})`);
      return scheduleInfo;
    } catch (error) {
      logger.error(`Failed to add schedule ${id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a schedule
   * @param {string} scheduleId 
   */
  removeSchedule(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // Stop and remove cron job
      const cronJob = this.cronJobs.get(scheduleId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(scheduleId);
        this.scheduleStats.activeSchedules--;
      }

      // Remove schedule
      this.schedules.delete(scheduleId);
      this.scheduleStats.totalSchedules--;

      logger.info(`Schedule removed: ${schedule.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Enable a schedule
   * @param {string} scheduleId 
   */
  enableSchedule(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (!schedule.enabled) {
        schedule.enabled = true;
        this._createCronJob(schedule);
        logger.info(`Schedule enabled: ${schedule.name}`);
      }

      return schedule;
    } catch (error) {
      logger.error(`Failed to enable schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Disable a schedule
   * @param {string} scheduleId 
   */
  disableSchedule(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (schedule.enabled) {
        schedule.enabled = false;
        
        // Stop cron job
        const cronJob = this.cronJobs.get(scheduleId);
        if (cronJob) {
          cronJob.stop();
          this.cronJobs.delete(scheduleId);
          this.scheduleStats.activeSchedules--;
        }

        logger.info(`Schedule disabled: ${schedule.name}`);
      }

      return schedule;
    } catch (error) {
      logger.error(`Failed to disable schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Update a schedule
   * @param {string} scheduleId 
   * @param {Object} updates 
   */
  updateSchedule(scheduleId, updates) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // Validate cron expression if being updated
      if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
        throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
      }

      // Stop existing cron job if active
      const cronJob = this.cronJobs.get(scheduleId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(scheduleId);
        this.scheduleStats.activeSchedules--;
      }

      // Update schedule
      Object.assign(schedule, updates);

      // Recreate cron job if enabled
      if (schedule.enabled) {
        this._createCronJob(schedule);
      }

      logger.info(`Schedule updated: ${schedule.name}`);
      return schedule;
    } catch (error) {
      logger.error(`Failed to update schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Get all schedules for an organization
   * @param {number} organizationId 
   */
  getSchedulesByOrganization(organizationId) {
    const orgSchedules = [];
    for (const schedule of this.schedules.values()) {
      if (schedule.organizationId === organizationId) {
        orgSchedules.push({
          ...schedule,
          isActive: this.cronJobs.has(schedule.id)
        });
      }
    }
    return orgSchedules;
  }

  /**
   * Get schedule by ID
   * @param {string} scheduleId 
   */
  getSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    return {
      ...schedule,
      isActive: this.cronJobs.has(scheduleId)
    };
  }

  /**
   * Create and start a cron job for a schedule
   * @param {Object} schedule 
   */
  _createCronJob(schedule) {
    const cronJob = cron.schedule(schedule.cronExpression, () => {
      this._executeSchedule(schedule);
    }, {
      scheduled: false // Don't start immediately
    });

    // Start the job
    cronJob.start();

    // Store the job
    this.cronJobs.set(schedule.id, cronJob);
    this.scheduleStats.activeSchedules++;

    logger.debug(`Cron job created for schedule: ${schedule.name}`);
  }

  /**
   * Execute a schedule (emit scheduled event)
   * @param {Object} schedule 
   */
  async _executeSchedule(schedule) {
    try {
      logger.debug(`Executing schedule: ${schedule.name} (${schedule.cronExpression})`);

      // Update schedule stats
      schedule.lastExecutedAt = new Date();
      schedule.executionCount++;
      this.scheduleStats.executedSchedules++;
      this.scheduleStats.lastExecutedAt = new Date();

      // Emit scheduled event
      this.eventBus.emitEvent(EventTypes.SCHEDULE_TRIGGERED, {
        cronExpression: schedule.cronExpression,
        scheduleName: schedule.name,
        scheduleId: schedule.id,
        organizationId: schedule.organizationId,
        ruleChainIds: schedule.ruleChainIds,
        timestamp: new Date(),
        metadata: {
          source: 'scheduler',
          executionCount: schedule.executionCount,
          ...schedule.metadata
        }
      });

      logger.debug(`Schedule executed successfully: ${schedule.name}`);
    } catch (error) {
      logger.error(`Failed to execute schedule ${schedule.name}:`, error);
      
      // Update failure stats
      schedule.failureCount++;
      this.scheduleStats.failedSchedules++;
    }
  }

  /**
   * Manually trigger a schedule (for testing)
   * @param {string} scheduleId 
   */
  async manuallyTriggerSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    await this._executeSchedule(schedule);
    return schedule;
  }

  /**
   * Get schedule statistics
   */
  getStats() {
    return {
      ...this.scheduleStats,
      scheduleDetails: Array.from(this.schedules.values()).map(schedule => ({
        id: schedule.id,
        name: schedule.name,
        enabled: schedule.enabled,
        executionCount: schedule.executionCount,
        failureCount: schedule.failureCount,
        lastExecutedAt: schedule.lastExecutedAt,
        isActive: this.cronJobs.has(schedule.id)
      }))
    };
  }

  /**
   * Stop all schedules
   */
  stopAll() {
    for (const [scheduleId, cronJob] of this.cronJobs.entries()) {
      cronJob.stop();
    }
    
    this.cronJobs.clear();
    this.scheduleStats.activeSchedules = 0;
    
    logger.info('All schedules stopped');
  }

  /**
   * Start all enabled schedules
   */
  startAll() {
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled && !this.cronJobs.has(schedule.id)) {
        this._createCronJob(schedule);
      }
    }
    
    logger.info('All enabled schedules started');
  }

  /**
   * Clear all schedules and statistics
   */
  reset() {
    this.stopAll();
    this.schedules.clear();
    this.scheduleStats = {
      totalSchedules: 0,
      activeSchedules: 0,
      executedSchedules: 0,
      failedSchedules: 0,
      lastExecutedAt: null
    };
    
    logger.info('ScheduleManager reset');
  }
}

module.exports = ScheduleManager; 