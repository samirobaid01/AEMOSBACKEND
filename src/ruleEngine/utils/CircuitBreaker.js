const logger = require('../../utils/logger');

/**
 * Circuit Breaker - Provides fault tolerance for rule engine operations
 * Prevents cascading failures and provides automatic recovery
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 60000, // 1 minute
      monitoringPeriod: options.monitoringPeriod || 60000, // 1 minute
      halfOpenMaxCalls: options.halfOpenMaxCalls || 3,
      ...options
    };

    // Circuit breaker state
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.halfOpenAttempts = 0;

    // Statistics
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      stateChanges: [],
      lastStateChange: null
    };

    // Name for logging
    this.name = options.name || 'CircuitBreaker';

    logger.debug(`CircuitBreaker initialized: ${this.name}`, this.options);
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {...any} args - Arguments for the function
   */
  async execute(fn, ...args) {
    this.stats.totalCalls++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (this._shouldAttemptReset()) {
        this._changeState('HALF_OPEN');
      } else {
        this.stats.rejectedCalls++;
        throw new CircuitBreakerError('Circuit breaker is OPEN', this.name);
      }
    }

    // Execute in CLOSED or HALF_OPEN state
    try {
      const result = await fn(...args);
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  _onSuccess() {
    this.stats.successfulCalls++;
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      
      // If enough successful attempts in half-open, close the circuit
      if (this.halfOpenAttempts >= this.options.halfOpenMaxCalls) {
        this._changeState('CLOSED');
        this._resetFailureCount();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this._resetFailureCount();
    }
  }

  /**
   * Handle failed execution
   * @param {Error} error 
   */
  _onFailure(error) {
    this.stats.failedCalls++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`Circuit breaker failure: ${this.name}`, {
      error: error.message,
      failureCount: this.failureCount,
      state: this.state
    });

    // Check if we should open the circuit
    if (this.failureCount >= this.options.failureThreshold) {
      this._changeState('OPEN');
      this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
    }
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  _shouldAttemptReset() {
    return Date.now() >= this.nextAttemptTime;
  }

  /**
   * Change circuit breaker state
   * @param {string} newState 
   */
  _changeState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.stats.lastStateChange = new Date();
    
    this.stats.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: new Date(),
      failureCount: this.failureCount
    });

    // Keep only last 10 state changes
    if (this.stats.stateChanges.length > 10) {
      this.stats.stateChanges = this.stats.stateChanges.slice(-10);
    }

    if (newState === 'HALF_OPEN') {
      this.halfOpenAttempts = 0;
    }

    logger.info(`Circuit breaker state changed: ${this.name}`, {
      from: oldState,
      to: newState,
      failureCount: this.failureCount
    });
  }

  /**
   * Reset failure count
   */
  _resetFailureCount() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.halfOpenAttempts = 0;
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats() {
    const successRate = this.stats.totalCalls > 0 ? 
      (this.stats.successfulCalls / this.stats.totalCalls * 100).toFixed(2) : 0;
    
    const failureRate = this.stats.totalCalls > 0 ? 
      (this.stats.failedCalls / this.stats.totalCalls * 100).toFixed(2) : 0;

    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      ...this.stats,
      successRate: `${successRate}%`,
      failureRate: `${failureRate}%`,
      isHealthy: this.state === 'CLOSED'
    };
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy() {
    return this.state === 'CLOSED';
  }

  /**
   * Manually open the circuit
   */
  forceOpen() {
    this._changeState('OPEN');
    this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
    logger.warn(`Circuit breaker force opened: ${this.name}`);
  }

  /**
   * Manually close the circuit
   */
  forceClose() {
    this._changeState('CLOSED');
    this._resetFailureCount();
    logger.info(`Circuit breaker force closed: ${this.name}`);
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.state = 'CLOSED';
    this._resetFailureCount();
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      stateChanges: [],
      lastStateChange: null
    };
    
    logger.info(`Circuit breaker reset: ${this.name}`);
  }
}

/**
 * Circuit Breaker Error
 */
class CircuitBreakerError extends Error {
  constructor(message, circuitName) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.circuitName = circuitName;
  }
}

/**
 * Circuit Breaker Manager - Manages multiple circuit breakers
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.globalStats = {
      totalBreakers: 0,
      healthyBreakers: 0,
      openBreakers: 0,
      halfOpenBreakers: 0
    };
    
    logger.info('CircuitBreakerManager initialized');
  }

  /**
   * Create or get a circuit breaker
   * @param {string} name 
   * @param {Object} options 
   */
  getCircuitBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({ ...options, name });
      this.breakers.set(name, breaker);
      this.globalStats.totalBreakers++;
      
      logger.debug(`Circuit breaker created: ${name}`);
    }
    
    return this.breakers.get(name);
  }

  /**
   * Execute function with circuit breaker protection
   * @param {string} name 
   * @param {Function} fn 
   * @param {Object} options 
   * @param {...any} args 
   */
  async execute(name, fn, options = {}, ...args) {
    const breaker = this.getCircuitBreaker(name, options);
    return breaker.execute(fn, ...args);
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers() {
    return Array.from(this.breakers.values());
  }

  /**
   * Get circuit breaker by name
   * @param {string} name 
   */
  getBreaker(name) {
    return this.breakers.get(name);
  }

  /**
   * Get global statistics
   */
  getGlobalStats() {
    this._updateGlobalStats();
    
    const breakerStats = Array.from(this.breakers.values()).map(breaker => breaker.getStats());
    
    return {
      ...this.globalStats,
      breakers: breakerStats,
      summary: {
        totalCalls: breakerStats.reduce((sum, stats) => sum + stats.totalCalls, 0),
        successfulCalls: breakerStats.reduce((sum, stats) => sum + stats.successfulCalls, 0),
        failedCalls: breakerStats.reduce((sum, stats) => sum + stats.failedCalls, 0),
        rejectedCalls: breakerStats.reduce((sum, stats) => sum + stats.rejectedCalls, 0)
      }
    };
  }

  /**
   * Update global statistics
   */
  _updateGlobalStats() {
    let healthy = 0;
    let open = 0;
    let halfOpen = 0;
    
    for (const breaker of this.breakers.values()) {
      switch (breaker.getState()) {
        case 'CLOSED':
          healthy++;
          break;
        case 'OPEN':
          open++;
          break;
        case 'HALF_OPEN':
          halfOpen++;
          break;
      }
    }
    
    this.globalStats.healthyBreakers = healthy;
    this.globalStats.openBreakers = open;
    this.globalStats.halfOpenBreakers = halfOpen;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    
    this.globalStats = {
      totalBreakers: this.breakers.size,
      healthyBreakers: this.breakers.size,
      openBreakers: 0,
      halfOpenBreakers: 0
    };
    
    logger.info('All circuit breakers reset');
  }

  /**
   * Remove a circuit breaker
   * @param {string} name 
   */
  removeBreaker(name) {
    if (this.breakers.delete(name)) {
      this.globalStats.totalBreakers--;
      logger.info(`Circuit breaker removed: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all circuit breakers
   */
  clearAll() {
    this.breakers.clear();
    this.globalStats = {
      totalBreakers: 0,
      healthyBreakers: 0,
      openBreakers: 0,
      halfOpenBreakers: 0
    };
    
    logger.info('All circuit breakers cleared');
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerManager
}; 