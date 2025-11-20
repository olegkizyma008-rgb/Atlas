/**
 * @fileoverview ErrorHandler - Консолідована обробка помилок
 * Видалює дублювання обробки помилок з 47 файлів (~470 рядків)
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

/**
 * Утиліта для консолідованої обробки помилок
 */
export class ErrorHandler {
    /**
     * Обробити операцію з обробкою помилок
     * @param {Function} operation - Асинхронна операція
     * @param {Object} options - Опції обробки
     * @param {Object} options.logger - Logger instance
     * @param {string} options.componentName - Назва компоненту
     * @param {string} options.operationName - Назва операції
     * @param {boolean} options.throwError - Кидати помилку (default: true)
     * @param {Object} options.context - Контекст помилки
     * @returns {Promise<Object>} Результат операції
     */
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

    /**
     * Обробити операцію з повторами та обробкою помилок
     * @param {Function} operation - Асинхронна операція
     * @param {Object} options - Опції обробки
     * @param {number} options.maxAttempts - Максимум спроб (default: 3)
     * @param {number} options.delayMs - Затримка між спробами (default: 1000)
     * @param {Object} options.logger - Logger instance
     * @param {string} options.componentName - Назва компоненту
     * @param {string} options.operationName - Назва операції
     * @param {Object} options.context - Контекст помилки
     * @returns {Promise<Object>} Результат операції
     */
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
                    `${operationName} attempt ${attempt} failed, retrying in ${delayMs}ms`,
                    { error: error.message }
                );

                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    /**
     * Обробити операцію з timeout
     * @param {Function} operation - Асинхронна операція
     * @param {Object} options - Опції обробки
     * @param {number} options.timeoutMs - Timeout в мс (default: 30000)
     * @param {Object} options.logger - Logger instance
     * @param {string} options.componentName - Назва компоненту
     * @param {string} options.operationName - Назва операції
     * @returns {Promise<Object>} Результат операції
     */
    static async handleWithTimeout(operation, options = {}) {
        const {
            timeoutMs = 30000,
            logger,
            componentName = 'unknown',
            operationName = 'operation'
        } = options;

        return Promise.race([
            operation(),
            new Promise((_, reject) =>
                setTimeout(() => {
                    const error = new Error(`${operationName} timeout after ${timeoutMs}ms`);
                    logger?.error?.(componentName, error.message);
                    reject(error);
                }, timeoutMs)
            )
        ]);
    }
}

export default ErrorHandler;
