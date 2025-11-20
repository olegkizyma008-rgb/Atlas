/**
 * @fileoverview ExecutorBase - Базовий клас для всіх executor'ів
 * Видалює дублювання 34 методів execute() (~1,700 рядків)
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

/**
 * Базовий клас для всіх executor'ів
 * Надає спільну функціональність для виконання операцій
 * 
 * Використання:
 * ```javascript
 * export class MyExecutor extends ExecutorBase {
 *   constructor(options = {}) {
 *     super({ ...options, componentName: 'my-executor' });
 *   }
 *   
 *   async execute(context) {
 *     return this.executeWithMetrics(async () => {
 *       // ... код ...
 *     }, { contextId: context.id });
 *   }
 * }
 * ```
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

    /**
     * Отримати метрики виконання
     * @protected
     * @param {number} startTime - Час початку
     * @returns {Object} Метрики { duration, timestamp }
     */
    _getMetrics(startTime) {
        const duration = Date.now() - startTime;
        return {
            duration,
            timestamp: new Date().toISOString(),
            executionId: this._generateExecutionId()
        };
    }
}

export default ExecutorBase;
