/**
 * @fileoverview ModeExecutorFactory - Фабрика для створення executor'ів за режимами
 * Спрощує executor-v3.js з 1,550 до <500 рядків
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

import { HybridModeExecutor } from './hybrid-mode-executor.js';
import { OptimizedModeExecutor } from './optimized-mode-executor.js';
import { StandardModeExecutor } from './standard-mode-executor.js';

/**
 * Фабрика для створення executor'ів за режимами
 */
export class ModeExecutorFactory {
    /**
     * Створити executor за режимом
     * @param {string} mode - Режим виконання (hybrid, optimized, standard)
     * @param {Object} config - Конфігурація
     * @returns {Object} Executor instance
     */
    static createExecutor(mode, config) {
        const normalizedMode = (mode || 'standard').toLowerCase();

        switch (normalizedMode) {
            case 'hybrid':
                return new HybridModeExecutor(config);

            case 'optimized':
                return new OptimizedModeExecutor(config);

            case 'standard':
            default:
                return new StandardModeExecutor(config);
        }
    }

    /**
     * Отримати доступні режими
     * @returns {string[]} Список режимів
     */
    static getAvailableModes() {
        return ['hybrid', 'optimized', 'standard'];
    }

    /**
     * Перевірити, чи режим валідний
     * @param {string} mode - Режим для перевірки
     * @returns {boolean} True якщо режим валідний
     */
    static isValidMode(mode) {
        return this.getAvailableModes().includes((mode || '').toLowerCase());
    }
}

export default ModeExecutorFactory;
