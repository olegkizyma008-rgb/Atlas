/**
 * CASCADE ACTIVATION MODULE
 * Модуль активації та інтеграції Cascade в систему Atlas
 * 
 * Створено: 2025-11-02
 * 
 * Цей модуль відповідає за:
 * - Перевірку готовності системи
 * - Активацію Cascade Controller
 * - Інтеграцію з Windsurf API
 * - Запуск автономного режиму
 */

import { CascadeController } from './cascade-controller.js';
import { getWindsurfClient } from '../../config/windsurf-integration.js';
import logger from '../utils/logger.js';

export class CascadeActivation {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        this.cascadeController = null;
        this.windsurfClient = null;
        this.isActive = false;
        
        this.status = {
            initialized: false,
            apiConnected: false,
            controllerActive: false,
            autonomousMode: false,
            lastCheck: null
        };
    }

    /**
     * Повна активація системи Cascade
     */
    async activate() {
        this.logger.info('🚀 [CASCADE ACTIVATION] Starting full system activation...');
        
        try {
            // 1. Перевірка Windsurf API
            await this._checkWindsurfAPI();
            
            // 2. Ініціалізація Cascade Controller
            await this._initializeCascadeController();
            
            // 3. Перевірка режиму роботи
            await this._configureOperationMode();
            
            // 4. Запуск моніторингу
            await this._startMonitoring();
            
            // 5. Фінальна перевірка
            await this._performSystemCheck();
            
            this.isActive = true;
            this.status.initialized = true;
            
            this.logger.info('✅ [CASCADE ACTIVATION] System activated successfully!', this.status);
            
            // Звіт про активацію
            return this._generateActivationReport();
            
        } catch (error) {
            this.logger.error('❌ [CASCADE ACTIVATION] Failed to activate:', error);
            this.isActive = false;
            throw error;
        }
    }

    /**
     * Перевірка доступності Windsurf API
     */
    async _checkWindsurfAPI() {
        this.logger.info('[CASCADE] Checking Windsurf API...');
        
        this.windsurfClient = getWindsurfClient();
        
        if (!this.windsurfClient.isActive) {
            throw new Error('Windsurf API key not configured. Please set WINDSURF_API_KEY in .env');
        }
        
        const health = await this.windsurfClient.healthCheck();
        
        if (!health.available) {
            throw new Error(`Windsurf API not available: ${health.error}`);
        }
        
        this.status.apiConnected = true;
        this.logger.info('✅ [CASCADE] Windsurf API connected successfully', {
            model: health.model
        });
    }

    /**
     * Ініціалізація Cascade Controller
     */
    async _initializeCascadeController() {
        this.logger.info('[CASCADE] Initializing Cascade Controller...');
        
        this.cascadeController = new CascadeController(this.container);
        const initialized = await this.cascadeController.initialize();
        
        if (!initialized) {
            throw new Error('Failed to initialize Cascade Controller');
        }
        
        this.status.controllerActive = true;
        this.logger.info('✅ [CASCADE] Controller initialized successfully');
    }

    /**
     * Налаштування режиму роботи
     */
    async _configureOperationMode() {
        const isContinuous = this.windsurfClient.isInContinuousMode();
        
        if (isContinuous) {
            this.logger.info('⚡ [CASCADE] Enabling CONTINUOUS mode - Autonomous operations active');
            this.status.autonomousMode = true;
            
            // Додаткові налаштування для автономного режиму
            if (this.cascadeController) {
                this.cascadeController.enableAutonomousMode = true;
            }
        } else {
            this.logger.info('🔧 [CASCADE] ON-DEMAND mode - Manual approval required');
            this.status.autonomousMode = false;
        }
    }

    /**
     * Запуск моніторингу системи
     */
    async _startMonitoring() {
        this.logger.info('[CASCADE] Starting system monitoring...');
        
        // Періодична перевірка стану
        setInterval(async () => {
            await this._performSystemCheck();
        }, 60000); // Кожну хвилину
        
        this.logger.info('✅ [CASCADE] Monitoring started');
    }

    /**
     * Перевірка стану системи
     */
    async _performSystemCheck() {
        const checks = {
            apiAvailable: false,
            controllerActive: false,
            memoryAvailable: false,
            problemsDetected: 0
        };
        
        // Перевірка API
        if (this.windsurfClient) {
            const health = await this.windsurfClient.healthCheck();
            checks.apiAvailable = health.available;
        }
        
        // Перевірка контролера
        if (this.cascadeController) {
            const state = this.cascadeController.getControlState();
            checks.controllerActive = state.active;
            checks.problemsDetected = state.errorsFound - state.errorsFixed;
        }
        
        this.status.lastCheck = new Date().toISOString();
        
        return checks;
    }

    /**
     * Генерація звіту про активацію
     */
    _generateActivationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            status: 'ACTIVE',
            
            configuration: {
                mode: this.windsurfClient?.config.operationMode || 'unknown',
                primaryModel: this.windsurfClient?.config.models.primary || 'unknown',
                apiEndpoint: this.windsurfClient?.config.endpoint || 'unknown'
            },
            
            capabilities: {
                codeAnalysis: true,
                selfImprovement: true,
                autonomousMode: this.status.autonomousMode,
                visionSupport: true,
                codestralIntegration: true
            },
            
            systemStatus: this.status,
            
            instructions: `
═══════════════════════════════════════════════════════════════
🌟 CASCADE SYSTEM ACTIVATED - Інструкція роботи
═══════════════════════════════════════════════════════════════

РЕЖИМ: ${this.status.autonomousMode ? 'CONTINUOUS (Автономний)' : 'ON-DEMAND (Ручний)'}

ЯК ПРАЦЮЄ СИСТЕМА:

1. АВТОНОМНИЙ РЕЖИМ (якщо активний):
   • Cascade постійно моніторить систему
   • Автоматично виявляє та виправляє проблеми
   • Додає нові можливості самостійно
   • Звітує про кожну дію в реальному часі
   • НЕ потребує дозволу для low-risk операцій

2. РУЧНИЙ РЕЖИМ:
   • Cascade чекає на команди
   • Аналізує на запит
   • Пропонує покращення для схвалення
   • ВСІ зміни потребують дозволу

3. ВЗАЄМОДІЯ:
   • Команда: "Cascade, проаналізуй систему"
   • Команда: "Cascade, виправ знайдені проблеми"
   • Команда: "Cascade, звіт про стан"

4. МОДЕЛІ В ВИКОРИСТАННІ:
   • Primary: ${this.windsurfClient?.config.models.primary}
   • Code Analysis: ${this.windsurfClient?.config.models.codeAnalysis}
   • Fallback: ${this.windsurfClient?.config.models.fallback}

5. БЕЗПЕКА:
   • Всі дії логуються в audit log
   • Критичні зміни ЗАВЖДИ потребують схвалення
   • Backup перед кожною зміною
   • Максимум ${process.env.CASCADE_MAX_CHANGES_PER_CYCLE || 10} змін за цикл

6. ЗВІТНІСТЬ:
   • Автоматичні звіти кожну хвилину
   • Детальні логи в orchestrator/logs/
   • Спеціальні звіти для Олега Миколайовича

═══════════════════════════════════════════════════════════════
            `,
            
            nextSteps: [
                'Система готова до роботи',
                'Cascade моніторить стан Atlas',
                this.status.autonomousMode ? 
                    'Автономні операції АКТИВНІ' : 
                    'Чекаю на команди'
            ]
        };
        
        return report;
    }

    /**
     * Деактивація системи
     */
    async deactivate() {
        this.logger.info('[CASCADE] Deactivating system...');
        
        this.isActive = false;
        this.status.initialized = false;
        this.status.controllerActive = false;
        
        // Генерація фінального звіту
        if (this.cascadeController) {
            const report = await this.cascadeController.generateReportForOleg();
            this.logger.info('[CASCADE] Final report generated:', report.summary);
        }
        
        this.logger.info('[CASCADE] System deactivated');
    }

    /**
     * Отримання поточного статусу
     */
    getStatus() {
        return {
            isActive: this.isActive,
            ...this.status,
            controllerState: this.cascadeController?.getControlState() || null
        };
    }
}

// Експорт для використання в системі
export default CascadeActivation;
