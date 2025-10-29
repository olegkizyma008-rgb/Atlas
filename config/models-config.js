/**
 * ATLAS Model Configuration
 * Містить конфігурацію AI/MCP моделей та vision налаштування.
 *
 * Browser-compatible: Works in both Node.js and browser environments
 */

/**
 * Browser-safe process.env access
 */
const env = typeof process !== 'undefined' ? process.env : {};

// === VISION MODELS CONFIGURATION (UPDATED 18.10.2025) ===
export const VISION_CONFIG = {
  primary: {
    model: 'atlas-llama-3.2-90b-vision-instruct',
    provider: 'atlas',
    cost: 0.01,
    speed: '1-2s',
    rateLimitPerMin: 10,
    use_cases: ['any_task', 'complex_ui', 'high_accuracy_required'],
    endpoint: 'http://localhost:4000/v1/chat/completions',
    isLocal: false
  },
  fast: {
    model: 'atlas-llama-3.2-11b-vision-instruct',
    provider: 'atlas',
    cost: 0.0002,
    speed: '0.8-1.2s',
    rateLimitPerMin: 6,
    use_cases: ['browser_open', 'file_exists', 'app_active', 'window_visible'],
    endpoint: 'http://localhost:4000/v1/chat/completions',
    isLocal: false
  },
  standard: {
    model: 'atlas-llama-3.2-90b-vision-instruct',
    provider: 'atlas',
    cost: 0.0003,
    speed: '1.5-2.5s',
    rateLimitPerMin: 3,
    use_cases: ['text_match', 'ui_validation', 'form_filled', 'button_state'],
    endpoint: 'http://localhost:4000/v1/chat/completions',
    isLocal: false
  },
  cheapest: {
    model: 'atlas-llama-3.2-11b-vision-instruct',
    provider: 'atlas',
    cost: 0.0001,
    speed: '1-1.5s',
    rateLimitPerMin: 12,
    use_cases: ['simple_check', 'presence_check', 'quick_verify'],
    endpoint: 'http://localhost:4000/v1/chat/completions',
    isLocal: false
  },
  get default() {
    return this.primary;
  },
  api: {
    primaryEndpoint: 'http://localhost:4000/v1/chat/completions',
    timeout: 60000,
    temperature: 0.2,
    maxTokens: 1000
  },
  selectModel(complexity) {
    if (complexity <= 3) return this.cheapest;
    if (complexity <= 6) return this.fast;
    if (complexity <= 8) return this.standard;
    return this.primary;
  },
  estimateCost(model, screenshotCount = 1) {
    const modelConfig = Object.values(this).find(cfg => cfg?.model === model);
    if (!modelConfig) return 0;
    return modelConfig.cost * screenshotCount;
  }
};

// === AI MODELS CONFIGURATION ===
export const AI_MODEL_CONFIG = {
  get apiEndpoint() {
    const primary = process.env.LLM_API_ENDPOINT || 'http://localhost:4000/v1/chat/completions';
    const fallback = process.env.LLM_API_FALLBACK_ENDPOINT;
    // Only enable fallback if it's explicitly set AND not empty
    const useFallback = process.env.LLM_API_USE_FALLBACK === 'true' && fallback && fallback.trim().length > 0;

    return {
      primary,
      fallback: fallback || null,
      useFallback,
      timeout: parseInt(process.env.LLM_API_TIMEOUT || '60000', 10)
    };
  },
  models: {
    classification: {
      get model() {
        return env.AI_MODEL_CLASSIFICATION || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.AI_TEMP_CLASSIFICATION || '0.05');
      },
      max_tokens: 50,
      description: 'Бінарна класифікація - максимальна точність'
    },
    chat: {
      get model() {
        return env.AI_MODEL_CHAT || 'atlas-mistral-medium-2505';
      },
      get temperature() {
        return parseFloat(env.AI_TEMP_CHAT || '0.7');
      },
      max_tokens: 500,
      description: 'Природні розмови - креативність (Mistral Medium)'
    },
    analysis: {
      get model() {
        return env.AI_MODEL_ANALYSIS || 'ext-mistral-codestral-2405';
      },
      get temperature() {
        return parseFloat(env.AI_TEMP_ANALYSIS || '0.2');
      },
      max_tokens: 1000,
      description: 'Аналіз та контекст - точність (Codestral 2405 - TEMP due to rate limit)'
    },
    tts_optimization: {
      get model() {
        return env.AI_MODEL_TTS_OPT || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.AI_TEMP_TTS_OPT || '0.15');
      },
      max_tokens: 300,
      description: 'Оптимізація для TTS - стабільність'
    }
  },
  stageModels: {
    'stage0_mode_selection': 'classification',
    'stage0_chat': 'chat',
    'stage-2_post_chat_analysis': 'analysis',
    'stage-3_tts_optimization': 'tts_optimization'
  },
  defaultModel: 'classification'
};

// === MCP MODELS CONFIGURATION ===
export const MCP_MODEL_CONFIG = {
  get apiEndpoint() {
    const primary = env.LLM_API_ENDPOINT || 'http://localhost:4000/v1/chat/completions';
    const fallback = env.LLM_API_FALLBACK_ENDPOINT;
    // Only enable fallback if it's explicitly set AND not empty
    const useFallback = env.LLM_API_USE_FALLBACK === 'true' && fallback && fallback.trim().length > 0;

    return {
      primary,
      fallback: fallback || null,
      useFallback,
      timeout: parseInt(env.LLM_API_TIMEOUT || '60000', 10)
    };
  },
  stages: {
    mode_selection: {
      get model() {
        return env.MCP_MODEL_MODE_SELECTION || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_MODE_SELECTION || '0.05');
      },
      max_tokens: 150,
      description: 'Бінарна класифікація task vs chat (Mistral 3B - швидка і точна)'
    },
    backend_selection: {
      get model() {
        return env.MCP_MODEL_BACKEND_SELECTION || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_BACKEND_SELECTION || '0.05');
      },
      max_tokens: 50,
      description: 'Keyword routing - точність (deprecated)'
    },
    todo_planning: {
      get model() {
        return env.MCP_MODEL_TODO_PLANNING || 'atlas-mistral-medium-2505';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_TODO_PLANNING || '0.3');
      },
      max_tokens: 4000,
      description: 'Atlas TODO Planning (Mistral Medium - reliable reasoning)'
    },
    plan_tools: {
      get model() {
        return env.MCP_MODEL_PLAN_TOOLS || 'ext-mistral-codestral-latest';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_PLAN_TOOLS || '0.1');
      },
      max_tokens: 2500,
      description: 'Tetyana Plan Tools - чистий JSON (Codestral Latest - TEMP due to rate limit)'
    },
    verification_eligibility: {
      get model() {
        return env.MCP_MODEL_VERIFICATION_ELIGIBILITY || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_VERIFICATION_ELIGIBILITY || '0.1');
      },
      max_tokens: 500,
      description: 'Grisha Verification Eligibility - routing decision (Mistral 3B - fast classification)'
    },
    verify_item: {
      get model() {
        return env.MCP_MODEL_VERIFY_ITEM || 'atlas-mistral-small-2503';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_VERIFY_ITEM || '0.15');
      },
      max_tokens: 800,
      description: 'Grisha Verify Item - швидка верифікація (Mistral Small)'
    },
    adjust_todo: {
      get model() {
        return env.MCP_MODEL_ADJUST_TODO || 'atlas-mistral-medium-2505';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_ADJUST_TODO || '0.2');
      },
      max_tokens: 1500,
      description: 'Atlas Adjust TODO - точна корекція (Mistral Medium)'
    },
    replan_todo: {
      get model() {
        return env.MCP_MODEL_REPLAN_TODO || 'atlas-mistral-medium-2505';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_REPLAN_TODO || '0.3');
      },
      max_tokens: 3000,
      description: 'Atlas Replan TODO - глибокий аналіз (Mistral Medium)'
    },
    final_summary: {
      get model() {
        return env.MCP_MODEL_FINAL_SUMMARY || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_FINAL_SUMMARY || '0.5');
      },
      max_tokens: 600,
      description: 'Final Summary для користувача - природність'
    },
    dev_analysis: {
      get model() {
        return env.MCP_MODEL_DEV_ANALYSIS || 'ext-mistral-codestral-latest';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_DEV_ANALYSIS || '0.2');
      },
      max_tokens: 4000,
      description: 'DEV mode self-analysis - deep introspection (Codestral Latest)'
    },
    vision_analysis: {
      get model() {
        return env.MCP_MODEL_VISION || 'atlas-llama-3.2-11b-vision-instruct';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_VISION || '0.2');
      },
      max_tokens: 1000,
      description: 'Vision Analysis - аналіз скріншотів (GPT-4o vision)'
    },
    vision_verification_fast: {
      get model() {
        return env.MCP_MODEL_VISION_FAST || 'atlas-llama-3.2-11b-vision-instruct';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_VISION_FAST || '0.2');
      },
      max_tokens: 800,
      description: 'Grisha Visual Verification Attempt 1 - середня модель (Llama-3.2 11B Vision)'
    },
    vision_verification_strong: {
      get model() {
        return env.MCP_MODEL_VISION_STRONG || 'atlas-llama-3.2-90b-vision-instruct';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_VISION_STRONG || '0.2');
      },
      max_tokens: 1000,
      description: 'Grisha Visual Verification Attempt 2 - потужна модель (Llama-3.2-90B Vision)'
    },
    vision_fallback: {
      get model() {
        return env.MCP_MODEL_VISION_FALLBACK || 'llama3.2-vision';
      },
      endpoint: 'http://localhost:11434/api/generate',
      description: 'Ollama local vision - безкоштовний fallback (повільний)'
    },
    server_selection: {
      get model() {
        return env.MCP_MODEL_SERVER_SELECTION || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_SERVER_SELECTION || '0.05');
      },
      max_tokens: 50,
      description: 'MCP Server Selection - швидка класифікація серверів'
    },
    state_analysis: {
      get model() {
        return env.MCP_MODEL_STATE_ANALYSIS || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_STATE_ANALYSIS || '0.1');
      },
      max_tokens: 100,
      description: 'State Analysis - аналіз станів агентів'
    },
    screenshot_adjustment: {
      get model() {
        return env.MCP_MODEL_SCREENSHOT_ADJ || 'atlas-phi-4-multimodal-instruct';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_SCREENSHOT_ADJ || '0.2');
      },
      max_tokens: 2000,
      description: 'Screenshot Adjustment - аналіз скріншотів (Phi-4 Multimodal)'
    },
    visual_capture_mode_selector: {
      get model() {
        return env.MCP_MODEL_VISUAL_CAPTURE_MODE || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_VISUAL_CAPTURE_MODE || '0.1');
      },
      max_tokens: 400,
      description: 'Visual Capture Mode Selector - вибір режиму скріншота'
    },
    tts_optimization: {
      get model() {
        return env.MCP_MODEL_TTS_OPT || 'atlas-ministral-3b';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_TTS_OPT || '0.3');
      },
      max_tokens: 200,
      description: 'TTS Optimization - оптимізація тексту для озвучки'
    },
    chat_memory_eligibility: {
      get model() {
        return env.MCP_MODEL_CHAT_MEMORY_ELIGIBILITY || 'atlas-ai21-jamba-1.5-mini';
      },
      get temperature() {
        return parseFloat(env.MCP_TEMP_CHAT_MEMORY_ELIGIBILITY || '0.1');
      },
      max_tokens: 150,
      description: 'Chat Memory Eligibility - швидка класифікація потреби в довготривалій пам\'яті (AI21 Jamba 1.5 Mini - ultra fast)'
    }
  },
  getStageConfig(stageName) {
    return this.stages[stageName] || this.stages.plan_tools;
  }
};

// === AI BACKEND CONFIGURATION (NEW 13.10.2025) ===
export const AI_BACKEND_CONFIG = {
  mode: 'mcp',
  primary: 'mcp',
  fallback: null,
  disableFallback: true,
  retry: {
    get maxAttempts() {
      return parseInt(env.MCP_MAX_ATTEMPTS || '3', 10);
    },
    get timeoutMs() {
      return parseInt(env.MCP_TIMEOUT_MS || '30000', 10);
    },
    get exponentialBackoff() {
      return env.MCP_EXPONENTIAL_BACKOFF !== 'false';
    },
    itemExecution: {
      get maxAttempts() {
        return parseInt(env.MCP_ITEM_MAX_ATTEMPTS || '2', 10);
      }
    },
    replanning: {
      get maxAttempts() {
        return parseInt(env.MCP_REPLANNING_MAX_ATTEMPTS || '3', 10);
      }
    },
    toolPlanning: {
      get maxAttempts() {
        return parseInt(env.MCP_TOOL_PLANNING_MAX_ATTEMPTS || '3', 10);
      },
      get retryDelay() {
        return parseInt(env.MCP_TOOL_PLANNING_RETRY_DELAY || '2000', 10);
      }
    },
    circuitBreaker: {
      get threshold() {
        return parseInt(env.MCP_CIRCUIT_BREAKER_THRESHOLD || '3', 10);
      },
      get resetTimeout() {
        return parseInt(env.MCP_CIRCUIT_BREAKER_RESET_MS || '60000', 10);
      }
    }
  },
  providers: {
    mcp: {
      enabled: true,
      type: 'direct',
      servers: {
        // Servers are now managed by MCP_REGISTRY
        // This section is deprecated and will be removed
        // See /config/mcp-registry.js for server configurations
      },
      llm: {
        provider: 'atlas',
        apiEndpoint: 'http://localhost:4000/v1/chat/completions',
        get model() {
          return env.MCP_LLM_MODEL || 'ext-mistral-codestral-2405';  // Codestral 2405 for LLM Tool Validator (TEMP due to rate limit)
        },
        get temperature() {
          return parseFloat(env.MCP_LLM_TEMPERATURE || '0.1');  // Low temperature for consistent validation
        }
      },
      useFor: [
        'file_operations',
        'browser_automation',
        'screenshots',
        'web_scraping',
        'terminal_commands',
        'macos_automation',
        'github_api',
        'git_operations',
        'memory_storage'
      ]
    }
  },
  routing: {
    mcpKeywords: [
      'створи файл', 'create file', 'save file',
      'файл', 'file', 'directory', 'папка',
      'відкрий браузер', 'open browser',
      'скріншот', 'screenshot',
      'web scraping', 'scrape',
      'виконай команду', 'run command', 'terminal',
      'npm', 'brew', 'git clone', 'install',
      'відкрий програму', 'open app', 'launch',
      'applescript', 'finder', 'safari', 'chrome',
      'github issue', 'pull request', 'pr',
      'create issue', 'list issues',
      'git commit', 'git push', 'git pull',
      'branch', 'merge', 'checkout',
      'запамʼятай', 'remember', 'save context',
      'що ти пам\'ятаєш', 'recall'
    ]
  }
};

// DEPRECATED: Use MCP_REGISTRY from mcp-registry.js instead
// This export is kept for backward compatibility only
import { MCP_REGISTRY } from './mcp-registry.js';

export const MCP_SERVERS = MCP_REGISTRY.getAllServers();

// Update AI_BACKEND_CONFIG to use registry
AI_BACKEND_CONFIG.providers.mcp.servers = MCP_REGISTRY.getAllServers();

export function getModelForStage(stageName) {
  const modelType = AI_MODEL_CONFIG.stageModels[stageName] || AI_MODEL_CONFIG.defaultModel;
  const modelConfig = AI_MODEL_CONFIG.models[modelType];
  if (!modelConfig) {
    throw new Error(`Model configuration not found for type: ${modelType}`);
  }
  return {
    endpoint: AI_MODEL_CONFIG.apiEndpoint,
    ...modelConfig
  };
}

export function getModelByType(type) {
  return AI_MODEL_CONFIG.models[type];
}
