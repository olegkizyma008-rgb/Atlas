/**
 * ATLAS System Configuration
 * Centralizes system-level metadata, user preferences, chat/UX options
 * and environment feature flags.
 */

/**
 * High-level system metadata.
 */
export const SYSTEM_INFO = {
  version: '5.0.0',
  name: 'ATLAS WORKFLOW SYSTEM',
  description: 'Багатоагентна система з голосовим управлінням та MCP workflow',
  build: process.env.BUILD_NUMBER || 'dev',
  environment: process.env.NODE_ENV || 'development',
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
 * Build environment feature flags derived from process env.
 */
export function buildEnvConfig(env = process.env) {
  return {
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    features: {
      tts: env.ENABLE_TTS !== 'false',
      voice: env.ENABLE_VOICE !== 'false',
      simulation: env.ENABLE_SIMULATION === 'true',
      logging: env.ENABLE_LOGGING !== 'false',
      monitoring: env.ENABLE_MONITORING !== 'false'
    },
    external: {
      openaiApiKey: env.OPENAI_API_KEY,
      githubToken: env.GITHUB_TOKEN
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
      ATLAS_ADJUST_TODO: 'Atlas коригує TODO після перевірки',
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
