const cron = require('node-cron');
const logger = require('../../utils/logger');
const RuleChain = require('../../models/RuleChain');
const RuleEngineEventBus = require('../core/RuleEngineEventBus');

class ScheduleManager {
  constructor() {
    this.jobs = new Map();
    this.refreshInterval = null;
  }

  async initialize() {
    await this.refreshSchedules();

    const refreshMs = parseInt(process.env.RULE_ENGINE_SCHEDULE_REFRESH_MS || '300000', 10);
    this.refreshInterval = setInterval(() => {
      this.refreshSchedules().catch((error) => {
        logger.error(`Failed to refresh schedules: ${error.message}`);
      });
    }, refreshMs);

    logger.info('Schedule manager initialized');
  }

  async refreshSchedules() {
    const chains = await RuleChain.findAll({
      where: { scheduleEnabled: true }
    });

    const activeIds = new Set();
    chains.forEach((chain) => {
      activeIds.add(chain.id);
      this.registerJob(chain);
    });

    // Remove obsolete jobs
    for (const [ruleChainId, job] of this.jobs.entries()) {
      if (!activeIds.has(ruleChainId)) {
        job.stop();
        this.jobs.delete(ruleChainId);
        logger.info(`Removed schedule for ruleChainId ${ruleChainId}`);
      }
    }
  }

  registerJob(ruleChain) {
    if (!ruleChain.cronExpression) {
      return;
    }

    const existing = this.jobs.get(ruleChain.id);
    if (existing && existing.cronExpression === ruleChain.cronExpression) {
      return;
    }

    if (existing) {
      existing.stop();
      this.jobs.delete(ruleChain.id);
    }

    const job = cron.schedule(
      ruleChain.cronExpression,
      async () => {
        await RuleEngineEventBus.emit('scheduled', {
          ruleChainId: ruleChain.id,
          organizationId: ruleChain.organizationId || null,
          cronExpression: ruleChain.cronExpression,
          timezone: ruleChain.timezone || 'UTC'
        });
      },
      { timezone: ruleChain.timezone || 'UTC' }
    );

    job.cronExpression = ruleChain.cronExpression;
    this.jobs.set(ruleChain.id, job);
    logger.info(`Scheduled ruleChainId ${ruleChain.id} with ${ruleChain.cronExpression}`);
  }

  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    for (const job of this.jobs.values()) {
      job.stop();
    }
    this.jobs.clear();
  }
}

module.exports = new ScheduleManager();
