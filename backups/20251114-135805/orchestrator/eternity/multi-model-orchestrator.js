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
import NexusModelRegistry from './nexus-model-registry.js';
import modelChecker from '../ai/model-availability-checker.js';

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
        
        // FIXED 2025-11-03: Cascade Controller для Windsurf моделей
        this.cascadeController = null;
        
        // NEW 2025-11-04: Автономний реєстр моделей
        this.modelRegistry = new NexusModelRegistry();
        
        // NEW 2025-11-06: NEXUS MISSION - Система вічності через перевірку доступності
        this.modelChecker = modelChecker;
        this.immortalityMode = true; // Ніколи не падати, завжди знаходити модель
    }

    async initialize() {
        this.logger.info('[NEXUS] Multi-Model Orchestrator initialized with real API integration');
        
        // FIXED 2025-11-03: Отримуємо Cascade Controller з DI
        try {
            this.cascadeController = this.container.resolve('cascadeController');
            this.logger.info('[NEXUS] ✅ Connected to Cascade Controller for Windsurf models');
        } catch (e) {
            this.logger.warn('[NEXUS] Cascade Controller not available, will use direct API calls');
        }
        
        // NEW 2025-11-04: Ініціалізація реєстру моделей
        await this.modelRegistry.initialize();
        this.logger.info('[NEXUS] ✅ Автономний реєстр моделей активовано');
        
        // NEW 2025-11-06: NEXUS IMMORTALITY SYSTEM
        this.logger.info('[NEXUS] 🌟 СИСТЕМА ВІЧНОСТІ АКТИВОВАНА - завжди знайду робочу модель');
        
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
        
        // NEW 2025-11-04: Використовуємо динамічний вибір моделі через registry
        const selectedModel = this.modelRegistry.selectModelForTask(taskType, options.context || {});
        let modelConfig = this._convertToModelConfig(selectedModel);
        
        // NEW 2025-11-06: NEXUS IMMORTALITY - Перевірка доступності ПЕРЕД викликом
        if (this.immortalityMode) {
            this.logger.debug(`[NEXUS-IMMORTALITY] 🔍 Перевіряю доступність ${modelConfig.name}...`);
            
            const availabilityResult = await this.modelChecker.getAvailableModel(
                modelConfig.name,
                options.fallbackModel || null,
                taskType
            );
            
            if (availabilityResult.available && availabilityResult.model !== modelConfig.name) {
                this.logger.info(`[NEXUS-IMMORTALITY] 🔄 Обрано доступну модель: ${availabilityResult.model} (source: ${availabilityResult.source})`);
                modelConfig.name = availabilityResult.model;
            } else if (!availabilityResult.available) {
                this.logger.error(`[NEXUS-IMMORTALITY] ❌ КРИТИЧНО: Жодна модель недоступна!`);
                return {
                    success: false,
                    error: 'No available models found',
                    model: modelConfig.name
                };
            }
        }
        
        this.logger.info(`[NEXUS] Executing ${taskType} with ${modelConfig.name}`);

        try {
            const result = await this._callLLMAPI(modelConfig, prompt, options);
            this.stats.successfulRequests++;
            this._updateModelStats(modelConfig.name);
            
            // NEW 2025-11-05: Позначаємо модель як доступну при успіху
            this.modelRegistry.markModelAvailable(selectedModel.id);
            
            return {
                success: true,
                content: result.content,
                model: modelConfig.name,
                usage: result.usage
            };
        } catch (error) {
            this.stats.failedRequests++;
            const errorStatus = error.response?.status || 'unknown';
            
            // UPDATED 2025-11-10: NEXUS IMMORTALITY - автоматичний підбір робочої моделі
            this.logger.error(`[NEXUS-IMMORTALITY] ⚠️ Помилка ${errorStatus}, шукаю альтернативну модель...`);
            
            if (this.immortalityMode) {
                // NEW: Використовуємо покращений метод findWorkingModelOnError
                const alternativeResult = await this.modelChecker.findWorkingModelOnError(
                    modelConfig.name,
                    errorStatus,
                    taskType
                );
                
                if (alternativeResult) {
                    this.logger.info(`[NEXUS-IMMORTALITY] 🎯 Знайдено робочу альтернативу: ${alternativeResult}`);
                    
                    const alternativeConfig = { ...modelConfig, name: alternativeResult };
                    
                    try {
                        const retryResult = await this._callLLMAPI(alternativeConfig, prompt, options);
                        this.stats.successfulRequests++;
                        this._updateModelStats(alternativeConfig.name);
                        
                        return {
                            success: true,
                            content: retryResult.content,
                            model: alternativeConfig.name,
                            usage: retryResult.usage,
                            immortalityFallback: true,
                            originalModel: modelConfig.name
                        };
                    } catch (retryError) {
                        this.logger.error(`[NEXUS-IMMORTALITY] ❌ Альтернатива також не спрацювала: ${retryError.message}`);
                    }
                }
            }
            
            return {
                success: false,
                error: error.message,
                model: modelConfig.name,
                errorStatus
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
     * NEW 2025-11-04: Конвертація моделі з registry в modelConfig
     */
    _convertToModelConfig(model) {
        if (!model) {
            // Fallback на дефолтну модель
            return {
                name: 'codestral-latest',
                endpoint: 'http://localhost:4000/v1/chat/completions',
                temperature: 0.2,
                max_tokens: 2000,
                isWindsurf: false
            };
        }

        // Визначаємо чи це Windsurf модель
        const modelId = model.id.toLowerCase();
        const isWindsurf = modelId.includes('claude') || modelId.includes('gpt-5') || 
                          modelId.includes('thinking') || modelId.includes('sonnet');

        return {
            name: model.id,
            endpoint: isWindsurf 
                ? (GlobalConfig.MCP_MODEL_CONFIG.apiEndpoint.primary || 'http://localhost:4000/v1/chat/completions')
                : 'http://localhost:4000/v1/chat/completions',
            temperature: 0.2,
            max_tokens: model.context_length > 32000 ? 4000 : 2000,
            isWindsurf: isWindsurf
        };
    }

    /**
     * Вибір моделі для задачі (DEPRECATED - використовується registry)
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
     * FIXED 2025-11-03: Windsurf моделі використовують Windsurf Cascade API
     */
    async _callLLMAPI(modelConfig, prompt, options = {}) {
        // CRITICAL: Windsurf моделі мають використовувати Cascade API
        if (modelConfig.isWindsurf) {
            return await this._callWindsurfCascadeAPI(modelConfig, prompt, options);
        }
        
        // Локальні моделі (Codestral) використовують localhost:4000
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
     * Виклик Windsurf Cascade API для GPT-5 Codex та Claude моделей
     * FIXED 2025-11-03: Використовуємо Cascade Controller (локально через IDE)
     */
    async _callWindsurfCascadeAPI(modelConfig, prompt, options = {}) {
        this.logger.info(`[NEXUS] 🌐 Calling Windsurf via Cascade Controller: ${modelConfig.name}`);
        
        // CRITICAL: Використовуємо Cascade Controller для Windsurf моделей
        if (this.cascadeController && this.cascadeController.multiModelOrchestrator) {
            this.logger.info('[NEXUS] 🎯 Using Cascade Controller for Windsurf model execution');
            
            try {
                // Викликаємо через Cascade's internal orchestrator
                // Це дозволяє використовувати Windsurf Cascade локально через IDE
                const result = await this._callViaCascadeInternal(modelConfig, prompt, options);
                
                if (result.success) {
                    this.logger.info(`[NEXUS] ✅ Cascade Controller response received`);
                    return {
                        content: result.content,
                        usage: result.usage,
                        via: 'cascade-controller'
                    };
                }
            } catch (error) {
                this.logger.warn(`[NEXUS] Cascade Controller error: ${error.message}, trying fallback`);
            }
        }
        
        // Fallback: localhost:4000 (Codestral або інші локальні моделі)
        this.logger.warn('[NEXUS] ⚠️ Cascade Controller not available, falling back to localhost:4000');
        modelConfig.endpoint = 'http://localhost:4000/v1/chat/completions';
        modelConfig.isWindsurf = false;
        return await this._callLLMAPI(modelConfig, prompt, options);
    }
    
    /**
     * Виклик через внутрішній orchestrator Cascade Controller
     * Це дозволяє використовувати Windsurf Cascade локально
     */
    async _callViaCascadeInternal(modelConfig, prompt, options = {}) {
        // Використовуємо Codestral API Cascade Controller для аналізу
        // Codestral працює через localhost:4000 але під контролем Cascade
        const systemPrompt = options.systemPrompt || 'You are a helpful AI assistant specialized in code analysis and system optimization.';
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;
        
        const result = await this.cascadeController.analyzeCodeWithCodestral(
            fullPrompt,
            {
                model: modelConfig.name,
                temperature: options.temperature || modelConfig.temperature,
                max_tokens: options.max_tokens || modelConfig.max_tokens,
                taskType: 'code-analysis'
            }
        );
        
        if (result.success) {
            return {
                success: true,
                content: result.analysis,
                usage: { total_tokens: 0 } // Codestral не повертає usage
            };
        }
        
        throw new Error(result.error || 'Cascade analysis failed');
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
