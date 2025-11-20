/**
 * ATLAS ORCHESTRATOR - Core Services Registry
 * Version: 4.0
 *
 * Реєстрація базових сервісів: конфігурація, логування, обробка помилок
 */

import logger from '../../utils/logger.js';
import errorHandler from '../../errors/unified-error-handler.js';
import telemetry from '../../utils/telemetry.js';
import GlobalConfig from '../../../config/atlas-config.js';
import LocalizationService from '../../services/localization-service.js';

/**
 * Реєструє всі core сервіси в DI контейнері
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerCoreServices(container) {
    // 1. Configuration - завжди першим
    container.singleton('config', () => GlobalConfig, {
        metadata: { category: 'core', priority: 100 }
    });

    // 2. Logger - базова інфраструктура
    container.singleton('logger', () => logger, {
        metadata: { category: 'infrastructure', priority: 90 },
        lifecycle: {
            onInit: async function () {
                this.system('startup', '[DI] Logger service initialized');
            }
        }
    });

    // 3. Unified Error Handler - обробка помилок з інтелектуальним розпізнаванням
    container.singleton('errorHandler', () => errorHandler, {
        dependencies: ['logger'],
        metadata: { category: 'infrastructure', priority: 85 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] Unified Error Handler initialized - intelligent pattern matching enabled');
            }
        }
    });

    // 4. Telemetry - метрики та моніторинг
    container.singleton('telemetry', () => telemetry, {
        dependencies: ['logger'],
        metadata: { category: 'monitoring', priority: 80 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] Telemetry initialized');
            }
        }
    });

    // 5. Localization Service
    container.singleton('localizationService', (c) => new LocalizationService({
        logger: c.resolve('logger')
    }), {
        dependencies: ['logger'],
        metadata: { category: 'core', priority: 75 },
        lifecycle: {
            onInit: async function () {
                await this.initialize();
                logger.system('startup', '[DI] Localization service initialized');
                logger.system('startup', `[DI] User language: ${this.getUserLanguage()}`);
            }
        }
    });

    // 6. LLM Client
    container.singleton('llmClient', async (c) => {
        const config = c.resolve('config');
        const llmConfig = config.AI_BACKEND_CONFIG?.providers?.mcp?.llm;

        if (!llmConfig) {
            logger.warn('startup', '[DI] ⚠️ No LLM config found, creating minimal client');
            // Return minimal client that won't crash
            return {
                call: async () => ({ content: '' }),
                generate: async () => '',
                generateResponse: async () => ({ content: '' }),
                chat: async () => ({
                    choices: [{
                        message: {
                            content: '{}'
                        }
                    }]
                })
            };
        }

        const { LLMClient } = await import('../../ai/llm-client.js');
        const client = new LLMClient(llmConfig);
        await client.initialize();
        return client;
    }, {
        dependencies: ['config', 'logger'],
        metadata: { category: 'core', priority: 70 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] LLM Client initialized for ValidationPipeline');
            }
        }
    });

    return container;
}

export default registerCoreServices;
