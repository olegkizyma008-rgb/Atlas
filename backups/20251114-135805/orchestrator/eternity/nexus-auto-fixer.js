/**
 * NEXUS AUTO FIXER - Автоматичне виправлення коду
 * Інтеграція з DEV mode для автономного виправлення помилок
 * Created: 2025-11-05
 */

import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

export class NexusAutoFixer extends EventEmitter {
    constructor(container) {
        super();
        this.container = container;
        this.logger = logger;
        
        // Конфігурація
        this.config = {
            autoFixEnabled: true,
            requiresApproval: false, // Автономний режим - БЕЗ схвалення
            maxFixesPerCycle: 5,
            cooldownBetweenFixes: 5000 // 5 секунд між виправленнями
        };
        
        // Стан
        this.state = {
            totalFixes: 0,
            successfulFixes: 0,
            failedFixes: 0,
            pendingFixes: [],
            recentFixes: [],
            lastFixTime: null
        };
        
        // Черга виправлень
        this.fixQueue = [];
        this.isProcessing = false;
        
        this.logger.info('🔧 [NEXUS-FIXER] Auto Fixer ініціалізовано');
    }

    /**
     * Додати помилку до черги виправлення
     */
    async queueFix(error) {
        const fix = {
            id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            error,
            timestamp: new Date().toISOString(),
            status: 'queued',
            attempts: 0,
            maxAttempts: 3
        };
        
        this.fixQueue.push(fix);
        this.state.pendingFixes.push(fix);
        
        this.logger.info(`[NEXUS-FIXER] ➕ Додано в чергу: ${error.extractedError?.message || error.line?.substring(0, 50)}`);
        
        // Запустити обробку якщо не обробляється
        if (!this.isProcessing) {
            this._processFixQueue();
        }
        
        return fix;
    }

    /**
     * Обробка черги виправлень
     */
    async _processFixQueue() {
        if (this.isProcessing || this.fixQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.fixQueue.length > 0) {
                const fix = this.fixQueue.shift();
                
                // Перевірка cooldown
                if (this.state.lastFixTime) {
                    const timeSinceLastFix = Date.now() - new Date(this.state.lastFixTime).getTime();
                    if (timeSinceLastFix < this.config.cooldownBetweenFixes) {
                        await this._sleep(this.config.cooldownBetweenFixes - timeSinceLastFix);
                    }
                }
                
                // Спроба виправлення
                await this._attemptFix(fix);
                
                this.state.lastFixTime = new Date().toISOString();
                
                // Видалити з pendingFixes
                this.state.pendingFixes = this.state.pendingFixes.filter(f => f.id !== fix.id);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Спроба виправити помилку
     */
    async _attemptFix(fix) {
        fix.attempts++;
        fix.status = 'processing';
        
        this.logger.info(`[NEXUS-FIXER] 🔧 Виправляю (спроба ${fix.attempts}/${fix.maxAttempts}): ${fix.error.extractedError?.message || 'unknown'}`);
        
        try {
            // Аналіз помилки та генерація рішення
            const solution = await this._analyzeSolution(fix.error);
            
            if (!solution || !solution.canFix) {
                this.logger.warn(`[NEXUS-FIXER] ❌ Не вдалося знайти рішення для: ${fix.error.extractedError?.message}`);
                fix.status = 'failed';
                fix.reason = 'No solution found';
                this.state.failedFixes++;
                return;
            }
            
            // Застосування виправлення через DEV mode
            const result = await this._applyFix(solution, fix.error);
            
            if (result.success) {
                fix.status = 'completed';
                fix.solution = solution;
                fix.result = result;
                
                this.state.successfulFixes++;
                this.state.recentFixes.push(fix);
                
                // Зберігаємо тільки останні 20
                if (this.state.recentFixes.length > 20) {
                    this.state.recentFixes.shift();
                }
                
                this.logger.info(`[NEXUS-FIXER] ✅ Виправлено: ${solution.description}`);
                this.emit('fix-completed', fix);
                
            } else {
                // Повторна спроба якщо не досягнуто ліміту
                if (fix.attempts < fix.maxAttempts) {
                    this.logger.warn(`[NEXUS-FIXER] ⚠️ Спроба не вдалася, повторюю...`);
                    this.fixQueue.unshift(fix); // Повернути на початок черги
                } else {
                    fix.status = 'failed';
                    fix.reason = result.error || 'Max attempts reached';
                    this.state.failedFixes++;
                    this.logger.error(`[NEXUS-FIXER] ❌ Виправлення не вдалося після ${fix.maxAttempts} спроб`);
                }
            }
            
        } catch (error) {
            fix.status = 'error';
            fix.error = error.message;
            this.state.failedFixes++;
            this.logger.error(`[NEXUS-FIXER] ❌ Помилка виправлення: ${error.message}`);
        }
        
        this.state.totalFixes++;
    }

    /**
     * Аналіз помилки та генерація рішення
     */
    async _analyzeSolution(error) {
        try {
            const details = error.extractedError || {};
            const errorMessage = details.message || error.line;
            
            // Визначити тип помилки та можливе рішення
            const solution = {
                canFix: false,
                type: 'unknown',
                description: '',
                actions: [],
                confidence: 0
            };
            
            // MCP Memory помилки
            if (errorMessage.includes('MCP Memory') || errorMessage.includes('create_entities')) {
                solution.canFix = true;
                solution.type = 'mcp_memory_error';
                solution.description = 'MCP Memory Server integration issue';
                solution.actions = [{
                    type: 'code_change',
                    file: 'orchestrator/eternity/eternity-self-analysis.js',
                    change: 'Replace MCP Memory calls with NexusMemoryManager'
                }];
                solution.confidence = 0.9;
            }
            
            // Endpoint 404 помилки
            if (errorMessage.includes('404') && errorMessage.includes('/api/chat')) {
                solution.canFix = true;
                solution.type = 'wrong_endpoint';
                solution.description = 'Wrong API endpoint - should be /chat/stream';
                solution.actions = [{
                    type: 'code_change',
                    file: 'orchestrator/eternity/nexus-auto-testing.js',
                    change: 'Replace /api/chat with /chat/stream'
                }];
                solution.confidence = 0.95;
            }
            
            // Відсутні модулі
            if (errorMessage.includes('Cannot find module') || errorMessage.includes('not defined')) {
                solution.canFix = true;
                solution.type = 'missing_import';
                solution.description = 'Missing import or module';
                solution.actions = [{
                    type: 'add_import',
                    file: details.file,
                    module: this._extractModuleName(errorMessage)
                }];
                solution.confidence = 0.8;
            }
            
            // TypeError - undefined property
            if (errorMessage.includes('TypeError') && errorMessage.includes('undefined')) {
                solution.canFix = true;
                solution.type = 'undefined_property';
                solution.description = 'Accessing undefined property';
                solution.actions = [{
                    type: 'add_null_check',
                    file: details.file,
                    property: this._extractPropertyName(errorMessage)
                }];
                solution.confidence = 0.7;
            }
            
            return solution;
            
        } catch (error) {
            this.logger.error(`[NEXUS-FIXER] Solution analysis failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Застосувати виправлення
     */
    async _applyFix(solution, error) {
        try {
            // Через DEV self-analysis processor
            const devProcessor = this.container.resolve('devSelfAnalysisProcessor');
            
            if (!devProcessor) {
                return {
                    success: false,
                    error: 'DEV processor not available'
                };
            }
            
            // Створити запит для DEV mode
            const fixRequest = this._generateFixRequest(solution, error);
            
            // AUTONOMOUS MODE - без пароля, автоматично
            const result = await devProcessor.execute({
                userMessage: fixRequest,
                session: { id: 'nexus-auto-fixer' },
                requiresIntervention: true,
                password: 'mykola', // Автономний режим
                autoApprove: true,
                container: this.container
            });
            
            return result;
            
        } catch (error) {
            this.logger.error(`[NEXUS-FIXER] Fix application failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Згенерувати запит для DEV mode
     */
    _generateFixRequest(solution, error) {
        const errorMsg = error.extractedError?.message || error.line?.substring(0, 100);
        
        return `Виправ помилку: ${errorMsg}

Тип: ${solution.type}
Опис: ${solution.description}
Впевненість: ${Math.round(solution.confidence * 100)}%

Дії:
${solution.actions.map((action, i) => `${i + 1}. ${action.type}: ${action.file || ''}`).join('\n')}

Виправ автоматично через самоаналіз.`;
    }

    /**
     * Витягти назву модуля з помилки
     */
    _extractModuleName(errorMessage) {
        const match = errorMessage.match(/Cannot find module ['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    }

    /**
     * Витягти назву property з помилки
     */
    _extractPropertyName(errorMessage) {
        const match = errorMessage.match(/Cannot read propert(?:y|ies) (?:of undefined )?['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    }

    /**
     * Sleep helper
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Отримати статистику
     */
    getStats() {
        return {
            total: this.state.totalFixes,
            successful: this.state.successfulFixes,
            failed: this.state.failedFixes,
            pending: this.state.pendingFixes.length,
            inQueue: this.fixQueue.length,
            successRate: this.state.totalFixes > 0 
                ? Math.round((this.state.successfulFixes / this.state.totalFixes) * 100)
                : 0,
            recentFixes: this.state.recentFixes.slice(-5)
        };
    }
}
