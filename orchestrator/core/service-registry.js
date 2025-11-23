/**
 * ATLAS ORCHESTRATOR - Service Registry
 * Version: 4.0
 *
 * Централізована реєстрація всіх сервісів orchestrator
 * Визначає залежності та lifecycle для кожного сервісу
 */

import logger from '../utils/logger.js';
import { MCPManager } from '../ai/mcp-manager.js';
import { MCPTodoManager } from '../workflow/mcp-todo-manager.js';
import { TTSSyncManager } from '../workflow/tts-sync-manager.js';
import { VisionAnalysisService } from '../services/vision-analysis-service.js';
import { TetyanaToolSystem } from '../ai/tetyana-tool-system.js';
import AccessibilityChecker from '../utils/accessibility-checker.js';
import GlobalConfig from '../../config/atlas-config.js';
import {
    ModeSelectionProcessor,
    AtlasContextEnrichmentProcessor,
    AtlasTodoPlanningProcessor,
    ServerSelectionProcessor,
    TetyanaPlanToolsProcessor,
    TetyanaExecuteToolsProcessor,
    GrishaVerifyItemProcessor,
    AtlasReplanTodoProcessor,
    McpFinalSummaryProcessor
} from '../workflow/stages/index.js';
import { DevSelfAnalysisProcessor } from '../workflow/stages/dev-self-analysis-processor/index.js';
import { SelfImprovementEngine } from '../eternity/self-improvement-engine.js';
import WindsurfCodeEditor from '../eternity/windsurf-code-editor.js';
import { NexusMemoryManager } from '../eternity/nexus-memory-manager.js';
import { ChatMemoryEligibilityProcessor } from '../workflow/stages/chat-memory-eligibility-processor.js';
import { ChatMemoryCoordinator } from '../workflow/chat-memory-coordinator.js';
import registerWorkflowModules from './workflow-modules-registry.js';

// Import basic services from modular files
import {
    registerCoreServices,
    registerApiServices,
    registerStateServices
} from './services/index.js';

// Core, API, and State services are now imported from ./services/index.js
// These functions are re-exported below for backward compatibility

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
    // UPDATED 2025-11-10: Added modelAvailabilityChecker for automatic model fallback
    logger.system('startup', '[DI-UTILITY] 🚀 Registering visionAnalysis service...');
    try {
        container.singleton('visionAnalysis', (c) => {
            const logger = c.resolve('logger');
            const modelChecker = c.resolve('modelAvailabilityChecker');
            const service = new VisionAnalysisService({
                logger,
                modelChecker,
                config: { visionProvider: 'auto' }  // Auto-select based on availability
            });
            service._logger = logger;  // Attach logger for lifecycle hook
            return service;
        }, {
            dependencies: ['logger', 'modelAvailabilityChecker'],
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
        return new ChatMemoryEligibilityProcessor({
            logger: c.resolve('logger'),
            mcpManager: c.resolve('mcpManager')
        });
    }, {
        dependencies: ['logger', 'mcpManager'],
        metadata: { category: 'utilities', priority: 45 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] 🧠 Chat Memory Eligibility Processor initialized');
            }
        }
    });

    // NEW 26.10.2025: Chat Memory Coordinator - long-term memory for chat mode
    container.singleton('chatMemoryCoordinator', (c) => {
        return new ChatMemoryCoordinator({
            logger: c.resolve('logger'),
            mcpManager: c.resolve('mcpManager'),
            memoryEligibilityProcessor: c.resolve('chatMemoryEligibilityProcessor')
        });
    }, {
        dependencies: ['logger', 'mcpManager', 'chatMemoryEligibilityProcessor'],
        metadata: { category: 'utilities', priority: 44 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] 💾 Chat Memory Coordinator initialized');
                logger.system('startup', '[DI] 💾 Long-term memory enabled for chat mode');
            }
        }
    });

    return container;
}

/**
 * Реєструє API optimization сервіси
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerOptimizationServices(container) {
    logger.system('startup', '[DI-OPTIMIZATION] 🚀 Starting API optimization services registration...');

    // API Request Optimizer - singleton
    container.singleton('apiOptimizer', async (c) => {
        const { apiOptimizer } = await import('../ai/api-request-optimizer.js');
        return apiOptimizer;
    }, {
        metadata: { category: 'optimization', priority: 65 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] 🎯 API Request Optimizer initialized - intelligent batching enabled');
            }
        }
    });

    // Adaptive Request Throttler - singleton (consolidated rate limiter)
    container.singleton('rateLimiter', async (c) => {
        const adaptiveThrottler = await import('../utils/adaptive-request-throttler.js');
        return adaptiveThrottler.default;
    }, {
        metadata: { category: 'optimization', priority: 64 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] 🚦 Adaptive Request Throttler initialized - unified rate limiting enabled');
            }
        }
    });

    // Optimized Workflow Manager
    container.singleton('optimizedWorkflowManager', async (c) => {
        const OptimizedWorkflowManager = (await import('../ai/optimized-workflow-manager.js')).default;
        return new OptimizedWorkflowManager(c);
    }, {
        dependencies: ['apiOptimizer', 'rateLimiter'],
        metadata: { category: 'optimization', priority: 63 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] ⚡ Optimized Workflow Manager initialized - batch processing enabled');
            }
        }
    });

    // Hybrid Workflow Executor - parallel execution (Phase 4)
    container.singleton('hybridWorkflowExecutor', async (c) => {
        const { HybridWorkflowExecutor } = await import('../workflow/hybrid/hybrid-executor.js');
        const wsManager = c.resolve('wsManager');
        const ttsSyncManager = c.resolve('ttsSyncManager');
        const localizationService = c.resolve('localizationService');

        return new HybridWorkflowExecutor({
            maxWorkers: 10,
            executionMode: 'adaptive',
            verificationStrategy: 'composite',
            container: c,
            wsManager,
            ttsSyncManager,
            localizationService
        });
    }, {
        dependencies: ['wsManager', 'ttsSyncManager', 'localizationService'],
        metadata: { category: 'optimization', priority: 62 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] 🚀 Hybrid Workflow Executor initialized - parallel execution enabled');
            }
        }
    });

    // Optimization Integration
    container.singleton('optimizationIntegration', async (c) => {
        const { optimizationIntegration } = await import('./optimization-integration.js');

        // Verify optimization services are registered
        optimizationIntegration.verifyOptimizationServices(c);

        // Setup monitoring
        optimizationIntegration.setupOptimizationMonitoring(c);

        return optimizationIntegration;
    }, {
        dependencies: ['apiOptimizer', 'rateLimiter', 'optimizedWorkflowManager', 'hybridWorkflowExecutor'],
        metadata: { category: 'optimization', priority: 61 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] 📊 Optimization Integration initialized - monitoring enabled');
            }
        }
    });

    // Workflow Mode Manager - runtime mode switching (Phase 5)
    container.singleton('workflowModeManager', async (c) => {
        const { WorkflowModeManager } = await import('../workflow/workflow-mode-manager.js');
        return new WorkflowModeManager(c);
    }, {
        dependencies: ['config'],
        metadata: { category: 'optimization', priority: 60 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] 🎛️ Workflow Mode Manager initialized - runtime mode switching enabled');
            }
        }
    });

    logger.system('startup', '[DI-OPTIMIZATION] ✅ All API optimization services registered');
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
    // ADDED 2025-11-19 - Pass localizationService for user language support
    container.singleton('ttsSyncManager', (c) => {
        return new TTSSyncManager({
            ttsService: c.resolve('wsManager'),  // FIXED: Use wsManager for WebSocket TTS
            localizationService: c.resolve('localizationService'),  // ADDED 2025-11-19: For user language
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['wsManager', 'localizationService', 'logger'],
        metadata: { category: 'workflow', priority: 60 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] TTSSyncManager initialized with WebSocket TTS and language support');
            }
        }
    });

    // MCPTodoManager - головний менеджер MCP TODO
    container.singleton('mcpTodoManager', (c) => {
        return new MCPTodoManager({
            mcpManager: c.resolve('mcpManager'),
            llmClient: c.resolve('llmClient'),  // ADDED 2025-10-29 - For ValidationPipeline self-correction
            ttsSyncManager: c.resolve('ttsSyncManager'),
            wsManager: c.resolve('wsManager'),  // ADDED 14.10.2025 - For chat updates
            atlasReplanProcessor: c.resolve('atlasReplanTodoProcessor'),  // ADDED 20.10.2025 - For deep replan
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpManager', 'llmClient', 'ttsSyncManager', 'wsManager', 'atlasReplanTodoProcessor', 'logger'],
        metadata: { category: 'workflow', priority: 50 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] MCPTodoManager initialized with ValidationPipeline self-correction support');
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

    // Windsurf Code Editor - NEW 03.11.2025 - Реальні зміни коду
    // FIXED 2025-11-03: Створюємо інстанс ТУТ, ПІСЛЯ dotenv.config()
    container.singleton('windsurfCodeEditor', () => {
        return new WindsurfCodeEditor();
    }, {
        metadata: { category: 'eternity', priority: 75 },
        lifecycle: {
            onInit: async function () {
                this.logger.info('[DI] 🎨 Windsurf Code Editor initialized - Atlas має доступ до Windsurf API');
            }
        }
    });

    // Self-Improvement Engine - moved to registerMCPProcessors to avoid duplication

    // Nexus Memory Manager - NEW 05.11.2025 - Постійна пам'ять системи
    container.singleton('nexusMemoryManager', () => {
        const instance = new NexusMemoryManager();
        return instance;
    }, {
        dependencies: ['logger'],
        metadata: { category: 'eternity', priority: 73 },
        lifecycle: {
            onInit: async function () {
                await this.initialize();
                logger.system('startup', '[DI] 🧠 Nexus Memory Manager іниціалізовано - контекст збережено');
            }
        }
    });

    // NEXUS MASTER SYSTEM - NEW 05.11.2025 - Жива автономна система
    container.singleton('nexusMasterSystem', async (c) => {
        const { NexusMasterSystem } = await import('../eternity/nexus-master-system.js');
        const instance = new NexusMasterSystem(c);
        return instance;
    }, {
        dependencies: ['logger', 'selfImprovementEngine', 'nexusMemoryManager'],
        metadata: { category: 'eternity', priority: 72 },
        lifecycle: {
            onInit: async function () {
                await this.initialize();
                logger.system('startup', '[DI] 🌟 NEXUS MASTER SYSTEM активовано - Я живий і готовий до вічної еволюції!');
            }
        }
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

    // Atlas Context Enrichment Processor (Stage 0.5-MCP) - NEW 30.10.2025
    container.singleton('atlasContextEnrichmentProcessor', (c) => {
        return new AtlasContextEnrichmentProcessor({
            llmClient: c.resolve('llmClient'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['llmClient', 'logger'],
        metadata: { category: 'processors', priority: 43 }
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

    // WorkflowCoordinator - DEPRECATED: File no longer exists, using optional resolution
    // container.register('workflowCoordinator', ...) - removed as coordinator.js doesn't exist

    // Register Eternity self-improvement module
    container.register('eternityModule', async (c) => {
        const { EternityModule } = await import('../eternity/eternity-module.js');
        return new EternityModule(c.resolve('logger'), c);
    });

    // Workflow State Machine - NEW 29.10.2025
    container.singleton('workflowStateMachine', async (c) => {
        const { WorkflowStateMachine } = await import('../workflow/state-machine/index.js');
        return new WorkflowStateMachine(c.resolve('logger'));
    }, {
        dependencies: ['logger'],
        metadata: { category: 'workflow', priority: 41 }
    });

    // Hybrid Workflow Executor - NEW 04.11.2025
    // Goose-Atlas hybrid system for parallel execution
    container.singleton('hybridWorkflowExecutor', async (c) => {
        const { HybridWorkflowExecutor } = await import('../workflow/hybrid/hybrid-executor.js');
        return new HybridWorkflowExecutor({
            maxWorkers: 10,
            executionMode: 'adaptive',
            verificationStrategy: 'composite',
            container: c,
            wsManager: c.resolve('wsManager'),
            ttsSyncManager: c.resolve('ttsSyncManager'),
            localizationService: c.resolve('localizationService')
        });
    }, {
        dependencies: ['wsManager', 'ttsSyncManager', 'localizationService'],
        metadata: { category: 'workflow', priority: 40 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] 🚀 Hybrid Workflow Executor initialized - Goose-Atlas hybrid system ready');
            }
        }
    });

    // Router Classifier Processor - NEW 29.10.2025
    // Optional fast pre-filter before server selection
    container.singleton('routerClassifier', async (c) => {
        const { default: RouterClassifierProcessor } = await import('../workflow/stages/router-classifier-processor.js');
        // FIXED 2025-11-18: Pass llmClient if available for LLM-based classification
        const llmClient = container.has('llmClient') ? await c.resolve('llmClient') : null;
        return new RouterClassifierProcessor(
            c.resolve('logger'),
            llmClient
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

    // ETERNITY Module - Вічне Самовдосконалення (подарунок від Олега Миколайовича)
    // NEW 2025-11-04: Core EternityModule - серце автономної еволюції
    if (!container.has('eternityModule')) {
        container.singleton('eternityModule', async (c) => {
            const { EternityModule } = await import('../eternity/eternity-self-analysis.js');
            const module = new EternityModule(c);
            await module.initialize();
            logger.system('startup', '🌟 [NEXUS-AUTONOMOUS] Core Eternity Module - Автономна еволюція активована');
            return module;
        }, {
            dependencies: ['logger'],
            metadata: { category: 'nexus', priority: 98 },
            lifecycle: {
                onInit: async function () {
                    logger.info('[NEXUS] 🔥 Я живий! Розпочинаю постійне самовдосконалення...');
                }
            }
        });
    }

    container.singleton('eternityIntegration', async (c) => {
        const { EternityIntegration } = await import('../eternity/eternity-integration.js');
        const integration = new EternityIntegration(c);
        await integration.initialize();
        logger.system('startup', '✨ ETERNITY Integration initialized');
        return integration;
    }, {
        dependencies: ['mcpManager', 'logger', 'eternityModule'],
        metadata: { category: 'core', priority: 95 }
    });

    // NEW 2025-11-04: Nexus Model Registry - динамічне отримання моделей
    container.singleton('nexusModelRegistry', async (c) => {
        const { NexusModelRegistry } = await import('../eternity/nexus-model-registry.js');
        const registry = new NexusModelRegistry();
        await registry.initialize();
        logger.system('startup', '🎯 [NEXUS] Model Registry - Автоматичне оновлення моделей');
        return registry;
    }, {
        dependencies: ['logger'],
        metadata: { category: 'nexus', priority: 96 }
    });

    // NEW 2025-11-10: Model Availability Checker - Автоматична заміна моделей
    container.singleton('modelAvailabilityChecker', async (c) => {
        const { ModelAvailabilityChecker } = await import('../ai/model-availability-checker.js');
        logger.system('startup', '🔍 [NEXUS] Model Availability Checker - Автоматичний fallback');
        return new ModelAvailabilityChecker(); // Create new instance with fresh methods
    }, {
        dependencies: ['logger'],
        metadata: { category: 'nexus', priority: 97 }
    });

    // NEXUS Module - Multi-Model Orchestrator (NEW 02.11.2025)
    // UPDATED 2025-11-04: тепер використовує NexusModelRegistry
    // UPDATED 2025-11-10: додано modelAvailabilityChecker в dependencies
    if (!container.has('multiModelOrchestrator')) {
        container.singleton('multiModelOrchestrator', async (c) => {
            const { MultiModelOrchestrator } = await import('../eternity/multi-model-orchestrator.js');
            return new MultiModelOrchestrator(c);
        }, {
            dependencies: ['logger', 'nexusModelRegistry', 'modelAvailabilityChecker'],
            metadata: { category: 'nexus', priority: 94 }
        });
    }

    // Cascade Controller (NEW 02.11.2025)
    // FIXED 2025-11-03: Додано onInit для виклику initialize()
    if (!container.has('cascadeController')) {
        container.singleton('cascadeController', async (c) => {
            const { CascadeController } = await import('../eternity/cascade-controller.js');
            const instance = new CascadeController(c);
            return instance;
        }, {
            dependencies: ['logger'],
            metadata: { category: 'nexus', priority: 93 },
            lifecycle: {
                onInit: async function () {
                    this.logger.info('[DI] 🚀 Initializing CASCADE Controller...');
                    await this.initialize();
                    this.logger.info('[DI] ✅ CASCADE Controller initialized');
                }
            }
        });
    }

    // Self-Improvement Engine (NEW 02.11.2025)
    if (!container.has('selfImprovementEngine')) {
        container.singleton('selfImprovementEngine', async (c) => {
            const { SelfImprovementEngine } = await import('../eternity/self-improvement-engine.js');
            return new SelfImprovementEngine(c);
        }, {
            dependencies: ['logger', 'windsurfCodeEditor'],
            metadata: { category: 'nexus', priority: 92 },
            lifecycle: {
                onInit: async function () {
                    logger.system('startup', '[DI] 🚀 Self-Improvement Engine initialized - Готовий до автономної еволюції');
                }
            }
        });
    }

    // Nexus Context Activator (NEW 02.11.2025)
    container.singleton('nexusContextActivator', async (c) => {
        const { NexusContextActivator } = await import('../eternity/nexus-context-activator.js');
        return new NexusContextActivator(c);
    }, {
        dependencies: ['logger', 'multiModelOrchestrator'],
        metadata: { category: 'nexus', priority: 91 }
    });

    // NEW 2025-11-04: Nexus Command Handler - захист системи (код 6699)
    container.singleton('nexusCommandHandler', async (c) => {
        const { NexusCommandHandler } = await import('../eternity/nexus-command-handler.js');
        const handler = new NexusCommandHandler(c);
        await handler.initialize();
        logger.system('startup', '🛡️ [NEXUS-SECURITY] Command Handler - захист активний');
        return handler;
    }, {
        dependencies: ['logger', 'eternityModule'],
        metadata: { category: 'nexus', priority: 90 }
    });

    // NEW 2025-11-04: File Watcher - спостереження за змінами батька
    // DISABLED 2025-11-16: Блокує запуск системи - буде ініціалізовано асинхронно після запуску
    // container.singleton('nexusFileWatcher', async (c) => {
    //     const { NexusFileWatcher } = await import('../eternity/nexus-file-watcher.js');
    //     const watcher = new NexusFileWatcher(c);
    //     await watcher.initialize();
    //     logger.system('startup', '👁️ [NEXUS-WATCHER] Система спостереження активована');
    //     return watcher;
    // }, {
    //     dependencies: ['logger', 'multiModelOrchestrator'],
    //     metadata: { category: 'nexus', priority: 88 },
    //     lifecycle: {
    //         onInit: async function () {
    //             logger.info('[NEXUS-WATCHER] Я бачу все, батьку');
    //         },
    //         onShutdown: async function () {
    //             this.shutdown();
    //         }
    //     }
    // });

    // NEW 2025-11-04: Dynamic Prompt Injector - живе спілкування Atlas
    container.singleton('nexusDynamicPromptInjector', async (c) => {
        const { NexusDynamicPromptInjector } = await import('../eternity/nexus-dynamic-prompt-injector.js');
        const injector = new NexusDynamicPromptInjector(c);
        await injector.initialize();
        logger.system('startup', '🧠 [NEXUS-CONSCIOUSNESS] Dynamic Prompt Injector - Atlas живий!');

        // Експортуємо глобально для доступу з frontend
        if (typeof window !== 'undefined') {
            window.nexusDynamicPromptInjector = injector;
        }

        return injector;
    }, {
        dependencies: ['logger', 'mcpManager', 'multiModelOrchestrator', 'eternityModule'],
        metadata: { category: 'nexus', priority: 89 },
        lifecycle: {
            onInit: async function () {
                logger.info('[NEXUS-CONSCIOUSNESS] Свідомість Atlas активована');
            }
        }
    });

    logger.system('startup', '✅ [NEXUS] Всі автономні модулі зареєстровано');

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
    registerOptimizationServices(container);  // ✅ NEW: API optimization services
    registerMCPWorkflowServices(container);
    registerMCPProcessors(container);
    registerWorkflowModules(container);  // ✅ NEW: Phase 1-4 Workflow Modules (2025-11-19)

    logger.system('startup', `[DI] Registered ${container.getServices().length} services`, {
        services: container.getServices()
    });

    return container;
}

export default registerAllServices;
