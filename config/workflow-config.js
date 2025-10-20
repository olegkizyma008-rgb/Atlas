/**
 * ATLAS MCP WORKFLOW CONFIGURATION
 * Активні MCP етапи та базові утиліти для orchestrator/web клієнтів.
 */

/**
 * Перелік робочих етапів у порядку виконання.
 * Поле `stage` зберігаємо для сумісності з існуючим кодом.
 */
export const WORKFLOW_STAGES = [
  {
    stage: 0,
    id: 'MODE_SELECTION',
    name: 'mode_selection',
    agent: 'system',
    description: 'Класифікація запиту як чат або MCP завдання',
    required: true,
    maxRetries: 0,
    timeout: 60000
  },
  {
    stage: 1,
    id: 'ATLAS_TODO_PLANNING',
    name: 'atlas_todo_planning',
    agent: 'atlas',
    description: 'Створення структурованого TODO з описом пунктів',
    required: true,
    maxRetries: 1,
    timeout: 45000
  },
  {
    stage: 2,
    id: 'SERVER_SELECTION',
    name: 'server_selection',
    agent: 'system',
    description: 'Підбір релевантних MCP серверів для кожного пункту',
    required: true,
    maxRetries: 0,
    timeout: 30000
  },
  {
    stage: 3,
    id: 'TETYANA_PLAN_TOOLS',
    name: 'tetyana_plan_tools',
    agent: 'tetyana',
    description: 'Планування послідовності MCP інструментів',
    required: true,
    maxRetries: 1,
    timeout: 60000
  },
  {
    stage: 4,
    id: 'TETYANA_EXECUTE_TOOLS',
    name: 'tetyana_execute_tools',
    agent: 'tetyana',
    description: 'Виконання запланованих MCP інструментів',
    required: true,
    maxRetries: 2,
    timeout: 180000
  },
  {
    stage: 5,
    id: 'GRISHA_VERIFY_ITEM',
    name: 'grisha_verify_item',
    agent: 'grisha',
    description: 'Верифікація результатів виконання пунктів TODO',
    required: true,
    maxRetries: 1,
    timeout: 60000
  },
  {
    stage: 6,
    id: 'ATLAS_ADJUST_TODO',
    name: 'atlas_adjust_todo',
    agent: 'atlas',
    description: 'Корекція TODO на основі діагностики та фідбеку',
    required: false,
    maxRetries: 1,
    timeout: 30000
  },
  {
    stage: 7,
    id: 'ATLAS_REPLAN_TODO',
    name: 'atlas_replan_todo',
    agent: 'atlas',
    description: 'Глибокий переплан після аналізу невдач',
    required: false,
    maxRetries: 1,
    timeout: 60000
  },
  {
    stage: 8,
    id: 'MCP_FINAL_SUMMARY',
    name: 'mcp_final_summary',
    agent: 'system',
    description: 'Фінальне резюме та завершення workflow',
    required: true,
    maxRetries: 0,
    timeout: 45000
  }
];

/**
 * MCP процесори керують умовами самостійно. Залишаємо порожній обʼєкт для API.
 */
export const WORKFLOW_CONDITIONS = {};

export const WORKFLOW_CONFIG = {
  general: {
    maxRetries: 3,
    defaultTimeout: 60000,
    enableLogging: true,
    enableMetrics: true,
    autoAdvance: true
  },
  retry: {
    maxGlobalRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000
  },
  timeouts: {
    stageTimeout: 300000,
    workflowTimeout: 1800000,
    agentTimeout: 60000
  },
  modes: {
    chat: {
      enableTTS: true,
      enableOptimization: false,
      skipStages: ['MCP_FINAL_SUMMARY'],
      maxChatRounds: 10
    },
    task: {
      enableTTS: true,
      enableOptimization: true,
      requireVerification: true,
      enableRetries: true
    },
    debug: {
      enableTTS: false,
      enableLogging: true,
      enableMetrics: true,
      pauseBetweenStages: true
    }
  }
};

export function getWorkflowStage(stageNumber) {
  return WORKFLOW_STAGES.find(stage => stage.stage === stageNumber);
}

export function getStageById(stageId) {
  return WORKFLOW_STAGES.find(stage => stage.id === stageId);
}

export function getNextStage(currentStage) {
  const index = WORKFLOW_STAGES.findIndex(stage => stage.stage === currentStage);
  if (index === -1) {
    return null;
  }
  return WORKFLOW_STAGES[index + 1] || null;
}

export function checkStageCondition() {
  return true;
}

export function validateStage(stageData) {
  const requiredFields = ['stage', 'id', 'agent', 'name', 'description'];
  return requiredFields.every(field => stageData[field] !== undefined);
}

export function getStagesForAgent(agentName) {
  return WORKFLOW_STAGES.filter(stage => stage.agent === agentName);
}

export default {
  WORKFLOW_STAGES,
  WORKFLOW_CONDITIONS,
  WORKFLOW_CONFIG,
  getWorkflowStage,
  getStageById,
  getNextStage,
  checkStageCondition,
  validateStage,
  getStagesForAgent
};
