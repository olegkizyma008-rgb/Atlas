/**
 * @fileoverview DevSelfAnalysisProcessorBase - Базовий клас для самоаналізу
 * Частина розділення dev-self-analysis-processor.js (2,454 рядків)
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

import logger from '../../../utils/logger.js';

/**
 * Базовий клас для самоаналізу розробника
 */
export class DevSelfAnalysisProcessorBase {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.container - DI Container
     * @param {Object} dependencies.config - Configuration
     */
    constructor({ logger: loggerInstance, container, config = {} }) {
        this.logger = loggerInstance || logger;
        this.container = container;
        this.config = config;
    }

    /**
     * Генерувати ID аналізу
     * @protected
     * @returns {string} Analysis ID
     */
    _generateAnalysisId() {
        return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Логувати крок аналізу
     * @protected
     * @param {string} step - Назва кроку
     * @param {Object} context - Контекст
     */
    _logAnalysisStep(step, context = {}) {
        this.logger.system('dev-self-analysis', `[ANALYSIS] ${step}`, context);
    }

    /**
     * Обробити помилку аналізу
     * @protected
     * @param {Error} error - Помилка
     * @param {string} context - Контекст помилки
     */
    _handleAnalysisError(error, context = '') {
        this.logger.error('dev-self-analysis', `[ANALYSIS-ERROR] ${context}`, {
            error: error.message,
            stack: error.stack
        });
    }

    /**
     * Валідувати контекст аналізу
     * @protected
     * @param {Object} context - Контекст для валідації
     * @returns {boolean} True якщо валідний
     */
    _validateAnalysisContext(context) {
        if (!context || typeof context !== 'object') {
            this._handleAnalysisError(new Error('Invalid context'), 'Context validation failed');
            return false;
        }

        if (!context.userMessage) {
            this._handleAnalysisError(new Error('Missing userMessage'), 'Context validation failed');
            return false;
        }

        return true;
    }

    /**
     * Отримати контекст аналізу
     * @protected
     * @param {Object} context - Вхідний контекст
     * @returns {Object} Контекст аналізу
     */
    _getAnalysisContext(context) {
        return {
            userMessage: context.userMessage,
            sessionId: context.session?.id,
            timestamp: Date.now(),
            analysisId: this._generateAnalysisId()
        };
    }
}

export default DevSelfAnalysisProcessorBase;
