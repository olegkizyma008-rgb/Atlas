/**
 * ATLAS ORCHESTRATOR - Service Registry
 * Version: 4.0
 *
 * Централізована реєстрація всіх сервісів orchestrator
 * Визначає залежності та lifecycle для кожного сервісу
 */

import logger from '../utils/logger.js';
import errorHandler from '../errors/error-handler.js';
import telemetry from '../utils/telemetry.js';
import wsManager from '../api/websocket-manager.js';
import webIntegration from '../api/web-integration.js';
import GlobalConfig from '../../config/atlas-config.js';
import { MCPManager } from '../ai/mcp-manager.js';
import { MCPTodoManager } from '../workflow/mcp-todo-manager.js';
import { TTSSyncManager } from '../workflow/tts-sync-manager.js';
import { VisionAnalysisService } from '../services/vision-analysis-service.js';
import { TetyanaToolSystem } from '../ai/tetyana-tool-system.js';
import AccessibilityChecker from '../utils/accessibility-checker.js';
import LocalizationService from '../services/localization-service.js';
import {
    ModeSelectionProcessor,
    AtlasTodoPlanningProcessor,
    ServerSelectionProcessor,
    TetyanaPlanToolsProcessor,
    TetyanaExecuteToolsProcessor,
    GrishaVerifyItemProcessor,
    AtlasReplanTodoProcessor,
    McpFinalSummaryProcessor
} from '../workflow/stages/index.js';
import { DevSelfAnalysisProcessor } from '../workflow/stages/dev-self-analysis-processor.js';

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

    // 3. Error Handler - обробка помилок
    container.singleton('errorHandler', () => errorHandler, {
        dependencies: ['logger'],
        metadata: { category: 'infrastructure', priority: 85 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] Error handler initialized');
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

    // 5. Localization Service - NEW
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

    return container;
}

/**
 * Реєструє API сервіси
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerApiServices(container) {
    // WebSocket Manager
    container.singleton('wsManager', () => wsManager, {
        dependencies: ['logger', 'config'],
        metadata: { category: 'api', priority: 60 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] WebSocket manager initialized');
            },
            onStart: async function () {
                // WebSocket запускається окремо в Application.startWebSocket()
                logger.system('startup', '[DI] WebSocket manager ready');
            },
            onStop: async function () {
                // Закриття WebSocket connections
                logger.system('shutdown', '[DI] WebSocket manager stopped');
            }
        }
    });

    // Web Integration
    container.singleton('webIntegration', () => webIntegration, {
        dependencies: ['logger'],
        metadata: { category: 'api', priority: 50 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] Web integration initialized');
            }
        }
    });

    return container;
}

/**
 * Реєструє state management сервіси
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerStateServices(container) {
    // Session Store - буде створений динамічно в Application
    container.singleton('sessions', () => new Map(), {
        metadata: { category: 'state', priority: 70 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] Session store initialized');
            },
            onStop: async function () {
                this.clear();
                logger.system('shutdown', '[DI] Session store cleared');
            }
        }
    });

    return container;
}

/**
 * Реєструє utility сервіси
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerUtilityServices(container) {
    logger.system('startup', '[DI-UTILITY] 🔧 Starting utility services registration...');

    // Network Config
    container.value('networkConfig', GlobalConfig.NETWORK_CONFIG);
    logger.system('startup', '[DI-UTILITY] ✅ Registered networkConfig');

    // Vision Analysis Service (OPTIMIZED 2025-10-17)
    // Priority: Port 4000 (fast ~2-5s) → Ollama (slow ~120s free) → OpenRouter (fast but $)
    logger.system('startup', '[DI-UTILITY] 🚀 Registering visionAnalysis service...');
    try {
        container.singleton('visionAnalysis', (c) => {
            const logger = c.resolve('logger');
            const service = new VisionAnalysisService({
                logger,
                config: { visionProvider: 'auto' }  // Auto-select based on availability
            });
            service._logger = logger;  // Attach logger for lifecycle hook
            return service;
        }, {
            dependencies: ['logger'],
            metadata: { category: 'utilities', priority: 45 },
            lifecycle: {
                onInit: async function () {
                    const logger = this._logger || globalThis.logger;
                    if (logger) {
                        logger.system('startup', '[DI] 🚀 Vision Analysis Service initializing...');
                    }
                    try {
                        await this.initialize();  // Check port 4000, Ollama availability
                        if (logger) {
                            const provider = this.visionProvider || 'unknown';
                            logger.system('startup', `[DI] ✅ Vision Analysis Service initialized with provider: ${provider}`);
                        }
                    } catch (error) {
                        if (logger) {
                            logger.error('startup', `[DI] ❌ Vision Analysis Service init error: ${error.message}`);
                        }
                    }
                }
            }
        });
        logger.system('startup', '[DI-UTILITY] ✅ Vision Analysis Service registered successfully');
    } catch (visionError) {
        logger.error('startup', `[DI-UTILITY] ❌ Failed to register visionAnalysis: ${visionError.message}`);
    }

    // Accessibility Checker - macOS Accessibility & Screen Recording
    if (process.env.ACCESSIBILITY_CHECK_PASSED === '1') {
        logger.system('startup', '[DI-UTILITY] Skipping accessibilityChecker: pre-check passed (ACCESSIBILITY_CHECK_PASSED=1)');
    } else {
        container.singleton('accessibilityChecker', (c) => {
            const logger = c.resolve('logger');
            const config = c.resolve('config');
            return new AccessibilityChecker({ logger, config });
        }, {
            dependencies: ['logger', 'config'],
            metadata: { category: 'utilities', priority: 46 },
            lifecycle: {
                onInit: async function () {
                    try {
                        const result = await this.checkAndPrompt();
                        if (!result.ok) {
                            // Log a warning but do not abort startup — services may run with reduced capabilities
                            logger.warn('startup', `[DI] AccessibilityChecker: ${result.reason || 'not granted'}`);
                        }
                    } catch (err) {
                        logger.error('startup', `[DI] AccessibilityChecker error: ${err?.message || err}`);
                    }
                }
            }
        });
    }

    // NEW 26.10.2025: Chat Memory Eligibility Processor - intelligent memory decision
    container.singleton('chatMemoryEligibilityProcessor', (c) => {
        // Dynamic import will be handled in lifecycle.onInit
        return null; // Placeholder, will be initialized in onInit
    }, {
        dependencies: ['logger', 'mcpManager'],
        metadata: { category: 'utilities', priority: 45 },
        lifecycle: {
            onInit: async function () {
                const { ChatMemoryEligibilityProcessor } = await import('../workflow/stages/chat-memory-eligibility-processor.js');
                const instance = new ChatMemoryEligibilityProcessor({
                    logger: container.resolve('logger'),
                    mcpManager: container.resolve('mcpManager')
                });
                // Replace placeholder with actual instance
                container._instances.set('chatMemoryEligibilityProcessor', instance);
                logger.system('startup', '[DI] 🧠 Chat Memory Eligibility Processor initialized');
            }
        }
    });

    // NEW 26.10.2025: Chat Memory Coordinator - long-term memory for chat mode
    container.singleton('chatMemoryCoordinator', (c) => {
        // Dynamic import will be handled in lifecycle.onInit
        return null; // Placeholder, will be initialized in onInit
    }, {
        dependencies: ['logger', 'mcpManager', 'chatMemoryEligibilityProcessor'],
        metadata: { category: 'utilities', priority: 44 },
        lifecycle: {
            onInit: async function () {
                const { ChatMemoryCoordinator } = await import('../workflow/chat-memory-coordinator.js');
                const instance = new ChatMemoryCoordinator({
                    logger: container.resolve('logger'),
                    mcpManager: container.resolve('mcpManager'),
                    memoryEligibilityProcessor: container.resolve('chatMemoryEligibilityProcessor')
                });
                // Replace placeholder with actual instance
                container._instances.set('chatMemoryCoordinator', instance);
                logger.system('startup', '[DI] 💾 Chat Memory Coordinator initialized');
                logger.system('startup', '[DI] 💾 Long-term memory enabled for chat mode');
            }
        }
    });

    return container;
}

/**
 * Реєструє MCP workflow сервіси (Phase 4)
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerMCPWorkflowServices(container) {

    // MCPManager - керування MCP servers
    // FIXED 14.10.2025 - Create instance synchronously, initialize in lifecycle
    // UPDATED 2025-10-23 - Using MCP_REGISTRY for centralized configuration
    container.singleton('mcpManager', (c) => {
        const config = c.resolve('config');
        // Use MCP_REGISTRY instead of AI_BACKEND_CONFIG
        const serversConfig = config.MCP_REGISTRY?.getEnabledServers() || 
                             config.AI_BACKEND_CONFIG?.providers?.mcp?.servers || {};

        // Create MCPManager instance (doesn't start servers yet)
        // Actual initialization (spawning servers) happens in onInit hook
        return new MCPManager(serversConfig);
    }, {
        dependencies: ['config'],
        metadata: { category: 'workflow', priority: 55 },
        lifecycle: {
            onInit: async function () {
                // FIXED 14.10.2025 - Initialize MCPManager (spawn servers, load tools)
                // this = MCPManager instance
                // Without this call, listTools() returns empty array!
                await this.initialize();
                logger.system('startup', '[DI] MCPManager initialized with servers');
            }
        }
    });

    // NEW 2025-10-20: TetyanaToolSystem - Goose-inspired tool management
    // FIXED 2025-10-21: Removed async from factory (DI Container doesn't support async factories)
    container.singleton('tetyanaToolSystem', (c) => {
        const mcpManager = c.resolve('mcpManager');
        const config = c.resolve('config');

        // Create TetyanaToolSystem without LLM client first
        // LLM client will be loaded asynchronously in onInit
        return new TetyanaToolSystem(mcpManager, null);
    }, {
        dependencies: ['mcpManager', 'config'],
        metadata: { category: 'workflow', priority: 54 },
        lifecycle: {
            onInit: async function () {
                // Load LLM client asynchronously
                const config = container.resolve('config');
                const llmConfig = config.AI_BACKEND_CONFIG?.providers?.mcp?.llm;

                if (llmConfig) {
                    try {
                        const { LLMClient } = await import('../ai/llm-client.js');
                        this.llmClient = new LLMClient(llmConfig);
                        this.llmValidator = new (await import('../ai/llm-tool-selector.js')).LLMToolValidator(this.llmClient);
                        logger.system('startup', '[DI] 🛡️ LLM client loaded for TetyanaToolSystem');
                    } catch (error) {
                        logger.warn('startup', `[DI] ⚠️ Failed to load LLM client: ${error.message}`);
                    }
                }

                // Initialize TetyanaToolSystem (load extensions, prepare inspectors)
                await this.initialize();
                const stats = this.getStatistics();
                logger.system('startup',
                    `[DI] 🎯 TetyanaToolSystem initialized: ${stats.totalTools} tools from ${stats.totalServers} servers (${stats.availableServers.join(', ')})`);

                if (stats.llmValidator) {
                    logger.system('startup',
                        `[DI] 🛡️ LLM Validator ACTIVE - ${stats.llmValidator.totalValidations} validations ready`);
                }
            }
        }
    });

    // TTSSyncManager - TTS synchronization для MCP workflow
    // FIXED 14.10.2025 NIGHT - Pass wsManager as ttsService for WebSocket TTS delivery
    container.singleton('ttsSyncManager', (c) => {
        return new TTSSyncManager({
            ttsService: c.resolve('wsManager'),  // FIXED: Use wsManager for WebSocket TTS
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['wsManager', 'logger'],  // FIXED: Added wsManager dependency
        metadata: { category: 'workflow', priority: 60 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] TTSSyncManager initialized with WebSocket TTS');
            }
        }
    });

    // MCPTodoManager - головний менеджер MCP TODO
    container.singleton('mcpTodoManager', (c) => {
        return new MCPTodoManager({
            mcpManager: c.resolve('mcpManager'),
            llmClient: null,  // Will be lazy-loaded when needed
            ttsSyncManager: c.resolve('ttsSyncManager'),
            wsManager: c.resolve('wsManager'),  // ADDED 14.10.2025 - For chat updates
            atlasReplanProcessor: c.resolve('atlasReplanTodoProcessor'),  // ADDED 20.10.2025 - For deep replan
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpManager', 'ttsSyncManager', 'wsManager', 'atlasReplanTodoProcessor', 'logger'],
        metadata: { category: 'workflow', priority: 50 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] MCPTodoManager initialized with replan support');
            }
        }
    });

    return container;
}

/**
 * Реєструє MCP stage processors (Phase 4)
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerMCPProcessors(container) {
    // Mode Selection Processor (Stage 0-MCP) - NEW 16.10.2025
    container.singleton('modeSelectionProcessor', (c) => {
        return new ModeSelectionProcessor({
            llmClient: null,  // Will use axios directly
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['logger'],
        metadata: { category: 'processors', priority: 45 }
    });

    // DEV Self-Analysis Processor (Stage 0-DEV) - NEW 28.10.2025
    container.singleton('devSelfAnalysisProcessor', (c) => {
        const instance = new DevSelfAnalysisProcessor(
            c.resolve('logger'),
            c
        );
        logger.system('startup', '[DI] 🔬 DEV Self-Analysis Processor initialized');
        return instance;
    }, {
        dependencies: ['logger'],
        metadata: { category: 'processors', priority: 44 }
    });

    // Self-Correction Validator - NEW 29.10.2025
    // Lazy initialization in validation-pipeline.js to avoid require issues
    container.singleton('selfCorrectionValidator', (c) => {
        return null; // Will be lazily initialized when needed
    }, {
        dependencies: [],
        metadata: { category: 'validators', priority: 43 }
    });

    // Context-Aware Tool Filter - NEW 29.10.2025
    container.singleton('contextAwareToolFilter', async (c) => {
        const { default: ContextAwareToolFilter } = await import('../ai/context-aware-tool-filter.js');
        return new ContextAwareToolFilter(
            c.resolve('logger')
        );
    }, {
        dependencies: ['logger'],
        metadata: { category: 'filters', priority: 42 }
    });

    // Workflow State Machine - NEW 29.10.2025
    container.singleton('workflowStateMachine', async (c) => {
        const { StateMachineFactory } = await import('../workflow/state-machine.js');
        return StateMachineFactory.createMCPWorkflow(
            c.resolve('logger')
        );
    }, {
        dependencies: ['logger'],
        metadata: { category: 'workflow', priority: 41 }
    });

    // Router Classifier Processor - NEW 29.10.2025
    // Optional fast pre-filter before server selection
    container.singleton('routerClassifier', async (c) => {
        const { default: RouterClassifierProcessor } = await import('../workflow/stages/router-classifier-processor.js');
        // LLMClient will be resolved from tetyanaToolSystem if needed
        return new RouterClassifierProcessor(
            c.resolve('logger'),
            null // LLM client not needed for basic routing
        );
    }, {
        dependencies: ['logger'],
        metadata: { category: 'processors', priority: 40 }
    });

    // MCP Schema Builder - NEW 29.10.2025
    // Implements Schema-First approach from refactor.md
    container.singleton('mcpSchemaBuilder', async (c) => {
        const { default: MCPSchemaBuilder } = await import('../mcp/schema-builder.js');
        return new MCPSchemaBuilder(
            c.resolve('logger')
        );
    }, {
        dependencies: ['logger'],
        metadata: { category: 'mcp', priority: 39 }
    });

    // Atlas TODO Planning Processor (Stage 1-MCP)
    container.singleton('atlasTodoPlanningProcessor', (c) => {
        return new AtlasTodoPlanningProcessor({
            mcpTodoManager: c.resolve('mcpTodoManager'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpTodoManager', 'logger'],
        metadata: { category: 'processors', priority: 40 }
    });

    // Server Selection Processor (Stage 2.0-MCP)
    container.singleton('serverSelectionProcessor', (c) => {
        return new ServerSelectionProcessor({
            mcpManager: c.resolve('mcpManager'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpManager', 'logger'],
        metadata: { category: 'processors', priority: 40 }
    });

    // Tetyana Plan Tools Processor (Stage 2.1-MCP)
    // UPDATED 2025-10-20: Added TetyanaToolSystem dependency
    container.singleton('tetyanaPlanToolsProcessor', (c) => {
        return new TetyanaPlanToolsProcessor({
            mcpTodoManager: c.resolve('mcpTodoManager'),
            mcpManager: c.resolve('mcpManager'),
            tetyanaToolSystem: c.resolve('tetyanaToolSystem'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpTodoManager', 'mcpManager', 'tetyanaToolSystem', 'logger'],
        metadata: { category: 'processors', priority: 40 }
    });

    // Tetyana Execute Tools Processor (Stage 2.2-MCP)
    // UPDATED 2025-10-20: Added TetyanaToolSystem dependency
    container.singleton('tetyanaExecuteToolsProcessor', (c) => {
        return new TetyanaExecuteToolsProcessor({
            mcpTodoManager: c.resolve('mcpTodoManager'),
            mcpManager: c.resolve('mcpManager'),
            tetyanaToolSystem: c.resolve('tetyanaToolSystem'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpTodoManager', 'mcpManager', 'tetyanaToolSystem', 'logger'],
        metadata: { category: 'processors', priority: 40 }
    });

    // Grisha Verify Item Processor (Stage 2.3-MCP)
    // UPDATED 2025-10-22: Added container for resolving TetyanaExecuteToolsProcessor
    // UPDATED 2025-10-22: Added callLLM for eligibility routing
    container.singleton('grishaVerifyItemProcessor', (c) => {
        return new GrishaVerifyItemProcessor({
            mcpTodoManager: c.resolve('mcpTodoManager'),
            mcpManager: c.resolve('mcpManager'),
            wsManager: c.resolve('wsManager'),  // FIXED 2025-10-21: Added for chat messages
            visionAnalysis: c.resolve('visionAnalysis'),
            tetyanaToolSystem: c.resolve('tetyanaToolSystem'),  // FIXED 2025-10-22: Required for MCP verification
            container: c,  // NEW 2025-10-22: Pass DI Container for resolving Tetyana's processor
            callLLM: async (params) => {  // NEW 2025-10-22: LLM client for eligibility routing
                const axios = (await import('axios')).default;
                const config = c.resolve('config');
                const endpoint = config.MCP_MODEL_CONFIG?.apiEndpoint?.primary;
                
                // Validate endpoint configuration
                if (!endpoint) {
                    logger.warn('service-registry', '[callLLM] No primary endpoint configured, using fallback');
                    return null; // Return null to trigger fallback behavior
                }
                
                try {
                    const response = await axios.post(endpoint, {
                        model: params.model || 'atlas-mistral-nemo',
                        messages: [
                            { role: 'system', content: params.systemPrompt || '' },
                            { role: 'user', content: params.userPrompt || '' }
                        ],
                        temperature: params.temperature || 0.3,
                        max_tokens: params.max_tokens || 1500
                    }, {
                        timeout: config.MCP_MODEL_CONFIG?.apiEndpoint?.timeout || 60000,
                        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
                    });
                    
                    // Check for valid response
                    if (response.data?.choices?.[0]?.message?.content) {
                        return response.data.choices[0].message.content;
                    }
                    
                    logger.warn('service-registry', '[callLLM] Invalid response structure from LLM');
                    return null;
                } catch (error) {
                    // Log error but don't throw - return null for graceful degradation
                    logger.warn('service-registry', `[callLLM] Request failed: ${error.message}, using fallback`);
                    return null; // Allow processor to handle fallback
                }
            },
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpTodoManager', 'mcpManager', 'wsManager', 'visionAnalysis', 'tetyanaToolSystem', 'logger', 'config'],
        metadata: { category: 'processors', priority: 40 }
    });

    // Atlas Replan TODO Processor (Stage 3.5-MCP) - NEW 18.10.2025
    container.singleton('atlasReplanTodoProcessor', (c) => {
        return new AtlasReplanTodoProcessor({
            mcpManager: c.resolve('mcpManager'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpManager', 'logger'],
        metadata: { category: 'processors', priority: 40 }
    });

    // MCP Final Summary Processor (Stage 8-MCP)
    container.singleton('mcpFinalSummaryProcessor', (c) => {
        return new McpFinalSummaryProcessor({
            mcpTodoManager: c.resolve('mcpTodoManager'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpTodoManager', 'logger'],
        metadata: { category: 'processors', priority: 40 }
    });

    logger.system('startup', '[DI] Registered 10 MCP stage processors');  // UPDATED 28.10.2025 (was 9)

    return container;
}

/**
 * Повна реєстрація всіх сервісів
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerAllServices(container) {
    logger.system('startup', '[DI] Registering all services...');

    registerCoreServices(container);
    registerApiServices(container);
    registerStateServices(container);
    registerUtilityServices(container);
    registerMCPWorkflowServices(container);
    registerMCPProcessors(container);

    logger.system('startup', `[DI] Registered ${container.getServices().length} services`, {
        services: container.getServices()
    });

    return container;
}

export default registerAllServices;
