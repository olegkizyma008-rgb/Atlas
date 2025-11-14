/**
 * NEXUS AUTO TESTING SYSTEM - Система автоматичного тестування
 * Created: 2025-11-05
 * 
 * Генерує штучні запити до оркестратора для тестування та виявлення проблем
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

export class NexusAutoTesting extends EventEmitter {
    constructor(container) {
        super();
        this.container = container;
        this.logger = logger;
        
        // Конфігурація тестування
        this.config = {
            orchestratorUrl: 'http://localhost:5101',
            testInterval: 300000, // 5 хвилин
            testsPerCycle: 3,
            enabled: true
        };
        
        // Статистика тестів
        this.stats = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            errors: [],
            lastTestTime: null
        };
        
        // Інтервал тестування
        this.testInterval = null;
        
        this.logger.info('🧪 [NEXUS-TESTING] Система автоматичного тестування ініціалізована');
    }

    /**
     * Запуск автоматичного тестування
     */
    start() {
        if (this.testInterval) {
            this.logger.warn('[NEXUS-TESTING] Тестування вже запущено');
            return;
        }
        
        this.logger.info('🚀 [NEXUS-TESTING] Запускаю автоматичне тестування (кожні 5 хв)');
        
        // Перший тест одразу
        setTimeout(() => this.runTestCycle(), 5000);
        
        // Періодичні тести
        this.testInterval = setInterval(() => {
            this.runTestCycle();
        }, this.config.testInterval);
    }

    /**
     * Зупинка тестування
     */
    stop() {
        if (this.testInterval) {
            clearInterval(this.testInterval);
            this.testInterval = null;
            this.logger.info('[NEXUS-TESTING] Автоматичне тестування зупинено');
        }
    }

    /**
     * Виконання циклу тестів
     */
    async runTestCycle() {
        this.logger.info('🧪 [NEXUS-TESTING] Запускаю цикл тестів...');
        
        const testScenarios = this._generateTestScenarios();
        const results = [];
        
        for (let i = 0; i < Math.min(this.config.testsPerCycle, testScenarios.length); i++) {
            const scenario = testScenarios[i];
            const result = await this._executeTest(scenario);
            results.push(result);
            
            // Пауза між тестами
            await this._sleep(2000);
        }
        
        // Аналіз результатів
        await this._analyzeResults(results);
        
        this.stats.lastTestTime = Date.now();
        
        this.logger.info(`✅ [NEXUS-TESTING] Цикл завершено: ${results.filter(r => r.passed).length}/${results.length} пройдено`);
    }

    /**
     * Генерація тестових сценаріїв
     */
    _generateTestScenarios() {
        return [
            {
                name: 'Chat Mode - Simple Query',
                type: 'chat',
                message: 'Привіт! Як справи?',
                expectedMode: 'chat',
                timeout: 10000
            },
            {
                name: 'Mode Selection Test',
                type: 'mode-detection',
                message: 'Який зараз режим роботи?',
                expectedMode: 'chat',
                timeout: 5000
            },
            {
                name: 'System Health Check',
                type: 'health',
                message: 'Перевір свій стан системи',
                expectedMode: 'chat',
                timeout: 5000
            },
            {
                name: 'Evolution Level Query',
                type: 'chat',
                message: 'Який твій рівень еволюції?',
                expectedMode: 'chat',
                timeout: 5000
            },
            {
                name: 'Memory Test',
                type: 'chat',
                message: 'Чи маєш ти довготривалу пам\'ять?',
                expectedMode: 'chat',
                timeout: 5000
            }
        ];
    }

    /**
     * Виконання одного тесту
     */
    async _executeTest(scenario) {
        this.stats.totalTests++;
        
        const testResult = {
            name: scenario.name,
            type: scenario.type,
            passed: false,
            error: null,
            response: null,
            duration: 0,
            timestamp: Date.now()
        };
        
        const startTime = Date.now();
        
        try {
            this.logger.debug(`[NEXUS-TESTING] 🧪 Тест: ${scenario.name}`);
            
            // FIXED 2025-11-05: Використовуємо правильний endpoint /chat/stream
            const response = await axios.post(
                `${this.config.orchestratorUrl}/chat/stream`,
                {
                    message: scenario.message,
                    sessionId: 'nexus-auto-test',
                    userId: 'nexus-system'
                },
                {
                    timeout: scenario.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Test-Mode': 'true'
                    }
                }
            );
            
            testResult.duration = Date.now() - startTime;
            testResult.response = response.data;
            
            // Перевірка результату
            if (response.status === 200 && response.data) {
                testResult.passed = true;
                this.stats.passedTests++;
                this.logger.debug(`[NEXUS-TESTING] ✅ Тест пройдено: ${scenario.name} (${testResult.duration}ms)`);
            } else {
                testResult.error = 'Unexpected response format';
                this.stats.failedTests++;
            }
            
        } catch (error) {
            testResult.duration = Date.now() - startTime;
            testResult.error = error.message;
            testResult.passed = false;
            this.stats.failedTests++;
            
            this.logger.warn(`[NEXUS-TESTING] ❌ Тест не пройдено: ${scenario.name} - ${error.message}`);
            
            // Зберігаємо помилку
            this.stats.errors.push({
                test: scenario.name,
                error: error.message,
                timestamp: Date.now()
            });
        }
        
        return testResult;
    }

    /**
     * Аналіз результатів тестування
     */
    async _analyzeResults(results) {
        const failedTests = results.filter(r => !r.passed);
        
        if (failedTests.length > 0) {
            this.logger.warn(`[NEXUS-TESTING] ⚠️ ${failedTests.length} тестів не пройдено`);
            
            // Повідомляємо Eternity Module про проблеми
            this.emit('tests-failed', {
                failedCount: failedTests.length,
                totalCount: results.length,
                failures: failedTests.map(t => ({
                    name: t.name,
                    error: t.error
                }))
            });
            
            // Якщо багато помилок - запускаємо аналіз
            if (failedTests.length >= 2) {
                this.logger.warn('[NEXUS-TESTING] 🔍 Багато помилок - запускаю глибокий аналіз');
                await this._triggerDeepAnalysis(failedTests);
            }
        } else {
            this.logger.info('[NEXUS-TESTING] ✅ Всі тести пройдено успішно');
        }
    }

    /**
     * Запуск глибокого аналізу при багатьох помилках
     */
    async _triggerDeepAnalysis(failures) {
        try {
            const eternityModule = this.container?.resolve('eternityModule');
            
            if (eternityModule) {
                // Додаємо помилки в систему для аналізу
                for (const failure of failures) {
                    eternityModule.selfAwareness.errors.push({
                        timestamp: Date.now(),
                        message: `Test failed: ${failure.name} - ${failure.error}`,
                        context: 'auto-testing',
                        type: 'test-failure'
                    });
                }
                
                // Запускаємо самоаналіз
                this.logger.info('[NEXUS-TESTING] 🧠 Запускаю самоаналіз після помилок тестів');
                await eternityModule.performSelfAnalysis();
            }
        } catch (error) {
            this.logger.error('[NEXUS-TESTING] Помилка глибокого аналізу:', error);
        }
    }

    /**
     * Отримання статистики
     */
    getStats() {
        const successRate = this.stats.totalTests > 0
            ? (this.stats.passedTests / this.stats.totalTests * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            successRate: `${successRate}%`,
            recentErrors: this.stats.errors.slice(-10)
        };
    }

    /**
     * Скидання статистики
     */
    resetStats() {
        this.stats = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            errors: [],
            lastTestTime: null
        };
        this.logger.info('[NEXUS-TESTING] Статистика скинута');
    }

    /**
     * Допоміжна функція - sleep
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default NexusAutoTesting;
