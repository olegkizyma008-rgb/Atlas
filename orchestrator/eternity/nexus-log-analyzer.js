/**
 * NEXUS LOG ANALYZER - Динамічний аналіз актуальних логів
 * Відстежує orchestrator.log в реальному часі та виявляє проблеми
 * Created: 2025-11-05
 */

import fs from 'fs/promises';
import { Tail } from 'tail';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

export class NexusLogAnalyzer extends EventEmitter {
    constructor(container) {
        super();
        this.container = container;
        this.logger = logger;
        
        // Конфігурація
        this.config = {
            logFile: '/Users/dev/Documents/GitHub/atlas4/logs/orchestrator.log',
            errorPatterns: [
                /ERROR/i,
                /CRITICAL/i,
                /Failed to/i,
                /Cannot/i,
                /Uncaught/i,
                /TypeError/i,
                /ReferenceError/i,
                /SyntaxError/i,
                /\[ERROR\]/i
            ],
            warningPatterns: [
                /WARN/i,
                /WARNING/i,
                /deprecated/i,
                /not available/i,
                /⚠️/
            ],
            criticalPatterns: [
                /CRITICAL/i,
                /Uncaught/i,
                /Fatal/i,
                /Crash/i
            ]
        };
        
        // Стан аналізу
        this.state = {
            errors: [],
            warnings: [],
            criticalIssues: [],
            lastAnalysis: null,
            totalErrorsFound: 0,
            totalWarningsFound: 0
        };
        
        // Tail instance для real-time моніторингу
        this.tail = null;
        this.isActive = false;
        
        this.logger.info('📊 [NEXUS-LOGS] Log Analyzer ініціалізовано');
    }

    /**
     * Запуск real-time моніторингу логів
     */
    async start() {
        try {
            // Перевірка існування файлу
            await fs.access(this.config.logFile);
            
            this.tail = new Tail(this.config.logFile, {
                follow: true,
                useWatchFile: true,
                fsWatchOptions: {
                    interval: 1000
                }
            });
            
            this.tail.on('line', (line) => this._analyzeLine(line));
            
            this.tail.on('error', (error) => {
                this.logger.error(`[NEXUS-LOGS] Tail error: ${error.message}`);
            });
            
            this.isActive = true;
            this.logger.info('🔍 [NEXUS-LOGS] Real-time log моніторинг активовано');
            
            // Також проводимо початковий аналіз останніх 200 рядків
            await this._analyzeRecentLogs(200);
            
        } catch (error) {
            this.logger.error(`[NEXUS-LOGS] Failed to start: ${error.message}`);
        }
    }

    /**
     * Зупинка моніторингу
     */
    stop() {
        if (this.tail) {
            this.tail.unwatch();
            this.tail = null;
        }
        this.isActive = false;
        this.logger.info('[NEXUS-LOGS] Real-time моніторинг зупинено');
    }

    /**
     * Аналіз одного рядка логу
     */
    _analyzeLine(line) {
        if (!line.trim()) return;
        
        // FIXED 2025-11-05: Ігноруємо власні логи NEXUS щоб запобігти infinite loop
        // EXPANDED: Додано всі системні компоненти що генерують логи про аналіз
        if (line.includes('[NEXUS-LOGS]') || 
            line.includes('[NEXUS-MASTER]') || 
            line.includes('[NEXUS-FIXER]') ||
            line.includes('[NEXUS-TESTING]') ||
            line.includes('[DEV-ANALYSIS]') ||
            line.includes('[INTENT-DETECTOR]') ||
            line.includes('[NEXUS-WATCHER]') ||
            line.includes('ETERNITY:')) {
            return; // Skip власні логи самоаналізу
        }
        
        const timestamp = new Date().toISOString();
        
        // FIXED 2025-11-08: Ignore false positives (JSON content, system prompts)
        const isFalsePositive = 
            line.includes('"content":') ||  // JSON field
            line.includes('You are Atlas') || // System prompt
            line.includes('[API-REQUEST]') || // API request logs
            line.includes('Messages to send'); // Message payload
        
        // Перевірка на критичні помилки
        for (const pattern of this.config.criticalPatterns) {
            if (pattern.test(line) && !isFalsePositive) {
                const issue = {
                    type: 'critical',
                    line,
                    pattern: pattern.source,
                    timestamp,
                    extractedError: this._extractErrorDetails(line)
                };
                
                // Only report if we extracted actual error details
                if (issue.extractedError && issue.extractedError.message) {
                    this.state.criticalIssues.push(issue);
                    this.logger.warn(`🚨 [NEXUS-LOGS] CRITICAL ISSUE: ${line.substring(0, 100)}`);
                    
                    // Негайно повідомити Eternity Module
                    this.emit('critical-issue', issue);
                }
                return;
            }
        }
        
        // Перевірка на звичайні помилки
        for (const pattern of this.config.errorPatterns) {
            if (pattern.test(line)) {
                const error = {
                    type: 'error',
                    line,
                    pattern: pattern.source,
                    timestamp,
                    extractedError: this._extractErrorDetails(line)
                };
                
                this.state.errors.push(error);
                this.state.totalErrorsFound++;
                
                // Зберігаємо тільки останні 100 помилок
                if (this.state.errors.length > 100) {
                    this.state.errors.shift();
                }
                
                this.emit('error-detected', error);
                return;
            }
        }
        
        // Перевірка на попередження
        for (const pattern of this.config.warningPatterns) {
            if (pattern.test(line)) {
                const warning = {
                    type: 'warning',
                    line,
                    pattern: pattern.source,
                    timestamp,
                    extractedError: this._extractErrorDetails(line)
                };
                
                this.state.warnings.push(warning);
                this.state.totalWarningsFound++;
                
                // Зберігаємо тільки останні 50 попереджень
                if (this.state.warnings.length > 50) {
                    this.state.warnings.shift();
                }
                
                return;
            }
        }
    }

    /**
     * Витягнути деталі помилки з рядка логу
     */
    _extractErrorDetails(line) {
        const details = {
            message: null,
            component: null,
            stackTrace: null
        };
        
        // Витягти повідомлення після ERROR:
        const errorMatch = line.match(/ERROR[:\]]\s*(.+)/i);
        if (errorMatch) {
            details.message = errorMatch[1].trim();
        }
        
        // Витягти компонент [COMPONENT]
        const componentMatch = line.match(/\[([A-Z\-]+)\]/);
        if (componentMatch) {
            details.component = componentMatch[1];
        }
        
        // Витягти назву файлу якщо є
        const fileMatch = line.match(/([a-z\-]+\.js)/i);
        if (fileMatch) {
            details.file = fileMatch[1];
        }
        
        return details;
    }

    /**
     * Проаналізувати останні N рядків логу
     */
    async _analyzeRecentLogs(lineCount = 200) {
        try {
            const content = await fs.readFile(this.config.logFile, 'utf-8');
            const lines = content.split('\n').slice(-lineCount);
            
            this.logger.info(`[NEXUS-LOGS] Аналізую останні ${lines.length} рядків...`);
            
            for (const line of lines) {
                this._analyzeLine(line);
            }
            
            this.state.lastAnalysis = new Date().toISOString();
            
            const summary = this._generateSummary();
            this.logger.info(`[NEXUS-LOGS] Аналіз завершено: ${summary.errors} помилок, ${summary.warnings} попереджень`);
            
            return summary;
            
        } catch (error) {
            this.logger.error(`[NEXUS-LOGS] Failed to analyze recent logs: ${error.message}`);
            return null;
        }
    }

    /**
     * Згенерувати summary аналізу
     */
    _generateSummary() {
        return {
            errors: this.state.errors.length,
            warnings: this.state.warnings.length,
            critical: this.state.criticalIssues.length,
            totalErrorsFound: this.state.totalErrorsFound,
            totalWarningsFound: this.state.totalWarningsFound,
            lastAnalysis: this.state.lastAnalysis,
            topErrors: this._getTopErrors(5),
            recentCritical: this.state.criticalIssues.slice(-3)
        };
    }

    /**
     * Отримати топ N найчастіших помилок
     */
    _getTopErrors(count = 5) {
        const errorCounts = {};
        
        for (const error of this.state.errors) {
            const key = error.extractedError.message || error.line.substring(0, 100);
            errorCounts[key] = (errorCounts[key] || 0) + 1;
        }
        
        return Object.entries(errorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([message, count]) => ({ message, count }));
    }

    /**
     * Отримати поточний стан
     */
    getState() {
        return {
            ...this.state,
            summary: this._generateSummary()
        };
    }

    /**
     * Отримати останні критичні проблеми
     */
    getCriticalIssues() {
        return this.state.criticalIssues;
    }

    /**
     * Отримати останні помилки
     */
    getRecentErrors(count = 10) {
        return this.state.errors.slice(-count);
    }

    /**
     * Очистити стан (зберігаючи статистику)
     */
    clearState() {
        this.state.errors = [];
        this.state.warnings = [];
        this.state.criticalIssues = [];
        this.logger.info('[NEXUS-LOGS] State cleared');
    }
}
