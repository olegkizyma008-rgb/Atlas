/**
 * MULTI-MODEL ORCHESTRATOR
 * Багатомодельна система з автоматичним розподілом задач
 * 
 * Створено: 2025-11-02
 * 
 * Моделі:
 * - Claude 4.5 Thinking: Глибокий аналіз, планування, стратегія
 * - GPT-5 Codex: Аналіз коду, рефакторинг, code review
 * - Codestral: Збір даних, технічний аналіз, документація
 * - Claude 4.5: Швидкі відповіді, загальні задачі
 * 
 * Система автоматично вибирає найкращу модель для кожної задачі
 */

import logger from '../utils/logger.js';
import { getWindsurfClient } from '../../config/windsurf-integration.js';
import axios from 'axios';

export class MultiModelOrchestrator {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        
        // Доступні моделі
        this.models = {
            // Claude 4.5 Thinking - для глибокого мислення
            thinking: {
                name: 'claude-sonnet-4.5-thinking',
                provider: 'windsurf',
                strengths: ['deep-analysis', 'planning', 'strategy', 'complex-reasoning'],
                cost: 'high',
                speed: 'slow',
                maxTokens: 8000
            },
            
            // GPT-5 Codex - для коду
            codex: {
                name: 'gpt-5-codex',
                provider: 'windsurf',
                strengths: ['code-analysis', 'refactoring', 'debugging', 'code-generation'],
                cost: 'high',
                speed: 'medium',
                maxTokens: 8000
            },
            
            // Codestral - для технічного аналізу
            codestral: {
                name: 'codestral-latest',
                provider: 'mistral',
                apiKey: process.env.CODESTRAL_API_KEY || process.env.MISTRAL_API_KEY,
                endpoint: 'https://api.mistral.ai/v1/chat/completions',
                strengths: ['data-collection', 'technical-analysis', 'documentation', 'code-review'],
                cost: 'medium',
                speed: 'fast',
                maxTokens: 4000
            },
            
            // Claude 4.5 - для загальних задач
            general: {
                name: 'claude-sonnet-4.5',
                provider: 'windsurf',
                strengths: ['general', 'quick-response', 'conversation'],
                cost: 'medium',
                speed: 'fast',
                maxTokens: 4000
            }
        };
        
        // Статистика використання
        this.stats = {
            totalRequests: 0,
            byModel: {},
            byTask: {},
            successRate: {}
        };
        
        this.windsurfClient = null;
    }

    /**
     * Ініціалізація
     */
    async initialize() {
        try {
            this.windsurfClient = getWindsurfClient();
            
            // Ініціалізуємо статистику
            Object.keys(this.models).forEach(key => {
                this.stats.byModel[key] = 0;
                this.stats.successRate[key] = 1.0;
            });
            
            this.logger.info('[MULTI-MODEL] Orchestrator initialized', {
                models: Object.keys(this.models).length
            });
            
            return true;
        } catch (error) {
            this.logger.error('[MULTI-MODEL] Initialization failed:', error);
            return false;
        }
    }

    /**
     * Автоматичний вибір моделі під задачу
     */
    selectModelForTask(taskType, context = {}) {
        const taskMapping = {
            // Глибокий аналіз
            'deep-analysis': 'thinking',
            'system-analysis': 'thinking',
            'planning': 'thinking',
            'strategy': 'thinking',
            
            // Код
            'code-analysis': 'codex',
            'code-review': 'codestral', // Codestral швидший для review
            'refactoring': 'codex',
            'debugging': 'codex',
            'code-generation': 'codex',
            
            // Збір даних та документація
            'data-collection': 'codestral',
            'technical-analysis': 'codestral',
            'documentation': 'codestral',
            'log-analysis': 'codestral',
            
            // Загальне
            'general': 'general',
            'conversation': 'general',
            'quick-response': 'general'
        };
        
        const selectedKey = taskMapping[taskType] || 'general';
        const model = this.models[selectedKey];
        
        this.logger.info('[MULTI-MODEL] Model selected', {
            taskType,
            model: model.name,
            reason: model.strengths.join(', ')
        });
        
        return { key: selectedKey, ...model };
    }

    /**
     * Виконання запиту через обрану модель
     */
    async executeTask(taskType, prompt, options = {}) {
        this.stats.totalRequests++;
        
        // Вибираємо модель
        const model = this.selectModelForTask(taskType, options.context);
        this.stats.byModel[model.key]++;
        
        // Збагачуємо промпт контекстом задачі
        const enrichedPrompt = this._enrichPrompt(prompt, taskType, model);
        
        try {
            let result;
            
            if (model.provider === 'windsurf') {
                // Через Windsurf API
                result = await this.windsurfClient.request(enrichedPrompt, {
                    model: model.name,
                    maxTokens: options.maxTokens || model.maxTokens,
                    temperature: options.temperature || 0.3
                });
            } else if (model.provider === 'mistral') {
                // Через Mistral API (Codestral)
                result = await this._requestMistral(enrichedPrompt, model, options);
            }
            
            // Оновлюємо статистику
            this.stats.successRate[model.key] = 
                (this.stats.successRate[model.key] * 0.9) + (0.1 * 1.0);
            
            this.logger.info('[MULTI-MODEL] Task completed', {
                taskType,
                model: model.name,
                success: true
            });
            
            return {
                success: true,
                model: model.name,
                taskType,
                content: result.content,
                usage: result.usage
            };
            
        } catch (error) {
            // Оновлюємо статистику помилок
            this.stats.successRate[model.key] = 
                (this.stats.successRate[model.key] * 0.9) + (0.1 * 0.0);
            
            this.logger.error('[MULTI-MODEL] Task failed', {
                taskType,
                model: model.name,
                error: error.message
            });
            
            // Спроба з fallback моделлю
            if (options.allowFallback !== false) {
                return await this._fallbackExecution(taskType, prompt, options, model.key);
            }
            
            throw error;
        }
    }

    /**
     * Запит до Mistral API (Codestral)
     */
    async _requestMistral(prompt, model, options) {
        if (!model.apiKey) {
            throw new Error('Codestral API key not configured');
        }

        const response = await axios.post(
            model.endpoint,
            {
                model: model.name,
                messages: [{
                    role: 'system',
                    content: 'You are Codestral, a specialized AI for code analysis and technical tasks.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                temperature: options.temperature || 0.2,
                max_tokens: options.maxTokens || model.maxTokens
            },
            {
                headers: {
                    'Authorization': `Bearer ${model.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        return {
            success: true,
            content: response.data.choices[0].message.content,
            usage: response.data.usage
        };
    }

    /**
     * Збагачення промпту контекстом задачі
     */
    _enrichPrompt(prompt, taskType, model) {
        const taskContext = {
            'deep-analysis': 'Perform deep, thorough analysis with strategic insights.',
            'code-analysis': 'Analyze code for bugs, improvements, and best practices.',
            'data-collection': 'Collect and organize technical data systematically.',
            'planning': 'Create detailed, actionable plans with clear steps.',
            'general': 'Provide clear, helpful response.'
        };

        const context = taskContext[taskType] || taskContext['general'];
        
        return `Task: ${taskType}
Context: ${context}
Model strengths: ${model.strengths.join(', ')}

${prompt}`;
    }

    /**
     * Fallback виконання при помилці
     */
    async _fallbackExecution(taskType, prompt, options, failedModel) {
        this.logger.warn('[MULTI-MODEL] Attempting fallback execution', {
            failedModel,
            taskType
        });

        // Вибираємо fallback модель (general)
        const fallbackModel = this.models.general;
        
        try {
            const result = await this.windsurfClient.request(prompt, {
                model: fallbackModel.name,
                maxTokens: options.maxTokens || fallbackModel.maxTokens,
                temperature: options.temperature || 0.3
            });

            return {
                success: true,
                model: fallbackModel.name,
                taskType,
                content: result.content,
                fallback: true,
                originalModel: failedModel
            };
        } catch (error) {
            this.logger.error('[MULTI-MODEL] Fallback also failed:', error);
            throw error;
        }
    }

    /**
     * ПАРАЛЕЛЬНЕ ВИКОНАННЯ ЗАДАЧ
     * Розподіляє задачі між моделями для швидшої обробки
     */
    async executeParallel(tasks) {
        this.logger.info('[MULTI-MODEL] Starting parallel execution', {
            taskCount: tasks.length
        });

        const promises = tasks.map(task => 
            this.executeTask(task.type, task.prompt, task.options)
        );

        const results = await Promise.allSettled(promises);

        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

        this.logger.info('[MULTI-MODEL] Parallel execution completed', {
            total: tasks.length,
            successful: successful.length,
            failed: failed.length
        });

        return {
            successful,
            failed,
            totalTime: Date.now()
        };
    }

    /**
     * АВТОНОМНИЙ ЗБІР ДАНИХ через Codestral
     * Система сама збирає необхідні дані для аналізу
     */
    async autonomousDataCollection(context) {
        this.logger.info('[MULTI-MODEL] Starting autonomous data collection');

        const dataCollectionTasks = [
            {
                type: 'data-collection',
                prompt: `Collect system logs and error patterns from: ${context.logsPath}`,
                options: { context }
            },
            {
                type: 'data-collection',
                prompt: `Analyze configuration files in: ${context.configPath}`,
                options: { context }
            },
            {
                type: 'technical-analysis',
                prompt: `Review recent code changes in: ${context.codePath}`,
                options: { context }
            },
            {
                type: 'log-analysis',
                prompt: `Extract metrics and performance data from logs`,
                options: { context }
            }
        ];

        const results = await this.executeParallel(dataCollectionTasks);

        // Агрегуємо зібрані дані
        const collectedData = {
            logs: results.successful.find(r => r.taskType === 'data-collection')?.content,
            config: results.successful.find(r => r.taskType === 'data-collection')?.content,
            codeChanges: results.successful.find(r => r.taskType === 'technical-analysis')?.content,
            metrics: results.successful.find(r => r.taskType === 'log-analysis')?.content,
            timestamp: new Date().toISOString()
        };

        this.logger.info('[MULTI-MODEL] Data collection completed', {
            itemsCollected: Object.keys(collectedData).length
        });

        return collectedData;
    }

    /**
     * Отримання статистики
     */
    getStats() {
        return {
            ...this.stats,
            models: Object.keys(this.models).map(key => ({
                key,
                name: this.models[key].name,
                requests: this.stats.byModel[key],
                successRate: (this.stats.successRate[key] * 100).toFixed(1) + '%'
            }))
        };
    }
}

export default MultiModelOrchestrator;
