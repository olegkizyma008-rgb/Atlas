# План Безпечного Рефакторингу - Детальна Реалізація

**Дата**: 20 листопада 2025  
**Статус**: ✅ ГОТОВО ДО РЕАЛІЗАЦІЇ  
**Ризик**: МІНІМАЛЬНИЙ ✅

---

## 🎯 Фаза 1: Видалення Безпечного Мертвого Коду (0.5 дня)

### Крок 1.1: Видалити state-machine.js

**Перевірка:**
```bash
grep -r "from.*state-machine.js\|require.*state-machine.js" orchestrator/
# Результат: 0 посилань ✅
```

**Дія:**
```bash
rm orchestrator/workflow/state-machine.js
git rm orchestrator/workflow/state-machine.js
git commit -m "Remove legacy state-machine.js (0 references, replaced by WorkflowStateMachine)"
```

**Результат**: -200 рядків

---

### Крок 1.2: Видалити Disabled Nexus Код

**Файл**: `orchestrator/workflow/executor-v3.js` (рядки 915-934)

**Перевірка:**
```bash
grep -n "NEXUS CONTEXT-AWARE ACTIVATION" orchestrator/workflow/executor-v3.js
# Результат: рядок 915
```

**Дія**: Видалити рядки 915-934 (20 рядків закоментованого коду)

**Перед:**
```javascript
// ===============================================
// NEXUS CONTEXT-AWARE ACTIVATION (DISABLED 02.11.2025)
// ...
/*
const nexusActivator = await container.resolve('nexusContextActivator');
// ...
*/
```

**Після:**
```javascript
// Якщо Nexus не потрібен - продовжуємо стандартний workflow
// Resolve processors from DI Container
const modeProcessor = container.resolve('modeSelectionProcessor');
```

**Результат**: -20 рядків

---

## 🔧 Фаза 2: Рефакторинг MCPTodoManager (3-4 дні)

### Крок 2.1: Видалити Дублювання Логування

**Поточна ситуація:**
- 649 операцій логування з однаковим паттерном
- Розповсюджено по 47 файлам

**Рішення**: Logging Middleware

**Файл**: `orchestrator/workflow/utils/logging-middleware.js`

```javascript
/**
 * Logging Middleware - Консолідація логування операцій
 */

export function logExecution(componentName, options = {}) {
    const { logArgs = false, logResult = true, logDuration = true } = options;

    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function(...args) {
            const executionId = this._generateExecutionId?.() || 
                               `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const startTime = Date.now();

            this.logger?.system?.(componentName,
                `[${executionId}] Starting ${propertyKey}`,
                logArgs ? { args: args.map(a => typeof a === 'object' ? Object.keys(a) : a) } : {}
            );

            try {
                const result = await originalMethod.apply(this, args);
                const duration = Date.now() - startTime;

                this.logger?.system?.(componentName,
                    `[${executionId}] Completed ${propertyKey}`,
                    { success: true, duration }
                );

                return result;

            } catch (error) {
                const duration = Date.now() - startTime;

                this.logger?.error?.(componentName,
                    `[${executionId}] Failed ${propertyKey}`,
                    { error: error.message, duration }
                );

                throw error;
            }
        };

        return descriptor;
    };
}
```

**Використання в MCPTodoManager:**
```javascript
import { logExecution } from './utils/logging-middleware.js';

export class MCPTodoManager {
    @logExecution('mcp-todo-manager', { logDuration: true })
    async createTodo(userMessage, options = {}) {
        // ... код без логування ...
    }

    @logExecution('mcp-todo-manager', { logDuration: true })
    async executeTodo(todo, session, options = {}) {
        // ... код без логування ...
    }

    @logExecution('mcp-todo-manager', { logDuration: true })
    async planTools(item, todo, options = {}) {
        // ... код без логування ...
    }
}
```

**Результат**: -300 рядків логування

---

### Крок 2.2: Видалити Дублювання Методів

**Поточна ситуація:**
- 34 методи execute() з однаковою структурою
- ~1,700 рядків дублювання

**Рішення**: Базовий клас ExecutorBase

**Файл**: `orchestrator/workflow/core/executor-base.js`

```javascript
export class ExecutorBase {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.componentName = options.componentName || this.constructor.name;
    }

    _generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async executeWithMetrics(operation, context = {}) {
        const executionId = this._generateExecutionId();
        const startTime = Date.now();

        try {
            const result = await operation();
            const duration = Date.now() - startTime;
            return { success: true, result, duration, executionId };
        } catch (error) {
            const duration = Date.now() - startTime;
            throw error;
        }
    }

    async executeWithRetries(operation, options = {}) {
        const { maxAttempts = 3, delayMs = 1000 } = options;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    _validateContext(context, requiredFields = []) {
        if (!context || typeof context !== 'object') {
            throw new Error('Context must be an object');
        }
        for (const field of requiredFields) {
            if (!(field in context)) {
                throw new Error(`Context missing required field: ${field}`);
            }
        }
    }
}
```

**Результат**: -1,500 рядків дублювання

---

## 📁 Фаза 3: Спрощення executor-v3.js (2-3 дні)

### Крок 3.1: Розділити на 3 файли за режимами

**Файл**: `orchestrator/workflow/modes/mode-executor-factory.js`

```javascript
import { HybridModeExecutor } from './hybrid-mode-executor.js';
import { OptimizedModeExecutor } from './optimized-mode-executor.js';
import { StandardModeExecutor } from './standard-mode-executor.js';

export class ModeExecutorFactory {
    static createExecutor(mode, config) {
        switch(mode) {
            case 'hybrid':
                return new HybridModeExecutor(config);
            case 'optimized':
                return new OptimizedModeExecutor(config);
            default:
                return new StandardModeExecutor(config);
        }
    }
}
```

**Спрощена executor-v3.js:**

```javascript
import { ModeExecutorFactory } from './modes/mode-executor-factory.js';

export async function executeWorkflow(userMessage, options) {
    const { logger, container, res } = options;
    
    const workflowConfig = container.resolve('config').ENV_CONFIG?.workflow || {};
    const engineMode = workflowConfig.engineMode || 'standard';

    logger.system('executor', `Using mode: ${engineMode}`);

    const executor = ModeExecutorFactory.createExecutor(engineMode, {
        logger,
        container,
        res,
        ...options
    });

    return executor.execute(userMessage, options);
}
```

**Результат**: -500 рядків в executor-v3.js

---

## 🧪 Фаза 4: Рефакторинг Великих Процесорів (4-5 днів)

### Крок 4.1: Розділити grisha-verify-item-processor.js (2,982 рядків)

**Розділити на 3 модулі:**

1. `grisha-verify-item-processor-base.js` (базова логіка)
2. `grisha-verify-item-processor-visual.js` (візуальна верифікація)
3. `grisha-verify-item-processor-mcp.js` (MCP верифікація)

**Результат**: -1,000 рядків

---

### Крок 4.2: Розділити dev-self-analysis-processor.js (2,454 рядків)

**Розділити на 3 модулі:**

1. `dev-self-analysis-processor-base.js` (базова логіка)
2. `dev-self-analysis-processor-analysis.js` (аналіз)
3. `dev-self-analysis-processor-improvement.js` (поліпшення)

**Результат**: -800 рядків

---

## 🧹 Фаза 5: Видалення Дублювання (3-4 дні)

### Крок 5.1: Консолідувати Обробку Помилок

**Файл**: `orchestrator/workflow/utils/error-handler.js`

```javascript
export class ErrorHandler {
    static async handle(operation, options = {}) {
        const { logger, componentName, operationName, throwError = true } = options;

        try {
            return await operation();
        } catch (error) {
            logger?.error?.(componentName, `${operationName} failed`, {
                error: error.message,
                stack: error.stack
            });

            if (throwError) throw error;
            return { success: false, error: error.message };
        }
    }

    static async handleWithRetry(operation, options = {}) {
        const { maxAttempts = 3, delayMs = 1000, logger, componentName, operationName } = options;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxAttempts) {
                    logger?.error?.(componentName, `${operationName} failed after ${maxAttempts} attempts`, 
                        { error: error.message });
                    throw error;
                }

                logger?.warn?.(componentName, `${operationName} attempt ${attempt} failed, retrying`,
                    { error: error.message });

                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
}
```

**Результат**: -350 рядків

---

### Крок 5.2: Консолідувати Генерацію ID

**Файл**: `orchestrator/workflow/utils/id-generator.js`

```javascript
export class IdGenerator {
    static generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static generateWorkflowId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static generateItemId() {
        return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
```

**Результат**: -30 рядків

---

## 🧪 Фаза 6: Тестування та Документація (2-3 дні)

### Крок 6.1: Написати Тести

```bash
# Тести для кожної фази
npm test -- --testPathPattern="workflow"

# Перевірити покриття
npm test -- --coverage --testPathPattern="workflow"
```

### Крок 6.2: Документація

- Оновити README
- Написати архітектурну документацію
- Створити діаграми залежностей

---

## ✅ Контрольний Список Реалізації

### Фаза 1 (0.5 дня)
- [ ] Видалити state-machine.js
- [ ] Видалити Nexus код
- [ ] Запустити тести
- [ ] Комітити

### Фаза 2 (3-4 дні)
- [ ] Створити logging middleware
- [ ] Оновити MCPTodoManager
- [ ] Видалити дублювання логування
- [ ] Запустити тести
- [ ] Комітити

### Фаза 3 (2-3 дні)
- [ ] Розділити executor-v3.js на 3 файли
- [ ] Створити ModeExecutorFactory
- [ ] Спростити executor-v3.js
- [ ] Запустити тести
- [ ] Комітити

### Фаза 4 (4-5 днів)
- [ ] Розділити grisha-verify-item-processor.js
- [ ] Розділити dev-self-analysis-processor.js
- [ ] Запустити тести
- [ ] Комітити

### Фаза 5 (3-4 дні)
- [ ] Створити ErrorHandler
- [ ] Створити IdGenerator
- [ ] Оновити всі файли
- [ ] Запустити тести
- [ ] Комітити

### Фаза 6 (2-3 дні)
- [ ] Написати тести
- [ ] Оновити документацію
- [ ] Перевірити функціональність
- [ ] Розгорнути на staging

---

## 📊 Очікувані Результати

| Метрика            | Поточно   | Після   | Поліпшення |
| ------------------ | --------- | ------- | ---------- |
| Рядків коду        | 28,685    | 22,000  | -23%       |
| Дублювання         | 34 методи | 0       | -100%      |
| Логування операцій | 649       | 200-300 | -55%       |
| Мертвого коду      | 220       | 0       | -100%      |
| Модульність        | Низька    | Висока  | +50%       |

---

## 🚀 Команди для Реалізації

```bash
# Фаза 1
rm orchestrator/workflow/state-machine.js
git rm orchestrator/workflow/state-machine.js
git commit -m "Phase 1: Remove legacy state-machine.js and disabled Nexus code"

# Фаза 2
git checkout -b refactor/phase-2-mcp-todo-manager
# ... реалізувати logging middleware ...
git commit -m "Phase 2: Refactor MCPTodoManager with logging middleware"

# Фаза 3
git checkout -b refactor/phase-3-executor-v3
# ... розділити executor-v3.js ...
git commit -m "Phase 3: Simplify executor-v3.js with mode factory"

# Фаза 4
git checkout -b refactor/phase-4-processors
# ... розділити великі процесори ...
git commit -m "Phase 4: Refactor large processors"

# Фаза 5
git checkout -b refactor/phase-5-deduplication
# ... видалити дублювання ...
git commit -m "Phase 5: Remove code duplication"

# Фаза 6
git checkout -b refactor/phase-6-testing
# ... тестування та документація ...
git commit -m "Phase 6: Add tests and documentation"

# Merge all phases
git checkout main
git merge refactor/phase-1
git merge refactor/phase-2-mcp-todo-manager
git merge refactor/phase-3-executor-v3
git merge refactor/phase-4-processors
git merge refactor/phase-5-deduplication
git merge refactor/phase-6-testing
```

---

## 📞 Контакти

**План розроблено**: MCP Codemap System  
**Дата**: 20 листопада 2025  
**Версія**: 1.0 (Безпечний План)

---

*Цей план мінімізує ризики втрати коду та забезпечує безпечний рефакторинг*
