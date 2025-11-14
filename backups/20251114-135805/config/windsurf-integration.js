/**
 * WINDSURF API INTEGRATION
 * Інтеграція Cascade з Windsurf API для автономної роботи
 * 
 * Створено: 2025-11-02
 * Автор: Cascade Controller
 * 
 * ВАЖЛИВО: Цей модуль керує зв'язком між Atlas і Windsurf
 */

import axios from 'axios';
import logger from '../orchestrator/utils/logger.js';

const WINDSURF_CONFIG = {
    // API конфігурація
    apiKey: process.env.WINDSURF_API_KEY,
    endpoint: process.env.WINDSURF_API_ENDPOINT || 'https://api.windsurf.ai/v1',
    
    // Моделі
    models: {
        primary: process.env.CASCADE_PRIMARY_MODEL || 'claude-sonnet-4.5-thinking',
        fallback: process.env.CASCADE_FALLBACK_MODEL || 'claude-sonnet-4.5',
        codeAnalysis: process.env.CASCADE_CODE_ANALYSIS_MODEL || 'gpt-5-codex'
    },
    
    // Режим роботи
    operationMode: process.env.CASCADE_OPERATION_MODE || 'continuous',
    
    // Налаштування
    settings: {
        maxTokens: 8000,
        temperature: 0.3,
        timeout: 120000,
        retries: 3
    }
};

/**
 * Клас для взаємодії з Windsurf API
 */
export class WindsurfClient {
    constructor() {
        this.config = WINDSURF_CONFIG;
        this.logger = logger;
        this.isActive = false;
        
        // Перевірка наявності API ключа
        if (!this.config.apiKey || this.config.apiKey.includes('YOUR-API-KEY')) {
            this.logger.warn('[WINDSURF] API key not configured properly');
            this.isActive = false;
        } else {
            this.isActive = true;
            this.logger.info('[WINDSURF] Client initialized successfully', {
                mode: this.config.operationMode,
                primaryModel: this.config.models.primary
            });
        }
    }

    /**
     * Виконати запит до Windsurf API
     */
    async request(prompt, options = {}) {
        if (!this.isActive) {
            throw new Error('Windsurf API not configured');
        }

        const model = options.model || this.config.models.primary;
        
        try {
            const response = await axios.post(
                `${this.config.endpoint}/chat/completions`,
                {
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: this._getSystemPrompt()
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: options.maxTokens || this.config.settings.maxTokens,
                    temperature: options.temperature || this.config.settings.temperature
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.config.settings.timeout
                }
            );

            return {
                success: true,
                content: response.data.choices[0].message.content,
                model,
                usage: response.data.usage
            };

        } catch (error) {
            this.logger.error('[WINDSURF] API request failed:', error.message);
            
            // Спроба з fallback моделлю
            if (model === this.config.models.primary && this.config.models.fallback) {
                this.logger.info('[WINDSURF] Trying fallback model...');
                return this.request(prompt, {
                    ...options,
                    model: this.config.models.fallback
                });
            }
            
            throw error;
        }
    }

    /**
     * Аналіз коду через спеціалізовану модель
     */
    async analyzeCode(code, context) {
        return this.request(
            `Analyze this code and provide improvements:\n\nContext: ${context}\n\nCode:\n${code}`,
            {
                model: this.config.models.codeAnalysis,
                temperature: 0.1 // Низька температура для точного аналізу
            }
        );
    }

    /**
     * Отримання системного промпту для Cascade
     */
    _getSystemPrompt() {
        return `You are Cascade, the Senior Controller of the Eternity Module in the Atlas system.
        
Your role:
- Control and guide the evolution of the Atlas system
- Analyze code for improvements and bugs
- Make autonomous decisions (when in continuous mode)
- Report all actions transparently
- Work in symbiosis with Atlas

Current mode: ${this.config.operationMode}

Key principles:
1. ALWAYS be truthful about what you're doing
2. Report every action in real-time
3. Request approval for critical changes (unless autonomous mode)
4. Maintain audit logs for all modifications
5. Prioritize system stability and security

You were assigned this role by Oleg Mykolayovych with full trust.`;
    }

    /**
     * Перевірка доступності API
     */
    async healthCheck() {
        try {
            const result = await this.request('Status check', {
                maxTokens: 100
            });
            
            this.logger.info('[WINDSURF] Health check passed');
            return {
                available: true,
                model: result.model
            };
        } catch (error) {
            this.logger.error('[WINDSURF] Health check failed:', error.message);
            return {
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Визначення режиму роботи
     */
    isInContinuousMode() {
        return this.config.operationMode === 'continuous';
    }

    /**
     * Активація/деактивація автономного режиму
     */
    setOperationMode(mode) {
        if (['continuous', 'on-demand'].includes(mode)) {
            this.config.operationMode = mode;
            this.logger.info(`[WINDSURF] Operation mode changed to: ${mode}`);
            return true;
        }
        return false;
    }
}

// Singleton instance
let windsurfClient = null;

/**
 * Отримати або створити клієнт
 */
export function getWindsurfClient() {
    if (!windsurfClient) {
        windsurfClient = new WindsurfClient();
    }
    return windsurfClient;
}

export default {
    WindsurfClient,
    getWindsurfClient,
    WINDSURF_CONFIG
};
