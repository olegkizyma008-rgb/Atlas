/**
 * @fileoverview Logging Middleware - Консолідація логування операцій
 * Зменшує дублювання логування з 649 операцій до 200-300
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

/**
 * Декоратор для логування виконання методів
 * @param {string} componentName - Назва компоненту для логування
 * @param {Object} options - Опції логування
 * @returns {Function} Декоратор
 */
export function logExecution(componentName, options = {}) {
    const { logArgs = false, logResult = true, logDuration = true } = options;

    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args) {
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

/**
 * Декоратор для логування кроків
 * @param {string} message - Повідомлення для логування
 * @param {Object} options - Опції логування
 * @returns {Function} Декоратор
 */
export function logStep(message, options = {}) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args) {
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

/**
 * Функція для логування з контекстом
 * @param {Object} logger - Logger instance
 * @param {string} componentName - Назва компоненту
 * @param {string} message - Повідомлення
 * @param {Object} context - Контекст
 */
export function logWithContext(logger, componentName, message, context = {}) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger?.system?.(componentName, `[${executionId}] ${message}`, context);
}

/**
 * Функція для логування помилок з контекстом
 * @param {Object} logger - Logger instance
 * @param {string} componentName - Назва компоненту
 * @param {string} message - Повідомлення
 * @param {Error} error - Помилка
 * @param {Object} context - Контекст
 */
export function logErrorWithContext(logger, componentName, message, error, context = {}) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger?.error?.(componentName, `[${executionId}] ${message}`, {
        error: error.message,
        stack: error.stack,
        ...context
    });
}

export default {
    logExecution,
    logStep,
    logWithContext,
    logErrorWithContext
};
