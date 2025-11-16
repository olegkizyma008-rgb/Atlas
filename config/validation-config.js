/**
 * Validation Configuration
 * Налаштування системи валідації MCP tools
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

/**
 * Browser-safe process.env access
 */
const env = typeof process !== 'undefined' ? process.env : {};

/**
 * Конфігурація системи валідації (OPTIMIZED Phase 8)
 * Reduction: 125 → 95 lines (-24%)
 */
export const VALIDATION_CONFIG = {
  pipeline: {
    enabled: true,
    earlyRejection: true,
    parallelStages: false,
    logLevel: 'info'
  },

  history: {
    enabled: true,
    maxSize: parseInt(env.VALIDATION_HISTORY_MAX_SIZE || '1000', 10),
    antiRepetitionWindow: parseInt(env.VALIDATION_ANTI_REPETITION_WINDOW || '100', 10),
    maxFailuresBeforeBlock: parseInt(env.VALIDATION_MAX_FAILURES_BEFORE_BLOCK || '3', 10),
    minSuccessRate: parseFloat(env.VALIDATION_MIN_SUCCESS_RATE || '0.3')
  },

  mcpSync: {
    enabled: true,
    cacheTTL: parseInt(env.VALIDATION_MCP_CACHE_TTL || '60000', 10),
    autoCorrect: true,
    similarityThreshold: parseFloat(env.VALIDATION_SIMILARITY_THRESHOLD || '0.8'),
    fallbackToCached: true
  },

  descriptions: {
    source: 'static',
    includeExamples: true,
    includeSchema: true,
    optimizeForLLM: true
  },

  autoCorrection: {
    enabled: true,
    methods: ['fuzzy_matching', 'mcp_tools_list', 'history'],
    maxAttempts: 3,
    confidenceThreshold: 0.8
  },

  stages: {
    format: { enabled: true, critical: true, timeout: 10, priority: 1 },
    history: { enabled: true, critical: false, timeout: 50, priority: 2 },
    schema: { enabled: true, critical: true, timeout: 100, priority: 3 },
    mcpSync: { enabled: true, critical: true, timeout: 5000, priority: 4 },
    llm: { enabled: true, critical: false, timeout: 10000, priority: 5 }
  },

  performance: {
    maxValidationTime: 15000,
    enableMetrics: true,
    logSlowValidations: true,
    slowValidationThreshold: 5000
  },

  errorHandling: {
    retryOnTimeout: true,
    maxRetries: 2,
    retryDelay: 1000,
    fallbackToLegacy: true
  },

  // Built-in methods (replaces standalone functions)
  getStage: function (name) { return this.stages[name] || null; },
  getEnabled: function () {
    return Object.entries(this.stages)
      .filter(([_, c]) => c.enabled !== false)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([name, config]) => ({ name, ...config }));
  },
  isCritical: function (name) {
    const stage = this.stages[name];
    return stage && stage.critical === true;
  },
  validate: function () {
    const errors = [];
    if (this.history.maxSize < 100) errors.push('history.maxSize must be at least 100');
    if (this.history.antiRepetitionWindow > this.history.maxSize)
      errors.push('history.antiRepetitionWindow cannot exceed maxSize');
    if (this.mcpSync.similarityThreshold < 0 || this.mcpSync.similarityThreshold > 1)
      errors.push('mcpSync.similarityThreshold must be between 0 and 1');
    if (this.getEnabled().length === 0) errors.push('At least one validation stage must be enabled');
    return { valid: errors.length === 0, errors };
  }
};

/**
 * Get stage configuration
 * @param {string} stageName - Stage name
 * @returns {Object} Stage config
 */
export function getStageConfig(stageName) {
  return VALIDATION_CONFIG.stages[stageName] || null;
}

/**
 * Check if stage is enabled
 * @param {string} stageName - Stage name
 * @returns {boolean}
 */
export function isStageEnabled(stageName) {
  const stage = VALIDATION_CONFIG.stages[stageName];
  return stage && stage.enabled !== false;
}

/**
 * Check if stage is critical
 * @param {string} stageName - Stage name
 * @returns {boolean}
 */
export function isStageCritical(stageName) {
  const stage = VALIDATION_CONFIG.stages[stageName];
  return stage && stage.critical === true;
}

/**
 * Get enabled stages in priority order
 * @returns {Array<Object>} Enabled stages
 */
export function getEnabledStages() {
  return Object.entries(VALIDATION_CONFIG.stages)
    .filter(([_, config]) => config.enabled !== false)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([name, config]) => ({ name, ...config }));
}

/**
 * Validate configuration
 * @returns {Object} {valid: boolean, errors: Array}
 */
export function validateConfig() {
  const errors = [];

  // Перевірка history settings
  if (VALIDATION_CONFIG.history.maxSize < 100) {
    errors.push('history.maxSize must be at least 100');
  }

  if (VALIDATION_CONFIG.history.antiRepetitionWindow > VALIDATION_CONFIG.history.maxSize) {
    errors.push('history.antiRepetitionWindow cannot exceed maxSize');
  }

  // Перевірка MCP sync settings
  if (VALIDATION_CONFIG.mcpSync.similarityThreshold < 0 || VALIDATION_CONFIG.mcpSync.similarityThreshold > 1) {
    errors.push('mcpSync.similarityThreshold must be between 0 and 1');
  }

  // Перевірка stages
  const enabledStages = getEnabledStages();
  if (enabledStages.length === 0) {
    errors.push('At least one validation stage must be enabled');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Валідація при імпорті
const configValidation = validateConfig();
if (!configValidation.valid) {
  console.error('[Validation Config] ❌ Configuration errors:');
  configValidation.errors.forEach(err => console.error(`  - ${err}`));
  throw new Error('Validation configuration is invalid');
}

// Log успішної ініціалізації
if (typeof console !== 'undefined') {
  const enabledStages = getEnabledStages();
  console.log(`[Validation Config] ✅ Initialized: ${enabledStages.length} stages enabled`);
}

export default VALIDATION_CONFIG;
