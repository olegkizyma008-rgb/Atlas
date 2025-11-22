# 🚀 План Дій: Рефакторинг Архітектури Воркфлоу

**Дата**: 22 листопада 2025  
**Статус**: 📋 ГОТОВО ДО РЕАЛІЗАЦІЇ  
**Тривалість**: 4-6 тижнів  
**Ризик**: МІНІМАЛЬНИЙ ✅

---

## 📋 ФАЗА 1: КОНСОЛІДАЦІЯ (Тиждень 1)

### Завдання 1.1: Видалити невикористовувані компоненти

**Файли для видалення:**
```bash
# 1. State Machine (логіка дублюється в executor-v3.js)
rm orchestrator/workflow/state-machine.js

# 2. Optimized Executor (не використовується)
rm orchestrator/workflow/optimized-executor.js

# 3. Workflow Modes (не використовуються)
rm orchestrator/workflow/modes/hybrid-mode-executor.js
rm orchestrator/workflow/modes/optimized-mode-executor.js
rm orchestrator/workflow/modes/standard-mode-executor.js
rm orchestrator/workflow/modes/mode-executor-factory.js

# 4. Optimized Workflow Manager (не інтегрований)
rm orchestrator/ai/optimized-workflow-manager.js
```

**Перевірка перед видаленням:**
```bash
# Переконатися, що немає посилань
grep -r "state-machine.js" orchestrator/ --include="*.js"
grep -r "optimized-executor" orchestrator/ --include="*.js"
grep -r "mode-executor-factory" orchestrator/ --include="*.js"
grep -r "OptimizedWorkflowManager" orchestrator/ --include="*.js"
```

**Результат:** -500 рядків мертвого коду

---

### Завдання 1.2: Видалити DI реєстрації невикористовуваних компонентів

**Файл:** `orchestrator/core/service-registry.js`

**Видалити:**
```javascript
// ❌ Видалити ці реєстрації
container.singleton('workflowStateMachine', ...);
container.singleton('hybridWorkflowExecutor', ...);
container.singleton('optimizedWorkflowManager', ...);
container.singleton('modeExecutorFactory', ...);
container.singleton('standardModeExecutor', ...);
container.singleton('optimizedModeExecutor', ...);
container.singleton('hybridModeExecutor', ...);
```

**Результат:** -100 рядків конфігурації

---

### Завдання 1.3: Централізувати логування

**Створити файл:** `orchestrator/workflow/utils/logging-middleware.js`

```javascript
/**
 * Logging Middleware - Консолідація логування операцій
 */

export class LoggingMiddleware {
  constructor(logger) {
    this.logger = logger;
  }

  // Workflow events
  workflowStart(sessionId, message) {
    this.logger.workflow('start', 'system', message, { sessionId });
  }

  workflowStage(stage, sessionId, message, context = {}) {
    this.logger.workflow('stage', 'system', `Stage ${stage}: ${message}`, { 
      sessionId, 
      ...context 
    });
  }

  workflowError(sessionId, error, context = {}) {
    this.logger.error('workflow', `Workflow error: ${error.message}`, { 
      sessionId, 
      error: error.stack,
      ...context 
    });
  }

  workflowComplete(sessionId, result, context = {}) {
    this.logger.workflow('complete', 'system', 'Workflow completed', { 
      sessionId, 
      result,
      ...context 
    });
  }

  // Tool execution
  toolStart(sessionId, toolName, params = {}) {
    this.logger.system('executor', `[TOOL-START] ${toolName}`, { 
      sessionId, 
      params 
    });
  }

  toolSuccess(sessionId, toolName, result = {}) {
    this.logger.system('executor', `[TOOL-SUCCESS] ${toolName}`, { 
      sessionId, 
      result 
    });
  }

  toolError(sessionId, toolName, error) {
    this.logger.error('executor', `[TOOL-ERROR] ${toolName}: ${error.message}`, { 
      sessionId, 
      error: error.stack 
    });
  }

  // Verification
  verificationStart(sessionId, itemId) {
    this.logger.system('executor', `[VERIFY-START] Item ${itemId}`, { sessionId });
  }

  verificationResult(sessionId, itemId, passed, reason = '') {
    this.logger.system('executor', 
      `[VERIFY-${passed ? 'PASS' : 'FAIL'}] Item ${itemId}: ${reason}`, 
      { sessionId }
    );
  }
}
```

**Інтеграція в executor-v3.js:**
```javascript
import { LoggingMiddleware } from './utils/logging-middleware.js';

export async function executeWorkflow(workflowContext) {
  const loggingMiddleware = new LoggingMiddleware(logger);
  
  loggingMiddleware.workflowStart(session.id, `Starting workflow: "${userMessage}"`);
  
  try {
    // ... workflow logic
    loggingMiddleware.workflowStage(0, session.id, 'Mode Selection', { mode });
    // ... more stages
    loggingMiddleware.workflowComplete(session.id, results);
  } catch (error) {
    loggingMiddleware.workflowError(session.id, error);
  }
}
```

**Результат:** -649 операцій дублювання логування

---

### Завдання 1.4: Видалити закоментований код

**Файл:** `orchestrator/workflow/executor-v3.js`

**Видалити рядки 915-934:**
```javascript
// ❌ Видалити цей блок
// ===============================================
// NEXUS CONTEXT-AWARE ACTIVATION (DISABLED 02.11.2025)
// ...
/*
const nexusActivator = await container.resolve('nexusContextActivator');
// ...
*/
```

**Результат:** -20 рядків

---

## 📋 ФАЗА 2: РЕФАКТОРИНГ (Тиждень 2-3)

### Завдання 2.1: Розділити MCPTodoManager на модулі

**Поточна структура (3944 рядків):**
```
MCPTodoManager
├── Planning (1000 рядків)
├── Execution (1500 рядків)
├── Verification (800 рядків)
└── Utils (644 рядків)
```

**Нова структура:**
```
orchestrator/workflow/core/
├── todo-planner.js (1000 рядків)
├── todo-executor.js (1500 рядків)
├── todo-verifier.js (800 рядків)
└── mcp-todo-manager.js (200 рядків - координатор)
```

**Файл 1: `todo-planner.js`**
```javascript
/**
 * TODO Planner - Планування TODO списків
 */
export class TodoPlanner {
  constructor(options) {
    this.llmClient = options.llmClient;
    this.logger = options.logger;
    this.localizationService = options.localizationService;
  }

  async plan(userMessage, options = {}) {
    // Логіка планування з MCPTodoManager
    // ~1000 рядків
  }

  async analyzComplexity(message) { ... }
  async generateItems(message, complexity) { ... }
  async enhanceCriteria(items) { ... }
}
```

**Файл 2: `todo-executor.js`**
```javascript
/**
 * TODO Executor - Виконання TODO списків
 */
export class TodoExecutor {
  constructor(options) {
    this.mcpManager = options.mcpManager;
    this.logger = options.logger;
    this.ttsSyncManager = options.ttsSyncManager;
  }

  async execute(todo, session) {
    // Логіка виконання з MCPTodoManager
    // ~1500 рядків
  }

  async executeItem(item, todo, session) { ... }
  async resolveDependencies(item, todo) { ... }
  async handleItemFailure(item, todo, error) { ... }
}
```

**Файл 3: `todo-verifier.js`**
```javascript
/**
 * TODO Verifier - Верифікація виконання TODO
 */
export class TodoVerifier {
  constructor(options) {
    this.visionAnalysis = options.visionAnalysis;
    this.logger = options.logger;
  }

  async verify(item, todo, session) {
    // Логіка верифікації з MCPTodoManager
    // ~800 рядків
  }

  async verifyWithVisual(item, session) { ... }
  async verifyWithMCP(item, session) { ... }
  async getVerificationDelay(item) { ... }
}
```

**Файл 4: `mcp-todo-manager.js` (новий)**
```javascript
/**
 * MCP TODO Manager - Координатор
 */
export class MCPTodoManager {
  constructor(options) {
    this.planner = new TodoPlanner(options);
    this.executor = new TodoExecutor(options);
    this.verifier = new TodoVerifier(options);
    this.logger = options.logger;
  }

  async execute(userMessage, session, options = {}) {
    try {
      // Планування
      const todo = await this.planner.plan(userMessage, options);
      
      // Виконання
      const results = await this.executor.execute(todo, session);
      
      // Верифікація
      const verification = await this.verifier.verify(results, session);
      
      return { success: true, results, verification };
    } catch (error) {
      this.logger.error('mcp-todo', error);
      throw error;
    }
  }
}
```

**Результат:** 
- MCPTodoManager: 3944 → 200 рядків
- Модульність: ✅
- Тестованість: ✅

---

### Завдання 2.2: Видалити дублювання з executor-v3.js

**Поточна проблема:**
- executor-v3.js містить логіку, яка дублюється в MCPTodoManager
- Обидва файли роблять одне й те ж

**Рішення:**
```javascript
// executor-v3.js - спрощено
export async function executeWorkflow(workflowContext) {
  const { userMessage, session, container } = workflowContext;
  
  // Отримуємо MCPTodoManager з DI
  const mcpTodoManager = container.resolve('mcpTodoManager');
  
  // Виконуємо workflow
  const result = await mcpTodoManager.execute(userMessage, session);
  
  // Обробляємо результат
  return result;
}
```

**Результат:**
- executor-v3.js: 967 → 200 рядків
- Дублювання: ❌ Видалено

---

### Завдання 2.3: Додати unit тести

**Структура тестів:**
```
tests/unit/workflow/
├── todo-planner.test.js
├── todo-executor.test.js
├── todo-verifier.test.js
└── mcp-todo-manager.test.js
```

**Приклад: `todo-planner.test.js`**
```javascript
import { TodoPlanner } from '../../../orchestrator/workflow/core/todo-planner.js';

describe('TodoPlanner', () => {
  let planner;
  let mockLlmClient;

  beforeEach(() => {
    mockLlmClient = {
      chat: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          items: [
            { id: 1, action: 'Test action', dependencies: [] }
          ]
        })
      })
    };

    planner = new TodoPlanner({
      llmClient: mockLlmClient,
      logger: console,
      localizationService: { translate: (x) => x }
    });
  });

  test('should plan simple task', async () => {
    const result = await planner.plan('Do something');
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
  });

  test('should analyze complexity', async () => {
    const complexity = await planner.analyzComplexity('Simple task');
    expect(complexity).toBeGreaterThanOrEqual(1);
    expect(complexity).toBeLessThanOrEqual(10);
  });
});
```

**Результат:** 
- Покриття: 0% → 60%+
- Регресійні тести: ✅

---

### Завдання 2.4: Оптимізувати DI Container

**Файл:** `orchestrator/core/service-registry.js`

**Видалити:**
```javascript
// ❌ Видалити невикористовувані реєстрації
container.singleton('workflowStateMachine', ...);
container.singleton('hybridWorkflowExecutor', ...);
container.singleton('optimizedWorkflowManager', ...);
```

**Додати:**
```javascript
// ✅ Нові модульні реєстрації
container.singleton('todoPlanner', (c) => new TodoPlanner({
  llmClient: c.resolve('llmClient'),
  logger: c.resolve('logger'),
  localizationService: c.resolve('localizationService')
}));

container.singleton('todoExecutor', (c) => new TodoExecutor({
  mcpManager: c.resolve('mcpManager'),
  logger: c.resolve('logger'),
  ttsSyncManager: c.resolve('ttsSyncManager')
}));

container.singleton('todoVerifier', (c) => new TodoVerifier({
  visionAnalysis: c.resolve('visionAnalysis'),
  logger: c.resolve('logger')
}));

container.singleton('mcpTodoManager', (c) => new MCPTodoManager({
  planner: c.resolve('todoPlanner'),
  executor: c.resolve('todoExecutor'),
  verifier: c.resolve('todoVerifier'),
  logger: c.resolve('logger')
}));
```

**Результат:**
- Невикористовувані реєстрації: ❌ Видалено
- Модульність: ✅
- Залежності: ✅ Чіткі

---

## 📋 ФАЗА 3: ОПТИМІЗАЦІЯ (Тиждень 4+)

### Завдання 3.1: Інтегрувати гібридний executor

**Поточна проблема:**
- HybridWorkflowExecutor існує, але не використовується
- Паралельне виконання не доступне

**Рішення:**
```javascript
// orchestrator/workflow/core/mcp-todo-manager.js

async execute(userMessage, session, options = {}) {
  const executionMode = options.executionMode || 'sequential';
  
  if (executionMode === 'parallel' && this.executor.supportsParallel) {
    return await this.executor.executeParallel(todo, session);
  } else {
    return await this.executor.executeSequential(todo, session);
  }
}
```

**Результат:**
- Паралельне виконання: ✅
- Масштабування: ✅

---

### Завдання 3.2: Додати кешування результатів

**Файл:** `orchestrator/workflow/core/todo-cache.js`

```javascript
export class TodoCache {
  constructor(ttl = 3600000) { // 1 час
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
}
```

**Результат:**
- Продуктивність: +30%
- Навантаження на LLM: -30%

---

### Завдання 3.3: Оновити документацію

**Файли для створення:**
1. `docs/WORKFLOW_ARCHITECTURE.md` - Архітектурна документація
2. `docs/WORKFLOW_API.md` - API документація
3. `docs/WORKFLOW_EXAMPLES.md` - Приклади використання
4. `docs/WORKFLOW_TROUBLESHOOTING.md` - Розв'язання проблем

---

## 📊 МЕТРИКИ УСПІХУ

| Метрика                       | Поточне | Цільове | Статус |
| ----------------------------- | ------- | ------- | ------ |
| Кількість executor реалізацій | 4       | 1       | ⏳      |
| Невикористовувані компоненти  | 10+     | 0       | ⏳      |
| Розмір MCPTodoManager         | 3944    | 200     | ⏳      |
| Розмір executor-v3            | 967     | 200     | ⏳      |
| Дублювання логування          | 649     | 0       | ⏳      |
| Покриття тестами              | 0%      | 60%+    | ⏳      |
| Модульність                   | ❌       | ✅       | ⏳      |
| Масштабування                 | ❌       | ✅       | ⏳      |

---

## 🎯 КОНТРОЛЬНІ ТОЧКИ

### Тиждень 1 (Консолідація)
- [ ] Видалити невикористовувані компоненти
- [ ] Видалити DI реєстрації
- [ ] Централізувати логування
- [ ] Видалити закоментований код

### Тиждень 2-3 (Рефакторинг)
- [ ] Розділити MCPTodoManager на модулі
- [ ] Видалити дублювання з executor-v3.js
- [ ] Додати unit тести
- [ ] Оптимізувати DI Container

### Тиждень 4+ (Оптимізація)
- [ ] Інтегрувати гібридний executor
- [ ] Додати кешування результатів
- [ ] Оновити документацію
- [ ] Провести performance тести

---

## 🚨 РИЗИКИ ТА МІТИГАЦІЯ

| Ризик                     | Ймовірність | Вплив    | Мітигація                       |
| ------------------------- | ----------- | -------- | ------------------------------- |
| Регресія функціоналу      | Середня     | Високий  | Unit тести перед рефакторингом  |
| Проблеми з залежностями   | Середня     | Середній | Перевірка циклічних залежностей |
| Проблеми з інтеграцією    | Низька      | Середній | Integration тести               |
| Проблеми з продуктивністю | Низька      | Середній | Performance тести               |

---

## 📚 ПОСИЛАННЯ

- Аналіз архітектури: `/WORKFLOW_ARCHITECTURE_ANALYSIS.md`
- Поточна документація: `/docs/`
- Workflow файли: `/orchestrator/workflow/`
- Service Registry: `/orchestrator/core/service-registry.js`

---

**Підготовлено**: Cascade AI Assistant  
**Дата**: 22 листопада 2025  
**Статус**: 📋 ГОТОВО ДО РЕАЛІЗАЦІЇ
