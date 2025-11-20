# Детальний Аналіз Дублювання Коду - Workflow System

**Дата**: 20 листопада 2025  
**Статус**: ✅ Завершено  

---

## 📊 Статистика Дублювання

### Загальна Статистика

| Тип дублювання      | Кількість | Файлів | Рядків | Пріоритет        |
| ------------------- | --------- | ------ | ------ | ---------------- |
| Методи `execute()`  | 34        | 34     | ~1,700 | 🔴 КРИТИЧНИЙ      |
| Логування операцій  | 649       | 47     | ~1,300 | 🟠 ВАЖЛИВИЙ       |
| Обробка помилок     | 47        | 47     | ~470   | 🟠 ВАЖЛИВИЙ       |
| Генерація ID        | 15        | 15     | ~45    | 🟡 РЕКОМЕНДОВАНИЙ |
| Валідація контексту | 12        | 12     | ~120   | 🟡 РЕКОМЕНДОВАНИЙ |

---

## 🔴 КРИТИЧНЕ ДУБЛЮВАННЯ: Методи execute()

### Проблема

34 файли мають метод `execute()` з однаковою структурою:

```javascript
async execute(context, options = {}) {
    const executionId = this._generateExecutionId();
    const startTime = Date.now();
    
    this.logger.system('component', `[${executionId}] Starting execution`, { ... });
    
    try {
        // ... основна логіка ...
        
        const duration = Date.now() - startTime;
        this.logger.system('component', `[${executionId}] Completed`, { duration });
        
        return results;
    } catch (error) {
        this.logger.error('component', `[${executionId}] Failed`, { 
            error: error.message,
            stack: error.stack
        });
        
        throw error;
    }
}
```

### Список Файлів з Дублюванням

#### Категорія 1: Core Modules (3 файли)
1. **`core/todo-executor.js`** - 115 рядків
2. **`core/workflow-engine.js`** - 168 рядків
3. **`core/todo-builder.js`** - 209 рядків

#### Категорія 2: Execution (3 файли)
4. **`execution/mcp-executor.js`** - ~150 рядків
5. **`execution/tool-executor.js`** - ~150 рядків
6. **`execution/fallback-handler.js`** - ~140 рядків

#### Категорія 3: Hybrid (6 файлів)
7. **`hybrid/hybrid-executor.js`** - ~200 рядків
8. **`hybrid/worker-pool.js`** - ~180 рядків
9. **`hybrid/execution-tracker.js`** - ~120 рядків
10. **`hybrid/recipe-processor.js`** - ~100 рядків
11. **`hybrid/stream-notifier.js`** - ~80 рядків
12. **`hybrid/verification-adapter.js`** - ~90 рядків

#### Категорія 4: Planning (3 файли)
13. **`planning/tool-planner.js`** - ~160 рядків
14. **`planning/dependency-resolver.js`** - ~140 рядків
15. **`planning/adaptive-planner.js`** - ~150 рядків

#### Категорія 5: Verification (4 файли)
16. **`verification/verification-engine.js`** - ~170 рядків
17. **`verification/mcp-verifier.js`** - ~150 рядків
18. **`verification/llm-verifier.js`** - ~140 рядків
19. **`verification/adaptive-verifier.js`** - ~130 рядків

#### Категорія 6: Stages/Processors (14 файлів)
20. **`stages/base-processor.js`** - ~100 рядків (базовий клас!)
21. **`stages/mode-selection-processor.js`** - ~200 рядків
22. **`stages/dev-self-analysis-processor.js`** - ~180 рядків
23. **`stages/atlas-todo-planning-processor.js`** - ~160 рядків
24. **`stages/tetyana-plan-tools-processor.js`** - ~170 рядків
25. **`stages/tetyana-execute-tools-processor.js`** - ~160 рядків
26. **`stages/grisha-verify-item-processor.js`** - ~200 рядків
27. **`stages/atlas-replan-todo-processor.js`** - ~150 рядків
28. **`stages/mcp-final-summary-processor.js`** - ~140 рядків
29. **`stages/server-selection-processor.js`** - ~130 рядків
30. **`stages/chat-memory-eligibility-processor.js`** - ~120 рядків
31. **`stages/grisha-verification-eligibility-processor.js`** - ~110 рядків
32. **`stages/router-classifier-processor.js`** - ~100 рядків
33. **`stages/intent-detector.js`** - ~90 рядків

#### Категорія 7: Інші (4 файли)
34. **`state-machine/WorkflowStateMachine.js`** - ~200 рядків
35. **`state-machine/handlers/StateHandler.js`** - ~120 рядків
36. **`chat-memory-coordinator.js`** - ~140 рядків
37. **`eternity-mcp-memory.js`** - ~110 рядків

### Рішення: Базовий Клас ExecutorBase

**Файл**: `orchestrator/workflow/core/executor-base.js`

```javascript
/**
 * @fileoverview ExecutorBase - Базовий клас для всіх executor'ів
 * Надає спільну функціональність для виконання операцій
 * 
 * @version 1.0.0
 * @date 2025-11-20
 */

/**
 * Базовий клас для всіх executor'ів
 * Надає:
 * - Генерацію execution ID
 * - Метрики часу виконання
 * - Логування операцій
 * - Обробку помилок
 */
export class ExecutorBase {
    /**
     * @param {Object} options
     * @param {Object} options.logger - Logger instance
     * @param {string} options.componentName - Назва компоненту для логування
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.componentName = options.componentName || this.constructor.name;
    }

    /**
     * Генерувати унікальний ID виконання
     * @protected
     * @returns {string} Execution ID
     */
    _generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Виконати операцію з метриками та логуванням
     * @protected
     * @param {Function} operation - Асинхронна операція
     * @param {Object} context - Контекст операції
     * @returns {Promise<Object>} { success, result, duration, executionId }
     */
    async executeWithMetrics(operation, context = {}) {
        const executionId = this._generateExecutionId();
        const startTime = Date.now();
        const operationName = operation.name || 'operation';

        this.logger.system(this.componentName, 
            `[${executionId}] Starting ${operationName}`, 
            { ...context }
        );

        try {
            const result = await operation();
            const duration = Date.now() - startTime;

            this.logger.system(this.componentName,
                `[${executionId}] Completed ${operationName}`,
                { duration, success: true }
            );

            return {
                success: true,
                result,
                duration,
                executionId
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error(this.componentName,
                `[${executionId}] Failed ${operationName}`,
                {
                    error: error.message,
                    stack: error.stack,
                    duration
                }
            );

            throw error;
        }
    }

    /**
     * Виконати операцію з повторами
     * @protected
     * @param {Function} operation - Асинхронна операція
     * @param {Object} options - Опції повторів
     * @param {number} options.maxAttempts - Максимум спроб (default: 3)
     * @param {number} options.delayMs - Затримка між спробами (default: 1000)
     * @param {Object} options.context - Контекст операції
     * @returns {Promise<Object>} Результат операції
     */
    async executeWithRetries(operation, options = {}) {
        const {
            maxAttempts = 3,
            delayMs = 1000,
            context = {}
        } = options;

        const executionId = this._generateExecutionId();
        const operationName = operation.name || 'operation';

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                this.logger.system(this.componentName,
                    `[${executionId}] Attempt ${attempt}/${maxAttempts} for ${operationName}`
                );

                const result = await operation();

                this.logger.system(this.componentName,
                    `[${executionId}] Success on attempt ${attempt}`
                );

                return { success: true, result, attempt };

            } catch (error) {
                if (attempt === maxAttempts) {
                    this.logger.error(this.componentName,
                        `[${executionId}] Failed after ${maxAttempts} attempts`,
                        { error: error.message }
                    );
                    throw error;
                }

                this.logger.warn(this.componentName,
                    `[${executionId}] Attempt ${attempt} failed, retrying in ${delayMs}ms`,
                    { error: error.message }
                );

                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    /**
     * Валідувати контекст
     * @protected
     * @param {Object} context - Контекст для валідації
     * @param {string[]} requiredFields - Обов'язкові поля
     * @throws {Error} Якщо контекст невалідний
     */
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

    /**
     * Обробити помилку з логуванням
     * @protected
     * @param {Error} error - Помилка
     * @param {string} operation - Назва операції
     * @param {Object} context - Контекст помилки
     * @throws {Error} Переброшена помилка
     */
    _handleError(error, operation, context = {}) {
        this.logger.error(this.componentName,
            `Error in ${operation}`,
            {
                error: error.message,
                stack: error.stack,
                ...context
            }
        );

        throw error;
    }
}
```

### Як Використовувати ExecutorBase

**Приклад 1: TodoExecutor**

```javascript
import { ExecutorBase } from './executor-base.js';

export class TodoExecutor extends ExecutorBase {
    constructor(options = {}) {
        super({
            ...options,
            componentName: 'todo-executor'
        });
        this.toolPlanner = options.toolPlanner;
        this.toolExecutor = options.toolExecutor;
        this.verificationEngine = options.verificationEngine;
    }

    async execute(todo, session, options = {}) {
        return this.executeWithMetrics(async () => {
            this._validateContext(session, ['id']);
            
            const results = {
                itemsProcessed: 0,
                itemsFailed: 0,
                items: []
            };

            for (let i = 0; i < todo.items.length; i++) {
                const item = todo.items[i];
                
                try {
                    const itemResult = await this._executeItemWithRetries(
                        item,
                        todo,
                        session
                    );
                    
                    results.items.push(itemResult);
                    if (itemResult.status === 'completed') {
                        results.itemsProcessed++;
                    }
                } catch (error) {
                    this._handleError(error, `execute item ${i}`, { itemId: item.id });
                    results.itemsFailed++;
                }
            }

            return results;
        }, { todoItemCount: todo.items.length });
    }

    async _executeItemWithRetries(item, todo, session) {
        return this.executeWithRetries(
            async () => this._executeItem(item, todo, session),
            {
                maxAttempts: item.max_attempts || 3,
                delayMs: 1000,
                context: { itemId: item.id }
            }
        );
    }

    async _executeItem(item, todo, session) {
        // ... основна логіка ...
    }
}
```

**Приклад 2: MCPExecutor**

```javascript
import { ExecutorBase } from '../core/executor-base.js';

export class MCPExecutor extends ExecutorBase {
    constructor(options = {}) {
        super({
            ...options,
            componentName: 'mcp-executor'
        });
        this.mcpManager = options.mcpManager;
    }

    async execute(tool, parameters, options = {}) {
        return this.executeWithMetrics(async () => {
            this._validateContext({ tool, parameters }, ['tool']);
            
            const result = await this.mcpManager.executeTool(tool, parameters);
            return result;
        }, { tool, parameterCount: Object.keys(parameters).length });
    }
}
```

### Очікуваний Результат

**Поточно**:
- 34 файли з дублюванням
- ~1,700 рядків повторюваного коду
- Складно підтримувати

**Після рефакторингу**:
- 1 базовий клас ExecutorBase (~150 рядків)
- 34 файли успадковують від ExecutorBase
- -1,550 рядків коду (-91%)
- Легко підтримувати

---

## 🟠 ВАЖЛИВЕ ДУБЛЮВАННЯ: Логування Операцій

### Проблема

649 операцій логування з однаковим паттерном:

```javascript
this.logger.system('component', `[${executionId}] Message`, { context });
this.logger.error('component', `[${executionId}] Error`, { error: error.message });
this.logger.warn('component', `[${executionId}] Warning`, { reason });
```

### Розподіл Логування

| Файл                                        | Операцій | %     |
| ------------------------------------------- | -------- | ----- |
| `stages/grisha-verify-item-processor.js`    | 116      | 17.9% |
| `executor-v3.js`                            | 60       | 9.2%  |
| `stages/tetyana-plan-tools-processor.js`    | 35       | 5.4%  |
| `workflow/tts-sync-manager.js`              | 34       | 5.2%  |
| `stages/tetyana-execute-tools-processor.js` | 32       | 4.9%  |
| `stages/mode-selection-processor.js`        | 27       | 4.2%  |
| `stages/dev-self-analysis-processor.js`     | 26       | 4.0%  |
| Інші (40 файлів)                            | 319      | 49.2% |

### Рішення: Logging Middleware

**Файл**: `orchestrator/workflow/utils/logging-middleware.js`

```javascript
/**
 * Logging Middleware - Консолідація логування операцій
 */

export function logExecution(componentName, options = {}) {
    const {
        logArgs = false,
        logResult = true,
        logDuration = true
    } = options;

    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function(...args) {
            const executionId = this._generateExecutionId?.() || 
                               `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const startTime = Date.now();

            const logContext = {};
            if (logArgs && args.length > 0) {
                logContext.args = args.map(arg => 
                    typeof arg === 'object' ? Object.keys(arg) : arg
                );
            }

            this.logger?.system?.(componentName,
                `[${executionId}] Starting ${propertyKey}`,
                logContext
            );

            try {
                const result = await originalMethod.apply(this, args);
                const duration = Date.now() - startTime;

                const resultContext = { success: true };
                if (logDuration) resultContext.duration = duration;
                if (logResult && result) {
                    resultContext.resultKeys = Object.keys(result);
                }

                this.logger?.system?.(componentName,
                    `[${executionId}] Completed ${propertyKey}`,
                    resultContext
                );

                return result;

            } catch (error) {
                const duration = Date.now() - startTime;

                this.logger?.error?.(componentName,
                    `[${executionId}] Failed ${propertyKey}`,
                    {
                        error: error.message,
                        duration,
                        stack: error.stack
                    }
                );

                throw error;
            }
        };

        return descriptor;
    };
}

export function logStep(message, options = {}) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function(...args) {
            const executionId = this._generateExecutionId?.() || 
                               `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            this.logger?.system?.(this.constructor.name,
                `[${executionId}] ${message}`,
                options.context || {}
            );

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
```

### Як Використовувати

**Приклад 1: Декоратор для методу**

```javascript
import { logExecution } from '../utils/logging-middleware.js';

export class GrishaVerifyItemProcessor {
    @logExecution('grisha-verify', { logDuration: true })
    async execute(context) {
        // ... код без логування ...
        return result;
    }

    @logExecution('grisha-verify', { logArgs: true })
    async verifyItem(item) {
        // ... код ...
        return verification;
    }
}
```

**Приклад 2: Ручне використання**

```javascript
export class TetyanaPlanToolsProcessor {
    async execute(context) {
        const executionId = this._generateExecutionId();
        
        this.logger.system('tetyana-plan', `[${executionId}] Starting planning`);
        
        try {
            const plan = await this._generatePlan(context);
            this.logger.system('tetyana-plan', `[${executionId}] Planning completed`);
            return plan;
        } catch (error) {
            this.logger.error('tetyana-plan', `[${executionId}] Planning failed`, {
                error: error.message
            });
            throw error;
        }
    }
}
```

### Очікуваний Результат

**Поточно**:
- 649 операцій логування
- ~1,300 рядків коду логування
- Складно змінювати формат

**Після рефакторингу**:
- 200-300 операцій логування
- ~300 рядків коду логування
- -55% операцій
- Легко змінювати формат глобально

---

## 🟠 ВАЖЛИВЕ ДУБЛЮВАННЯ: Обробка Помилок

### Проблема

47 файлів з однаковою обробкою помилок:

```javascript
try {
    // ... операція ...
} catch (error) {
    this.logger.error('component', `Failed`, { 
        error: error.message, 
        stack: error.stack 
    });
    throw error; // або return { success: false }
}
```

### Рішення: Error Handler Utility

**Файл**: `orchestrator/workflow/utils/error-handler.js`

```javascript
/**
 * Error Handler Utility - Єдина обробка помилок
 */

export class ErrorHandler {
    static async handle(operation, options = {}) {
        const {
            logger,
            componentName = 'unknown',
            operationName = 'operation',
            throwError = true,
            context = {}
        } = options;

        try {
            return await operation();
        } catch (error) {
            logger?.error?.(componentName,
                `${operationName} failed`,
                {
                    error: error.message,
                    stack: error.stack,
                    ...context
                }
            );

            if (throwError) {
                throw error;
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    static async handleWithRetry(operation, options = {}) {
        const {
            maxAttempts = 3,
            delayMs = 1000,
            logger,
            componentName = 'unknown',
            operationName = 'operation',
            context = {}
        } = options;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxAttempts) {
                    logger?.error?.(componentName,
                        `${operationName} failed after ${maxAttempts} attempts`,
                        { error: error.message, ...context }
                    );
                    throw error;
                }

                logger?.warn?.(componentName,
                    `${operationName} attempt ${attempt} failed, retrying`,
                    { error: error.message }
                );

                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
}
```

### Як Використовувати

```javascript
import { ErrorHandler } from '../utils/error-handler.js';

export class MyProcessor {
    async execute(context) {
        return ErrorHandler.handle(
            async () => {
                // ... основна логіка ...
                return result;
            },
            {
                logger: this.logger,
                componentName: 'my-processor',
                operationName: 'execute',
                context: { contextId: context.id }
            }
        );
    }

    async executeWithRetry(item) {
        return ErrorHandler.handleWithRetry(
            async () => {
                // ... основна логіка ...
                return result;
            },
            {
                maxAttempts: 3,
                delayMs: 1000,
                logger: this.logger,
                componentName: 'my-processor',
                operationName: 'executeWithRetry',
                context: { itemId: item.id }
            }
        );
    }
}
```

---

## 🟡 РЕКОМЕНДОВАНЕ ДУБЛЮВАННЯ: Генерація ID

### Проблема

15 файлів з однаковою генерацією ID:

```javascript
_generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

_generateWorkflowId() {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Рішення: ID Generator Utility

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

---

## 📊 Резюме Дублювання

### Поточний Стан

| Тип              | Файлів | Рядків     | Статус           |
| ---------------- | ------ | ---------- | ---------------- |
| Методи execute() | 34     | ~1,700     | 🔴 КРИТИЧНИЙ      |
| Логування        | 47     | ~1,300     | 🟠 ВАЖЛИВИЙ       |
| Обробка помилок  | 47     | ~470       | 🟠 ВАЖЛИВИЙ       |
| Генерація ID     | 15     | ~45        | 🟡 РЕКОМЕНДОВАНИЙ |
| Валідація        | 12     | ~120       | 🟡 РЕКОМЕНДОВАНИЙ |
| **ВСЬОГО**       | **47** | **~3,635** |                  |

### Після Рефакторингу

| Тип              | Файлів           | Рядків   | Поліпшення |
| ---------------- | ---------------- | -------- | ---------- |
| Методи execute() | 1 (базовий клас) | ~150     | -91%       |
| Логування        | 1 (middleware)   | ~200     | -85%       |
| Обробка помилок  | 1 (utility)      | ~100     | -79%       |
| Генерація ID     | 1 (utility)      | ~30      | -33%       |
| Валідація        | 1 (utility)      | ~50      | -58%       |
| **ВСЬОГО**       | **5**            | **~530** | **-85%**   |

---

## 🎯 План Видалення Дублювання

### Етап 1: Базовий Клас ExecutorBase (1 день)

1. Створити `orchestrator/workflow/core/executor-base.js`
2. Перенести спільні методи
3. Оновити 34 файли для успадкування

### Етап 2: Logging Middleware (1 день)

1. Створити `orchestrator/workflow/utils/logging-middleware.js`
2. Замінити 649 операцій логування на декоратори
3. Тестування

### Етап 3: Error Handler (0.5 дня)

1. Створити `orchestrator/workflow/utils/error-handler.js`
2. Замінити 47 блоків try-catch
3. Тестування

### Етап 4: ID Generator (0.5 дня)

1. Створити `orchestrator/workflow/utils/id-generator.js`
2. Замінити 15 методів генерації ID
3. Тестування

### Етап 5: Валідація (0.5 дня)

1. Створити `orchestrator/workflow/utils/context-validator.js`
2. Замінити 12 методів валідації
3. Тестування

**Загальний час**: 3.5 дня

---

## 📈 Метрики Успіху

### Кількісні

- ✅ Видалити 3,635 рядків дублюваного коду
- ✅ Зменшити 47 файлів до 5 утиліт
- ✅ Зменшити дублювання на 85%

### Якісні

- ✅ Легше підтримувати код
- ✅ Легше змінювати поведінку глобально
- ✅ Менше помилок при копіюванні коду
- ✅ Краща читаємість

---

*Цей звіт був автоматично згенерований за допомогою MCP Codemap Analysis System*
