/**
 * @fileoverview HybridModeExecutor - Executor для гібридного режиму
 * Виконує workflow з паралельною обробкою
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

/**
 * Executor для гібридного режиму
 * Використовує HybridWorkflowExecutor для паралельного виконання
 */
export class HybridModeExecutor {
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
     * Виконати workflow в гібридному режимі
     * @param {string} userMessage - Повідомлення користувача
     * @param {Object} context - Контекст виконання
     * @returns {Promise<Object>} Результат виконання
     */
    async execute(userMessage, context = {}) {
        const { session, options = {} } = context;
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.logger.system('hybrid-mode-executor',
            `[${executionId}] Starting hybrid mode execution`,
            { userMessage: userMessage.substring(0, 100) }
        );

        try {
            // Отримати HybridWorkflowExecutor з DI контейнера
            const hybridExecutor = this.container.resolve('hybridWorkflowExecutor');

            if (!hybridExecutor) {
                throw new Error('HybridWorkflowExecutor not available in DI container');
            }

            // Виконати workflow в гібридному режимі
            const result = await hybridExecutor.execute(userMessage, {
                session,
                wsManager: this.wsManager,
                ttsSyncManager: this.ttsSyncManager,
                localizationService: this.localizationService,
                ...options
            });

            this.logger.system('hybrid-mode-executor',
                `[${executionId}] Hybrid mode execution completed`,
                { success: true }
            );

            return {
                success: true,
                mode: 'hybrid',
                result,
                executionId
            };

        } catch (error) {
            this.logger.error('hybrid-mode-executor',
                `[${executionId}] Hybrid mode execution failed`,
                { error: error.message, stack: error.stack }
            );

            throw error;
        }
    }
}

export default HybridModeExecutor;
