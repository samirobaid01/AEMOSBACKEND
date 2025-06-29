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
      lastExecutedAt: null,
      lastDatabaseSyncAt: null, // NEW: Track when we last synced with database
      autoSyncEnabled: true,    // NEW: Control auto-sync behavior
      databaseChangesDetected: 0 // NEW: Track how many changes we've detected
    };

    this.isInitialized = false;
    
    // NEW: Auto-sync configuration
    this.autoSyncConfig = {
      enabled: true,
      intervalMinutes: 2, // Check database every 2 minutes
      cronJob: null,
      lastKnownScheduleCount: 0
    };
    
    logger.info('Enhanced ScheduleManager initialized with database integration and auto-sync');
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
      
      // NEW: Start auto-sync mechanism
      if (this.autoSyncConfig.enabled) {
        this._startAutoSync();
      }
      
      this.isInitialized = true;
      logger.info('ScheduleManager initialized with database schedules and auto-sync');
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
      logger.info('🔍 DEBUG: _loadSchedulesFromDatabase() - Starting to load schedules from database');
      
      const scheduledRuleChains = await this.ruleChainService.getScheduledRuleChains();
      
      logger.info('🔍 DEBUG: _loadSchedulesFromDatabase() - Retrieved rule chains from database', {
        count: scheduledRuleChains.length,
        ruleChains: scheduledRuleChains.map(rc => ({
          id: rc.id,
          name: rc.name,
          scheduleEnabled: rc.scheduleEnabled,
          cronExpression: rc.cronExpression,
          timezone: rc.timezone,
          executionType: rc.executionType
        }))
      });
      
      for (const ruleChain of scheduledRuleChains) {
        logger.info('🔍 DEBUG: _loadSchedulesFromDatabase() - Processing rule chain', {
          id: ruleChain.id,
          name: ruleChain.name,
          scheduleEnabled: ruleChain.scheduleEnabled,
          cronExpression: ruleChain.cronExpression,
          timezone: ruleChain.timezone
        });

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

        logger.info('🔍 DEBUG: _loadSchedulesFromDatabase() - Added schedule to local cache', {
          ruleChainId: ruleChain.id,
          scheduleInfo: {
            enabled: scheduleInfo.enabled,
            cronExpression: scheduleInfo.cronExpression,
            timezone: scheduleInfo.timezone
          }
        });

        // Create cron job if enabled
        if (scheduleInfo.enabled) {
          logger.info('🔍 DEBUG: _loadSchedulesFromDatabase() - Creating cron job for enabled schedule', {
            ruleChainId: ruleChain.id,
            name: ruleChain.name,
            cronExpression: ruleChain.cronExpression
          });
          this._createCronJob(scheduleInfo);
        } else {
          logger.warn('🔍 DEBUG: _loadSchedulesFromDatabase() - Skipping cron job creation (schedule disabled)', {
            ruleChainId: ruleChain.id,
            name: ruleChain.name,
            enabled: scheduleInfo.enabled
          });
        }
      }

      // Update auto-sync tracking
      this.autoSyncConfig.lastKnownScheduleCount = scheduledRuleChains.length;
      this.scheduleStats.lastDatabaseSyncAt = new Date();

      logger.info(`🔍 DEBUG: _loadSchedulesFromDatabase() - Completed loading ${scheduledRuleChains.length} schedules from database`, {
        totalSchedules: this.scheduleStats.totalSchedules,
        activeSchedules: this.scheduleStats.activeSchedules,
        loadedScheduleIds: Array.from(this.schedules.keys())
      });
    } catch (error) {
      logger.error('❌ DEBUG: _loadSchedulesFromDatabase() - Failed to load schedules from database:', error);
      throw error;
    }
  }

  /**
   * Start automatic database synchronization
   */
  _startAutoSync() {
    if (this.autoSyncConfig.cronJob) {
      logger.warn('Auto-sync already running, stopping previous job');
      this.autoSyncConfig.cronJob.stop();
    }

    // Create cron job that runs every N minutes
    const cronExpression = `0 */${this.autoSyncConfig.intervalMinutes} * * * *`;
    
    this.autoSyncConfig.cronJob = cron.schedule(cronExpression, async () => {
      try {
        await this._performAutoSync();
      } catch (error) {
        logger.error('Error during auto-sync:', error);
      }
    }, {
      scheduled: false
    });

    this.autoSyncConfig.cronJob.start();
    
    logger.info(`Auto-sync started: checking database every ${this.autoSyncConfig.intervalMinutes} minutes`);
  }

  /**
   * Stop automatic database synchronization
   */
  _stopAutoSync() {
    if (this.autoSyncConfig.cronJob) {
      this.autoSyncConfig.cronJob.stop();
      this.autoSyncConfig.cronJob = null;
      logger.info('Auto-sync stopped');
    }
  }

  /**
   * Perform automatic synchronization with database
   */
  async _performAutoSync() {
    try {
      if (!this.ruleChainService) {
        return;
      }

      logger.debug('🔄 Performing auto-sync with database...');

      // Get current scheduled rule chains from database
      const currentScheduledRuleChains = await this.ruleChainService.getScheduledRuleChains();
      const currentScheduleMap = new Map();
      
      // Build map of current database state
      currentScheduledRuleChains.forEach(rc => {
        currentScheduleMap.set(rc.id, {
          scheduleEnabled: rc.scheduleEnabled,
          cronExpression: rc.cronExpression,
          timezone: rc.timezone || 'UTC',
          priority: rc.priority || 0,
          maxRetries: rc.maxRetries || 0,
          retryDelay: rc.retryDelay || 0,
          metadata: rc.scheduleMetadata || {},
          lastExecutedAt: rc.lastExecutedAt,
          executionCount: rc.executionCount || 0,
          failureCount: rc.failureCount || 0
        });
      });

      // Track changes
      let changesDetected = 0;
      const changes = {
        added: [],
        updated: [],
        removed: []
      };

      // Check for new schedules or updates
      for (const [ruleChainId, dbSchedule] of currentScheduleMap.entries()) {
        const localSchedule = this.schedules.get(ruleChainId);
        
        if (!localSchedule) {
          // New schedule detected
          await this._addScheduleFromDatabase(ruleChainId, dbSchedule);
          changes.added.push(ruleChainId);
          changesDetected++;
        } else {
          // Check for updates
          const hasChanges = 
            localSchedule.enabled !== dbSchedule.scheduleEnabled ||
            localSchedule.cronExpression !== dbSchedule.cronExpression ||
            localSchedule.timezone !== dbSchedule.timezone ||
            localSchedule.priority !== dbSchedule.priority ||
            localSchedule.maxRetries !== dbSchedule.maxRetries ||
            localSchedule.retryDelay !== dbSchedule.retryDelay ||
            JSON.stringify(localSchedule.metadata) !== JSON.stringify(dbSchedule.metadata);

          if (hasChanges) {
            await this._updateScheduleFromDatabase(ruleChainId, dbSchedule);
            changes.updated.push(ruleChainId);
            changesDetected++;
          }
        }
      }

      // Check for removed schedules
      for (const ruleChainId of this.schedules.keys()) {
        const schedule = this.schedules.get(ruleChainId);
        
        // Skip legacy schedules (they're not in database)
        if (schedule.isLegacy) continue;
        
        if (!currentScheduleMap.has(ruleChainId)) {
          // Schedule was removed from database
          await this._removeScheduleFromLocal(ruleChainId);
          changes.removed.push(ruleChainId);
          changesDetected++;
        }
      }

      // Update tracking
      this.scheduleStats.lastDatabaseSyncAt = new Date();
      this.autoSyncConfig.lastKnownScheduleCount = currentScheduledRuleChains.length;
      
      if (changesDetected > 0) {
        this.scheduleStats.databaseChangesDetected += changesDetected;
        
        logger.info('🔄 Auto-sync detected changes', {
          changesDetected,
          added: changes.added.length,
          updated: changes.updated.length,
          removed: changes.removed.length,
          changes
        });
      } else {
        logger.debug('✅ Auto-sync completed - no changes detected');
      }

    } catch (error) {
      logger.error('Error during auto-sync:', error);
    }
  }

  /**
   * Add a schedule from database during auto-sync
   */
  async _addScheduleFromDatabase(ruleChainId, dbSchedule) {
    try {
      // Get full rule chain info
      const ruleChain = await this.ruleChainService.findChainById(ruleChainId);
      if (!ruleChain) {
        logger.warn(`Rule chain ${ruleChainId} not found during auto-sync`);
        return;
      }

      const scheduleInfo = {
        id: ruleChainId,
        ruleChainId: ruleChainId,
        name: ruleChain.name,
        cronExpression: dbSchedule.cronExpression,
        timezone: dbSchedule.timezone,
        organizationId: ruleChain.organizationId,
        priority: dbSchedule.priority,
        maxRetries: dbSchedule.maxRetries,
        retryDelay: dbSchedule.retryDelay,
        enabled: dbSchedule.scheduleEnabled,
        metadata: dbSchedule.metadata,
        createdAt: ruleChain.createdAt,
        lastExecutedAt: dbSchedule.lastExecutedAt,
        executionCount: dbSchedule.executionCount,
        failureCount: dbSchedule.failureCount
      };

      this.schedules.set(ruleChainId, scheduleInfo);
      this.scheduleStats.totalSchedules++;

      if (scheduleInfo.enabled) {
        this._createCronJob(scheduleInfo);
      }

      logger.info(`📅 Auto-sync added schedule: ${ruleChain.name} (${dbSchedule.cronExpression})`);
    } catch (error) {
      logger.error(`Error adding schedule ${ruleChainId} during auto-sync:`, error);
    }
  }

  /**
   * Update a schedule from database during auto-sync
   */
  async _updateScheduleFromDatabase(ruleChainId, dbSchedule) {
    try {
      const schedule = this.schedules.get(ruleChainId);
      if (!schedule) return;

      // Stop existing cron job if active
      const cronJob = this.cronJobs.get(ruleChainId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(ruleChainId);
        this.scheduleStats.activeSchedules--;
      }

      // Update schedule properties
      Object.assign(schedule, {
        cronExpression: dbSchedule.cronExpression,
        timezone: dbSchedule.timezone,
        priority: dbSchedule.priority,
        maxRetries: dbSchedule.maxRetries,
        retryDelay: dbSchedule.retryDelay,
        enabled: dbSchedule.scheduleEnabled,
        metadata: dbSchedule.metadata,
        lastExecutedAt: dbSchedule.lastExecutedAt,
        executionCount: dbSchedule.executionCount,
        failureCount: dbSchedule.failureCount
      });

      // Recreate cron job if enabled
      if (schedule.enabled) {
        this._createCronJob(schedule);
      }

      logger.info(`🔄 Auto-sync updated schedule: ${schedule.name}`);
    } catch (error) {
      logger.error(`Error updating schedule ${ruleChainId} during auto-sync:`, error);
    }
  }

  /**
   * Remove a schedule locally during auto-sync
   */
  async _removeScheduleFromLocal(ruleChainId) {
    try {
      const schedule = this.schedules.get(ruleChainId);
      if (!schedule) return;

      // Stop and remove cron job
      const cronJob = this.cronJobs.get(ruleChainId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(ruleChainId);
        this.scheduleStats.activeSchedules--;
      }

      // Remove from local schedules
      this.schedules.delete(ruleChainId);
      this.scheduleStats.totalSchedules--;

      logger.info(`🗑️ Auto-sync removed schedule: ${schedule.name}`);
    } catch (error) {
      logger.error(`Error removing schedule ${ruleChainId} during auto-sync:`, error);
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
    logger.info('🔍 DEBUG: _createCronJob() - Starting to create cron job', {
      ruleChainId: schedule.id,
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      enabled: schedule.enabled
    });

    try {
      // Validate cron expression before creating job
      if (!cron.validate(schedule.cronExpression)) {
        logger.error('❌ DEBUG: _createCronJob() - Invalid cron expression', {
          ruleChainId: schedule.id,
          cronExpression: schedule.cronExpression
        });
        return;
      }

      const cronJob = cron.schedule(schedule.cronExpression, () => {
        logger.info('🔥 DEBUG: CRON JOB TRIGGERED!', {
          ruleChainId: schedule.id,
          name: schedule.name,
          cronExpression: schedule.cronExpression,
          triggeredAt: new Date()
        });
        this._executeSchedule(schedule);
      }, {
        scheduled: false,
        timezone: schedule.timezone || 'UTC'
      });

      cronJob.start();
      this.cronJobs.set(schedule.id, cronJob);
      this.scheduleStats.activeSchedules++;

      logger.info('✅ DEBUG: _createCronJob() - Cron job created and started successfully', {
        ruleChainId: schedule.id,
        name: schedule.name,
        cronExpression: schedule.cronExpression,
        timezone: schedule.timezone || 'UTC',
        activeSchedulesCount: this.scheduleStats.activeSchedules,
        cronJobsCount: this.cronJobs.size
      });
    } catch (error) {
      logger.error('❌ DEBUG: _createCronJob() - Failed to create cron job', {
        ruleChainId: schedule.id,
        name: schedule.name,
        cronExpression: schedule.cronExpression,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Execute a schedule (emit scheduled event and update database stats)
   * @param {Object} schedule 
   */
  async _executeSchedule(schedule) {
    logger.info('🚀 DEBUG: _executeSchedule() - Starting schedule execution', {
      ruleChainId: schedule.ruleChainId,
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      executionCount: schedule.executionCount,
      executedAt: new Date()
    });

    try {
      // Update local stats
      schedule.lastExecutedAt = new Date();
      schedule.executionCount++;
      this.scheduleStats.executedSchedules++;
      this.scheduleStats.lastExecutedAt = new Date();

      logger.info('🔍 DEBUG: _executeSchedule() - Updated local stats', {
        ruleChainId: schedule.ruleChainId,
        newExecutionCount: schedule.executionCount,
        lastExecutedAt: schedule.lastExecutedAt
      });

      // Update database stats if it's a database schedule
      if (schedule.ruleChainId && !schedule.isLegacy && this.ruleChainService) {
        logger.info('🔍 DEBUG: _executeSchedule() - Updating database execution stats', {
          ruleChainId: schedule.ruleChainId
        });
        await this.ruleChainService.updateExecutionStats(schedule.ruleChainId, true);
      }

      // Prepare event data
      const eventData = {
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
      };

      logger.info('🔍 DEBUG: _executeSchedule() - Prepared event data', {
        eventData: {
          ruleChainId: eventData.ruleChainId,
          organizationId: eventData.organizationId,
          ruleChainIds: eventData.ruleChainIds,
          cronExpression: eventData.cronExpression,
          scheduleName: eventData.scheduleName
        }
      });

      // Emit scheduled event
      logger.info('📡 DEBUG: _executeSchedule() - Emitting SCHEDULE_TRIGGERED event', {
        ruleChainId: schedule.ruleChainId,
        eventType: 'SCHEDULE_TRIGGERED',
        hasEventBus: !!this.eventBus
      });

      if (!this.eventBus) {
        logger.error('❌ DEBUG: _executeSchedule() - EventBus is not available!', {
          ruleChainId: schedule.ruleChainId
        });
        return;
      }

      this.eventBus.emitEvent(EventTypes.SCHEDULE_TRIGGERED, eventData);

      logger.info('✅ DEBUG: _executeSchedule() - Successfully emitted SCHEDULE_TRIGGERED event', {
        ruleChainId: schedule.ruleChainId,
        name: schedule.name,
        eventData
      });

    } catch (error) {
      logger.error('❌ DEBUG: _executeSchedule() - Schedule execution failed', {
        ruleChainId: schedule.ruleChainId,
        name: schedule.name,
        error: error.message,
        stack: error.stack
      });
      
      // Update failure stats
      schedule.failureCount++;
      this.scheduleStats.failedSchedules++;

      // Update database failure stats if it's a database schedule
      if (schedule.ruleChainId && !schedule.isLegacy && this.ruleChainService) {
        try {
          await this.ruleChainService.updateExecutionStats(schedule.ruleChainId, false, error);
        } catch (dbError) {
          logger.error('❌ DEBUG: _executeSchedule() - Failed to update database failure stats:', dbError);
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
      autoSyncConfig: {
        enabled: this.autoSyncConfig.enabled,
        intervalMinutes: this.autoSyncConfig.intervalMinutes,
        isRunning: !!this.autoSyncConfig.cronJob,
        lastKnownScheduleCount: this.autoSyncConfig.lastKnownScheduleCount
      },
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
    
    // Stop auto-sync
    this._stopAutoSync();
    
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
    
    // Start auto-sync if enabled
    if (this.autoSyncConfig.enabled && !this.autoSyncConfig.cronJob) {
      this._startAutoSync();
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
      lastExecutedAt: null,
      lastDatabaseSyncAt: null,
      autoSyncEnabled: true,
      databaseChangesDetected: 0
    };
    this.autoSyncConfig.lastKnownScheduleCount = 0;
    
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

      // Restart auto-sync
      if (this.autoSyncConfig.enabled) {
        this._startAutoSync();
      }

      logger.info('Database schedules refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh database schedules:', error);
      throw error;
    }
  }

  /**
   * Configure auto-sync settings
   * @param {Object} config - Auto-sync configuration
   */
  configureAutoSync(config = {}) {
    const {
      enabled = this.autoSyncConfig.enabled,
      intervalMinutes = this.autoSyncConfig.intervalMinutes
    } = config;

    const wasEnabled = this.autoSyncConfig.enabled;
    
    this.autoSyncConfig.enabled = enabled;
    this.autoSyncConfig.intervalMinutes = Math.max(1, intervalMinutes); // Minimum 1 minute
    
    if (wasEnabled && !enabled) {
      // Disable auto-sync
      this._stopAutoSync();
      logger.info('Auto-sync disabled');
    } else if (!wasEnabled && enabled) {
      // Enable auto-sync
      this._startAutoSync();
      logger.info('Auto-sync enabled');
    } else if (enabled) {
      // Reconfigure running auto-sync
      this._stopAutoSync();
      this._startAutoSync();
      logger.info(`Auto-sync reconfigured: ${this.autoSyncConfig.intervalMinutes} minutes`);
    }

    return this.autoSyncConfig;
  }

  /**
   * Manually trigger auto-sync
   */
  async triggerAutoSync() {
    if (!this.autoSyncConfig.enabled) {
      logger.warn('Auto-sync is disabled, cannot trigger manual sync');
      return;
    }

    logger.info('Manually triggering auto-sync...');
    await this._performAutoSync();
  }
}

module.exports = ScheduleManager; 