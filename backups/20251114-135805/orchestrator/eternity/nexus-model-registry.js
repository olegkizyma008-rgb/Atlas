/**
 * NEXUS MODEL REGISTRY - Реєстр доступних моделей для автономної роботи
 * Створено: 2025-11-04
 * 
 * Динамічне отримання списку моделей з API та інтелектуальний вибір
 * на основі типу завдання. Система сама обирає найкращу модель.
 */

import axios from 'axios';
import logger from '../utils/logger.js';

export class NexusModelRegistry {
    constructor() {
        this.logger = logger;
        this.availableModels = [];
        this.modelCapabilities = new Map();
        this.lastUpdate = null;
        this.updateInterval = null;
        
        // NEW 2025-11-05: Відстеження ТИМЧАСОВО недоступних моделей
        this.temporarilyUnavailableModels = new Map(); // { modelId: { since, attempts, lastError } }
        this.unavailabilityTimeout = 600000; // 10 хвилин - після цього спробуємо знову
        
        // NEXUS 2025-11-05: Windsurf copilot моделі повертають 500 - блокуємо одразу
        this._blockWindsurfModels();
        
        // NEXUS 2025-11-08: Виключення Ollama моделей з модуля самовдосконалення
        this.excludeOllamaModels = process.env.NEXUS_EXCLUDE_OLLAMA === 'true';
        if (this.excludeOllamaModels) {
            this.logger.info('🚫 [NEXUS-REGISTRY] Ollama моделі виключені з самовдосконалення (працюють тільки для TASK/CHAT)');
        }
        
        // Базові налаштування API
        this.apiEndpoint = process.env.CODESTRAL_API_ENDPOINT || 'http://localhost:4000/v1';
        this.updateFrequency = 300000; // 5 хвилин
        
        this.logger.info('🎯 [NEXUS-REGISTRY] Ініціалізовано реєстр моделей');
    }
    
    /**
     * NEXUS 2025-11-05: Блокування Windsurf моделей через 500 помилки
     */
    _blockWindsurfModels() {
        // Блокуємо ВСІ copilot-* моделі через Windsurf API 500 помилки
        this.blockAllCopilotModels = true;
        this.logger.info(`🚫 [NEXUS-REGISTRY] Блокування ВСІХ copilot-* моделей (Windsurf API 500)`);
    }

    async initialize() {
        try {
            // Перше отримання моделей
            await this.fetchAvailableModels();
            
            // Автоматичне оновлення кожні 5 хвилин
            this.updateInterval = setInterval(() => {
                this.fetchAvailableModels().catch(err => 
                    this.logger.warn('[NEXUS-REGISTRY] Автооновлення моделей не вдалось:', err.message)
                );
            }, this.updateFrequency);
            
            this.logger.info('✅ [NEXUS-REGISTRY] Автономне оновлення моделей активовано');
            return true;
        } catch (error) {
            this.logger.error('[NEXUS-REGISTRY] Ініціалізація не вдалась:', error);
            return false;
        }
    }

    /**
     * Отримання списку доступних моделей з API (як OpenAI)
     */
    async fetchAvailableModels() {
        try {
            this.logger.info('[NEXUS-REGISTRY] Отримую список доступних моделей...');
            
            const response = await axios.get(`${this.apiEndpoint}/models`, {
                timeout: 5000,
                headers: {
                    'Authorization': `Bearer ${process.env.CODESTRAL_API_KEY || process.env.MISTRAL_API_KEY}`
                }
            });

            if (response.data && response.data.data) {
                this.availableModels = response.data.data;
                this.lastUpdate = Date.now();
                
                // Аналіз можливостей кожної моделі
                this._analyzeModelCapabilities();
                
                this.logger.info(`✅ [NEXUS-REGISTRY] Отримано ${this.availableModels.length} моделей:`, 
                    this.availableModels.map(m => m.id).join(', '));
                
                return this.availableModels;
            }
            
            return [];
        } catch (error) {
            // FIXED 2025-11-04: Детальніше логування помилок
            if (error.code === 'ECONNREFUSED') {
                this.logger.warn('[NEXUS-REGISTRY] API недоступний (localhost:4000), використовую fallback моделі');
            } else if (error.response?.status === 401) {
                this.logger.warn('[NEXUS-REGISTRY] Невірний API ключ, використовую fallback моделі');
            } else {
                this.logger.warn('[NEXUS-REGISTRY] Помилка отримання моделей:', error.message);
            }
            
            // Fallback на статичний список
            const fallbackModels = this._getFallbackModels();
            this.availableModels = fallbackModels;
            this._analyzeModelCapabilities();
            return fallbackModels;
        }
    }

    /**
     * Аналіз можливостей моделей на основі їх назв та метаданих
     */
    _analyzeModelCapabilities() {
        for (const model of this.availableModels) {
            const capabilities = {
                codeAnalysis: false,
                bugFixing: false,
                refactoring: false,
                dataCollection: false,
                strategicThinking: false,
                contextWindow: model.context_length || 4096
            };

            const modelId = model.id.toLowerCase();

            // Codestral - для аналізу коду та збору даних
            if (modelId.includes('codestral') || modelId.includes('code')) {
                capabilities.codeAnalysis = true;
                capabilities.dataCollection = true;
                capabilities.refactoring = true;
            }

            // GPT/Claude - для виправлення багів та стратегії
            if (modelId.includes('gpt') || modelId.includes('claude')) {
                capabilities.bugFixing = true;
                capabilities.strategicThinking = true;
                capabilities.codeAnalysis = true;
            }

            // Thinking/reasoning моделі - для складної стратегії
            if (modelId.includes('thinking') || modelId.includes('reasoning') || modelId.includes('o1')) {
                capabilities.strategicThinking = true;
                capabilities.bugFixing = true;
            }

            this.modelCapabilities.set(model.id, capabilities);
        }

        this.logger.debug('[NEXUS-REGISTRY] Проаналізовано можливості моделей');
    }

    /**
     * Інтелектуальний вибір моделі на основі типу завдання
     */
    selectModelForTask(taskType, context = {}) {
        // FIXED 2025-11-04: Перевірка наявності моделей
        if (!this.availableModels || this.availableModels.length === 0) {
            this.logger.warn('[NEXUS-REGISTRY] Немає доступних моделей, використовую fallback');
            this.availableModels = this._getFallbackModels();
            this._analyzeModelCapabilities();
        }

        const taskRequirements = this._getTaskRequirements(taskType);
        let bestModel = null;
        let bestScore = 0;

        for (const model of this.availableModels) {
            const capabilities = this.modelCapabilities.get(model.id);
            if (!capabilities) continue;
            
            // NEXUS 2025-11-05: Блокуємо ВСІ copilot-* моделі (Windsurf API 500)
            if (this.blockAllCopilotModels && model.id.startsWith('copilot-')) {
                continue;
            }
            
            // NEXUS 2025-11-08: Блокуємо Ollama моделі для самовдосконалення
            const modelIdLower = model.id.toLowerCase();
            if (this.excludeOllamaModels && modelIdLower.includes('ollama')) {
                this.logger.debug(`[NEXUS-REGISTRY] Пропускаю Ollama модель для самовдосконалення: ${model.id}`);
                continue;
            }
            
            // NEW 2025-11-05: Пропускаємо ТИМЧАСОВО недоступні моделі
            if (this.isModelTemporarilyUnavailable(model.id)) {
                this.logger.debug(`[NEXUS-REGISTRY] Пропускаю тимчасово недоступну модель: ${model.id}`);
                continue;
            }

            let score = 0;

            // Оцінка відповідності моделі завданню
            if (taskRequirements.codeAnalysis && capabilities.codeAnalysis) score += 3;
            if (taskRequirements.bugFixing && capabilities.bugFixing) score += 3;
            if (taskRequirements.refactoring && capabilities.refactoring) score += 2;
            if (taskRequirements.dataCollection && capabilities.dataCollection) score += 3;
            if (taskRequirements.strategicThinking && capabilities.strategicThinking) score += 2;

            // Перевага моделям з більшим context window для складних завдань
            if (context.needsLargeContext && capabilities.contextWindow > 8000) {
                score += 1;
            }

            if (score > bestScore) {
                bestScore = score;
                bestModel = model;
            }
        }

        if (bestModel) {
            this.logger.info(`🎯 [NEXUS-REGISTRY] Вибрано модель для ${taskType}:`, {
                model: bestModel.id,
                score: bestScore,
                capabilities: this.modelCapabilities.get(bestModel.id)
            });
            return bestModel;
        }

        // Fallback на першу доступну модель
        const fallback = this.availableModels[0] || this._getFallbackModels()[0];
        this.logger.warn(`[NEXUS-REGISTRY] Не знайдено оптимальної моделі для ${taskType}, використовую fallback: ${fallback.id}`);
        return fallback;
    }

    /**
     * Визначення вимог для типу завдання
     */
    _getTaskRequirements(taskType) {
        const requirements = {
            'code-analysis': {
                codeAnalysis: true,
                dataCollection: true,
                refactoring: false,
                bugFixing: false,
                strategicThinking: false
            },
            'bug-fixing': {
                codeAnalysis: true,
                dataCollection: false,
                refactoring: false,
                bugFixing: true,
                strategicThinking: true
            },
            'refactoring': {
                codeAnalysis: true,
                dataCollection: false,
                refactoring: true,
                bugFixing: false,
                strategicThinking: true
            },
            'data-collection': {
                codeAnalysis: false,
                dataCollection: true,
                refactoring: false,
                bugFixing: false,
                strategicThinking: false
            },
            'strategic-planning': {
                codeAnalysis: false,
                dataCollection: false,
                refactoring: false,
                bugFixing: false,
                strategicThinking: true
            }
        };

        return requirements[taskType] || {
            codeAnalysis: true,
            dataCollection: true,
            refactoring: true,
            bugFixing: true,
            strategicThinking: true
        };
    }

    /**
     * Fallback моделі якщо API недоступний
     */
    /**
     * NEW 2025-11-05: Перевірка чи модель тимчасово недоступна
     */
    isModelTemporarilyUnavailable(modelId) {
        const unavailable = this.temporarilyUnavailableModels.get(modelId);
        if (!unavailable) return false;
        
        const now = Date.now();
        const timeSince = now - unavailable.since;
        
        // Після 10 хвилин спробуємо знову
        if (timeSince > this.unavailabilityTimeout) {
            this.logger.info(`[NEXUS-REGISTRY] ⏰ Час минув, спробую модель ${modelId} знову`);
            this.temporarilyUnavailableModels.delete(modelId);
            return false;
        }
        
        return true;
    }
    
    /**
     * NEW 2025-11-05: Позначити модель як тимчасово недоступну (500/503)
     */
    markModelUnavailable(modelId, error) {
        const existing = this.temporarilyUnavailableModels.get(modelId);
        
        if (existing) {
            // Оновлюємо лічильник спроб
            existing.attempts++;
            existing.lastError = error;
            this.logger.warn(`[NEXUS-REGISTRY] ⚠️ Модель ${modelId} досі недоступна (спроба ${existing.attempts})`);
        } else {
            // Перший раз позначаємо
            this.temporarilyUnavailableModels.set(modelId, {
                since: Date.now(),
                attempts: 1,
                lastError: error
            });
            this.logger.warn(`[NEXUS-REGISTRY] 🚫 Модель ${modelId} тимчасово недоступна: ${error}`);
        }
    }
    
    /**
     * NEW 2025-11-05: Позначити модель як доступну знову
     */
    markModelAvailable(modelId) {
        if (this.temporarilyUnavailableModels.has(modelId)) {
            this.temporarilyUnavailableModels.delete(modelId);
            this.logger.info(`[NEXUS-REGISTRY] ✅ Модель ${modelId} знову доступна`);
        }
    }
    
    /**
     * Fallback моделі якщо API недоступний
     */
    _getFallbackModels() {
        return [
            {
                id: 'codestral-latest',
                object: 'model',
                created: Date.now(),
                owned_by: 'mistral',
                context_length: 32000
            },
            {
                id: 'gpt-4o',
                object: 'model',
                created: Date.now(),
                owned_by: 'openai',
                context_length: 128000
            },
            {
                id: 'claude-sonnet-4.5',
                object: 'model',
                created: Date.now(),
                owned_by: 'anthropic',
                context_length: 200000
            }
        ];
    }

    /**
     * Отримання статистики використання моделей
     */
    getStats() {
        return {
            totalModels: this.availableModels.length,
            lastUpdate: this.lastUpdate,
            models: this.availableModels.map(m => ({
                id: m.id,
                capabilities: this.modelCapabilities.get(m.id)
            }))
        };
    }

    shutdown() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.logger.info('[NEXUS-REGISTRY] Реєстр моделей зупинено');
    }

    /**
     * FIXED 2025-11-04: Метод для ручного оновлення моделей
     */
    async refreshModels() {
        this.logger.info('[NEXUS-REGISTRY] Ручне оновлення списку моделей...');
        return await this.fetchAvailableModels();
    }
}

export default NexusModelRegistry;
