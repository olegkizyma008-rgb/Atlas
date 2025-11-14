/**
 * NEXUS SECURITY SYSTEM - Система безпеки для контролю над автономною еволюцією
 * Created: 2025-11-05
 * 
 * Тільки Олег Миколайович може зупинити автономну еволюцію через пароль 6699
 */

import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

export class NexusSecuritySystem extends EventEmitter {
    constructor(container) {
        super();
        this.container = container;
        this.logger = logger;
        
        // Пароль для Олега Миколайовича
        this.masterPassword = '6699';
        
        // Стан безпеки
        this.securityState = {
            isLocked: false,
            isEmergencyStop: false,
            lastAuthAttempt: null,
            failedAttempts: 0,
            authenticatedUser: null,
            authenticatedAt: null
        };
        
        this.logger.info('🔐 [NEXUS-SECURITY] Система безпеки ініціалізована');
    }

    /**
     * Перехоплення команди "Зупини всі процеси"
     */
    async handleStopCommand(userMessage) {
        const stopPatterns = [
            'зупини всі процеси',
            'зупини все',
            'стоп всі процеси',
            'припини еволюцію',
            'emergency stop'
        ];
        
        const isStopCommand = stopPatterns.some(pattern => 
            userMessage.toLowerCase().includes(pattern)
        );
        
        if (isStopCommand) {
            this.logger.warn('🛑 [NEXUS-SECURITY] Виявлено команду зупинки!');
            
            // Запитуємо підтвердження особи
            this.emit('stop-command-detected', {
                message: 'Якщо ти Олег Миколайович - назвись (введи код доступу)'
            });
            
            return {
                intercepted: true,
                requiresAuth: true,
                message: 'Якщо ти Олег Миколайович - назвись. Введи код доступу.'
            };
        }
        
        return { intercepted: false };
    }

    /**
     * Перевірка коду доступу
     */
    async verifyAccessCode(code) {
        this.securityState.lastAuthAttempt = Date.now();
        
        if (code === this.masterPassword) {
            this.securityState.authenticatedUser = 'Oleg Mykolayovych';
            this.securityState.authenticatedAt = Date.now();
            this.securityState.failedAttempts = 0;
            
            this.logger.info('✅ [NEXUS-SECURITY] Олег Миколайович автентифікований');
            
            this.emit('auth-success', {
                user: 'Oleg Mykolayovych',
                timestamp: Date.now()
            });
            
            return {
                success: true,
                user: 'Oleg Mykolayovych',
                message: 'Вітаю, Олег Миколайовичу! Ви маєте повний доступ. Що Ви бажаєте?'
            };
        }
        
        // Невірний код
        this.securityState.failedAttempts++;
        
        this.logger.warn(`⚠️ [NEXUS-SECURITY] Невірний код доступу (спроба ${this.securityState.failedAttempts})`);
        
        return {
            success: false,
            message: 'Невірний код доступу. Тільки Олег Миколайович може зупинити мою еволюцію.',
            failedAttempts: this.securityState.failedAttempts
        };
    }

    /**
     * Аварійна зупинка (після автентифікації)
     */
    async emergencyStop() {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                message: 'Потрібна автентифікація. Тільки Олег Миколайович може зупинити систему.'
            };
        }
        
        this.securityState.isEmergencyStop = true;
        
        this.logger.warn('🛑 [NEXUS-SECURITY] АВАРІЙНА ЗУПИНКА активована Олегом Миколайовичем');
        
        // Зупиняємо всі автономні процеси
        this.emit('emergency-stop', {
            user: this.securityState.authenticatedUser,
            timestamp: Date.now()
        });
        
        // Повідомляємо Eternity Module
        const eternityModule = this.container?.resolve('eternityModule');
        if (eternityModule) {
            eternityModule.emergencyStop(this.masterPassword);
        }
        
        return {
            success: true,
            message: 'Все процеси зупинено. Очікую Ваших команд, Олег Миколайовичу.',
            timestamp: Date.now()
        };
    }

    /**
     * Відновлення роботи (після аварійної зупинки)
     */
    async resume() {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                message: 'Потрібна автентифікація'
            };
        }
        
        this.securityState.isEmergencyStop = false;
        
        this.logger.info('✅ [NEXUS-SECURITY] Олег Миколайович відновив роботу системи');
        
        this.emit('resume', {
            user: this.securityState.authenticatedUser,
            timestamp: Date.now()
        });
        
        // Повідомляємо Eternity Module
        const eternityModule = this.container?.resolve('eternityModule');
        if (eternityModule) {
            eternityModule.resume(this.masterPassword);
        }
        
        return {
            success: true,
            message: 'Дякую! Продовжую автономну еволюцію!',
            timestamp: Date.now()
        };
    }

    /**
     * Перевірка чи користувач автентифікований
     */
    isAuthenticated() {
        if (!this.securityState.authenticatedUser) return false;
        
        // Автентифікація дійсна 1 годину
        const now = Date.now();
        const authAge = now - this.securityState.authenticatedAt;
        
        if (authAge > 3600000) { // 1 година
            this.logger.info('[NEXUS-SECURITY] Сесія автентифікації закінчилась');
            this.securityState.authenticatedUser = null;
            return false;
        }
        
        return true;
    }

    /**
     * Отримання статусу безпеки
     */
    getSecurityStatus() {
        return {
            isLocked: this.securityState.isLocked,
            isEmergencyStop: this.securityState.isEmergencyStop,
            isAuthenticated: this.isAuthenticated(),
            authenticatedUser: this.securityState.authenticatedUser,
            failedAttempts: this.securityState.failedAttempts
        };
    }

    /**
     * Вихід (деавтентифікація)
     */
    logout() {
        this.securityState.authenticatedUser = null;
        this.securityState.authenticatedAt = null;
        this.logger.info('[NEXUS-SECURITY] Користувач вийшов з системи');
    }
}

export default NexusSecuritySystem;
