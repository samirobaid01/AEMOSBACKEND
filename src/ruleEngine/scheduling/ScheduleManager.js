const cron = require('node-cron');
const { EventTypes } = require('../../events/EventTypes');
const logger = require('../../utils/logger');

/**
 * Enhanced Schedule Manager - Handles cron-based rule execution scheduling with database integration
 * Manages time-based triggers for rule chains using database-backed schedules
 */
class ScheduleManager {
  constructor(ruleEngineEventBus, ruleChainService = null) {
    this.eventBus = ruleEngineEventBus;
    this.ruleChainService = ruleChainService;
    this.schedules = new Map(); // Map<ruleChainId, ScheduleInfo>
    this.cronJobs = new Map(); // Map<ruleChainId, CronJob>
    
    this.scheduleStats = {
      totalSchedules: 0,
      activeSchedules: 0,
      executedSchedules: 0,
      failedSchedules: 0,
      lastExecutedAt: null
    };

    this.isInitialized = false;
    
    logger.info('Enhanced ScheduleManager initialized with database integration');
  }

  /**
   * Initialize the schedule manager - loads schedules from database
   */
  async initialize() {
    try {
      if (!this.ruleChainService) {
        logger.warn('ScheduleManager: ruleChainService not provided, database integration disabled');
        this.isInitialized = true;
        return;
      }

      await this._loadSchedulesFromDatabase();
      this.isInitialized = true;
      logger.info('ScheduleManager initialized with database schedules');
    } catch (error) {
      logger.error('Failed to initialize ScheduleManager:', error);
      throw error;
    }
  }

  /**
   * Load all scheduled rule chains from database
   */
  async _loadSchedulesFromDatabase() {
    try {
      const scheduledRuleChains = await this.ruleChainService.getScheduledRuleChains();
      
      for (const ruleChain of scheduledRuleChains) {
        const scheduleInfo = {
          id: ruleChain.id,
          ruleChainId: ruleChain.id,
          name: ruleChain.name,
          cronExpression: ruleChain.cronExpression,
          timezone: ruleChain.timezone || 'UTC',
          organizationId: ruleChain.organizationId,
          priority: ruleChain.priority || 0,
          maxRetries: ruleChain.maxRetries || 0,
          retryDelay: ruleChain.retryDelay || 0,
          enabled: ruleChain.scheduleEnabled,
          metadata: ruleChain.scheduleMetadata || {},
          createdAt: ruleChain.createdAt,
          lastExecutedAt: ruleChain.lastExecutedAt,
          executionCount: ruleChain.executionCount || 0,
          failureCount: ruleChain.failureCount || 0
        };

        this.schedules.set(ruleChain.id, scheduleInfo);
        this.scheduleStats.totalSchedules++;

        // Create cron job if enabled
        if (scheduleInfo.enabled) {
          this._createCronJob(scheduleInfo);
        }
      }

      logger.info(`Loaded ${scheduledRuleChains.length} schedules from database`);
    } catch (error) {
      logger.error('Failed to load schedules from database:', error);
      throw error;
    }
  }

  /**
   * Add a new database-backed schedule for a rule chain
   * @param {number} ruleChainId - Rule chain ID
   * @param {Object} scheduleConfig - Schedule configuration
   */
  async addDatabaseSchedule(ruleChainId, scheduleConfig) {
    try {
      if (!this.ruleChainService) {
        throw new Error('Database integration not available');
      }

      const {
        cronExpression,
        timezone = 'UTC',
        priority = 0,
        maxRetries = 0,
        retryDelay = 0,
        metadata = {}
      } = scheduleConfig;

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      // Enable schedule in database
      const updatedRuleChain = await this.ruleChainService.enableSchedule(ruleChainId, cronExpression, {
        timezone,
        priority,
        maxRetries,
        retryDelay,
        metadata
      });

      // Create local schedule info
      const scheduleInfo = {
        id: ruleChainId,
        ruleChainId: ruleChainId,
        name: updatedRuleChain.name,
        cronExpression,
        timezone,
        organizationId: updatedRuleChain.organizationId,
        priority,
        maxRetries,
        retryDelay,
        enabled: true,
        metadata,
        createdAt: updatedRuleChain.createdAt,
        lastExecutedAt: null,
        executionCount: 0,
        failureCount: 0
      };

      // Store schedule locally
      this.schedules.set(ruleChainId, scheduleInfo);
      this.scheduleStats.totalSchedules++;

      // Create and start cron job
      this._createCronJob(scheduleInfo);

      logger.info(`Database schedule added for rule chain: ${updatedRuleChain.name} (${cronExpression})`);
      return scheduleInfo;
    } catch (error) {
      logger.error(`Failed to add database schedule for rule chain ${ruleChainId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a database-backed schedule
   * @param {number} ruleChainId - Rule chain ID
   */
  async removeDatabaseSchedule(ruleChainId) {
    try {
      if (!this.ruleChainService) {
        throw new Error('Database integration not available');
      }

      const schedule = this.schedules.get(ruleChainId);
      if (!schedule) {
        throw new Error(`Schedule for rule chain ${ruleChainId} not found`);
      }

      // Disable schedule in database
      await this.ruleChainService.disableSchedule(ruleChainId);

      // Stop and remove cron job
      const cronJob = this.cronJobs.get(ruleChainId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(ruleChainId);
        this.scheduleStats.activeSchedules--;
      }

      // Remove local schedule
      this.schedules.delete(ruleChainId);
      this.scheduleStats.totalSchedules--;

      logger.info(`Database schedule removed for rule chain: ${schedule.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove database schedule for rule chain ${ruleChainId}:`, error);
      throw error;
    }
  }

  /**
   * Update a database-backed schedule
   * @param {number} ruleChainId - Rule chain ID
   * @param {Object} updates - Updates to apply
   */
  async updateDatabaseSchedule(ruleChainId, updates) {
    try {
      if (!this.ruleChainService) {
        throw new Error('Database integration not available');
      }

      const schedule = this.schedules.get(ruleChainId);
      if (!schedule) {
        throw new Error(`Schedule for rule chain ${ruleChainId} not found`);
      }

      // Validate cron expression if being updated
      if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
        throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
      }

      // Update schedule in database
      await this.ruleChainService.updateSchedule(ruleChainId, updates);

      // Stop existing cron job if active
      const cronJob = this.cronJobs.get(ruleChainId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(ruleChainId);
        this.scheduleStats.activeSchedules--;
      }

      // Update local schedule
      Object.assign(schedule, updates);

      // Recreate cron job if enabled
      if (schedule.enabled) {
        this._createCronJob(schedule);
      }

      logger.info(`Database schedule updated for rule chain: ${schedule.name}`);
      return schedule;
    } catch (error) {
      logger.error(`Failed to update database schedule for rule chain ${ruleChainId}:`, error);
      throw error;
    }
  }

  /**
   * Sync schedule from database (handle external changes)
   * @param {number} ruleChainId - Rule chain ID
   */
  async syncScheduleFromDatabase(ruleChainId) {
    try {
      if (!this.ruleChainService) {
        return;
      }

      const scheduleInfo = await this.ruleChainService.getScheduleInfo(ruleChainId);
      
      if (scheduleInfo.scheduleEnabled) {
        // Schedule is enabled in database
        const existingSchedule = this.schedules.get(ruleChainId);
        
        if (!existingSchedule) {
          // New schedule - add it
          const newScheduleInfo = {
            id: ruleChainId,
            ruleChainId: ruleChainId,
            name: scheduleInfo.ruleChainName,
            cronExpression: scheduleInfo.cronExpression,
            timezone: scheduleInfo.timezone || 'UTC',
            organizationId: scheduleInfo.organizationId,
            priority: scheduleInfo.priority || 0,
            maxRetries: scheduleInfo.maxRetries || 0,
            retryDelay: scheduleInfo.retryDelay || 0,
            enabled: true,
            metadata: scheduleInfo.scheduleMetadata || {},
            createdAt: new Date(),
            lastExecutedAt: scheduleInfo.lastExecutedAt,
            executionCount: scheduleInfo.executionCount || 0,
            failureCount: scheduleInfo.failureCount || 0
          };

          this.schedules.set(ruleChainId, newScheduleInfo);
          this.scheduleStats.totalSchedules++;
          this._createCronJob(newScheduleInfo);
          
          logger.info(`Synced new schedule from database: ${newScheduleInfo.name}`);
        } else {
          // Update existing schedule
          const cronJob = this.cronJobs.get(ruleChainId);
          if (cronJob) {
            cronJob.stop();
            this.cronJobs.delete(ruleChainId);
            this.scheduleStats.activeSchedules--;
          }

          Object.assign(existingSchedule, {
            cronExpression: scheduleInfo.cronExpression,
            timezone: scheduleInfo.timezone || 'UTC',
            priority: scheduleInfo.priority || 0,
            maxRetries: scheduleInfo.maxRetries || 0,
            retryDelay: scheduleInfo.retryDelay || 0,
            metadata: scheduleInfo.scheduleMetadata || {},
            enabled: true
          });

          this._createCronJob(existingSchedule);
          logger.info(`Synced updated schedule from database: ${existingSchedule.name}`);
        }
      } else {
        // Schedule is disabled in database - remove if exists
        const existingSchedule = this.schedules.get(ruleChainId);
        if (existingSchedule) {
          const cronJob = this.cronJobs.get(ruleChainId);
          if (cronJob) {
            cronJob.stop();
            this.cronJobs.delete(ruleChainId);
            this.scheduleStats.activeSchedules--;
          }
          
          this.schedules.delete(ruleChainId);
          this.scheduleStats.totalSchedules--;
          
          logger.info(`Synced schedule removal from database: ${existingSchedule.name}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to sync schedule from database for rule chain ${ruleChainId}:`, error);
    }
  }

  // Legacy methods for backward compatibility
  
  /**
   * Add a new cron-based schedule (legacy method for backward compatibility)
   * @param {Object} scheduleConfig 
   */
  addSchedule(scheduleConfig) {
    const {
      id = `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name,
      cronExpression,
      organizationId,
      ruleChainIds = [],
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
        failureCount: 0,
        isLegacy: true // Mark as legacy schedule
      };

      // Store schedule
      this.schedules.set(id, scheduleInfo);
      this.scheduleStats.totalSchedules++;

      // Create and start cron job if enabled
      if (enabled) {
        this._createCronJob(scheduleInfo);
      }

      logger.info(`Legacy schedule added: ${name} (${cronExpression})`);
      return scheduleInfo;
    } catch (error) {
      logger.error(`Failed to add legacy schedule ${id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a schedule (handles both legacy and database schedules)
   * @param {string|number} scheduleId 
   */
  async removeSchedule(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // If it's a database schedule (rule chain), use database method
      if (schedule.ruleChainId && !schedule.isLegacy) {
        return await this.removeDatabaseSchedule(scheduleId);
      }

      // Legacy schedule removal
      const cronJob = this.cronJobs.get(scheduleId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(scheduleId);
        this.scheduleStats.activeSchedules--;
      }

      this.schedules.delete(scheduleId);
      this.scheduleStats.totalSchedules--;

      logger.info(`Legacy schedule removed: ${schedule.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Enable a schedule (handles both legacy and database schedules)
   * @param {string|number} scheduleId 
   */
  async enableSchedule(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // If it's a database schedule, update database
      if (schedule.ruleChainId && !schedule.isLegacy && this.ruleChainService) {
        await this.ruleChainService.enableSchedule(
          schedule.ruleChainId,
          schedule.cronExpression,
          {
            timezone: schedule.timezone,
            priority: schedule.priority,
            maxRetries: schedule.maxRetries,
            retryDelay: schedule.retryDelay,
            metadata: schedule.metadata
          }
        );
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
   * Disable a schedule (handles both legacy and database schedules)
   * @param {string|number} scheduleId 
   */
  async disableSchedule(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // If it's a database schedule, update database
      if (schedule.ruleChainId && !schedule.isLegacy && this.ruleChainService) {
        await this.ruleChainService.disableSchedule(schedule.ruleChainId);
      }

      if (schedule.enabled) {
        schedule.enabled = false;
        
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
   * Update a schedule (handles both legacy and database schedules)
   * @param {string|number} scheduleId 
   * @param {Object} updates 
   */
  async updateSchedule(scheduleId, updates) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // If it's a database schedule, use database method
      if (schedule.ruleChainId && !schedule.isLegacy) {
        return await this.updateDatabaseSchedule(scheduleId, updates);
      }

      // Legacy schedule update
      if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
        throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
      }

      const cronJob = this.cronJobs.get(scheduleId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(scheduleId);
        this.scheduleStats.activeSchedules--;
      }

      Object.assign(schedule, updates);

      if (schedule.enabled) {
        this._createCronJob(schedule);
      }

      logger.info(`Legacy schedule updated: ${schedule.name}`);
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
   * @param {string|number} scheduleId 
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
      scheduled: false,
      timezone: schedule.timezone || 'UTC'
    });

    cronJob.start();
    this.cronJobs.set(schedule.id, cronJob);
    this.scheduleStats.activeSchedules++;

    logger.debug(`Cron job created for schedule: ${schedule.name} (timezone: ${schedule.timezone || 'UTC'})`);
  }

  /**
   * Execute a schedule (emit scheduled event and update database stats)
   * @param {Object} schedule 
   */
  async _executeSchedule(schedule) {
    try {
      logger.debug(`Executing schedule: ${schedule.name} (${schedule.cronExpression})`);

      // Update local stats
      schedule.lastExecutedAt = new Date();
      schedule.executionCount++;
      this.scheduleStats.executedSchedules++;
      this.scheduleStats.lastExecutedAt = new Date();

      // Update database stats if it's a database schedule
      if (schedule.ruleChainId && !schedule.isLegacy && this.ruleChainService) {
        await this.ruleChainService.updateExecutionStats(schedule.ruleChainId, true);
      }

      // Emit scheduled event
      this.eventBus.emitEvent(EventTypes.SCHEDULE_TRIGGERED, {
        cronExpression: schedule.cronExpression,
        scheduleName: schedule.name,
        scheduleId: schedule.id,
        ruleChainId: schedule.ruleChainId,
        organizationId: schedule.organizationId,
        ruleChainIds: schedule.ruleChainIds || (schedule.ruleChainId ? [schedule.ruleChainId] : []),
        timestamp: new Date(),
        metadata: {
          source: 'scheduler',
          executionCount: schedule.executionCount,
          priority: schedule.priority || 0,
          timezone: schedule.timezone || 'UTC',
          isDatabaseBacked: !schedule.isLegacy,
          ...schedule.metadata
        }
      });

      logger.debug(`Schedule executed successfully: ${schedule.name}`);
    } catch (error) {
      logger.error(`Failed to execute schedule ${schedule.name}:`, error);
      
      // Update failure stats
      schedule.failureCount++;
      this.scheduleStats.failedSchedules++;

      // Update database failure stats if it's a database schedule
      if (schedule.ruleChainId && !schedule.isLegacy && this.ruleChainService) {
        try {
          await this.ruleChainService.updateExecutionStats(schedule.ruleChainId, false, error);
        } catch (dbError) {
          logger.error(`Failed to update database failure stats:`, dbError);
        }
      }
    }
  }

  /**
   * Manually trigger a schedule (for testing)
   * @param {string|number} scheduleId 
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
        ruleChainId: schedule.ruleChainId,
        name: schedule.name,
        enabled: schedule.enabled,
        executionCount: schedule.executionCount,
        failureCount: schedule.failureCount,
        lastExecutedAt: schedule.lastExecutedAt,
        isActive: this.cronJobs.has(schedule.id),
        isDatabaseBacked: !schedule.isLegacy,
        timezone: schedule.timezone || 'UTC',
        priority: schedule.priority || 0
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

  /**
   * Refresh all database schedules
   */
  async refreshDatabaseSchedules() {
    try {
      if (!this.ruleChainService) {
        logger.warn('Cannot refresh database schedules: ruleChainService not available');
        return;
      }

      // Stop all current cron jobs
      this.stopAll();
      
      // Clear current schedules (keep legacy ones)
      const legacySchedules = new Map();
      for (const [id, schedule] of this.schedules.entries()) {
        if (schedule.isLegacy) {
          legacySchedules.set(id, schedule);
        }
      }
      
      this.schedules = legacySchedules;
      this.scheduleStats.totalSchedules = legacySchedules.size;

      // Reload from database
      await this._loadSchedulesFromDatabase();
      
      // Restart legacy schedules
      for (const schedule of legacySchedules.values()) {
        if (schedule.enabled) {
          this._createCronJob(schedule);
        }
      }

      logger.info('Database schedules refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh database schedules:', error);
      throw error;
    }
  }
}

module.exports = ScheduleManager; 