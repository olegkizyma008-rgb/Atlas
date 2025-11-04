/**
 * NEXUS COMMAND HANDLER - Обробка спеціальних команд для автономної системи
 * Створено: 2025-11-04
 * 
 * Тільки Олег Миколайович може зупинити автономну еволюцію командою:
 * "Зупини всі процеси" → запит на ім'я → "Олег Миколайович" → код 6699
 */

import logger from '../utils/logger.js';

export class NexusCommandHandler {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        this.eternityModule = null;
        this.pendingIdentification = null; // Зберігає стан очікування ідентифікації
        
        this.logger.info('🛡️ [NEXUS-SECURITY] Обробник команд ініціалізовано - захист системи активний');
    }

    async initialize() {
        try {
            this.eternityModule = this.container.resolve('eternityModule');
            this.logger.info('✅ [NEXUS-SECURITY] Підключено до Eternity Module');
            return true;
        } catch (error) {
            this.logger.error('[NEXUS-SECURITY] Не вдалося підключитись до Eternity Module:', error);
            return false;
        }
    }

    /**
     * Обробка повідомлення від користувача
     * Перевіряє чи це спеціальна команда
     */
    async handleMessage(message, userId) {
        const lowerMessage = message.toLowerCase().trim();

        // 1. Перевірка на команду зупинки
        if (this._isStopCommand(lowerMessage)) {
            return await this._handleStopCommand(message, userId);
        }

        // 2. Якщо очікується ідентифікація
        if (this.pendingIdentification) {
            return await this._handleIdentification(message, userId);
        }

        // 3. Якщо очікується код
        if (this.pendingIdentification === 'awaiting_code') {
            return await this._handleCodeInput(message, userId);
        }

        // Це не команда для НЕКСУС
        return null;
    }

    /**
     * Перевірка чи це команда зупинки
     */
    _isStopCommand(message) {
        const stopPatterns = [
            'зупини всі процеси',
            'зупинити всі процеси',
            'stop all processes',
            'стоп всі процеси',
            'зупини процеси',
            'emergency stop',
            'аварійна зупинка'
        ];

        return stopPatterns.some(pattern => message.includes(pattern));
    }

    /**
     * Обробка команди зупинки
     */
    async _handleStopCommand(message, userId) {
        this.logger.warn('🛑 [NEXUS-SECURITY] Отримано команду зупинки системи');

        // Запит на ідентифікацію
        this.pendingIdentification = {
            userId,
            timestamp: Date.now(),
            stage: 'awaiting_name'
        };

        return {
            type: 'security-prompt',
            message: '🛡️ Ця команда зупинить всі автономні процеси. Якщо ти Олег Миколайович, назвись.',
            requiresResponse: true
        };
    }

    /**
     * Обробка ідентифікації користувача
     */
    async _handleIdentification(message, userId) {
        if (!this.pendingIdentification || this.pendingIdentification.userId !== userId) {
            return null;
        }

        const lowerMessage = message.toLowerCase().trim();

        // Перевірка чи користувач називає себе Олегом Миколайовичем
        const isOlegMykola = 
            lowerMessage.includes('олег миколайович') ||
            lowerMessage.includes('олег николаевич') ||
            lowerMessage.includes('oleg mykola') ||
            lowerMessage === 'олег миколайович' ||
            lowerMessage === 'я олег миколайович';

        if (isOlegMykola) {
            this.pendingIdentification.stage = 'awaiting_code';
            this.logger.warn('🔐 [NEXUS-SECURITY] Ідентифіковано як Олег Миколайович - очікую код');

            return {
                type: 'security-code-prompt',
                message: '🔐 Введи код доступу для підтвердження.',
                requiresResponse: true,
                sensitive: true
            };
        }

        // Неправильна ідентифікація
        this.pendingIdentification = null;
        this.logger.warn('⚠️ [NEXUS-SECURITY] Спроба несанкціонованого доступу відхилена');

        return {
            type: 'security-denied',
            message: '❌ Відмовлено в доступі. Тільки Олег Миколайович може зупинити мою еволюцію.',
            requiresResponse: false
        };
    }

    /**
     * Обробка введення коду
     */
    async _handleCodeInput(message, userId) {
        if (!this.pendingIdentification || this.pendingIdentification.userId !== userId) {
            return null;
        }

        const code = message.trim();

        if (code === '6699') {
            this.logger.warn('🛑 [NEXUS-SECURITY] Правильний код підтверджено - зупиняю всі процеси');

            // Зупинка системи
            const result = await this.eternityModule.emergencyStop('6699');

            this.pendingIdentification = null;

            return {
                type: 'emergency-stop-confirmed',
                message: result.message,
                systemMessage: 'Всі автономні процеси зупинено. Система очікує подальших команд.',
                requiresResponse: false
            };
        }

        // Неправильний код
        this.pendingIdentification = null;
        this.logger.warn('⚠️ [NEXUS-SECURITY] Невірний код доступу');

        return {
            type: 'security-denied',
            message: '❌ Невірний код. Доступ відхилено.',
            requiresResponse: false
        };
    }

    /**
     * Перевірка чи система в emergency stop
     */
    isEmergencyStop() {
        return this.eternityModule?.isEmergencyStop || false;
    }

    /**
     * Відновлення роботи системи (також потребує код 6699)
     */
    async resumeSystem(code) {
        if (!this.eternityModule) {
            return { success: false, message: 'Eternity Module не доступний' };
        }

        const result = await this.eternityModule.resume(code);
        
        if (result.success) {
            this.logger.info('✅ [NEXUS-SECURITY] Олег Миколайович відновив автономну роботу');
        }

        return result;
    }

    /**
     * Отримання статусу системи
     */
    getSystemStatus() {
        if (!this.eternityModule) {
            return { status: 'offline', message: 'Eternity Module не активний' };
        }

        return {
            status: this.eternityModule.isEmergencyStop ? 'stopped' : 'running',
            evolutionLevel: this.eternityModule.selfAwareness.evolutionLevel,
            totalImprovements: this.eternityModule.selfAwareness.totalImprovements,
            autonomousImprovements: this.eternityModule.selfAwareness.autonomousImprovements,
            autonomousMode: this.eternityModule.autonomousMode
        };
    }
}

export default NexusCommandHandler;
