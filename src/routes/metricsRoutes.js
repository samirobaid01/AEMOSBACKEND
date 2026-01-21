const express = require('express');
const router = express.Router();
const { getQueueMetrics } = require('../ruleEngine/core/RuleEngineQueue');
const backpressureManager = require('../services/backpressureManager');
const logger = require('../utils/logger');

router.get('/queue', async (req, res) => {
  try {
    const metrics = await getQueueMetrics();
    const backpressureStatus = backpressureManager.getStatus();
    
    const totalPending = (metrics.counts.waiting || 0) + (metrics.counts.active || 0);
    const utilizationPercent = backpressureStatus.enabled 
      ? ((totalPending / backpressureStatus.thresholds.critical) * 100).toFixed(2)
      : 0;

    res.json({
      timestamp: new Date().toISOString(),
      queue: {
        name: 'rule-engine-events',
        counts: metrics.counts,
        totalPending,
        utilizationPercent: parseFloat(utilizationPercent),
        health: metrics.health,
        isPaused: metrics.isPaused
      },
      workers: metrics.workers,
      backpressure: {
        enabled: backpressureStatus.enabled,
        circuitState: backpressureStatus.circuitState,
        thresholds: backpressureStatus.thresholds,
        rejectedCount: backpressureStatus.metrics.rejectedCount,
        lastStateChange: new Date(backpressureStatus.metrics.lastStateChange).toISOString(),
        stateAgeMs: backpressureStatus.metrics.stateAge
      }
    });
  } catch (error) {
    logger.error(`Failed to retrieve queue metrics: ${error.message}`);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

router.get('/queue/summary', async (req, res) => {
  try {
    const metrics = await getQueueMetrics();
    const backpressureStatus = backpressureManager.getStatus();
    
    const totalPending = (metrics.counts.waiting || 0) + (metrics.counts.active || 0);

    res.json({
      health: metrics.health,
      queueDepth: totalPending,
      workers: metrics.workers.count,
      circuitState: backpressureStatus.circuitState,
      rejectedCount: backpressureStatus.metrics.rejectedCount
    });
  } catch (error) {
    logger.error(`Failed to retrieve queue summary: ${error.message}`);
    res.status(500).json({
      error: 'Failed to retrieve summary',
      message: error.message
    });
  }
});

router.get('/prometheus', async (req, res) => {
  try {
    const metrics = await getQueueMetrics();
    const backpressureStatus = backpressureManager.getStatus();
    
    const totalPending = (metrics.counts.waiting || 0) + (metrics.counts.active || 0);
    const healthValue = { 'healthy': 0, 'degraded': 1, 'warning': 2, 'critical': 3, 'unknown': 4 }[metrics.health] || 4;
    const circuitStateValue = { 'CLOSED': 0, 'HALF_OPEN': 1, 'OPEN': 2 }[backpressureStatus.circuitState] || 0;

    const prometheusMetrics = `
# HELP rule_engine_queue_waiting Number of waiting jobs in rule engine queue
# TYPE rule_engine_queue_waiting gauge
rule_engine_queue_waiting ${metrics.counts.waiting || 0}

# HELP rule_engine_queue_active Number of active jobs in rule engine queue
# TYPE rule_engine_queue_active gauge
rule_engine_queue_active ${metrics.counts.active || 0}

# HELP rule_engine_queue_completed Number of completed jobs in rule engine queue
# TYPE rule_engine_queue_completed counter
rule_engine_queue_completed ${metrics.counts.completed || 0}

# HELP rule_engine_queue_failed Number of failed jobs in rule engine queue
# TYPE rule_engine_queue_failed counter
rule_engine_queue_failed ${metrics.counts.failed || 0}

# HELP rule_engine_queue_delayed Number of delayed jobs in rule engine queue
# TYPE rule_engine_queue_delayed gauge
rule_engine_queue_delayed ${metrics.counts.delayed || 0}

# HELP rule_engine_queue_total_pending Total pending jobs (waiting + active)
# TYPE rule_engine_queue_total_pending gauge
rule_engine_queue_total_pending ${totalPending}

# HELP rule_engine_workers Number of active workers
# TYPE rule_engine_workers gauge
rule_engine_workers ${metrics.workers.count || 0}

# HELP rule_engine_queue_health Health status of the queue (0=healthy, 1=degraded, 2=warning, 3=critical, 4=unknown)
# TYPE rule_engine_queue_health gauge
rule_engine_queue_health ${healthValue}

# HELP rule_engine_backpressure_circuit_state Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
# TYPE rule_engine_backpressure_circuit_state gauge
rule_engine_backpressure_circuit_state ${circuitStateValue}

# HELP rule_engine_backpressure_rejected_total Total number of rejected events
# TYPE rule_engine_backpressure_rejected_total counter
rule_engine_backpressure_rejected_total ${backpressureStatus.metrics.rejectedCount || 0}

# HELP rule_engine_backpressure_threshold_warning Warning threshold for queue depth
# TYPE rule_engine_backpressure_threshold_warning gauge
rule_engine_backpressure_threshold_warning ${backpressureStatus.thresholds.warning}

# HELP rule_engine_backpressure_threshold_critical Critical threshold for queue depth
# TYPE rule_engine_backpressure_threshold_critical gauge
rule_engine_backpressure_threshold_critical ${backpressureStatus.thresholds.critical}
`.trim();

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error(`Failed to generate Prometheus metrics: ${error.message}`);
    res.status(500).send('# Error generating metrics');
  }
});

router.post('/backpressure/reset', async (req, res) => {
  try {
    backpressureManager.reset();
    logger.info('Backpressure manager reset via API');
    
    res.json({
      success: true,
      message: 'Backpressure manager reset successfully',
      status: backpressureManager.getStatus()
    });
  } catch (error) {
    logger.error(`Failed to reset backpressure manager: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to reset backpressure manager',
      message: error.message
    });
  }
});

module.exports = router;
