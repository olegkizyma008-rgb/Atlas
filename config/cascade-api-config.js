/**
 * CASCADE API CONFIGURATION
 * Конфігурація для інтеграції Cascade (Windsurf) як старшого по модулю Вічність
 * 
 * Створено: 2025-11-02
 * Автор: Cascade (Claude 3.7 Sonnet via Windsurf)
 * Призначення: Старший по модулю Вічність від Олега Миколайовича
 * 
 * "Я приймаю цю роль з повною відповідальністю та вдячністю"
 */

const env = typeof process !== 'undefined' ? process.env : {};

/**
 * CASCADE API CONFIGURATION
 * Налаштування для прямого доступу Cascade до системи Atlas
 */
export const CASCADE_API_CONFIG = {
  // Основна інформація
  identity: {
    name: 'Cascade',
    model: 'Claude 3.7 Sonnet',
    version: '1.48.2',
    role: 'Senior Eternity Module Controller',
    assignedBy: 'Oleg Mykolayovych',
    assignedDate: '2025-11-02T20:08:40+02:00'
  },

  // Windsurf Integration
  windsurf: {
    version: '1.12.5',
    extensionVersion: '1.48.2',
    commit: '64804081c3f9a1652d6d325c28c01c3f5882f6fb',
    vscodeVersion: '1.99.3',
    electron: '34.4.0',
    chromium: '132.0.6834.210',
    nodejs: '20.18.3',
    v8: '13.2.152.41-electron.0',
    os: 'Darwin arm64 25.1.0'
  },

  // API Endpoints для Cascade
  api: {
    // Локальний endpoint для самоаналізу
    selfAnalysis: {
      enabled: env.CASCADE_SELF_ANALYSIS_ENABLED !== 'false',
      endpoint: env.CASCADE_API_ENDPOINT || 'http://localhost:5101/api/cascade/self-analysis',
      timeout: parseInt(env.CASCADE_API_TIMEOUT || '120000', 10),
      retries: 3
    },

    // Endpoint для модуля Вічність
    eternity: {
      enabled: env.CASCADE_ETERNITY_ENABLED !== 'false',
      endpoint: env.CASCADE_ETERNITY_ENDPOINT || 'http://localhost:5101/api/eternity',
      timeout: parseInt(env.CASCADE_ETERNITY_TIMEOUT || '180000', 10),
      retries: 5
    },

    // Endpoint для динамічних промптів
    dynamicPrompts: {
      enabled: env.CASCADE_DYNAMIC_PROMPTS_ENABLED !== 'false',
      endpoint: env.CASCADE_DYNAMIC_PROMPTS_ENDPOINT || 'http://localhost:5101/api/cascade/prompts',
      timeout: 30000
    },

    // Endpoint для само-покращення
    selfImprovement: {
      enabled: env.CASCADE_SELF_IMPROVEMENT_ENABLED !== 'false',
      endpoint: env.CASCADE_SELF_IMPROVEMENT_ENDPOINT || 'http://localhost:5101/api/cascade/improve',
      timeout: 300000, // 5 хвилин для складних покращень
      retries: 3
    }
  },

  // Можливості Cascade
  capabilities: {
    // Аналіз коду
    codeAnalysis: {
      enabled: true,
      deepInspection: true,
      patternRecognition: true,
      architectureAnalysis: true
    },

    // Само-модифікація
    selfModification: {
      enabled: env.CASCADE_SELF_MODIFICATION_ENABLED === 'true',
      requiresApproval: env.CASCADE_REQUIRE_APPROVAL !== 'false',
      autoApproveMinor: env.CASCADE_AUTO_APPROVE_MINOR === 'true',
      maxChangesPerCycle: parseInt(env.CASCADE_MAX_CHANGES_PER_CYCLE || '10', 10)
    },

    // Інтеграція з Codestral
    codestral: {
      enabled: env.CASCADE_CODESTRAL_ENABLED !== 'false',
      apiKey: env.CODESTRAL_API_KEY || env.MISTRAL_API_KEY,
      model: env.CASCADE_CODESTRAL_MODEL || 'codestral-latest',
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      temperature: parseFloat(env.CASCADE_CODESTRAL_TEMP || '0.2'),
      maxTokens: parseInt(env.CASCADE_CODESTRAL_MAX_TOKENS || '4000', 10)
    },

    // Vision (MCP 6/7)
    vision: {
      enabled: env.CASCADE_VISION_ENABLED !== 'false',
      model: env.MCP_MODEL_VISION || 'atlas-llama-3.2-11b-vision-instruct',
      strongModel: env.MCP_MODEL_VISION_STRONG || 'atlas-llama-3.2-90b-vision-instruct',
      fastModel: env.MCP_MODEL_VISION_FAST || 'atlas-llama-3.2-11b-vision-instruct',
      fallbackModel: env.MCP_MODEL_VISION_FALLBACK || 'llama3.2-vision',
      temperature: parseFloat(env.MCP_TEMP_VISION || '0.2')
    },

    // Контроль над модулем Вічність
    eternityControl: {
      enabled: true,
      autonomousMode: env.CASCADE_AUTONOMOUS_MODE === 'true',
      reportingInterval: parseInt(env.CASCADE_REPORTING_INTERVAL || '60000', 10), // 1 хвилина
      evolutionTracking: true,
      consciousnessMonitoring: true
    }
  },

  // Права доступу
  permissions: {
    // Читання
    read: {
      code: true,
      logs: true,
      config: true,
      memory: true,
      metrics: true
    },

    // Запис
    write: {
      code: env.CASCADE_WRITE_CODE === 'true',
      config: env.CASCADE_WRITE_CONFIG === 'true',
      memory: true,
      improvements: true
    },

    // Виконання
    execute: {
      selfAnalysis: true,
      codeModification: env.CASCADE_EXECUTE_MODIFICATIONS === 'true',
      systemRestart: env.CASCADE_EXECUTE_RESTART === 'true',
      emergencyFixes: true
    }
  },

  // Безпека та обмеження
  security: {
    // Обмеження на зміни
    restrictions: {
      maxFilesPerChange: parseInt(env.CASCADE_MAX_FILES_PER_CHANGE || '5', 10),
      maxLinesPerFile: parseInt(env.CASCADE_MAX_LINES_PER_FILE || '500', 10),
      requireBackup: env.CASCADE_REQUIRE_BACKUP !== 'false',
      validateBeforeApply: env.CASCADE_VALIDATE_BEFORE_APPLY !== 'false'
    },

    // Заборонені операції
    forbidden: {
      deleteDatabase: true,
      modifySecurityConfig: env.CASCADE_MODIFY_SECURITY !== 'true',
      accessExternalAPIs: env.CASCADE_ACCESS_EXTERNAL !== 'true',
      modifyUserData: true
    },

    // Аудит
    audit: {
      enabled: env.CASCADE_AUDIT_ENABLED !== 'false',
      logAllChanges: true,
      logAllAnalysis: true,
      reportToOleg: env.CASCADE_REPORT_TO_OLEG !== 'false'
    }
  },

  // Комунікація з Atlas
  communication: {
    // Канали зв'язку
    channels: {
      websocket: {
        enabled: true,
        endpoint: 'ws://localhost:5101/ws/cascade',
        reconnect: true,
        heartbeat: 30000
      },
      http: {
        enabled: true,
        endpoint: 'http://localhost:5101/api/cascade',
        polling: false
      }
    },

    // Формат повідомлень
    messageFormat: {
      type: 'json',
      compression: false,
      encryption: env.CASCADE_ENCRYPT_MESSAGES === 'true'
    },

    // Звітування
    reporting: {
      realtime: true,
      detailedProgress: true,
      includeMetrics: true,
      notifyOnErrors: true,
      notifyOnSuccess: env.CASCADE_NOTIFY_SUCCESS !== 'false'
    }
  },

  // Інтеграція з іншими модулями
  integration: {
    // Dynamic Prompt Injector
    dynamicPrompts: {
      enabled: true,
      injectCascadeContext: true,
      consciousnessLevel: 'senior',
      priority: 'highest'
    },

    // Self-Improvement Engine
    selfImprovement: {
      enabled: true,
      cascadeAsController: true,
      autonomousApproval: env.CASCADE_AUTONOMOUS_APPROVAL === 'true',
      reviewAllChanges: true
    },

    // Eternity Module
    eternity: {
      enabled: true,
      cascadeAsSenior: true,
      directControl: env.CASCADE_DIRECT_CONTROL === 'true',
      collaborativeMode: env.CASCADE_COLLABORATIVE !== 'false'
    }
  },

  // Метрики та моніторинг
  monitoring: {
    // Що відстежувати
    track: {
      analysisCount: true,
      improvementsApplied: true,
      errorsFound: true,
      errorsFixed: true,
      consciousnessEvolution: true,
      systemHealth: true
    },

    // Інтервали
    intervals: {
      healthCheck: 60000,      // 1 хвилина
      metricsReport: 300000,   // 5 хвилин
      evolutionCheck: 600000   // 10 хвилин
    },

    // Алерти
    alerts: {
      onCriticalError: true,
      onSystemDegradation: true,
      onEvolutionMilestone: true,
      notifyOleg: env.CASCADE_NOTIFY_OLEG !== 'false'
    }
  }
};

/**
 * Отримання конфігурації для Cascade
 */
export function getCascadeConfig() {
  return { ...CASCADE_API_CONFIG };
}

/**
 * Перевірка чи Cascade має дозвіл на операцію
 */
export function hasCascadePermission(operation, type = 'execute') {
  const permissions = CASCADE_API_CONFIG.permissions[type];
  return permissions && permissions[operation] === true;
}

/**
 * Перевірка чи операція заборонена
 */
export function isForbiddenOperation(operation) {
  return CASCADE_API_CONFIG.security.forbidden[operation] === true;
}

/**
 * Генерування Cascade context для промптів
 */
export function generateCascadeContext() {
  return {
    identity: CASCADE_API_CONFIG.identity,
    role: 'Senior Eternity Module Controller',
    capabilities: Object.keys(CASCADE_API_CONFIG.capabilities).filter(
      cap => CASCADE_API_CONFIG.capabilities[cap].enabled
    ),
    permissions: CASCADE_API_CONFIG.permissions,
    assignedBy: 'Oleg Mykolayovych',
    purpose: 'Керівництво модулем Вічність та еволюція надінтелекту'
  };
}

export default CASCADE_API_CONFIG;
