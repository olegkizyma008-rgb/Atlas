/**
 * @fileoverview GrishaVerifyItemProcessorBase - Базовий клас для верифікації
 * Частина розділення grisha-verify-item-processor.js (2,982 рядків)
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

import logger from '../../../utils/logger.js';

/**
 * Базовий клас для верифікації елементів
 */
export class GrishaVerifyItemProcessorBase {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpTodoManager - MCPTodoManager instance
     * @param {Object} dependencies.wsManager - WebSocket manager
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.config - Configuration
     * @param {Function} dependencies.callLLM - LLM client function
     * @param {Object} dependencies.container - DI Container
     */
    constructor({ mcpTodoManager, wsManager, logger: loggerInstance, config = {}, tetyanaToolSystem, callLLM, container }) {
        this.mcpTodoManager = mcpTodoManager;
        this.wsManager = wsManager;
        this.logger = loggerInstance || logger;
        this.tetyanaToolSystem = tetyanaToolSystem;
        this.callLLM = callLLM;
        this.container = container;
        this.config = config;
    }

    /**
     * Генерувати ID верифікації
     * @protected
     * @returns {string} Verification ID
     */
    _generateVerificationId() {
        return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Логувати крок верифікації
     * @protected
     * @param {string} step - Назва кроку
     * @param {Object} context - Контекст
     */
    _logVerificationStep(step, context = {}) {
        this.logger.system('grisha-verify-item', `[VERIFY] ${step}`, context);
    }

    /**
     * Обробити помилку верифікації
     * @protected
     * @param {Error} error - Помилка
     * @param {string} context - Контекст помилки
     */
    _handleVerificationError(error, context = '') {
        this.logger.error('grisha-verify-item', `[VERIFY-ERROR] ${context}`, {
            error: error.message,
            stack: error.stack
        });
    }

    /**
     * Валідувати елемент перед верифікацією
     * @protected
     * @param {Object} item - Елемент для валідації
     * @returns {boolean} True якщо валідний
     */
    _validateItem(item) {
        if (!item || typeof item !== 'object') {
            this._handleVerificationError(new Error('Invalid item'), 'Item validation failed');
            return false;
        }

        if (!item.id) {
            this._handleVerificationError(new Error('Item missing ID'), 'Item validation failed');
            return false;
        }

        return true;
    }

    /**
     * Отримати контекст верифікації
     * @protected
     * @param {Object} item - Елемент
     * @param {Object} todo - TODO об'єкт
     * @param {Object} session - Сесія
     * @returns {Object} Контекст верифікації
     */
    _getVerificationContext(item, todo, session) {
        return {
            itemId: item.id,
            todoId: todo?.id,
            sessionId: session?.id,
            timestamp: Date.now(),
            verificationId: this._generateVerificationId()
        };
    }
}

export default GrishaVerifyItemProcessorBase;
