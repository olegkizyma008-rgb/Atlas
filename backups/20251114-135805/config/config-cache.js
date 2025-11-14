/**
 * CONFIG CACHE LAYER
 * Provides unified, cached access to all configuration modules
 * Reduces repeated parsing and improves performance
 *
 * @version 1.0.0
 * @date 2025-11-14
 */

import GlobalConfig from './atlas-config.js';

/**
 * Configuration cache with TTL support
 */
class ConfigCache {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cached value or compute and cache it
   * @param {string} key - Cache key
   * @param {Function} getter - Function to get value if not cached
   * @param {number} ttl - Time to live in milliseconds
   * @returns {*} Cached or computed value
   */
  get(key, getter, ttl = this.defaultTTL) {
    const now = Date.now();
    const cached = this.cache.get(key);
    const expiresAt = this.ttls.get(key);

    if (cached && expiresAt && now < expiresAt) {
      return cached;
    }

    const value = getter();
    this.cache.set(key, value);
    this.ttls.set(key, now + ttl);
    return value;
  }

  /**
   * Invalidate cache entry
   * @param {string} key - Cache key
   */
  invalidate(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
const configCache = new ConfigCache();

/**
 * Cached configuration getters
 */
export const CachedConfig = {
  /**
   * Get agent configuration (cached)
   * @param {string} agentName - Agent name
   * @returns {Object} Agent config
   */
  getAgentConfig(agentName) {
    return configCache.get(
      `agent_${agentName}`,
      () => GlobalConfig.getAgentConfig(agentName),
      10 * 60 * 1000 // 10 minutes
    );
  },

  /**
   * Get all agents (cached)
   * @returns {Object} All agents
   */
  getAllAgents() {
    return configCache.get(
      'all_agents',
      () => GlobalConfig.AGENTS,
      10 * 60 * 1000
    );
  },

  /**
   * Get workflow stage (cached)
   * @param {number} stageNumber - Stage number
   * @returns {Object} Stage config
   */
  getWorkflowStage(stageNumber) {
    return configCache.get(
      `stage_${stageNumber}`,
      () => GlobalConfig.getWorkflowStage(stageNumber),
      10 * 60 * 1000
    );
  },

  /**
   * Get all workflow stages (cached)
   * @returns {Array} All stages
   */
  getAllWorkflowStages() {
    return configCache.get(
      'all_stages',
      () => GlobalConfig.WORKFLOW_STAGES,
      10 * 60 * 1000
    );
  },

  /**
   * Get API URL (cached)
   * @param {string} serviceName - Service name
   * @param {string} endpoint - Endpoint path
   * @returns {string} Full URL
   */
  getApiUrl(serviceName, endpoint = '') {
    return configCache.get(
      `api_url_${serviceName}_${endpoint}`,
      () => GlobalConfig.getApiUrl(serviceName, endpoint),
      30 * 60 * 1000 // 30 minutes
    );
  },

  /**
   * Get service configuration (cached)
   * @param {string} serviceName - Service name
   * @returns {Object} Service config
   */
  getServiceConfig(serviceName) {
    return configCache.get(
      `service_${serviceName}`,
      () => GlobalConfig.getServiceConfig(serviceName),
      30 * 60 * 1000
    );
  },

  /**
   * Get model configuration (cached)
   * @param {string} modelType - Model type
   * @returns {Object} Model config
   */
  getModelConfig(modelType) {
    return configCache.get(
      `model_${modelType}`,
      () => {
        if (modelType === 'vision') return GlobalConfig.VISION_CONFIG;
        if (modelType === 'ai') return GlobalConfig.AI_MODEL_CONFIG;
        if (modelType === 'mcp') return GlobalConfig.MCP_MODEL_CONFIG;
        return null;
      },
      30 * 60 * 1000
    );
  },

  /**
   * Get TTS configuration (cached)
   * @returns {Object} TTS config
   */
  getTtsConfig() {
    return configCache.get(
      'tts_config',
      () => GlobalConfig.TTS_CONFIG,
      30 * 60 * 1000
    );
  },

  /**
   * Get voice configuration (cached)
   * @returns {Object} Voice config
   */
  getVoiceConfig() {
    return configCache.get(
      'voice_config',
      () => GlobalConfig.VOICE_CONFIG,
      30 * 60 * 1000
    );
  },

  /**
   * Get MCP registry (cached)
   * @returns {Object} MCP registry
   */
  getMcpRegistry() {
    return configCache.get(
      'mcp_registry',
      () => GlobalConfig.MCP_REGISTRY,
      10 * 60 * 1000
    );
  },

  /**
   * Invalidate specific cache entry
   * @param {string} key - Cache key
   */
  invalidate(key) {
    configCache.invalidate(key);
  },

  /**
   * Clear all configuration cache
   */
  clearCache() {
    configCache.clear();
  },

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return configCache.getStats();
  }
};

export default CachedConfig;
