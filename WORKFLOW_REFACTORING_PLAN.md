# 🔄 Workflow Refactoring Plan - Based on MCP Codemap Analysis

**Date**: 2025-11-19
**Status**: Planning Phase
**Based on**: Codemap Analysis (693 files, 1,369 functions)

---

## Executive Summary

На основі аналізу кодемепу, виявлено можливості для оптимізації воркфлоу архітектури:

**Поточний стан:**
- ✅ 0 циклічних залежностей (добра архітектура)
- ⚠️ Монолітна MCPTodoManager (3,941 рядків)
- ⚠️ Дублювання логіки в processor'ах
- ⚠️ Слабка розділення concerns
- ⚠️ Складна залежність на DI Container

**Цільовий стан:**
- ✅ Модульна архітектура
- ✅ Чіткі інтерфейси
- ✅ Переиспользуваний код
- ✅ Легше тестувати
- ✅ Краще масштабувати

---

## 1. Поточна Архітектура

### Основні Компоненти

```
orchestrator/workflow/
├── mcp-todo-manager.js (3,941 строк) ⚠️ МОНОЛІТНА
│   ├── createTodo()
│   ├── executeTodo()
│   ├── planTools()
│   ├── executeTools()
│   ├── verifyItem()
│   └── adjustTodo()
├── executor-v3.js (1,551 строк)
│   ├── executeWorkflow()
│   └── executeMCPWorkflow()
├── hybrid/
│   ├── recipe-processor.js (468 строк)
│   ├── worker-pool.js (492 строк)
│   └── verification-adapter.js (409 строк)
└── stages/
    └── tetyana-execute-tools-processor.js
```

### Проблеми

1. **MCPTodoManager занадто великий** (3,941 рядків)
   - Змішує логіку планування, виконання, верифікації
   - Важко тестувати
   - Важко розширювати

2. **Дублювання логіки**
   - `recipe-processor.js` і `worker-pool.js` мають подібну логіку
   - Processor resolution повторюється в кількох місцях
   - Template resolution дублюється

3. **Слабка розділення concerns**
   - Планування, виконання, верифікація змішані
   - TTS, WebSocket, logging розсіяні
   - Залежність на DI Container скрізь

4. **Складна верифікація**
   - MCP-based і LLM-based верифікація змішані
   - Адаптивна логіка розсіяна
   - Важко додати нові методи верифікації

---

## 2. Рекомендована Архітектура

### Нова Структура

```
orchestrator/workflow/
├── core/
│   ├── workflow-engine.js (новий)
│   │   └── Основний оркестратор
│   ├── todo-builder.js (новий)
│   │   └── Побудова TODO з user input
│   └── todo-executor.js (новий)
│       └── Виконання TODO items
├── planning/
│   ├── tool-planner.js (новий)
│   │   └── Планування інструментів
│   ├── dependency-resolver.js (новий)
│   │   └── Розв'язання залежностей
│   └── adaptive-planner.js (новий)
│       └── Адаптивне планування
├── execution/
│   ├── tool-executor.js (новий)
│   │   └── Виконання інструментів
│   ├── mcp-executor.js (новий)
│   │   └── MCP-специфічне виконання
│   └── fallback-handler.js (новий)
│       └── Обробка fallback'ів
├── verification/
│   ├── verification-engine.js (новий)
│   │   └── Основна верифікація
│   ├── mcp-verifier.js (новий)
│   │   └── MCP-based верифікація
│   ├── llm-verifier.js (новий)
│   │   └── LLM-based верифікація
│   └── adaptive-verifier.js (новий)
│       └── Адаптивна верифікація
├── adjustment/
│   ├── todo-adjuster.js (новий)
│   │   └── Коригування TODO
│   └── replan-handler.js (новий)
│       └── Перепланування
├── utils/
│   ├── processor-registry.js (новий)
│   │   └── Реєстр процесорів
│   ├── template-resolver.js (новий)
│   │   └── Розв'язання шаблонів
│   └── context-builder.js (новий)
│       └── Побудова контексту
├── mcp-todo-manager.js (рефакторено)
│   └── Фасад для зворотної сумісності
└── executor-v3.js (оновлено)
    └── Використовує нову архітектуру
```

### Переваги

✅ **Модульність**: Кожен модуль має одну відповідальність
✅ **Тестованість**: Легше писати unit тести
✅ **Розширюваність**: Легше додавати нові верифікатори, виконавців
✅ **Переиспользуваність**: Компоненти можна використовувати окремо
✅ **Масштабованість**: Легше розподіляти навантаження

---

## 3. Детальний План Рефакторингу

### Фаза 1: Створення Core Модулів (4 години)

#### 1.1 Workflow Engine
```javascript
// orchestrator/workflow/core/workflow-engine.js
export class WorkflowEngine {
  constructor(dependencies) {
    this.todoBuilder = dependencies.todoBuilder;
    this.todoExecutor = dependencies.todoExecutor;
    this.logger = dependencies.logger;
  }

  async execute(userMessage, session) {
    // 1. Build TODO
    const todo = await this.todoBuilder.build(userMessage);
    
    // 2. Execute TODO
    const results = await this.todoExecutor.execute(todo, session);
    
    // 3. Return results
    return results;
  }
}
```

**Файли для створення:**
- `orchestrator/workflow/core/workflow-engine.js`
- `orchestrator/workflow/core/todo-builder.js`
- `orchestrator/workflow/core/todo-executor.js`

**Час**: 1.5 години

#### 1.2 Planning Модулі
```javascript
// orchestrator/workflow/planning/tool-planner.js
export class ToolPlanner {
  constructor(dependencies) {
    this.mcpManager = dependencies.mcpManager;
    this.llmClient = dependencies.llmClient;
  }

  async planTools(item, availableTools) {
    // Планування інструментів для item
  }
}
```

**Файли для створення:**
- `orchestrator/workflow/planning/tool-planner.js`
- `orchestrator/workflow/planning/dependency-resolver.js`
- `orchestrator/workflow/planning/adaptive-planner.js`

**Час**: 1.5 години

#### 1.3 Execution Модулі
```javascript
// orchestrator/workflow/execution/tool-executor.js
export class ToolExecutor {
  constructor(dependencies) {
    this.mcpManager = dependencies.mcpManager;
    this.rateLimiter = dependencies.rateLimiter;
  }

  async execute(item, tools) {
    // Виконання інструментів
  }
}
```

**Файли для створення:**
- `orchestrator/workflow/execution/tool-executor.js`
- `orchestrator/workflow/execution/mcp-executor.js`
- `orchestrator/workflow/execution/fallback-handler.js`

**Час**: 1 година

### Фаза 2: Верифікація Модулі (3 години)

#### 2.1 Verification Engine
```javascript
// orchestrator/workflow/verification/verification-engine.js
export class VerificationEngine {
  constructor(dependencies) {
    this.mcpVerifier = dependencies.mcpVerifier;
    this.llmVerifier = dependencies.llmVerifier;
    this.adaptiveVerifier = dependencies.adaptiveVerifier;
  }

  async verify(item, result, session) {
    // Вибір оптимального верифікатора
    // Виконання верифікації
  }
}
```

**Файли для створення:**
- `orchestrator/workflow/verification/verification-engine.js`
- `orchestrator/workflow/verification/mcp-verifier.js`
- `orchestrator/workflow/verification/llm-verifier.js`
- `orchestrator/workflow/verification/adaptive-verifier.js`

**Час**: 3 години

### Фаза 3: Утиліти та Реєстри (2 години)

#### 3.1 Processor Registry
```javascript
// orchestrator/workflow/utils/processor-registry.js
export class ProcessorRegistry {
  constructor() {
    this.processors = new Map();
  }

  register(name, processor) {
    this.processors.set(name, processor);
  }

  resolve(name) {
    return this.processors.get(name);
  }
}
```

**Файли для створення:**
- `orchestrator/workflow/utils/processor-registry.js`
- `orchestrator/workflow/utils/template-resolver.js`
- `orchestrator/workflow/utils/context-builder.js`

**Час**: 2 години

### Фаза 4: Рефакторинг MCPTodoManager (3 години)

#### 4.1 Перетворення на Фасад
```javascript
// orchestrator/workflow/mcp-todo-manager.js (рефакторено)
export class MCPTodoManager {
  constructor(dependencies) {
    this.workflowEngine = dependencies.workflowEngine;
    this.logger = dependencies.logger;
  }

  async createTodo(userMessage, options) {
    return this.workflowEngine.todoBuilder.build(userMessage, options);
  }

  async executeTodo(todo, session) {
    return this.workflowEngine.todoExecutor.execute(todo, session);
  }

  // ... інші методи як делегати
}
```

**Час**: 3 години

### Фаза 5: Оновлення DI Container (2 години)

#### 5.1 Реєстрація Нових Сервісів
```javascript
// orchestrator/core/service-registry.js (оновлено)
container.singleton('toolPlanner', (c) => {
  return new ToolPlanner({
    mcpManager: c.resolve('mcpManager'),
    llmClient: c.resolve('llmClient')
  });
});

container.singleton('verificationEngine', (c) => {
  return new VerificationEngine({
    mcpVerifier: c.resolve('mcpVerifier'),
    llmVerifier: c.resolve('llmVerifier')
  });
});

// ... інші реєстрації
```

**Час**: 2 години

### Фаза 6: Тестування та Документація (3 години)

#### 6.1 Unit Тести
```javascript
// tests/unit/workflow/tool-planner.test.js
describe('ToolPlanner', () => {
  it('should plan tools for item', async () => {
    // Test
  });
});
```

**Час**: 2 години

#### 6.2 Документація
- API документація для кожного модуля
- Приклади використання
- Migration guide від старої архітектури

**Час**: 1 година

---

## 4. Метрики Рефакторингу

### Поточні Метрики
```
MCPTodoManager:           3,941 строк
Executor-v3:              1,551 строк
Hybrid processors:        1,369 строк
Total workflow code:      6,861 строк

Циклічні залежності:      0
Середня складність:       HIGH
Тестованість:             LOW
Модульність:              LOW
```

### Цільові Метрики
```
WorkflowEngine:           ~400 строк
TodoBuilder:              ~300 строк
TodoExecutor:             ~400 строк
ToolPlanner:              ~350 строк
VerificationEngine:       ~400 строк
Утиліти:                  ~500 строк
Total workflow code:      ~3,500 строк (49% зменшення)

Циклічні залежності:      0
Середня складність:       MEDIUM
Тестованість:             HIGH
Модульність:              HIGH
```

---

## 5. Часова Оцінка

| Фаза       | Завдання                   | Час          |
| ---------- | -------------------------- | ------------ |
| 1          | Core модулі                | 4 год        |
| 2          | Верифікація модулі         | 3 год        |
| 3          | Утиліти та реєстри         | 2 год        |
| 4          | Рефакторинг MCPTodoManager | 3 год        |
| 5          | Оновлення DI Container     | 2 год        |
| 6          | Тестування та документація | 3 год        |
| **ВСЬОГО** |                            | **17 годин** |

---

## 6. Ризики та Мітигація

### Ризик 1: Зворотна Сумісність
**Проблема**: Старий код може залежати від MCPTodoManager
**Мітигація**: Зберегти MCPTodoManager як фасад

### Ризик 2: Регресія
**Проблема**: Нова архітектура може мати баги
**Мітигація**: Комплексне тестування перед merge

### Ризик 3: Складність Міграції
**Проблема**: Складно мігрувати весь код одразу
**Мітигація**: Поступова міграція з паралельним запуском

---

## 7. Наступні Кроки

### Негайно (Цей тиждень)
1. Створити структуру папок
2. Реалізувати Core модулі (Фаза 1)
3. Написати unit тести

### Наступний тиждень
1. Реалізувати Верифікація модулі (Фаза 2)
2. Реалізувати Утиліти (Фаза 3)
3. Почати рефакторинг MCPTodoManager (Фаза 4)

### Через 2 тижні
1. Завершити рефакторинг
2. Оновити DI Container
3. Комплексне тестування
4. Merge до main

---

## 8. Файли для Модифікації

### Нові Файли (17)
- `orchestrator/workflow/core/workflow-engine.js`
- `orchestrator/workflow/core/todo-builder.js`
- `orchestrator/workflow/core/todo-executor.js`
- `orchestrator/workflow/planning/tool-planner.js`
- `orchestrator/workflow/planning/dependency-resolver.js`
- `orchestrator/workflow/planning/adaptive-planner.js`
- `orchestrator/workflow/execution/tool-executor.js`
- `orchestrator/workflow/execution/mcp-executor.js`
- `orchestrator/workflow/execution/fallback-handler.js`
- `orchestrator/workflow/verification/verification-engine.js`
- `orchestrator/workflow/verification/mcp-verifier.js`
- `orchestrator/workflow/verification/llm-verifier.js`
- `orchestrator/workflow/verification/adaptive-verifier.js`
- `orchestrator/workflow/utils/processor-registry.js`
- `orchestrator/workflow/utils/template-resolver.js`
- `orchestrator/workflow/utils/context-builder.js`
- `tests/unit/workflow/workflow-engine.test.js`

### Модифіковані Файли (3)
- `orchestrator/workflow/mcp-todo-manager.js` (рефакторено)
- `orchestrator/workflow/executor-v3.js` (оновлено)
- `orchestrator/core/service-registry.js` (оновлено)

---

## 9. Переваги Рефакторингу

✅ **Код якість**: Зменшення складності на 49%
✅ **Тестованість**: Легше писати unit тести
✅ **Масштабованість**: Легше додавати нові функції
✅ **Продуктивність**: Краще розподіляти навантаження
✅ **Обслуговуваність**: Легше розуміти та модифікувати
✅ **Переиспользуваність**: Компоненти можна використовувати в інших проектах

---

**Статус**: 📋 Plan Ready
**Рекомендація**: Почати з Фази 1 (Core модулі)
**Наступна перевірка**: Після завершення Фази 1
