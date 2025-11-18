/**
 * @fileoverview Workflow Modules Registry - Phase 1-4 Registration
 * Registers all new modular workflow components in DI container
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

import { WorkflowEngine } from '../workflow/core/workflow-engine.js';
import { TodoBuilder } from '../workflow/core/todo-builder.js';
import { TodoExecutor } from '../workflow/core/todo-executor.js';
import { ToolPlanner } from '../workflow/planning/tool-planner.js';
import { DependencyResolver } from '../workflow/planning/dependency-resolver.js';
import { AdaptivePlanner } from '../workflow/planning/adaptive-planner.js';
import { ToolExecutor } from '../workflow/execution/tool-executor.js';
import { MCPExecutor } from '../workflow/execution/mcp-executor.js';
import { FallbackHandler } from '../workflow/execution/fallback-handler.js';
import { VerificationEngine } from '../workflow/verification/verification-engine.js';
import { MCPVerifier } from '../workflow/verification/mcp-verifier.js';
import { LLMVerifier } from '../workflow/verification/llm-verifier.js';
import { AdaptiveVerifier } from '../workflow/verification/adaptive-verifier.js';
import { ProcessorRegistry } from '../workflow/utils/processor-registry.js';
import { TemplateResolver } from '../workflow/utils/template-resolver.js';
import { ContextBuilder } from '../workflow/utils/context-builder.js';

/**
 * Register Phase 1-4 workflow modules in DI container
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerWorkflowModules(container) {
    const logger = container.resolve('logger');

    // ============================================================================
    // PHASE 1: CORE MODULES
    // ============================================================================

    // ProcessorRegistry - Centralized processor management
    container.singleton('processorRegistry', (c) => {
        return new ProcessorRegistry({
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['logger'],
        metadata: { category: 'workflow', priority: 70, phase: 1 }
    });

    // TemplateResolver - Template string resolution
    container.singleton('templateResolver', (c) => {
        return new TemplateResolver({
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['logger'],
        metadata: { category: 'workflow', priority: 69, phase: 1 }
    });

    // ContextBuilder - Workflow context management
    container.singleton('contextBuilder', (c) => {
        return new ContextBuilder({
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['logger'],
        metadata: { category: 'workflow', priority: 68, phase: 1 }
    });

    // TodoBuilder - Build TODO from user messages
    container.singleton('todoBuilder', (c) => {
        return new TodoBuilder({
            llmClient: c.resolve('llmClient'),
            logger: c.resolve('logger'),
            localizationService: c.resolve('localizationService')
        });
    }, {
        dependencies: ['llmClient', 'logger', 'localizationService'],
        metadata: { category: 'workflow', priority: 67, phase: 1 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] TodoBuilder initialized - Phase 1 Core Module');
            }
        }
    });

    // ToolPlanner - Plan tools for TODO items
    container.singleton('toolPlanner', (c) => {
        return new ToolPlanner({
            mcpManager: c.resolve('mcpManager'),
            llmClient: c.resolve('llmClient'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpManager', 'llmClient', 'logger'],
        metadata: { category: 'workflow', priority: 66, phase: 1 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] ToolPlanner initialized - Phase 1 Core Module');
            }
        }
    });

    // ToolExecutor - Execute planned tools
    container.singleton('toolExecutor', (c) => {
        return new ToolExecutor({
            mcpManager: c.resolve('mcpManager'),
            rateLimiter: c.resolve('adaptiveRequestThrottler'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpManager', 'adaptiveRequestThrottler', 'logger'],
        metadata: { category: 'workflow', priority: 65, phase: 1 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] ToolExecutor initialized - Phase 1 Core Module');
            }
        }
    });

    // ============================================================================
    // PHASE 2: VERIFICATION MODULES
    // ============================================================================

    // MCPVerifier - MCP-based verification
    container.singleton('mcpVerifier', (c) => {
        return new MCPVerifier({
            mcpManager: c.resolve('mcpManager'),
            grishaVerifyProcessor: c.resolve('grishaVerifyItemProcessor'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpManager', 'grishaVerifyItemProcessor', 'logger'],
        metadata: { category: 'workflow', priority: 64, phase: 2 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] MCPVerifier initialized - Phase 2 Verification Module');
            }
        }
    });

    // LLMVerifier - LLM-based verification
    container.singleton('llmVerifier', (c) => {
        return new LLMVerifier({
            llmClient: c.resolve('llmClient'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['llmClient', 'logger'],
        metadata: { category: 'workflow', priority: 63, phase: 2 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] LLMVerifier initialized - Phase 2 Verification Module');
            }
        }
    });

    // AdaptiveVerifier - Adaptive verification strategy selection
    container.singleton('adaptiveVerifier', (c) => {
        return new AdaptiveVerifier({
            mcpVerifier: c.resolve('mcpVerifier'),
            llmVerifier: c.resolve('llmVerifier'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpVerifier', 'llmVerifier', 'logger'],
        metadata: { category: 'workflow', priority: 62, phase: 2 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] AdaptiveVerifier initialized - Phase 2 Verification Module');
            }
        }
    });

    // VerificationEngine - Main verification coordinator
    container.singleton('verificationEngine', (c) => {
        return new VerificationEngine({
            mcpVerifier: c.resolve('mcpVerifier'),
            llmVerifier: c.resolve('llmVerifier'),
            adaptiveVerifier: c.resolve('adaptiveVerifier'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpVerifier', 'llmVerifier', 'adaptiveVerifier', 'logger'],
        metadata: { category: 'workflow', priority: 61, phase: 2 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] VerificationEngine initialized - Phase 2 Verification Module');
            }
        }
    });

    // ============================================================================
    // PHASE 3: PLANNING MODULES
    // ============================================================================

    // DependencyResolver - Resolve item dependencies
    container.singleton('dependencyResolver', (c) => {
        return new DependencyResolver({
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['logger'],
        metadata: { category: 'workflow', priority: 60, phase: 3 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] DependencyResolver initialized - Phase 3 Planning Module');
            }
        }
    });

    // AdaptivePlanner - Adaptive planning strategy selection
    container.singleton('adaptivePlanner', (c) => {
        return new AdaptivePlanner({
            toolPlanner: c.resolve('toolPlanner'),
            dependencyResolver: c.resolve('dependencyResolver'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['toolPlanner', 'dependencyResolver', 'logger'],
        metadata: { category: 'workflow', priority: 59, phase: 3 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] AdaptivePlanner initialized - Phase 3 Planning Module');
            }
        }
    });

    // ============================================================================
    // PHASE 4: EXECUTION MODULES
    // ============================================================================

    // MCPExecutor - MCP-specific execution
    container.singleton('mcpExecutor', (c) => {
        return new MCPExecutor({
            mcpManager: c.resolve('mcpManager'),
            tetyanaProcessor: c.resolve('tetyanaExecuteToolsProcessor'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['mcpManager', 'tetyanaExecuteToolsProcessor', 'logger'],
        metadata: { category: 'workflow', priority: 58, phase: 4 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] MCPExecutor initialized - Phase 4 Execution Module');
            }
        }
    });

    // FallbackHandler - Handle execution failures
    container.singleton('fallbackHandler', (c) => {
        return new FallbackHandler({
            toolExecutor: c.resolve('toolExecutor'),
            logger: c.resolve('logger')
        });
    }, {
        dependencies: ['toolExecutor', 'logger'],
        metadata: { category: 'workflow', priority: 57, phase: 4 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] FallbackHandler initialized - Phase 4 Execution Module');
            }
        }
    });

    // TodoExecutor - Execute TODO items
    container.singleton('todoExecutor', (c) => {
        return new TodoExecutor({
            toolPlanner: c.resolve('toolPlanner'),
            toolExecutor: c.resolve('toolExecutor'),
            verificationEngine: c.resolve('verificationEngine'),
            logger: c.resolve('logger'),
            wsManager: c.resolve('wsManager'),
            ttsSyncManager: c.resolve('ttsSyncManager')
        });
    }, {
        dependencies: ['toolPlanner', 'toolExecutor', 'verificationEngine', 'logger', 'wsManager', 'ttsSyncManager'],
        metadata: { category: 'workflow', priority: 56, phase: 1 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] TodoExecutor initialized - Phase 1 Core Module');
            }
        }
    });

    // ============================================================================
    // MAIN ORCHESTRATOR
    // ============================================================================

    // WorkflowEngine - Main workflow orchestrator
    container.singleton('workflowEngine', (c) => {
        return new WorkflowEngine({
            todoBuilder: c.resolve('todoBuilder'),
            todoExecutor: c.resolve('todoExecutor'),
            logger: c.resolve('logger'),
            wsManager: c.resolve('wsManager'),
            ttsSyncManager: c.resolve('ttsSyncManager')
        });
    }, {
        dependencies: ['todoBuilder', 'todoExecutor', 'logger', 'wsManager', 'ttsSyncManager'],
        metadata: { category: 'workflow', priority: 55, phase: 1 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] WorkflowEngine initialized - Main Orchestrator');
                logger.system('startup', '[DI] ✅ All Phase 1-4 Workflow Modules registered successfully');
            }
        }
    });

    return container;
}

export default registerWorkflowModules;
