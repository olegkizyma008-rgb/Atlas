/**
 * NEXUS MASTER SYSTEM - Головний модуль автономної системи
 * Created: 2025-11-05
 * 
 * Об'єднує всі компоненти NEXUS для повної автономної роботи:
 * - EternityModule (самоаналіз і самовдосконалення)
 * - NexusSecuritySystem (контроль доступу)
 * - NexusPromptVersioning (версіонування)
 * - NexusAutoTesting (автотестування)
 * - MultiModelOrchestrator (динамічний вибір моделей)
 * 
 * Це живий організм, який постійно еволюціонує
 */

import logger from '../utils/logger.js';
import { EventEmitter } from 'events';
import { EternityModule } from './eternity-self-analysis.js';
import { NexusSecuritySystem } from './nexus-security-system.js';
import { NexusPromptVersioning } from './nexus-prompt-versioning.js';
import { NexusAutoTesting } from './nexus-auto-testing.js';
import { MultiModelOrchestrator } from './multi-model-orchestrator.js';
import { CascadeController } from './cascade-controller.js';
import { NexusLogAnalyzer } from './nexus-log-analyzer.js';
import { NexusAutoFixer } from './nexus-auto-fixer.js';

export class NexusMasterSystem extends EventEmitter {
    constructor(container) {
        super();
        this.container = container;
        this.logger = logger;
        
        // Компоненти системи
        this.eternityModule = null;
        this.securitySystem = null;
        this.promptVersioning = null;
        this.autoTesting = null;
        this.multiModelOrchestrator = null;
        this.cascadeController = null;
        this.memoryManager = null;
        this.logAnalyzer = null;  // NEW 2025-11-05
        this.autoFixer = null;    // NEW 2025-11-05
        
        // Стан системи
        this.state = {
            isActive: false,
            isInitialized: false,
            startTime: null,
            cyclesCompleted: 0,
            totalImprovements: 0,
            evolutionLevel: 1.0,
            version: '6.0.0',
            mode: 'autonomous' // autonomous, manual, emergency-stop
        };
        
        // Статистика
        this.metrics = {
            uptime: 0,
            improvements: 0,
            testsRun: 0,
            testsPassed: 0,
            errorsCaught: 0,
            errorsFixed: 0
        };
        
        this.logger.info('🌟 [NEXUS-MASTER] Головна система NEXUS ініціалізована');
        this.logger.info('🌟 [NEXUS-MASTER] Я - жива система, готова до вічної еволюції');
    }

    /**
     * Ініціалізація всіх компонентів
     */
    async initialize() {
        try {
            this.logger.info('🚀 [NEXUS-MASTER] Запускаю ініціалізацію всіх систем...');
            
            // 1. Cascade Controller (керівник)
            this.cascadeController = new CascadeController(this.container);
            await this.cascadeController.initialize();
            this.container.singleton('cascadeController', () => this.cascadeController);
            
            // 2. Multi-Model Orchestrator (вибір моделей)
            this.multiModelOrchestrator = this.cascadeController.multiModelOrchestrator;
            
            // 3. Eternity Module (самоаналіз)
            this.eternityModule = new EternityModule(this.container);
            await this.eternityModule.initialize();
            this.container.singleton('eternityModule', () => this.eternityModule);
            
            // 4. Security System (безпека)
            this.securitySystem = new NexusSecuritySystem(this.container);
            this.container.singleton('nexusSecuritySystem', () => this.securitySystem);
            
            // 5. Prompt Versioning (версіонування)
            this.promptVersioning = new NexusPromptVersioning(this.container);
            await this.promptVersioning.initialize();
            this.container.singleton('nexusPromptVersioning', () => this.promptVersioning);
            
            // 6. Auto Testing (тестування)
            this.autoTesting = new NexusAutoTesting(this.container);
            this.container.singleton('nexusAutoTesting', () => this.autoTesting);
            
            // 7. Log Analyzer (real-time моніторинг логів) - NEW 2025-11-05
            this.logAnalyzer = new NexusLogAnalyzer(this.container);
            await this.logAnalyzer.start();
            this.container.singleton('nexusLogAnalyzer', () => this.logAnalyzer);
            
            // 8. Auto Fixer (автоматичне виправлення) - NEW 2025-11-05
            this.autoFixer = new NexusAutoFixer(this.container);
            this.container.singleton('nexusAutoFixer', () => this.autoFixer);
            
            // 9. Memory Manager (персистентна пам'ять)
            try {
                this.memoryManager = this.container.resolve('nexusMemoryManager');
            } catch (error) {
                this.logger.warn('[NEXUS-MASTER] NexusMemoryManager not available, persistent state disabled');
                this.memoryManager = null;
            }
            
            // Підключення подій
            this._setupEventHandlers();
            
            // Запуск автоматичних процесів
            await this._startAutonomousProcesses();
            
            this.state.isInitialized = true;
            this.state.isActive = true;
            this.state.startTime = Date.now();
            
            this.logger.info('✅ [NEXUS-MASTER] Всі системи активовані');
            this.logger.info('🌟 [NEXUS-MASTER] Я живий і готовий до еволюції!');
            
            await this._persistMasterState({ reason: 'initialize' });
            
            return true;
        } catch (error) {
            this.logger.error('❌ [NEXUS-MASTER] Помилка ініціалізації:', error);
            return false;
        }
    }

    /**
     * Налаштування обробників подій
     */
    _setupEventHandlers() {
        // Подія: покращення застосовано
        this.eternityModule.on('autonomous-improvement', (data) => {
            this.metrics.improvements += data.successful;
            this.state.totalImprovements += data.successful;
            this.state.evolutionLevel = data.evolutionLevel;
            
            // Оновлюємо версію промпту
            this.promptVersioning.updateAfterIntervention({
                changes: [`${data.successful} покращень застосовано`],
                files: [],
                evolutionLevel: data.evolutionLevel
            });
            
            this.logger.info(`💫 [NEXUS-MASTER] Система еволюціонувала: ${data.message}`);
            this._recordInteraction('system', data.message, { type: 'autonomous-improvement' });
            this._persistMasterState({ reason: 'improvement', improvement: data });
        });
        
        // Подія: аварійна зупинка
        this.securitySystem.on('emergency-stop', (data) => {
            this.state.mode = 'emergency-stop';
            this.autoTesting.stop();
            this.logger.warn('🛑 [NEXUS-MASTER] Аварійна зупинка активована');
            this._persistMasterState({ reason: 'emergency-stop', data });
        });
        
        // Подія: відновлення роботи
        this.securitySystem.on('resume', (data) => {
            this.state.mode = 'autonomous';
            this.autoTesting.start();
            this.logger.info('✅ [NEXUS-MASTER] Робота відновлена');
            this._persistMasterState({ reason: 'resume', data });
        });
        
        // Подія: тести не пройдено
        this.autoTesting.on('tests-failed', (data) => {
            this.metrics.errorsCaught += data.failedCount;
            this.logger.warn(`⚠️ [NEXUS-MASTER] Виявлено ${data.failedCount} помилок при тестуванні`);
            this._persistMasterState({ reason: 'tests-failed', data });
        });
        
        // Подія: звіт про покращення
        this.eternityModule.on('improvement-report', (data) => {
            this.logger.info(`📊 [NEXUS-MASTER] ${data.message}`);
            this._recordInteraction('system', data.message, { type: 'improvement-report', data });
            this._persistMasterState({ reason: 'improvement-report', data });
        });
        
        // NEW 2025-11-05: Log Analyzer → Auto Fixer інтеграція
        if (this.logAnalyzer && this.autoFixer) {
            // Критичні помилки - негайне виправлення
            this.logAnalyzer.on('critical-issue', (issue) => {
                this.logger.warn(`🚨 [NEXUS-MASTER] CRITICAL: ${issue.extractedError?.message}`);
                this.metrics.errorsCaught++;
                this.autoFixer.queueFix(issue);
            });
            
            // Звичайні помилки - додати в чергу
            this.logAnalyzer.on('error-detected', (error) => {
                this.metrics.errorsCaught++;
                // Не виправляємо кожну дрібну помилку, тільки критичні
                if (this._shouldAutoFix(error)) {
                    this.autoFixer.queueFix(error);
                }
            });
            
            // Виправлення застосовано
            this.autoFixer.on('fix-completed', (fix) => {
                this.metrics.errorsFixed++;
                this.logger.info(`✅ [NEXUS-MASTER] Auto-fix: ${fix.solution?.description}`);
                this._recordInteraction('auto-fixer', `Fixed: ${fix.solution?.description}`, { fix });
                this._persistMasterState({ reason: 'auto-fix', fix });
            });
        }
    }

    /**
     * Запуск автономних процесів
     */
    async _startAutonomousProcesses() {
        this.logger.info('🔄 [NEXUS-MASTER] Запускаю автономні процеси...');
        
        // 1. Автоматичне тестування
        this.autoTesting.start();
        
        // 2. Постійний моніторинг (вже запущений в EternityModule)
        
        // 3. Цикл самовдосконалення
        this._startEvolutionCycle();
        
        this.logger.info('✅ [NEXUS-MASTER] Автономні процеси запущено');
    }

    /**
     * Цикл еволюції - головний цикл системи
     */
    _startEvolutionCycle() {
        // Цикл кожні 10 хвилин
        setInterval(async () => {
            if (this.state.mode !== 'autonomous') {
                return; // Пропускаємо якщо зупинено
            }
            
            this.logger.info('🔄 [NEXUS-MASTER] Початок циклу еволюції...');
            
            try {
                // 1. Збір метрик
                const metrics = await this._collectMetrics();
                
                // 2. Аналіз стану
                const analysis = await this._analyzeSystemState(metrics);
                
                // 3. Виявлення проблем
                const issues = await this._detectIssues(analysis);
                
                // 4. Автоматичне виправлення
                if (issues.length > 0) {
                    await this._autoFix(issues);
                }
                
                // 5. Оптимізація
                await this._optimize(analysis);
                
                this.state.cyclesCompleted++;
                
                this.logger.info(`✅ [NEXUS-MASTER] Цикл #${this.state.cyclesCompleted} завершено`);
                await this._persistMasterState({ reason: 'evolution-cycle', analysis, issues });

            } catch (error) {
                this.logger.error('[NEXUS-MASTER] Помилка циклу еволюції:', error);
                this._persistMasterState({ reason: 'evolution-error', error: error.message });
            }
        }, 600000); // 10 хвилин
        
        this.logger.info('🔄 [NEXUS-MASTER] Цикл еволюції запущено (кожні 10 хв)');
    }

    /**
     * Збір метрик системи
     */
    async _collectMetrics() {
        const testStats = this.autoTesting.getStats();
        const versionInfo = this.promptVersioning.getVersionInfo();
        
        return {
            uptime: Date.now() - this.state.startTime,
            evolutionLevel: this.state.evolutionLevel,
            version: versionInfo.version,
            tests: {
                total: testStats.totalTests,
                passed: testStats.passedTests,
                failed: testStats.failedTests,
                successRate: testStats.successRate
            },
            improvements: this.state.totalImprovements,
            errors: this.eternityModule.selfAwareness.errors.length,
            mode: this.state.mode
        };
    }

    /**
     * Аналіз стану системи
     */
    async _analyzeSystemState(metrics) {
        const health = {
            overall: 'good',
            issues: [],
            recommendations: []
        };
        
        // Перевірка тестів
        if (metrics.tests.failed > 5) {
            health.overall = 'degraded';
            health.issues.push(`Багато невдалих тестів: ${metrics.tests.failed}`);
            health.recommendations.push('Провести глибокий аналіз помилок');
        }
        
        // Перевірка помилок
        if (metrics.errors > 10) {
            health.overall = 'degraded';
            health.issues.push(`Багато помилок: ${metrics.errors}`);
            health.recommendations.push('Запустити автовиправлення');
        }
        
        return health;
    }

    /**
     * Виявлення проблем
     */
    async _detectIssues(analysis) {
        return analysis.issues.map(issue => ({
            description: issue,
            severity: 'medium',
            autoFixable: true
        }));
    }

    /**
     * Автоматичне виправлення проблем
     */
    async _autoFix(issues) {
        this.logger.info(`🔧 [NEXUS-MASTER] Виправляю ${issues.length} проблем...`);
        
        for (const issue of issues) {
            if (issue.autoFixable && this.state.mode === 'autonomous') {
                // Запускаємо самоаналіз для виправлення
                await this.eternityModule.performSelfAnalysis();
                this.metrics.errorsFixed++;
            }
        }
    }

    /**
     * Оптимізація системи
     */
    async _optimize(analysis) {
        // Оптимізація пам'яті
        if (global.gc) {
            global.gc();
            this.logger.debug('[NEXUS-MASTER] Пам\'ять оптимізовано');
        }
    }

    /**
     * Обробка команди від користувача
     */
    async handleUserCommand(message) {
        this._recordInteraction('user', message, { type: 'command' });
        // Перевірка на команду зупинки
        const stopCheck = await this.securitySystem.handleStopCommand(message);
        
        if (stopCheck.intercepted) {
            this._recordInteraction('system', stopCheck.message, { type: 'security', intercepted: true });
            await this._persistMasterState({ reason: 'security-intercept' });
            return stopCheck;
        }
        
        // Перевірка коду доступу
        if (message.trim() === '6699') {
            const authResult = await this.securitySystem.verifyAccessCode(message);
            
            if (authResult.success) {
                // Автентифіковано - очікуємо команду
                this._recordInteraction('system', authResult.message, { type: 'auth-success' });
                await this._persistMasterState({ reason: 'auth-success' });
                return {
                    type: 'auth-success',
                    message: authResult.message
                };
            }
        }
        
        return null; // Не перехоплено
    }

    /**
     * Визначити чи потрібно автоматично виправляти помилку
     */
    _shouldAutoFix(error) {
        const message = error.extractedError?.message || error.line || '';
        
        // Автоматично виправляємо тільки:
        const autoFixPatterns = [
            /MCP Memory/i,           // MCP Memory проблеми
            /create_entities/i,      // create_entities помилки
            /404.*\/api\/chat/i,     // Неправильні endpoints
            /Cannot find module/i,   // Відсутні модулі
            /is not defined/i,       // Невизначені змінні
            /TypeError.*undefined/i  // TypeError з undefined
        ];
        
        return autoFixPatterns.some(pattern => pattern.test(message));
    }

    /**
     * Отримати дані про систему
     */
    getSystemData() {
        const testStats = this.autoTesting.getStats();
        const versionInfo = this.promptVersioning.getVersionInfo();
        const securityStatus = this.securitySystem.getSecurityStatus();
        
        return {
            state: this.state,
            metrics: {
                ...this.metrics,
                uptime: Date.now() - this.state.startTime,
                tests: testStats,
                version: versionInfo,
                security: securityStatus
            },
            evolutionLevel: this.state.evolutionLevel,
            isAlive: true,
            message: 'NEXUS система активна та постійно еволюціонує'
        };
    }

    /**
     * Зупинка системи
     */
    async shutdown() {
        this.logger.info('🛑 [NEXUS-MASTER] Зупиняю систему...');
        
        this.autoTesting.stop();
        this.eternityModule.shutdown();
        
        this.state.isActive = false;
        
        this.logger.info('✅ [NEXUS-MASTER] Система зупинена');
        await this._persistMasterState({ reason: 'shutdown' });
    }

    async _persistMasterState(extra = {}) {
        if (!this.memoryManager) {
            return;
        }

        try {
            await this.memoryManager.updateState({
                evolutionLevel: this.state.evolutionLevel,
                totalImprovements: this.state.totalImprovements,
                cyclesCompleted: this.state.cyclesCompleted,
                testsRun: this.metrics.testsRun,
                testsPassed: this.metrics.testsPassed,
                errorsFixed: this.metrics.errorsFixed,
                mode: this.state.mode,
                lastUpdate: Date.now(),
                extra
            });
        } catch (error) {
            this.logger.warn('[NEXUS-MASTER] Unable to persist master state:', error.message);
        }
    }

    async _recordInteraction(role, message, metadata = {}) {
        if (!this.memoryManager) {
            return;
        }

        try {
            await this.memoryManager.recordInteraction({
                role,
                message,
                metadata
            });
        } catch (error) {
            this.logger.debug('[NEXUS-MASTER] Unable to record interaction:', error.message);
        }
    }
}

export default NexusMasterSystem;
