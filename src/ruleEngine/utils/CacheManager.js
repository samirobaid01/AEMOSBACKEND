const logger = require('../../utils/logger');

/**
 * Cache Manager - Multi-level caching system for rule engine
 * Provides configuration cache, data cache, and result cache
 */
class CacheManager {
  constructor(options = {}) {
    this.options = {
      configCacheTTL: options.configCacheTTL || 300000, // 5 minutes
      dataCacheTTL: options.dataCacheTTL || 30000, // 30 seconds
      resultCacheTTL: options.resultCacheTTL || 60000, // 1 minute
      maxCacheSize: options.maxCacheSize || 1000,
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      ...options
    };

    // Cache stores
    this.configCache = new Map(); // Rule configurations
    this.dataCache = new Map(); // Sensor/device data
    this.resultCache = new Map(); // Execution results
    this.indexCache = new Map(); // Index data

    // Cache statistics
    this.stats = {
      configCache: { hits: 0, misses: 0, size: 0 },
      dataCache: { hits: 0, misses: 0, size: 0 },
      resultCache: { hits: 0, misses: 0, size: 0 },
      indexCache: { hits: 0, misses: 0, size: 0 },
      totalOperations: 0,
      lastCleanupAt: null
    };

    // Start periodic cleanup
    this.startCleanup();

    logger.info('CacheManager initialized', {
      configTTL: this.options.configCacheTTL,
      dataTTL: this.options.dataCacheTTL,
      maxSize: this.options.maxCacheSize
    });
  }

  /**
   * Configuration Cache Methods
   */

  /**
   * Get rule configuration from cache
   * @param {string} key 
   */
  getConfig(key) {
    return this._getCachedItem('configCache', key, this.options.configCacheTTL);
  }

  /**
   * Set rule configuration in cache
   * @param {string} key 
   * @param {any} value 
   */
  setConfig(key, value) {
    this._setCachedItem('configCache', key, value);
  }

  /**
   * Clear configuration cache
   */
  clearConfig() {
    this.configCache.clear();
    this.stats.configCache.size = 0;
    logger.debug('Configuration cache cleared');
  }

  /**
   * Data Cache Methods
   */

  /**
   * Get sensor/device data from cache
   * @param {string} key 
   */
  getData(key) {
    return this._getCachedItem('dataCache', key, this.options.dataCacheTTL);
  }

  /**
   * Set sensor/device data in cache
   * @param {string} key 
   * @param {any} value 
   */
  setData(key, value) {
    this._setCachedItem('dataCache', key, value);
  }

  /**
   * Clear data cache
   */
  clearData() {
    this.dataCache.clear();
    this.stats.dataCache.size = 0;
    logger.debug('Data cache cleared');
  }

  /**
   * Result Cache Methods
   */

  /**
   * Get execution result from cache
   * @param {string} key 
   */
  getResult(key) {
    return this._getCachedItem('resultCache', key, this.options.resultCacheTTL);
  }

  /**
   * Set execution result in cache
   * @param {string} key 
   * @param {any} value 
   */
  setResult(key, value) {
    this._setCachedItem('resultCache', key, value);
  }

  /**
   * Clear result cache
   */
  clearResults() {
    this.resultCache.clear();
    this.stats.resultCache.size = 0;
    logger.debug('Result cache cleared');
  }

  /**
   * Index Cache Methods
   */

  /**
   * Get index data from cache
   * @param {string} key 
   */
  getIndex(key) {
    return this._getCachedItem('indexCache', key, this.options.configCacheTTL);
  }

  /**
   * Set index data in cache
   * @param {string} key 
   * @param {any} value 
   */
  setIndex(key, value) {
    this._setCachedItem('indexCache', key, value);
  }

  /**
   * Clear index cache
   */
  clearIndex() {
    this.indexCache.clear();
    this.stats.indexCache.size = 0;
    logger.debug('Index cache cleared');
  }

  /**
   * Generic cache operations
   */

  /**
   * Get item from specific cache with TTL check
   * @param {string} cacheType 
   * @param {string} key 
   * @param {number} ttl 
   */
  _getCachedItem(cacheType, key, ttl) {
    const cache = this[cacheType];
    const cached = cache.get(key);

    this.stats.totalOperations++;

    if (!cached) {
      this.stats[cacheType].misses++;
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > ttl) {
      cache.delete(key);
      this.stats[cacheType].misses++;
      this.stats[cacheType].size = cache.size;
      return null;
    }

    this.stats[cacheType].hits++;
    return cached.value;
  }

  /**
   * Set item in specific cache
   * @param {string} cacheType 
   * @param {string} key 
   * @param {any} value 
   */
  _setCachedItem(cacheType, key, value) {
    const cache = this[cacheType];

    // Check cache size limit
    if (cache.size >= this.options.maxCacheSize) {
      this._evictLRU(cache);
    }

    cache.set(key, {
      value,
      timestamp: Date.now(),
      accessed: Date.now()
    });

    this.stats[cacheType].size = cache.size;
  }

  /**
   * Evict least recently used item from cache
   * @param {Map} cache 
   */
  _evictLRU(cache) {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, value] of cache.entries()) {
      if (value.accessed < oldestTime) {
        oldestTime = value.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      logger.debug(`Evicted LRU cache item: ${oldestKey}`);
    }
  }

  /**
   * Create cache key from components
   * @param {...any} components 
   */
  createKey(...components) {
    return components.filter(c => c !== null && c !== undefined).join(':');
  }

  /**
   * Bulk operations
   */

  /**
   * Get multiple items from cache
   * @param {string} cacheType 
   * @param {Array} keys 
   */
  getBulk(cacheType, keys) {
    const results = new Map();
    const ttl = this._getTTLForCacheType(cacheType);

    for (const key of keys) {
      const value = this._getCachedItem(cacheType, key, ttl);
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple items in cache
   * @param {string} cacheType 
   * @param {Map} items 
   */
  setBulk(cacheType, items) {
    for (const [key, value] of items.entries()) {
      this._setCachedItem(cacheType, key, value);
    }
  }

  /**
   * Get TTL for cache type
   * @param {string} cacheType 
   */
  _getTTLForCacheType(cacheType) {
    switch (cacheType) {
      case 'configCache':
      case 'indexCache':
        return this.options.configCacheTTL;
      case 'dataCache':
        return this.options.dataCacheTTL;
      case 'resultCache':
        return this.options.resultCacheTTL;
      default:
        return this.options.dataCacheTTL;
    }
  }

  /**
   * Cache maintenance
   */

  /**
   * Start periodic cache cleanup
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    logger.debug('Cache cleanup started', {
      interval: this.options.cleanupInterval
    });
  }

  /**
   * Stop periodic cache cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.debug('Cache cleanup stopped');
    }
  }

  /**
   * Clean up expired entries from all caches
   */
  cleanup() {
    const now = Date.now();
    let totalCleaned = 0;

    // Clean each cache type
    totalCleaned += this._cleanupCache('configCache', this.options.configCacheTTL, now);
    totalCleaned += this._cleanupCache('dataCache', this.options.dataCacheTTL, now);
    totalCleaned += this._cleanupCache('resultCache', this.options.resultCacheTTL, now);
    totalCleaned += this._cleanupCache('indexCache', this.options.configCacheTTL, now);

    this.stats.lastCleanupAt = new Date();

    if (totalCleaned > 0) {
      logger.debug(`Cache cleanup completed: ${totalCleaned} items removed`);
    }
  }

  /**
   * Clean up specific cache
   * @param {string} cacheType 
   * @param {number} ttl 
   * @param {number} now 
   */
  _cleanupCache(cacheType, ttl, now) {
    const cache = this[cacheType];
    const keysToDelete = [];

    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => cache.delete(key));
    this.stats[cacheType].size = cache.size;

    return keysToDelete.length;
  }

  /**
   * Statistics and monitoring
   */

  /**
   * Get cache statistics
   */
  getStats() {
    const totalHits = Object.values(this.stats).reduce((sum, cache) => 
      sum + (cache.hits || 0), 0);
    const totalMisses = Object.values(this.stats).reduce((sum, cache) => 
      sum + (cache.misses || 0), 0);
    const totalRequests = totalHits + totalMisses;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      totalHits,
      totalMisses,
      totalRequests,
      hitRate: `${hitRate}%`,
      memoryUsage: this._getMemoryUsage()
    };
  }

  /**
   * Get approximate memory usage
   */
  _getMemoryUsage() {
    const sizes = {
      configCache: this.configCache.size,
      dataCache: this.dataCache.size,
      resultCache: this.resultCache.size,
      indexCache: this.indexCache.size
    };

    const totalSize = Object.values(sizes).reduce((sum, size) => sum + size, 0);

    return {
      ...sizes,
      totalSize,
      estimatedBytes: totalSize * 1024 // Rough estimate
    };
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.stats = {
      configCache: { hits: 0, misses: 0, size: this.configCache.size },
      dataCache: { hits: 0, misses: 0, size: this.dataCache.size },
      resultCache: { hits: 0, misses: 0, size: this.resultCache.size },
      indexCache: { hits: 0, misses: 0, size: this.indexCache.size },
      totalOperations: 0,
      lastCleanupAt: null
    };
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.clearConfig();
    this.clearData();
    this.clearResults();
    this.clearIndex();
    logger.info('All caches cleared');
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    this.stopCleanup();
    this.clearAll();
    logger.info('CacheManager shut down');
  }
}

module.exports = CacheManager; 