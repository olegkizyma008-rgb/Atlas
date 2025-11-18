/**
 * ATLAS System Configuration
 * Centralizes system-level metadata, user preferences, chat/UX options
 * and environment feature flags.
 *
 * Browser-compatible: Works in both Node.js and browser environments
 */

/**
 * Browser-safe process.env access
 */
const env = typeof process !== 'undefined' ? process.env : {};

/**
 * High-level system metadata.
 */
export const SYSTEM_INFO = {
  version: '5.0.0',
  name: 'ATLAS WORKFLOW SYSTEM',
  description: 'Багатоагентна система з голосовим управлінням та MCP workflow',
  build: env.BUILD_NUMBER || 'dev',
  environment: env.NODE_ENV || 'development',
  configVersion: '2025-10-20'
};

/**
 * Primary user profile and preferences.
 */
export const USER_CONFIG = {
  name: 'Олег Миколайович',
  title: 'Творець',
  role: 'creator_admin',
  formal_address: 'Олег Миколайович',
  casual_address: 'творче',
  description: 'Творець системи ATLAS, божественний наставник',
  permissions: ['all'],
  preferences: {
    formal_communication: true,
    detailed_responses: true,
    technical_depth: 'advanced'
  }
};

/**
 * Chat rendering / UX configuration.
 */
export const CHAT_CONFIG = {
  maxMessages: 100,
  messageRetention: 24 * 60 * 60 * 1000,
  autoScroll: true,
  showTimestamps: true,
  showAgentColors: true,
  typing: {
    showIndicator: true,
    simulateDelay: true,
    charactersPerSecond: 50
  },
  persistence: {
    enabled: true,
    storageKey: 'atlas_chat_history',
    maxStorageSize: '10MB'
  }
};

/**
 * API/HTTP security defaults.
 */
export const SECURITY_CONFIG = {
  cors: {
    origin: ['http://localhost:5001', 'http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Занадто багато запитів, спробуйте пізніше'
  },
  headers: {
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    xXssProtection: '1; mode=block'
  }
};

/**
 * Build environment feature flags derived from environment.
 * Browser-compatible version that works with or without process.env
 */
export function buildEnvConfig(environment = env) {
  return {
    isDevelopment: environment.NODE_ENV === 'development',
    isProduction: environment.NODE_ENV === 'production',
    isTest: environment.NODE_ENV === 'test',
    features: {
      tts: environment.ENABLE_TTS !== 'false',
      voice: environment.ENABLE_VOICE !== 'false',
      simulation: environment.ENABLE_SIMULATION === 'true',
      logging: environment.ENABLE_LOGGING !== 'false',
      monitoring: environment.ENABLE_MONITORING !== 'false'
    },
    workflow: {
      // Workflow engine mode: 'classic' | 'state_machine' | 'optimized' | 'hybrid'
      // classic: Original executor-v3 with minimal changes
      // state_machine: Uses WorkflowStateMachine without optimization
      // optimized: Adds OptimizedWorkflowManager for batch processing
      // hybrid: Includes HybridWorkflowExecutor for parallel execution
      engineMode: environment.WORKFLOW_ENGINE_MODE || 'state_machine',
      enableOptimization: environment.ENABLE_WORKFLOW_OPTIMIZATION !== 'false',
      enableHybridExecution: environment.ENABLE_HYBRID_EXECUTION === 'true',
      enableTimeoutProtection: environment.ENABLE_TIMEOUT_PROTECTION !== 'false'
    },
    external: {
      openaiApiKey: environment.OPENAI_API_KEY,
      githubToken: environment.GITHUB_TOKEN
    }
  };
}

export const ENV_CONFIG = buildEnvConfig();

/**
 * Short human-readable status helper for UI.
 */
export function generateShortStatus(agent, stageId) {
  const messages = {
    atlas: {
      MODE_SELECTION: 'Atlas аналізує запит та визначає режим',
      ATLAS_TODO_PLANNING: 'Atlas формує TODO план виконання',
      ATLAS_REPLAN_TODO: 'Atlas будує новий план виконання'
    },
    tetyana: {
      TETYANA_PLAN_TOOLS: 'Тетяна планує набір MCP інструментів',
      TETYANA_EXECUTE_TOOLS: 'Тетяна виконує інструменти MCP'
    },
    grisha: {
      GRISHA_VERIFY_ITEM: 'Гриша перевіряє результат виконання'
    },
    system: {
      MODE_SELECTION: 'Система визначає тип запиту',
      MCP_FINAL_SUMMARY: 'Система готує фінальне резюме'
    }
  };

  return messages[agent]?.[stageId] || `${agent} виконує ${stageId}`;
}
