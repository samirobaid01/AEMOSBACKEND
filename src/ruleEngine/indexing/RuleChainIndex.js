const { RuleChain, RuleChainNode } = require('../../models/initModels');
const logger = require('../../utils/logger');

/**
 * Rule Chain Index System
 * Maintains entity-to-rulechain mappings for efficient targeting
 * This is the core optimization that prevents executing all rule chains
 */
class RuleChainIndex {
  constructor() {
    // Index structure: Map<organizationId, EntityIndex>
    this.organizationIndexes = new Map();
    
    // Cache for parsed rule configurations
    this.configCache = new Map();
    
    // Track index build status
    this.indexStatus = new Map();
    
    // Stats tracking
    this.stats = {
      organizationsIndexed: 0,
      lastUpdated: null
    };
    
    logger.info('RuleChainIndex initialized');
  }

  /**
   * Initialize the RuleChainIndex (lazy initialization - no database operations)
   * Indexes will be built on-demand when first accessed
   */
  async initialize() {
    logger.info('RuleChainIndex initialize() called - using lazy loading strategy');
    
    // No database operations during initialization
    // Indexes will be built on-demand when first accessed via _ensureIndexExists
    
    logger.info('RuleChainIndex initialization completed (lazy mode)');
    return Promise.resolve();
  }

  /**
   * Entity Index structure for each organization
   */
  _createEntityIndex() {
    return {
      // Map<sensorUuid, Set<ruleChainId>>
      sensorMappings: new Map(),
      
      // Map<deviceUuid, Set<ruleChainId>>  
      deviceMappings: new Map(),
      
      // Map<cronExpression, Set<ruleChainId>>
      scheduleMappings: new Map(),
      
      // Set<ruleChainId> - rule chains with no entity dependencies (always execute)
      globalRuleChains: new Set(),
      
      // Metadata
      lastUpdated: null,
      totalRuleChains: 0,
      totalMappings: 0
    };
  }

  /**
   * Build or rebuild index for an organization
   * @param {number} organizationId 
   */
  async rebuildIndex(organizationId) {
    const startTime = Date.now();
    
    try {
      logger.info(`Building rule chain index for organization ${organizationId}`);
      
      // Set building status
      this.indexStatus.set(organizationId, { status: 'building', startTime });
      
      // Get all rule chains for the organization (without eager loading)
      const ruleChains = await RuleChain.findAll({
        where: { organizationId }
      });

      // Get all rule chain nodes for these rule chains
      const ruleChainIds = ruleChains.map(rc => rc.id);
      const ruleChainNodes = ruleChainIds.length > 0 ? await RuleChainNode.findAll({
        where: {
          ruleChainId: ruleChainIds
        }
      }) : [];

      // Group nodes by ruleChainId
      const nodesByRuleChainId = {};
      ruleChainNodes.forEach(node => {
        if (!nodesByRuleChainId[node.ruleChainId]) {
          nodesByRuleChainId[node.ruleChainId] = [];
        }
        nodesByRuleChainId[node.ruleChainId].push(node);
      });

      // Attach nodes to rule chains
      ruleChains.forEach(ruleChain => {
        ruleChain.nodes = nodesByRuleChainId[ruleChain.id] || [];
      });

      // Create new index
      const entityIndex = this._createEntityIndex();
      
      // Process each rule chain
      for (const ruleChain of ruleChains) {
        await this._processRuleChain(ruleChain, entityIndex);
      }
      
      // Update metadata
      entityIndex.lastUpdated = new Date();
      entityIndex.totalRuleChains = ruleChains.length;
      entityIndex.totalMappings = this._calculateTotalMappings(entityIndex);
      
      // Store the index
      this.organizationIndexes.set(organizationId, entityIndex);
      
      // Update status
      const buildTime = Date.now() - startTime;
      this.indexStatus.set(organizationId, { 
        status: 'ready', 
        buildTime,
        lastBuilt: new Date(),
        totalRuleChains: entityIndex.totalRuleChains,
        totalMappings: entityIndex.totalMappings
      });
      
      logger.info(`Rule chain index built for organization ${organizationId}`, {
        buildTime: `${buildTime}ms`,
        ruleChains: entityIndex.totalRuleChains,
        mappings: entityIndex.totalMappings
      });
      
      return entityIndex;
    } catch (error) {
      this.indexStatus.set(organizationId, { 
        status: 'error', 
        error: error.message,
        lastAttempt: new Date()
      });
      
      logger.error(`Failed to build index for organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Process a single rule chain and extract entity dependencies
   * @param {Object} ruleChain 
   * @param {Object} entityIndex 
   */
  async _processRuleChain(ruleChain, entityIndex) {
    if (!ruleChain.nodes || ruleChain.nodes.length === 0) {
      return;
    }

    const ruleChainId = ruleChain.id;
    let hasEntityDependencies = false;
    
    // Extract requirements from all nodes
    for (const node of ruleChain.nodes) {
      try {
        const config = JSON.parse(node.config || '{}');
        const requirements = this._extractEntityRequirements(config);
        
        // Process sensor requirements
        for (const sensorUuid of requirements.sensors) {
          if (!entityIndex.sensorMappings.has(sensorUuid)) {
            entityIndex.sensorMappings.set(sensorUuid, new Set());
          }
          entityIndex.sensorMappings.get(sensorUuid).add(ruleChainId);
          hasEntityDependencies = true;
        }
        
        // Process device requirements
        for (const deviceUuid of requirements.devices) {
          if (!entityIndex.deviceMappings.has(deviceUuid)) {
            entityIndex.deviceMappings.set(deviceUuid, new Set());
          }
          entityIndex.deviceMappings.get(deviceUuid).add(ruleChainId);
          hasEntityDependencies = true;
        }
        
        // Process schedule requirements
        for (const cronExpression of requirements.schedules) {
          if (!entityIndex.scheduleMappings.has(cronExpression)) {
            entityIndex.scheduleMappings.set(cronExpression, new Set());
          }
          entityIndex.scheduleMappings.get(cronExpression).add(ruleChainId);
          hasEntityDependencies = true;
        }
        
        // Cache the parsed config for faster execution
        this.configCache.set(`${node.id}`, config);
        
      } catch (error) {
        logger.warn(`Failed to parse config for node ${node.id} in rule chain ${ruleChainId}:`, error);
      }
    }
    
    // If no entity dependencies found, add to global rule chains
    if (!hasEntityDependencies) {
      entityIndex.globalRuleChains.add(ruleChainId);
    }
  }

  /**
   * Extract entity requirements from rule configuration
   * @param {Object} config - Node configuration
   * @returns {Object} Requirements object
   */
  _extractEntityRequirements(config) {
    const requirements = {
      sensors: new Set(),
      devices: new Set(),
      schedules: new Set()
    };
    
    // Recursive function to extract from nested expressions
    const extractFromExpression = (expr) => {
      if (expr.type && expr.expressions) {
        // Handle nested AND/OR expressions
        expr.expressions.forEach(extractFromExpression);
      } else {
        // Handle leaf expression
        const { sourceType, UUID } = expr;
        
        if (sourceType === 'sensor' && UUID) {
          requirements.sensors.add(UUID);
        } else if (sourceType === 'device' && UUID) {
          requirements.devices.add(UUID);
        }
      }
    };
    
    // Extract from main config
    if (config.sourceType && config.UUID) {
      if (config.sourceType === 'sensor') {
        requirements.sensors.add(config.UUID);
      } else if (config.sourceType === 'device') {
        requirements.devices.add(config.UUID);
      }
    }
    
    // Extract from nested expressions
    if (config.expressions) {
      config.expressions.forEach(extractFromExpression);
    }
    
    // Extract from command configurations (actions)
    if (config.command && config.command.deviceUuid) {
      requirements.devices.add(config.command.deviceUuid);
    }
    
    // Extract schedule information (if applicable)
    if (config.cronExpression) {
      requirements.schedules.add(config.cronExpression);
    }
    
    // Convert Sets to Arrays for easier handling
    return {
      sensors: Array.from(requirements.sensors),
      devices: Array.from(requirements.devices),
      schedules: Array.from(requirements.schedules)
    };
  }

  /**
   * Extract entity mappings from rule configuration (alias for _extractEntityRequirements)
   * @param {Object} config - Node configuration
   * @returns {Object} Mappings object with sensors and devices arrays
   */
  _extractEntityMappings(config) {
    return this._extractEntityRequirements(config);
  }

  /**
   * Calculate total mappings in an entity index
   * @param {Object} entityIndex 
   */
  _calculateTotalMappings(entityIndex) {
    let total = 0;
    
    entityIndex.sensorMappings.forEach(ruleChainSet => {
      total += ruleChainSet.size;
    });
    
    entityIndex.deviceMappings.forEach(ruleChainSet => {
      total += ruleChainSet.size;
    });
    
    entityIndex.scheduleMappings.forEach(ruleChainSet => {
      total += ruleChainSet.size;
    });
    
    total += entityIndex.globalRuleChains.size;
    
    return total;
  }

  /**
   * Find rule chains that should be executed for a specific sensor
   * @param {string} sensorUuid 
   * @param {number} organizationId 
   * @returns {Array} Array of rule chain IDs
   */
  async findBySensorUuid(sensorUuid, organizationId) {
    // Validate inputs
    if (!sensorUuid) {
      logger.warn('⚠️ DEBUG: findBySensorUuid called with undefined/null sensorUuid', {
        sensorUuid,
        organizationId,
        sensorUuidType: typeof sensorUuid
      });
      return [];
    }

    if (!organizationId) {
      logger.warn('⚠️ DEBUG: findBySensorUuid called with undefined/null organizationId', {
        sensorUuid,
        organizationId,
        organizationIdType: typeof organizationId
      });
      return [];
    }

    logger.info('🔍 DEBUG: RuleChainIndex searching for sensor', {
      sensorUuid,
      organizationId,
      hasIndex: this.organizationIndexes.has(organizationId)
    });
    
    try {
      // Ensure index is built for this organization
      await this._ensureIndexExists(organizationId);
      
      const entityIndex = this.organizationIndexes.get(organizationId);
      if (!entityIndex) {
        logger.warn('⚠️ DEBUG: No index found for organization', { organizationId });
        return [];
      }
      
      logger.info('📋 DEBUG: Organization index contents', {
        organizationId,
        sensorMappingsCount: entityIndex.sensorMappings.size,
        deviceMappingsCount: entityIndex.deviceMappings.size,
        globalRuleChainsCount: entityIndex.globalRuleChains.size,
        targetSensorUuid: sensorUuid,
        availableSensorUuids: Array.from(entityIndex.sensorMappings.keys()).slice(0, 5) // First 5 for debugging
      });

      // Get rule chains for this specific sensor
      const sensorRuleChains = entityIndex.sensorMappings.get(sensorUuid) || new Set();
      
      // Add global rule chains that should always execute
      const globalRuleChains = Array.from(entityIndex.globalRuleChains);
      
      // Combine and deduplicate
      const allRelevantRuleChains = [...new Set([...Array.from(sensorRuleChains), ...globalRuleChains])];
      
      logger.info('🎯 DEBUG: Rule chain lookup result', {
        sensorUuid,
        organizationId,
        sensorSpecificRules: Array.from(sensorRuleChains),
        globalRules: globalRuleChains,
        totalRelevantRules: allRelevantRuleChains,
        count: allRelevantRuleChains.length
      });
      
      return allRelevantRuleChains;
    } catch (error) {
      logger.error('❌ DEBUG: Error in findBySensorUuid', {
        sensorUuid,
        organizationId,
        error: error.message
      });
      // Return empty array instead of crashing
      return [];
    }
  }

  /**
   * Find rule chains affected by device state change
   * @param {string} deviceUuid 
   * @param {number} organizationId 
   */
  async findByDeviceUuid(deviceUuid, organizationId) {
    await this._ensureIndexExists(organizationId);
    
    const entityIndex = this.organizationIndexes.get(organizationId);
    if (!entityIndex) return [];
    
    const ruleChainIds = new Set();
    
    // Add device-specific rule chains
    if (entityIndex.deviceMappings.has(deviceUuid)) {
      entityIndex.deviceMappings.get(deviceUuid).forEach(id => ruleChainIds.add(id));
    }
    
    // Add global rule chains (always execute)
    entityIndex.globalRuleChains.forEach(id => ruleChainIds.add(id));
    
    return Array.from(ruleChainIds);
  }

  /**
   * Find rule chains affected by schedule trigger
   * @param {string} cronExpression 
   * @param {number} organizationId 
   */
  async findBySchedule(cronExpression, organizationId) {
    await this._ensureIndexExists(organizationId);
    
    const entityIndex = this.organizationIndexes.get(organizationId);
    if (!entityIndex) return [];
    
    const ruleChainIds = new Set();
    
    // Add schedule-specific rule chains
    if (entityIndex.scheduleMappings.has(cronExpression)) {
      entityIndex.scheduleMappings.get(cronExpression).forEach(id => ruleChainIds.add(id));
    }
    
    return Array.from(ruleChainIds);
  }

  /**
   * Find all rule chains for manual trigger (organization level)
   * @param {number} organizationId 
   * @param {number} ruleChainId - Optional specific rule chain
   */
  async findForManualTrigger(organizationId, ruleChainId = null) {
    await this._ensureIndexExists(organizationId);
    
    if (ruleChainId) {
      // Return specific rule chain if requested
      return [ruleChainId];
    }
    
    const entityIndex = this.organizationIndexes.get(organizationId);
    if (!entityIndex) return [];
    
    const ruleChainIds = new Set();
    
    // Add all rule chains in the organization
    entityIndex.sensorMappings.forEach(ruleChainSet => {
      ruleChainSet.forEach(id => ruleChainIds.add(id));
    });
    
    entityIndex.deviceMappings.forEach(ruleChainSet => {
      ruleChainSet.forEach(id => ruleChainIds.add(id));
    });
    
    entityIndex.globalRuleChains.forEach(id => ruleChainIds.add(id));
    
    return Array.from(ruleChainIds);
  }

  /**
   * Ensure index exists for organization, build if necessary
   * @param {number} organizationId 
   */
  async _ensureIndexExists(organizationId) {
    if (!this.organizationIndexes.has(organizationId)) {
      const status = this.indexStatus.get(organizationId);
      
      if (!status || status.status === 'error') {
        await this.rebuildIndex(organizationId);
      }
    }
  }

  /**
   * Invalidate index for organization (trigger rebuild on next access)
   * @param {number} organizationId 
   */
  invalidateIndex(organizationId) {
    this.organizationIndexes.delete(organizationId);
    this.indexStatus.delete(organizationId);
    
    // Clear related config cache
    this.configCache.forEach((config, key) => {
      if (key.startsWith(`${organizationId}_`)) {
        this.configCache.delete(key);
      }
    });
    
    logger.info(`Index invalidated for organization ${organizationId}`);
  }

  /**
   * Get cached configuration for a node
   * @param {number} nodeId 
   */
  getCachedConfig(nodeId) {
    return this.configCache.get(`${nodeId}`);
  }

  /**
   * Get index statistics
   * @param {number} organizationId 
   */
  getIndexStats(organizationId) {
    const entityIndex = this.organizationIndexes.get(organizationId);
    const status = this.indexStatus.get(organizationId);
    
    if (!entityIndex) {
      return { status: 'not_built' };
    }
    
    return {
      ...status,
      sensorMappings: entityIndex.sensorMappings.size,
      deviceMappings: entityIndex.deviceMappings.size, 
      scheduleMappings: entityIndex.scheduleMappings.size,
      globalRuleChains: entityIndex.globalRuleChains.size,
      totalMappings: entityIndex.totalMappings,
      lastUpdated: entityIndex.lastUpdated
    };
  }

  /**
   * Clear all indexes and cache
   */
  clearAll() {
    this.organizationIndexes.clear();
    this.configCache.clear();
    this.indexStatus.clear();
    logger.info('All rule chain indexes cleared');
  }

  /**
   * Build index for a specific organization
   * @param {number} organizationId 
   */
  async _buildIndex(organizationId) {
    const startTime = Date.now();
    
    logger.info('🏗️ DEBUG: Building index for organization', { organizationId });
    
    try {
      // Initialize index structure
      const index = {
        sensorMappings: new Map(),      // sensorUuid -> [ruleChainId, ...]
        deviceMappings: new Map(),      // deviceUuid -> [ruleChainId, ...]
        globalRuleChains: new Set(),    // Rule chains that always execute
        lastUpdated: new Date()
      };

      // Get all rule chains for this organization
      const ruleChains = await RuleChain.findAll({
        where: { organizationId },
        include: [{
          model: RuleChainNode,
          as: 'nodes'
        }]
      });

      logger.info('📝 DEBUG: Found rule chains for organization', {
        organizationId,
        ruleChainCount: ruleChains.length,
        ruleChainIds: ruleChains.map(rc => rc.id)
      });

      // Process each rule chain
      for (const ruleChain of ruleChains) {
        const ruleChainId = ruleChain.id;
        let hasEntityMappings = false;
        
        logger.info('🔧 DEBUG: Processing rule chain', {
          ruleChainId,
          name: ruleChain.name,
          nodesCount: ruleChain.nodes?.length || 0
        });

        // Process each node to extract entity requirements
        if (ruleChain.nodes && ruleChain.nodes.length > 0) {
          for (const node of ruleChain.nodes) {
            try {
              const config = JSON.parse(node.config || '{}');
              const entityMappings = this._extractEntityMappings(config);
              
              logger.debug('📊 DEBUG: Node entity mappings', {
                ruleChainId,
                nodeId: node.id,
                nodeType: node.type,
                entityMappings
              });

              // Add sensor mappings
              entityMappings.sensors.forEach(sensorUuid => {
                if (!index.sensorMappings.has(sensorUuid)) {
                  index.sensorMappings.set(sensorUuid, []);
                }
                index.sensorMappings.get(sensorUuid).push(ruleChainId);
                hasEntityMappings = true;
                
                logger.debug('🎯 DEBUG: Added sensor mapping', {
                  sensorUuid,
                  ruleChainId,
                  totalMappingsForSensor: index.sensorMappings.get(sensorUuid).length
                });
              });

              // Add device mappings
              entityMappings.devices.forEach(deviceUuid => {
                if (!index.deviceMappings.has(deviceUuid)) {
                  index.deviceMappings.set(deviceUuid, []);
                }
                index.deviceMappings.get(deviceUuid).push(ruleChainId);
                hasEntityMappings = true;
                
                logger.debug('🎯 DEBUG: Added device mapping', {
                  deviceUuid,
                  ruleChainId,
                  totalMappingsForDevice: index.deviceMappings.get(deviceUuid).length
                });
              });
            } catch (error) {
              logger.error('❌ DEBUG: Error processing node config', {
                ruleChainId,
                nodeId: node.id,
                error: error.message
              });
            }
          }
        }

        // If no specific entity mappings, treat as global rule chain
        if (!hasEntityMappings) {
          index.globalRuleChains.add(ruleChainId);
          logger.info('🌐 DEBUG: Added to global rule chains', {
            ruleChainId,
            name: ruleChain.name
          });
        }
      }

      // Store the built index
      this.organizationIndexes.set(organizationId, index);
      this.stats.lastUpdated = new Date();
      this.stats.organizationsIndexed++;

      const buildTime = Date.now() - startTime;
      
      logger.info('✅ DEBUG: Index built successfully', {
        organizationId,
        buildTime: `${buildTime}ms`,
        sensorMappingsCount: index.sensorMappings.size,
        deviceMappingsCount: index.deviceMappings.size,
        globalRuleChainsCount: index.globalRuleChains.size,
        totalRuleChains: ruleChains.length,
        sensorMappings: Object.fromEntries(index.sensorMappings),
        deviceMappings: Object.fromEntries(index.deviceMappings),
        globalRuleChains: Array.from(index.globalRuleChains)
      });
      
      return index;
    } catch (error) {
      logger.error('❌ DEBUG: Index building failed', {
        organizationId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = RuleChainIndex; 