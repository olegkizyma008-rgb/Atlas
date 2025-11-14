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
 * Конфігурація системи валідації
 */
export const VALIDATION_CONFIG = {
  /**
   * Pipeline settings
   */
  pipeline: {
    enabled: true,
    earlyRejection: true,      // Зупинка на першій CRITICAL помилці
    parallelStages: false,     // Послідовне виконання для early rejection
    logLevel: 'info'           // 'debug' | 'info' | 'warn' | 'error'
  },

  /**
   * History settings
   */
  history: {
    enabled: true,
    maxSize: parseInt(env.VALIDATION_HISTORY_MAX_SIZE || '1000', 10),
    antiRepetitionWindow: parseInt(env.VALIDATION_ANTI_REPETITION_WINDOW || '100', 10),
    maxFailuresBeforeBlock: parseInt(env.VALIDATION_MAX_FAILURES_BEFORE_BLOCK || '3', 10),
    minSuccessRate: parseFloat(env.VALIDATION_MIN_SUCCESS_RATE || '0.3')  // 30% мінімум
  },

  /**
   * MCP Sync settings
   */
  mcpSync: {
    enabled: true,
    cacheTTL: parseInt(env.VALIDATION_MCP_CACHE_TTL || '60000', 10),  // 60 секунд
    autoCorrect: true,
    similarityThreshold: parseFloat(env.VALIDATION_SIMILARITY_THRESHOLD || '0.8'),  // 80% для автокорекції
    fallbackToCached: true     // Fallback на кешований список якщо MCP недоступний
  },

  /**
   * Tool descriptions
   */
  descriptions: {
    source: 'static',          // 'static' (рекомендовано) або 'mcp_cache'
    includeExamples: true,
    includeSchema: true,
    optimizeForLLM: true       // Скорочені описи для економії токенів
  },

  /**
   * Auto-correction
   */
  autoCorrection: {
    enabled: true,
    methods: ['fuzzy_matching', 'mcp_tools_list', 'history'],
    maxAttempts: 3,
    confidenceThreshold: 0.8   // Мінімальна впевненість для автокорекції
  },

  /**
   * Validation stages configuration
   */
  stages: {
    format: {
      enabled: true,
      critical: true,
      timeout: 10,               // ms
      priority: 1
    },
    history: {
      enabled: true,
      critical: false,           // NON-CRITICAL - тільки warnings
      timeout: 50,               // ms
      priority: 2
    },
    schema: {
      enabled: true,
      critical: true,
      timeout: 100,              // ms
      priority: 3
    },
    mcpSync: {
      enabled: true,
      critical: true,
      timeout: 5000,             // ms (може бути повільний)
      priority: 4
    },
    llm: {
      enabled: true,
      critical: false,           // NON-CRITICAL - тільки warnings
      timeout: 10000,            // ms
      priority: 5
    }
  },

  /**
   * Performance settings
   */
  performance: {
    maxValidationTime: 15000,  // 15 секунд максимум для всього pipeline
    enableMetrics: true,
    logSlowValidations: true,
    slowValidationThreshold: 5000  // 5 секунд
  },

  /**
   * Error handling
   */
  errorHandling: {
    retryOnTimeout: true,
    maxRetries: 2,
    retryDelay: 1000,          // ms
    fallbackToLegacy: true     // Fallback на стару систему валідації
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
