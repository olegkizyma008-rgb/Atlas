/**
 * @fileoverview StandardModeExecutor - Executor для стандартного режиму
 * Виконує workflow через WorkflowStateMachine
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

/**
 * Executor для стандартного режиму
 * Використовує WorkflowStateMachine для послідовного виконання
 */
export class StandardModeExecutor {
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
     * Виконати workflow в стандартному режимі
     * @param {string} userMessage - Повідомлення користувача
     * @param {Object} context - Контекст виконання
     * @returns {Promise<Object>} Результат виконання
     */
    async execute(userMessage, context = {}) {
        const { session, options = {} } = context;
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.logger.system('standard-mode-executor',
            `[${executionId}] Starting standard mode execution`,
            { userMessage: userMessage.substring(0, 100) }
        );

        try {
            // Отримати WorkflowStateMachine з DI контейнера
            const stateMachine = this.container.resolve('workflowStateMachine');

            if (!stateMachine) {
                throw new Error('WorkflowStateMachine not available in DI container');
            }

            // Виконати workflow через state machine
            const result = await stateMachine.execute(userMessage, {
                session,
                wsManager: this.wsManager,
                ttsSyncManager: this.ttsSyncManager,
                localizationService: this.localizationService,
                ...options
            });

            this.logger.system('standard-mode-executor',
                `[${executionId}] Standard mode execution completed`,
                { success: true }
            );

            return {
                success: true,
                mode: 'standard',
                result,
                executionId
            };

        } catch (error) {
            this.logger.error('standard-mode-executor',
                `[${executionId}] Standard mode execution failed`,
                { error: error.message, stack: error.stack }
            );

            throw error;
        }
    }
}

export default StandardModeExecutor;
