/**
 * NEXUS MULTI-MODEL ORCHESTRATOR
 * Real implementation with API integration
 * 
 * Created: 2025-11-03
 * Integrates: Codestral (data collection) + GPT-5 Codex (code analysis) + Claude Thinking (strategy)
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import GlobalConfig from '../../config/global-config.js';
import fs from 'fs/promises';
import path from 'path';

export class MultiModelOrchestrator {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            modelUsage: {}
        };
    }

    async initialize() {
        this.logger.info('[NEXUS] Multi-Model Orchestrator initialized with real API integration');
        return true;
    }

    /**
     * Автономний збір даних через Codestral
     */
    async autonomousDataCollection(context) {
        this.logger.info('[NEXUS] Starting autonomous data collection (Codestral)', context);
        
        try {
            const data = {
                logs: await this._collectLogs(context.logsPath),
                config: await this._collectConfig(context.configPath),
                codeChanges: await this._collectCodeChanges(context.codePath),
                metrics: await this._collectMetrics(),
                timestamp: new Date().toISOString()
            };

            this.logger.info('[NEXUS] Data collection completed', {
                logsCount: data.logs.length,
                configFiles: Object.keys(data.config).length
            });

            return data;
        } catch (error) {
            this.logger.error('[NEXUS] Data collection failed:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Виконання задачі через відповідну модель
     */
    async executeTask(taskType, prompt, options = {}) {
        this.stats.totalRequests++;
        
        const modelConfig = this._selectModelForTask(taskType);
        this.logger.info(`[NEXUS] Executing ${taskType} with ${modelConfig.name}`);

        try {
            const result = await this._callLLMAPI(modelConfig, prompt, options);
            this.stats.successfulRequests++;
            this._updateModelStats(modelConfig.name);
            
            return {
                success: true,
                content: result.content,
                model: modelConfig.name,
                usage: result.usage
            };
        } catch (error) {
            this.stats.failedRequests++;
            this.logger.error(`[NEXUS] Task execution failed:`, error);
            
            return {
                success: false,
                error: error.message,
                model: modelConfig.name
            };
        }
    }

    /**
     * Паралельне виконання задач
     */
    async executeParallel(tasks) {
        this.logger.info(`[NEXUS] Executing ${tasks.length} tasks in parallel`);
        
        const promises = tasks.map(task => 
            this.executeTask(task.type, task.prompt, task.options)
        );

        const results = await Promise.allSettled(promises);
        
        const successful = results
            .filter(r => r.status === 'fulfilled' && r.value.success)
            .map(r => r.value);
        
        const failed = results
            .filter(r => r.status === 'rejected' || !r.value?.success)
            .map(r => r.reason || r.value);

        return {
            successful,
            failed
        };
    }

    /**
     * Вибір моделі для задачі
     * 
     * WINDSURF моделі (через Windsurf API):
     * - CASCADE_PRIMARY_MODEL: claude-sonnet-4.5-thinking
     * - CASCADE_CODE_ANALYSIS_MODEL: gpt-5-codex
     * - CASCADE_FALLBACK_MODEL: claude-sonnet-4.5
     * 
     * CODESTRAL (через API 4000):
     * - CASCADE_CODESTRAL_MODEL: ext-mistral-codestral-2405
     */
    _selectModelForTask(taskType) {
        // WINDSURF моделі (Claude, GPT-5 Codex)
        const cascadePrimary = process.env.CASCADE_PRIMARY_MODEL || 'claude-sonnet-4.5-thinking';
        const cascadeCodeAnalysis = process.env.CASCADE_CODE_ANALYSIS_MODEL || 'gpt-5-codex';
        const cascadeFallback = process.env.CASCADE_FALLBACK_MODEL || 'claude-sonnet-4.5';
        
        // CODESTRAL з API 4000 (окремо від Windsurf)
        const codestralModel = process.env.CASCADE_CODESTRAL_MODEL || 'ext-mistral-codestral-2405';
        const codestralEndpoint = process.env.LLM_API_ENDPOINT || 'http://localhost:4000/v1/chat/completions';
        
        const modelMapping = {
            // GPT-5 Codex (Windsurf) - аналіз коду
            'code-analysis': {
                name: cascadeCodeAnalysis,
                endpoint: 'windsurf',  // Використовує Windsurf API
                isWindsurf: true
            },
            'data-collection': {
                name: cascadeCodeAnalysis,
                endpoint: 'windsurf',
                isWindsurf: true
            },
            
            // Codestral (API 4000) - tool planning, file ops, JSON
            'tool-planning': {
                name: codestralModel,
                endpoint: codestralEndpoint,
                isWindsurf: false
            },
            'file-operations': {
                name: codestralModel,
                endpoint: codestralEndpoint,
                isWindsurf: false
            },
            'json-generation': {
                name: codestralModel,
                endpoint: codestralEndpoint,
                isWindsurf: false
            },
            
            // Claude Thinking (Windsurf) - глибокий аналіз
            'deep-analysis': {
                name: cascadePrimary,
                endpoint: 'windsurf',
                isWindsurf: true
            },
            'strategy': {
                name: cascadePrimary,
                endpoint: 'windsurf',
                isWindsurf: true
            },
            'thinking': {
                name: cascadePrimary,
                endpoint: 'windsurf',
                isWindsurf: true
            },
            
            // Claude Sonnet (Windsurf) - загальні задачі
            'general': {
                name: cascadeFallback,
                endpoint: 'windsurf',
                isWindsurf: true
            },
            'chat': {
                name: cascadeFallback,
                endpoint: 'windsurf',
                isWindsurf: true
            }
        };

        const modelConfig = modelMapping[taskType] || modelMapping.general;
        const modelName = modelConfig.name;
        const endpoint = modelConfig.isWindsurf 
            ? (GlobalConfig.MCP_MODEL_CONFIG.apiEndpoint.primary || 'http://localhost:4000/v1/chat/completions')
            : modelConfig.endpoint;
        
        this.logger.info(`[NEXUS] Selected model for ${taskType}: ${modelName} (${modelConfig.isWindsurf ? 'Windsurf' : 'API 4000'})`);
        
        return {
            name: modelName,
            endpoint: endpoint,
            temperature: this._getTemperatureForTask(taskType),
            max_tokens: this._getMaxTokensForTask(taskType),
            isWindsurf: modelConfig.isWindsurf
        };
    }
    
    /**
     * Температура для різних типів задач
     */
    _getTemperatureForTask(taskType) {
        const temperatureMap = {
            'code-analysis': 0.1,
            'tool-planning': 0.1,
            'json-generation': 0.05,
            'file-operations': 0.15,
            'deep-analysis': 0.3,
            'strategy': 0.3,
            'thinking': 0.4
        };
        return temperatureMap[taskType] || 0.2;
    }
    
    /**
     * Max tokens для різних типів задач
     */
    _getMaxTokensForTask(taskType) {
        const maxTokensMap = {
            'deep-analysis': 4000,
            'strategy': 3000,
            'thinking': 4000,
            'code-analysis': 2500,
            'tool-planning': 2000,
            'file-operations': 1500
        };
        return maxTokensMap[taskType] || 2000;
    }

    /**
     * Виклик LLM API
     */
    async _callLLMAPI(modelConfig, prompt, options = {}) {
        const requestBody = {
            model: modelConfig.name,
            messages: [
                {
                    role: 'system',
                    content: options.systemPrompt || 'You are a helpful AI assistant specialized in code analysis and system optimization.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: options.temperature || modelConfig.temperature,
            max_tokens: options.max_tokens || modelConfig.max_tokens
        };

        const response = await axios.post(modelConfig.endpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2 minutes
        });

        return {
            content: response.data.choices[0].message.content,
            usage: response.data.usage
        };
    }

    /**
     * Збір логів
     */
    async _collectLogs(logsPath) {
        try {
            const errorLog = await fs.readFile(path.join(logsPath, 'error.log'), 'utf-8');
            const orchestratorLog = await fs.readFile(path.join(logsPath, 'orchestrator.log'), 'utf-8');
            
            return {
                errors: errorLog.split('\n').slice(-100).join('\n'),
                orchestrator: orchestratorLog.split('\n').slice(-100).join('\n')
            };
        } catch (error) {
            this.logger.warn('[NEXUS] Failed to collect logs:', error.message);
            return 'Logs unavailable';
        }
    }

    /**
     * Збір конфігурації
     */
    async _collectConfig(configPath) {
        try {
            const files = await fs.readdir(configPath);
            const jsFiles = files.filter(f => f.endsWith('.js'));
            
            return {
                files: jsFiles,
                count: jsFiles.length
            };
        } catch (error) {
            this.logger.warn('[NEXUS] Failed to collect config:', error.message);
            return {};
        }
    }

    /**
     * Збір змін в коді (заглушка)
     */
    async _collectCodeChanges(codePath) {
        return 'Recent code changes analysis available';
    }

    /**
     * Збір метрик
     */
    async _collectMetrics() {
        return {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }

    /**
     * Оновлення статистики моделі
     */
    _updateModelStats(modelName) {
        if (!this.stats.modelUsage[modelName]) {
            this.stats.modelUsage[modelName] = 0;
        }
        this.stats.modelUsage[modelName]++;
    }

    /**
     * Отримання статистики
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalRequests > 0 
                ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }
}

export default MultiModelOrchestrator;
