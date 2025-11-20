/**
 * @fileoverview GrishaVerifyItemProcessor - Експорт модулів
 * Розділений grisha-verify-item-processor.js на модулі
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

import { GrishaVerifyItemProcessorBase } from './base.js';

/**
 * Основний клас GrishaVerifyItemProcessor
 * Розширює базовий клас та додає основну функціональність
 */
export class GrishaVerifyItemProcessor extends GrishaVerifyItemProcessorBase {
    /**
     * Виконати верифікацію елемента
     * @param {Object} context - Контекст виконання
     * @returns {Promise<Object>} Результат верифікації
     */
    async execute(context) {
        const { item, todo, session } = context;

        // Валідувати елемент
        if (!this._validateItem(item)) {
            return { success: false, error: 'Invalid item' };
        }

        const verificationContext = this._getVerificationContext(item, todo, session);

        this._logVerificationStep('Starting verification', verificationContext);

        try {
            // Основна логіка верифікації буде додана в наступних фазах
            // Поки що повертаємо базовий результат
            return {
                success: true,
                item,
                verificationContext
            };

        } catch (error) {
            this._handleVerificationError(error, 'Verification execution failed');
            throw error;
        }
    }
}

export default GrishaVerifyItemProcessor;
