/**
 * ATLAS Configuration Aggregator
 * Єдина точка імпорту для orchestrator, web та сервісів.
 */

import {
  SYSTEM_INFO,
  USER_CONFIG,
  CHAT_CONFIG,
  SECURITY_CONFIG,
  ENV_CONFIG,
  buildEnvConfig,
  generateShortStatus
} from './system-config.js';

import {
  AGENTS,
  getAgentConfig,
  getAgentsByRole,
  getAgentsByPriority,
  hasAgent,
  validateAgentConfig
} from './agents-config.js';

import {
  WORKFLOW_STAGES,
  WORKFLOW_CONDITIONS,
  WORKFLOW_CONFIG,
  getWorkflowStage,
  getStageById,
  getNextStage,
  checkStageCondition,
  validateStage,
  getStagesForAgent
} from './workflow-config.js';

import {
  NETWORK_CONFIG,
  API_ENDPOINTS,
  TTS_CONFIG,
  VOICE_CONFIG,
  getApiUrl,
  getServiceConfig,
  checkServiceHealth,
  generateClientConfig
} from './api-config.js';

import {
  VISION_CONFIG,
  AI_MODEL_CONFIG,
  MCP_MODEL_CONFIG,
  AI_BACKEND_CONFIG,
  MCP_SERVERS,
  getModelForStage,
  getModelByType
} from './models-config.js';

function isServiceEnabled(serviceName) {
  const service = NETWORK_CONFIG.services?.[serviceName];
  return Boolean(service && service.host && service.port);
}

function getWebSocketUrl(service) {
  const config = NETWORK_CONFIG.services?.[service];
  if (!config || !config.wsEndpoint) {
    throw new Error(`WebSocket не налаштовано для сервісу: ${service}`);
  }
  const protocol = config.protocol === 'https' ? 'wss' : 'ws';
  return `${protocol}://${config.host}:${config.port}${config.wsEndpoint}`;
}

function validateConfig() {
  const errors = [];

  const requiredServices = ['orchestrator', 'frontend', 'tts'];
  for (const name of requiredServices) {
    if (!NETWORK_CONFIG.services?.[name]) {
      errors.push(`Відсутня конфігурація для сервісу: ${name}`);
    }
  }

  const requiredAgents = ['atlas', 'tetyana', 'grisha'];
  for (const agent of requiredAgents) {
    if (!AGENTS[agent]) {
      errors.push(`Відсутня конфігурація для агента: ${agent}`);
    }
  }

  if (WORKFLOW_STAGES.length === 0) {
    errors.push('Не знайдено жодного етапу workflow');
  }

  if (errors.length > 0) {
    throw new Error(`Помилки конфігурації:\n${errors.join('\n')}`);
  }

  return true;
}

const AtlasConfig = {
  SYSTEM_INFO,
  USER_CONFIG,
  CHAT_CONFIG,
  SECURITY_CONFIG,
  ENV_CONFIG,
  AI_MODEL_CONFIG,
  MCP_MODEL_CONFIG,
  VISION_CONFIG,
  AI_BACKEND_CONFIG,
  MCP_SERVERS,
  AGENTS,
  WORKFLOW_STAGES,
  WORKFLOW_CONDITIONS,
  WORKFLOW_CONFIG,
  NETWORK_CONFIG,
  API_ENDPOINTS,
  TTS_CONFIG,
  VOICE_CONFIG,
  getAgentConfig,
  getAgentsByRole,
  getAgentsByPriority,
  hasAgent,
  validateAgentConfig,
  getWorkflowStage,
  getStageById,
  getNextStage,
  checkStageCondition,
  validateStage,
  getStagesForAgent,
  getApiUrl,
  getServiceConfig,
  checkServiceHealth,
  generateClientConfig,
  getModelForStage,
  getModelByType,
  generateShortStatus,
  isServiceEnabled,
  getWebSocketUrl,
  validateConfig,
  buildEnvConfig
};

export {
  SYSTEM_INFO,
  USER_CONFIG,
  CHAT_CONFIG,
  SECURITY_CONFIG,
  ENV_CONFIG,
  buildEnvConfig,
  generateShortStatus,
  AGENTS,
  getAgentConfig,
  getAgentsByRole,
  getAgentsByPriority,
  hasAgent,
  validateAgentConfig,
  WORKFLOW_STAGES,
  WORKFLOW_CONDITIONS,
  WORKFLOW_CONFIG,
  getWorkflowStage,
  getStageById,
  getNextStage,
  checkStageCondition,
  validateStage,
  getStagesForAgent,
  NETWORK_CONFIG,
  API_ENDPOINTS,
  TTS_CONFIG,
  VOICE_CONFIG,
  getApiUrl,
  getServiceConfig,
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
