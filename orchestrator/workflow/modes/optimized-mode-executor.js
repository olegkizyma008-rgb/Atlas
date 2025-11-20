/**
 * @fileoverview OptimizedModeExecutor - Executor для оптимізованого режиму
 * Виконує workflow з оптимізацією для швидкості
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

/**
 * Executor для оптимізованого режиму
 * Використовує OptimizedWorkflowManager для швидкого виконання
 */
export class OptimizedModeExecutor {
    /**
     * @param {Object} config
     * @param {Object} config.logger - Logger instance
     * @param {Object} config.container - DI Container
     * @param {Object} config.res - Response object
     * @param {Object} config.wsManager - WebSocket manager
     * @param {Object} config.ttsSyncManager - TTS sync manager
     * @param {Object} config.localizationService - Localization service
     */
    constructor(config = {}) {
        this.logger = config.logger || console;
        this.container = config.container;
        this.res = config.res;
        this.wsManager = config.wsManager;
        this.ttsSyncManager = config.ttsSyncManager;
        this.localizationService = config.localizationService;
    }

    /**
     * Виконати workflow в оптимізованому режимі
     * @param {string} userMessage - Повідомлення користувача
     * @param {Object} context - Контекст виконання
     * @returns {Promise<Object>} Результат виконання
     */
    async execute(userMessage, context = {}) {
        const { session, options = {} } = context;
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.logger.system('optimized-mode-executor',
            `[${executionId}] Starting optimized mode execution`,
            { userMessage: userMessage.substring(0, 100) }
        );

        try {
            // Отримати OptimizedWorkflowManager з DI контейнера
            const optimizedManager = this.container.resolve('optimizedWorkflowManager');

            if (!optimizedManager) {
                throw new Error('OptimizedWorkflowManager not available in DI container');
            }

            // Виконати workflow в оптимізованому режимі
            const result = await optimizedManager.execute(userMessage, {
                session,
                wsManager: this.wsManager,
                ttsSyncManager: this.ttsSyncManager,
                localizationService: this.localizationService,
                ...options
            });

            this.logger.system('optimized-mode-executor',
                `[${executionId}] Optimized mode execution completed`,
                { success: true }
            );

            return {
                success: true,
                mode: 'optimized',
                result,
                executionId
            };

        } catch (error) {
            this.logger.error('optimized-mode-executor',
                `[${executionId}] Optimized mode execution failed`,
                { error: error.message, stack: error.stack }
            );

            throw error;
        }
    }
}

export default OptimizedModeExecutor;
