/**
 * NEXUS REAL TESTING CYCLE - Реальне тестування через веб API
 * Імітує повідомлення від веб інтерфейсу
 */

import axios from 'axios';
import fs from 'fs/promises';
import logger from './orchestrator/utils/logger.js';

const ORCHESTRATOR_URL = 'http://localhost:5101';
const TEST_CYCLES = 5;
const CYCLE_DELAY = 15000; // 15 секунд між циклами

class NexusRealCycleTester {
    constructor() {
        this.cycleNumber = 0;
        this.results = [];
        this.improvements = [];
    }

    /**
     * Відправка тестового повідомлення до оркестратора
     */
    async sendTestMessage(message) {
        try {
            logger.info(`\n🧪 [CYCLE ${this.cycleNumber}] Відправляю: "${message}"`);
            
            const response = await axios.post(
                `${ORCHESTRATOR_URL}/chat/stream`,
                {
                    message,
                    sessionId: `nexus-test-${Date.now()}`,
                    userId: 'nexus-real-test'
                },
                {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' },
                    responseType: 'stream'
                }
            );
            
            logger.info(`✅ [CYCLE ${this.cycleNumber}] Відповідь отримано`);
            
            return {
                success: true,
                response: response.data,
                status: response.status,
                duration: response.headers['x-response-time'] || 'unknown'
            };
        } catch (error) {
            logger.error(`❌ [CYCLE ${this.cycleNumber}] Помилка: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                status: error.response?.status || 0
            };
        }
    }

    /**
     * Читання логів системи
     */
    async readSystemLogs() {
        try {
            const logPath = '/Users/dev/Documents/GitHub/atlas4/logs/orchestrator.log';
            const content = await fs.readFile(logPath, 'utf8');
            const lines = content.split('\n').slice(-50); // Останні 50 рядків
            
            return lines.filter(line => line.trim());
        } catch (error) {
            logger.warn(`[CYCLE ${this.cycleNumber}] Не вдалося прочитати логи: ${error.message}`);
            return [];
        }
    }

    /**
     * Аналіз результатів циклу
     */
    async analyzeResults(result) {
        const analysis = {
            cycleNumber: this.cycleNumber,
            timestamp: new Date().toISOString(),
            success: result.success,
            issues: [],
            suggestions: []
        };

        // Перевірка помилок
        if (!result.success) {
            analysis.issues.push({
                type: 'api-error',
                severity: 'high',
                message: result.error,
                suggestion: 'Перевірити доступність оркестратора та API endpoints'
            });
        }

        // Читання логів
        const logs = await this.readSystemLogs();
        const errors = logs.filter(log => 
            log.toLowerCase().includes('error') || 
            log.toLowerCase().includes('failed') ||
            log.toLowerCase().includes('exception')
        );

        if (errors.length > 0) {
            analysis.issues.push({
                type: 'runtime-errors',
                severity: 'medium',
                count: errors.length,
                examples: errors.slice(0, 3),
                suggestion: 'Додати обробку помилок та fallback механізми'
            });
        }

        // Перевірка часу відповіді
        if (result.duration && parseInt(result.duration) > 5000) {
            analysis.issues.push({
                type: 'slow-response',
                severity: 'low',
                duration: result.duration,
                suggestion: 'Оптимізувати обробку запитів та кешування'
            });
        }

        return analysis;
    }

    /**
     * Генерація покращень
     */
    generateImprovements(analysis) {
        const improvements = [];

        for (const issue of analysis.issues) {
            improvements.push({
                issue: issue.message || issue.type,
                priority: issue.severity === 'high' ? 10 : issue.severity === 'medium' ? 5 : 2,
                suggestion: issue.suggestion,
                autoFixable: issue.severity !== 'high' // Тільки не-критичні автофіксимо
            });
        }

        return improvements;
    }

    /**
     * Відображення результатів циклу
     */
    displayCycleResults(analysis, improvements) {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(`📊 ЦИКЛ ${this.cycleNumber} - АНАЛІЗ ЗАВЕРШЕНО`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`Час: ${analysis.timestamp}`);
        console.log(`Успішно: ${analysis.success ? '✅' : '❌'}`);
        console.log(`Виявлено проблем: ${analysis.issues.length}`);
        console.log(`Згенеровано покращень: ${improvements.length}`);
        
        if (analysis.issues.length > 0) {
            console.log('\n🔍 ВИЯВЛЕНІ ПРОБЛЕМИ:');
            analysis.issues.forEach((issue, i) => {
                console.log(`  ${i + 1}. [${issue.severity}] ${issue.type}`);
                if (issue.message) console.log(`     → ${issue.message}`);
                console.log(`     💡 ${issue.suggestion}`);
            });
        }

        if (improvements.length > 0) {
            console.log('\n🔧 ПОКРАЩЕННЯ:');
            improvements.forEach((imp, i) => {
                console.log(`  ${i + 1}. [Пріоритет ${imp.priority}] ${imp.issue}`);
                console.log(`     ${imp.autoFixable ? '✅ Автофікс' : '⚠️ Ручний фікс'}`);
            });
        }
        
        console.log('═══════════════════════════════════════════════════════════\n');
    }

    /**
     * Головний цикл тестування
     */
    async runTestingCycle() {
        console.log('\n🌟 NEXUS REAL TESTING CYCLE - СТАРТ');
        console.log('════════════════════════════════════════════════════════════\n');

        const testMessages = [
            'Привіт! Як справи?',
            'Який твій рівень еволюції?',
            'Чи працює автономний режим?',
            'Перевір свій стан системи',
            'Що нового в твоїх можливостях?'
        ];

        for (let cycle = 1; cycle <= TEST_CYCLES; cycle++) {
            this.cycleNumber = cycle;
            
            console.log(`\n🔄 === ЦИКЛ ${cycle}/${TEST_CYCLES} ===\n`);
            
            // 1. Відправка повідомлення
            const message = testMessages[(cycle - 1) % testMessages.length];
            const result = await this.sendTestMessage(message);
            
            // 2. Аналіз результатів
            const analysis = await this.analyzeResults(result);
            
            // 3. Генерація покращень
            const improvements = this.generateImprovements(analysis);
            
            // 4. Відображення результатів
            this.displayCycleResults(analysis, improvements);
            
            // 5. Зберігання результатів
            this.results.push({ cycle, analysis, improvements });
            this.improvements.push(...improvements);
            
            // 6. Затримка перед наступним циклом
            if (cycle < TEST_CYCLES) {
                logger.info(`⏳ Очікування ${CYCLE_DELAY/1000} секунд до наступного циклу...\n`);
                await this.sleep(CYCLE_DELAY);
            }
        }

        // Фінальний звіт
        this.displayFinalReport();
    }

    /**
     * Фінальний звіт
     */
    displayFinalReport() {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║           NEXUS TESTING CYCLE - ФІНАЛЬНИЙ ЗВІТ             ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        
        const successCount = this.results.filter(r => r.analysis.success).length;
        const totalIssues = this.results.reduce((sum, r) => sum + r.analysis.issues.length, 0);
        const totalImprovements = this.improvements.length;
        const autoFixable = this.improvements.filter(i => i.autoFixable).length;
        
        console.log(`📊 СТАТИСТИКА:`);
        console.log(`   Всього циклів: ${TEST_CYCLES}`);
        console.log(`   Успішних: ${successCount} (${(successCount/TEST_CYCLES*100).toFixed(1)}%)`);
        console.log(`   Виявлено проблем: ${totalIssues}`);
        console.log(`   Згенеровано покращень: ${totalImprovements}`);
        console.log(`   Автофіксимих: ${autoFixable} (${(autoFixable/totalImprovements*100).toFixed(1)}%)`);
        
        console.log(`\n🎯 РЕКОМЕНДАЦІЇ:`);
        
        if (successCount === TEST_CYCLES && totalIssues === 0) {
            console.log(`   ✅ Система працює ідеально!`);
            console.log(`   ✅ Жодних проблем не виявлено`);
            console.log(`   ✅ NEXUS готовий до продакшну`);
        } else {
            console.log(`   🔧 Потрібно застосувати ${totalImprovements} покращень`);
            console.log(`   ⚡ ${autoFixable} покращень можуть бути застосовані автоматично`);
            console.log(`   📝 ${totalImprovements - autoFixable} потребують ручного втручання`);
        }
        
        console.log('\n═══════════════════════════════════════════════════════════\n');
        
        // Збереження звіту
        this.saveReport();
    }

    /**
     * Збереження звіту у файл
     */
    async saveReport() {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                cycles: TEST_CYCLES,
                results: this.results,
                improvements: this.improvements,
                summary: {
                    totalCycles: TEST_CYCLES,
                    successCount: this.results.filter(r => r.analysis.success).length,
                    totalIssues: this.results.reduce((sum, r) => sum + r.analysis.issues.length, 0),
                    totalImprovements: this.improvements.length,
                    autoFixable: this.improvements.filter(i => i.autoFixable).length
                }
            };
            
            const reportPath = '/Users/dev/Documents/GitHub/atlas4/logs/nexus-test-report.json';
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
            
            logger.info(`📄 Звіт збережено: ${reportPath}`);
        } catch (error) {
            logger.error('Помилка збереження звіту:', error);
        }
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Запуск
const tester = new NexusRealCycleTester();
tester.runTestingCycle().then(() => {
    logger.info('🎉 Тестування завершено!');
    process.exit(0);
}).catch(error => {
    logger.error('❌ Критична помилка:', error);
    process.exit(1);
});
