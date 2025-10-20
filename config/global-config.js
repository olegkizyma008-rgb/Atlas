/**
 * ATLAS GLOBAL CONFIGURATION SYSTEM
 *
 * Централізована система управління конфігураціями для всього ATLAS workflow
 * Всі сервіси та компоненти мають використовувати цю конфігурацію
 *
 * Версія: 4.0.0
 * Автор: Atlas System
 * Дата створення: 2025-10-09 (Рефакторинг)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Імпорт модульних конфігурацій
import { AGENTS, getAgentConfig, getAgentsByRole, getAgentsByPriority, hasAgent, validateAgentConfig } from './agents-config.js';
import { WORKFLOW_STAGES, WORKFLOW_CONDITIONS, WORKFLOW_CONFIG, getWorkflowStage, getNextStage, checkStageCondition, validateStage, getStagesForAgent } from './workflow-config.js';
import { NETWORK_CONFIG, API_ENDPOINTS, TTS_CONFIG, VOICE_CONFIG, getApiUrl, getServiceConfig, checkServiceHealth, generateClientConfig } from './api-config.js';
import promptRegistry from '../prompts/prompt-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// === СИСТЕМНІ НАЛАШТУВАННЯ ===
export const SYSTEM_INFO = {
  version: '4.0.0',
  name: 'ATLAS WORKFLOW SYSTEM',
  description: 'Багатоагентна система з голосовим управлінням та TTS',
  build: process.env.BUILD_NUMBER || 'dev',
  environment: process.env.NODE_ENV || 'development',
  configVersion: '2025-10-10'
};

// === КОРИСТУВАЧ ===
export const USER_CONFIG = {
  name: 'Олег Миколайович',
  title: 'Творець',
  role: 'creator_admin',
  formal_address: 'Олег Миколайович',
  casual_address: 'творче',
  description: 'Творець системи ATLAS, божественний наставник',
  permissions: ['all'],
  preferences: {
      primary,
      fallback: fallback || null,
      useFallback,
      timeout: parseInt(process.env.LLM_API_TIMEOUT || '60000', 10)
    };
  },

  // Моделі для різних типів завдань
  models: {
    // Класифікація та швидкі рішення
    // T=0.05 для максимальної точності (бінарна класифікація)
    // ministral-3b: 45 req/min (найбільш доступна)
    classification: {
      get model() { return process.env.AI_MODEL_CLASSIFICATION || 'atlas-ministral-3b'; },
      get temperature() { return parseFloat(process.env.AI_TEMP_CLASSIFICATION || '0.05'); },
      max_tokens: 50,
      description: 'Бінарна класифікація - максимальна точність'
    },

    // Чат та розмова
    // T=0.7 для природності та креативності
    // Mistral Medium - відмінно для природних розмов
    chat: {
      get model() { return process.env.AI_MODEL_CHAT || 'atlas-mistral-medium-2505'; },
      get temperature() { return parseFloat(process.env.AI_TEMP_CHAT || '0.7'); },
      max_tokens: 500,
      description: 'Природні розмови - креативність (Mistral Medium)'
    },

    // Аналіз та контекст
    // T=0.2 для точного аналізу з мінімальною варіативністю
    // gpt-4o-mini: 35 req/min (балансує якість та швидкість)
    analysis: {
      get model() { return process.env.AI_MODEL_ANALYSIS || 'atlas-gpt-4o-mini'; },
      get temperature() { return parseFloat(process.env.AI_TEMP_ANALYSIS || '0.2'); },
      max_tokens: 1000,
      description: 'Аналіз та контекст - точність'
    },

    // TTS оптимізація
    // T=0.15 для стабільного результату (важливо щоб озвучка звучала однаково)
    // ministral-3b: 45 req/min
    tts_optimization: {
      get model() { return process.env.AI_MODEL_TTS_OPT || 'atlas-ministral-3b'; },
      get temperature() { return parseFloat(process.env.AI_TEMP_TTS_OPT || '0.15'); },
      max_tokens: 300,
      description: 'Оптимізація для TTS - стабільність'
    }
  },

  // Відповідність стадій до моделей
  stageModels: {
    'stage0_mode_selection': 'classification',
    'stage0_chat': 'chat',
    'stage-2_post_chat_analysis': 'analysis',
    'stage-3_tts_optimization': 'tts_optimization'
  },

  // Fallback модель якщо не знайдено специфічну
  defaultModel: 'classification'
};

// === MCP MODELS CONFIGURATION (NEW 14.10.2025) ===
// Окрема конфігурація моделей для кожного MCP стейджу з ENV підтримкою
// UPDATED 20.10.2025: Повна централізація всіх моделей в одному місці
// Температури:
//   - 0.05: Бінарна класифікація (максимальна точність)
//   - 0.1: JSON output (мінімальна варіативність)
//   - 0.15-0.2: Аналіз та верифікація (точність + креатив)
//   - 0.3: Планування (баланс точності та креативу)
//   - 0.5: Резюме користувачу (природність)
//   - 0.7: Чат (креативність)
// Детально: docs/MCP_MODEL_SELECTION_GUIDE.md
// v5.0: Підтримка fallback API endpoint
export const MCP_MODEL_CONFIG = {
  // API endpoint (підтримує fallback)
  get apiEndpoint() {
    const primary = process.env.LLM_API_ENDPOINT || 'http://localhost:4000/v1/chat/completions';
    const fallback = process.env.LLM_API_FALLBACK_ENDPOINT;
    const useFallback = process.env.LLM_API_USE_FALLBACK === 'true';

    return {
      primary,
      fallback: fallback || null,
      useFallback,
      timeout: parseInt(process.env.LLM_API_TIMEOUT || '60000', 10)
    };
  },

  // Моделі для кожного MCP stage (читаємо з ENV для гнучкості)
  stages: {
    // Stage 0: Mode Selection (task vs chat)
    // T=0.05 для максимальної точності (бінарна класифікація)
    // Microsoft Phi-4 Mini - швидка та точна для класифікації
    mode_selection: {
      get model() { return process.env.MCP_MODEL_MODE_SELECTION || 'atlas-phi-4-mini-instruct'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_MODE_SELECTION || '0.05'); },
      max_tokens: 50,
      description: 'Бінарна класифікація task vs chat (Microsoft Phi-4 Mini)'
    },

    // Stage 0.5: Backend Selection (deprecated - now MCP-only)
    backend_selection: {
      get model() { return process.env.MCP_MODEL_BACKEND_SELECTION || 'atlas-ministral-3b'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_BACKEND_SELECTION || '0.05'); },
      max_tokens: 50,
      description: 'Keyword routing - точність (deprecated)'
    },

    // Stage 1-MCP: Atlas TODO Planning
    // T=0.3 для балансу планування (точність + креатив)
    // UPDATED 20.10.2025: Mistral Large через rate limit на GPT-4o
    todo_planning: {
      get model() { return process.env.MCP_MODEL_TODO_PLANNING || 'atlas-mistral-large-2411'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_TODO_PLANNING || '0.3'); },
      max_tokens: 4000,
      description: 'Atlas TODO Planning (GPT-4o - найкраще reasoning)'
    },

    // Stage 2.1-MCP: Tetyana Plan Tools
    // T=0.1 для ЧИСТОГО JSON output без варіацій
    // UPDATED 20.10.2025: GPT-4o-mini для стабільного JSON
    plan_tools: {
      get model() { return process.env.MCP_MODEL_PLAN_TOOLS || 'atlas-gpt-4o-mini'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_PLAN_TOOLS || '0.1'); },
      max_tokens: 2500,
      description: 'Tetyana Plan Tools - чистий JSON (GPT-4o-mini)'
    },

    // Stage 2.3-MCP: Grisha Verify Item
    // T=0.15 для точної верифікації
    // Mistral Small - швидка та точна для верифікації
    verify_item: {
      get model() { return process.env.MCP_MODEL_VERIFY_ITEM || 'atlas-mistral-small-2503'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_VERIFY_ITEM || '0.15'); },
      max_tokens: 800,
      description: 'Grisha Verify Item - швидка верифікація (Mistral Small)'
    },

    // Stage 3-MCP: Atlas Adjust TODO
    // T=0.2 для точного аналізу та корекції
    // UPDATED 20.10.2025: Mistral Medium замість GPT-4o-mini (стабільний аналіз)
    adjust_todo: {
      get model() { return process.env.MCP_MODEL_ADJUST_TODO || 'atlas-mistral-medium-2505'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_ADJUST_TODO || '0.2'); },
      max_tokens: 1500,
      description: 'Atlas Adjust TODO - точна корекція (Mistral Medium)'
    },

    // Stage 3.5-MCP: Atlas Replan TODO (NEW 20.10.2025)
    // T=0.3 для креативного перепланування з аналізом помилок
    // UPDATED 20.10.2025: Mistral Large замість GPT-4o-mini (reasoning без лімітів)
    replan_todo: {
      get model() { return process.env.MCP_MODEL_REPLAN_TODO || 'atlas-mistral-large-2411'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_REPLAN_TODO || '0.3'); },
      max_tokens: 3000,
      description: 'Atlas Replan TODO - глибокий аналіз (Mistral Large)'
    },

    // Stage 8-MCP: Final Summary
    // T=0.5 для природного резюме користувачу
    final_summary: {
      get model() { return process.env.MCP_MODEL_FINAL_SUMMARY || 'atlas-ministral-3b'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_FINAL_SUMMARY || '0.5'); },
      max_tokens: 600,
      description: 'Final Summary для користувача - природність'
    },

    // Vision Analysis (Grisha) (NEW 20.10.2025)
    // T=0.2 для точного аналізу скріншотів
    // UPDATED 20.10.2025: llama-3.2-11b-vision через ліміти на 90b
    vision_analysis: {
      get model() { return process.env.MCP_MODEL_VISION || 'atlas-llama-3.2-11b-vision-instruct'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_VISION || '0.2'); },
      max_tokens: 1000,
      description: 'Vision Analysis - аналіз скріншотів (GPT-4o vision)'
    },

    // Vision Fallback - Ollama local (FREE but slow)
    vision_fallback: {
      get model() { return process.env.MCP_MODEL_VISION_FALLBACK || 'llama3.2-vision'; },
      endpoint: 'http://localhost:11434/api/generate',
      description: 'Ollama local vision - безкоштовний fallback (повільний)'
    },

    // Server Selection (MCP backend routing) (NEW 20.10.2025)
    // T=0.05 для точної класифікації серверів
    server_selection: {
      get model() { return process.env.MCP_MODEL_SERVER_SELECTION || 'atlas-ministral-3b'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_SERVER_SELECTION || '0.05'); },
      max_tokens: 50,
      description: 'MCP Server Selection - швидка класифікація серверів'
    },

    // State Analysis (AI state analyzer) (NEW 20.10.2025)
    // T=0.1 для точного аналізу станів агентів
    state_analysis: {
      get model() { return process.env.MCP_MODEL_STATE_ANALYSIS || 'atlas-ministral-3b'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_STATE_ANALYSIS || '0.1'); },
      max_tokens: 100,
      description: 'State Analysis - аналіз станів агентів'
    },

    // Screenshot Adjustment (Tetyana screenshot analysis) (NEW 20.10.2025)
    // T=0.2 для точного аналізу скріншотів та корекції
    // Microsoft Phi-4 Multimodal - швидка vision модель
    screenshot_adjustment: {
      get model() { return process.env.MCP_MODEL_SCREENSHOT_ADJ || 'atlas-phi-4-multimodal-instruct'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_SCREENSHOT_ADJ || '0.2'); },
      max_tokens: 2000,
      description: 'Screenshot Adjustment - аналіз скріншотів (Phi-4 Multimodal)'
    },

    // TTS Optimization (NEW 20.10.2025)
    // T=0.3 для стабільної оптимізації тексту для озвучки
    tts_optimization: {
      get model() { return process.env.MCP_MODEL_TTS_OPT || 'atlas-ministral-3b'; },
      get temperature() { return parseFloat(process.env.MCP_TEMP_TTS_OPT || '0.3'); },
      max_tokens: 200,
      description: 'TTS Optimization - оптимізація тексту для озвучки'
    }
  },

  // Helper: Отримати конфігурацію для stage
  getStageConfig(stageName) {
    return this.stages[stageName] || this.stages.plan_tools; // Fallback на mid-tier model
  }
};

// === AI BACKEND CONFIGURATION (NEW 13.10.2025) ===
// MCP Dynamic TODO System Configuration
// SIMPLIFIED: MCP-only, no Goose fallback
export const AI_BACKEND_CONFIG = {
  // Always MCP mode
  mode: 'mcp',

  // No fallback - pure MCP
  primary: 'mcp',
  fallback: null,
  disableFallback: true,

  // Retry налаштування для MCP
  // UPDATED 19.10.2025: item execution = 1 спроба, replanning = 3 спроби (кастомізується)
  retry: {
    get maxAttempts() { return parseInt(process.env.MCP_MAX_ATTEMPTS || '3', 10); },
    get timeoutMs() { return parseInt(process.env.MCP_TIMEOUT_MS || '30000', 10); },
    get exponentialBackoff() { return process.env.MCP_EXPONENTIAL_BACKOFF !== 'false'; },
    
    // Окремі налаштування для різних типів операцій
    itemExecution: {
      // UPDATED 20.10.2025: 2 спроби на item (дає можливість для retry після adjustment/replan)
      get maxAttempts() { return parseInt(process.env.MCP_ITEM_MAX_ATTEMPTS || '2', 10); }
    },
    
    // Налаштування для replanning (Atlas adjust TODO)
    // 3 спроби перепланування перед skip
    replanning: {
      get maxAttempts() { return parseInt(process.env.MCP_REPLANNING_MAX_ATTEMPTS || '3', 10); }
    },
    
    // Налаштування для tool planning (LLM retry)
    toolPlanning: {
      get maxAttempts() { return parseInt(process.env.MCP_TOOL_PLANNING_MAX_ATTEMPTS || '3', 10); },
 */

export { default } from './atlas-config.js';
export * from './atlas-config.js';
  checkServiceHealth,
  generateClientConfig,
  VISION_CONFIG,
  AI_MODEL_CONFIG,
  MCP_MODEL_CONFIG,
  AI_BACKEND_CONFIG,
  MCP_SERVERS,
  getModelForStage,
  getModelByType,
  isServiceEnabled,
  getWebSocketUrl,
  validateConfig
};

export default AtlasConfig;
