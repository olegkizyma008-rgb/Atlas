/**
 * CORE CONFIGURATION - Proxy до централізованих конфігів
 * Цей файл тепер просто реекспортує з /config/
 *
 * 📅 Оновлено: 2025-10-21 (Рефакторинг)
 */

// Реекспорт з централізованих конфігів
// Відносний шлях: /web/static/js/core/ -> /config/
export {
  AGENTS,
  CHAT_CONFIG,
  API_ENDPOINTS,
  TTS_CONFIG,
  VOICE_CONFIG,
  WORKFLOW_STAGES,
  getAgentConfig as getAgentByName,
  getWorkflowStage,
  getApiUrl,
  generateShortStatus
} from '../../../../config/atlas-config.js';

export {
  AUDIO_CONFIG,
  WEB_UI_CONFIG,
  createAudioConstraints
} from '../../../../config/web-config.js';

// Backward compatibility - старий експорт для сумісності
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
