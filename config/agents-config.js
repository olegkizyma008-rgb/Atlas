/**
 * ATLAS AGENTS CONFIGURATION
 * Конфігурація всіх агентів системи ATLAS
 *
 * Версія: 4.0.0
 * Автор: Atlas System
 * Дата створення: 2025-10-09
 */

// === АГЕНТИ ===
export const AGENTS = {
  atlas: {
    role: 'strategist_coordinator',
    name: 'Атлас',
    signature: '[ATLAS]',
    color: '#00ff00',
    voice: 'mykyta',
    priority: 1,
    description: 'Стратег-координатор, завжди починає першим',
    enableTools: false,
    model: 'github-copilot',
    maxRetries: 2,
    timeout: 30000
  },
  tetyana: {
    role: 'executor',
    name: 'Тетяна',
    signature: '[ТЕТЯНА]',
    color: '#00ffff',
    voice: 'tetiana',
    priority: 2,
    description: 'Основний виконавець завдань',
    enableTools: true,
    model: 'github-copilot',
    maxRetries: 3,
    timeout: 60000
  },
  grisha: {
    role: 'verifier_finalizer',
    name: 'Гриша',
    signature: '[ГРИША]',
    color: '#ffff00',
    voice: 'oleksa',  // Змінено з dmytro на oleksa (працюючий голос)
    priority: 3,
    description: 'Верифікатор результатів та фінальний контроль',
    enableTools: true,
    model: 'github-copilot',
    maxRetries: 2,
    timeout: 45000,
    verification: {
      methods: ['visual', 'mcp'],
      defaultMethod: 'visual',
      routing: {
        model: 'atlas-ministral-3b',
        temperature: 0.1,
        description: 'LLM-based вибір методу верифікації (visual vs MCP)'
      },
      visual: {
        enabled: true,
        visionModel: 'atlas-llama-3.2-90b-vision-instruct',
        fallbackModel: 'atlas-phi-3.5-vision-instruct',
        minConfidence: 70,
        captureDelay: 2000,
        description: 'Візуальна верифікація через скріншоти та Vision AI'
      },
      mcp: {
        enabled: true,
        usesTetyanaProcessor: true,
        supportedServers: ['filesystem', 'shell', 'memory'],
        description: 'MCP верифікація через Tetyana execution processor'
      },
      fallback: {
        visualToMcp: true,
        mcpToVisual: false,
        description: 'Автоматичний fallback при невдачі основного методу'
      }
    }
  },
  system: {
    role: 'system_completion',
    name: 'System',
    signature: '[SYSTEM]',
    color: '#888888',
    voice: 'mykyta',
    priority: 4,
    description: 'Системне завершення workflow',
    enableTools: false,
    model: null,
    maxRetries: 1,
    timeout: 10000
  },
  'tts-optimizer': {
    role: 'tts_optimization',
    name: 'стаже-3',
    signature: '[TTS-OPT]',
    color: '#ff6600',
    voice: null,
    priority: -3,
    description: 'Оптимізатор тексту для TTS озвучки',
    enableTools: false,
    model: 'fallback-llm',
    maxRetries: 2,
    timeout: 15000
  }
};

// === УТИЛІТИ ДЛЯ РОБОТИ З АГЕНТАМИ ===

/**
 * Отримання конфігурації агента за іменем
 */
export function getAgentConfig(agentName) {
  const agent = AGENTS[agentName];
  if (!agent) {
    throw new Error(`Agent "${agentName}" not found in configuration`);
  }
  return { ...agent };
}

/**
 * Отримання всіх агентів за роллю
 */
export function getAgentsByRole(role) {
  return Object.entries(AGENTS)
    .filter(([_, agent]) => agent.role === role)
    .map(([name, agent]) => ({ name, ...agent }));
}

/**
 * Отримання агентів за пріоритетом
 */
export function getAgentsByPriority() {
  return Object.entries(AGENTS)
    .sort(([_, a], [__, b]) => a.priority - b.priority)
    .map(([name, agent]) => ({ name, ...agent }));
}

/**
 * Перевірка існування агента
 */
export function hasAgent(agentName) {
  return agentName in AGENTS;
}

/**
 * Валідація конфігурації агента
 */
export function validateAgentConfig(agentName) {
  const agent = AGENTS[agentName];
  if (!agent) return false;

  const requiredFields = ['role', 'name', 'signature', 'priority'];
  return requiredFields.every(field => agent[field] !== undefined);
}

// Експорт за замовчуванням
export default AGENTS;
