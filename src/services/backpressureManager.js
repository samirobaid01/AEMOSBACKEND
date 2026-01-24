const logger = require('../utils/logger');

const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

class BackpressureManager {
  constructor(options = {}) {
    this.warningThreshold = parseInt(process.env.QUEUE_WARNING_THRESHOLD || '10000', 10);
    this.criticalThreshold = parseInt(process.env.QUEUE_CRITICAL_THRESHOLD || '50000', 10);
    this.recoveryThreshold = parseInt(process.env.QUEUE_RECOVERY_THRESHOLD || '5000', 10);
    this.enabled = process.env.ENABLE_BACKPRESSURE !== 'false';
    
    this.circuitState = CIRCUIT_STATE.CLOSED;
    this.lastStateChange = Date.now();
    this.rejectedCount = 0;
    this.lastWarningLog = 0;
    this.warningLogInterval = 30000;
    
    logger.info('BackpressureManager initialized', {
      enabled: this.enabled,
      warningThreshold: this.warningThreshold,
      criticalThreshold: this.criticalThreshold,
      recoveryThreshold: this.recoveryThreshold
    });
  }

  shouldAcceptEvent(queueMetrics, priority = 5) {
    if (!this.enabled) {
      return { accept: true, reason: null };
    }

    const totalPending = (queueMetrics.waiting || 0) + (queueMetrics.active || 0);

    if (this.circuitState === CIRCUIT_STATE.OPEN) {
      if (totalPending <= this.recoveryThreshold) {
        this.halfOpenCircuit();
      } else {
        if (priority <= 1 && totalPending >= this.criticalThreshold) {
          logger.warn('Circuit open but accepting high-priority event', {
            totalPending,
            priority,
            circuitState: this.circuitState
          });
          return { accept: true, reason: 'high-priority-override' };
        }
        
        this.rejectedCount++;
        return { 
          accept: false, 
          reason: 'circuit-open',
          queueDepth: totalPending,
          circuitState: this.circuitState
        };
      }
    }

    if (this.circuitState === CIRCUIT_STATE.HALF_OPEN) {
      if (totalPending <= this.recoveryThreshold * 0.6) {
        this.closeCircuit();
      } else if (totalPending >= this.warningThreshold) {
        this.openCircuit();
        if (priority > 2) {
          this.rejectedCount++;
          return { 
            accept: false, 
            reason: 'circuit-reopened',
            queueDepth: totalPending
          };
        }
      }
    }

    if (totalPending >= this.criticalThreshold) {
      this.openCircuit();
      
      if (priority <= 1) {
        logger.warn('Critical queue depth reached, but accepting high-priority event', {
          totalPending,
          priority,
          threshold: this.criticalThreshold
        });
        return { accept: true, reason: 'high-priority-override' };
      }

      this.rejectedCount++;
      return { 
        accept: false, 
        reason: 'queue-critical',
        queueDepth: totalPending,
        threshold: this.criticalThreshold
      };
    }

    if (totalPending >= this.warningThreshold && totalPending < this.criticalThreshold) {
      const now = Date.now();
      if (now - this.lastWarningLog > this.warningLogInterval) {
        logger.warn('Queue depth approaching critical threshold', {
          totalPending,
          warningThreshold: this.warningThreshold,
          criticalThreshold: this.criticalThreshold,
          utilization: ((totalPending / this.criticalThreshold) * 100).toFixed(2) + '%'
        });
        this.lastWarningLog = now;
      }

      if (priority > 5 && totalPending >= this.criticalThreshold * 0.8) {
        this.rejectedCount++;
        return { 
          accept: false, 
          reason: 'low-priority-shed',
          queueDepth: totalPending,
          priority
        };
      }
    }

    return { accept: true, reason: null };
  }

  openCircuit() {
    if (this.circuitState !== CIRCUIT_STATE.OPEN) {
      this.circuitState = CIRCUIT_STATE.OPEN;
      this.lastStateChange = Date.now();
      logger.error('Circuit breaker OPENED - Queue overloaded', {
        circuitState: this.circuitState,
        rejectedCount: this.rejectedCount
      });
    }
  }

  halfOpenCircuit() {
    if (this.circuitState !== CIRCUIT_STATE.HALF_OPEN) {
      this.circuitState = CIRCUIT_STATE.HALF_OPEN;
      this.lastStateChange = Date.now();
      logger.info('Circuit breaker HALF_OPEN - Testing recovery', {
        circuitState: this.circuitState
      });
    }
  }

  closeCircuit() {
    if (this.circuitState !== CIRCUIT_STATE.CLOSED) {
      const previousState = this.circuitState;
      this.circuitState = CIRCUIT_STATE.CLOSED;
      this.lastStateChange = Date.now();
      this.rejectedCount = 0;
      logger.info('Circuit breaker CLOSED - Normal operation resumed', {
        circuitState: this.circuitState,
        previousState,
        recoveryDuration: Date.now() - this.lastStateChange
      });
    }
  }

  getStatus() {
    return {
      enabled: this.enabled,
      circuitState: this.circuitState,
      thresholds: {
        warning: this.warningThreshold,
        critical: this.criticalThreshold,
        recovery: this.recoveryThreshold
      },
      metrics: {
        rejectedCount: this.rejectedCount,
        lastStateChange: this.lastStateChange,
        stateAge: Date.now() - this.lastStateChange
      }
    };
  }

  reset() {
    this.circuitState = CIRCUIT_STATE.CLOSED;
    this.rejectedCount = 0;
    this.lastStateChange = Date.now();
    logger.info('BackpressureManager reset to initial state');
  }
}

module.exports = new BackpressureManager();
module.exports.CIRCUIT_STATE = CIRCUIT_STATE;
module.exports.BackpressureManager = BackpressureManager;
