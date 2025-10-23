/**
 * @fileoverview Tetyana Tool System - Integrated Goose-inspired tool management
 * Main integration module that combines all components
 * 
 * Architecture:
 * - MCPExtensionManager: Tool discovery and management
 * - ToolInspectionManager: Security and validation
 * - ToolDispatcher: Execution and routing
 * - ValidationPipeline: Multi-level validation with early rejection (NEW 2025-10-23)
 * 
 * @version 6.0.0
 * @date 2025-10-23
 * @updated Added ValidationPipeline integration
 */

import { MCPExtensionManager } from './mcp-extension-manager.js';
import { createDefaultInspectionManager } from './tool-inspectors.js';
import { ToolDispatcher } from './tool-dispatcher.js';
import { ToolHistoryManager } from './tool-history-manager.js';
import { ToolInspectionManager } from './tool-inspection-manager.js';
import { RepetitionInspector } from './inspectors/repetition-inspector.js';
import { LLMToolValidator } from './llm-tool-selector.js';  // Renamed from LLMToolSelector
import { ValidationPipeline } from './validation/validation-pipeline.js';
import { FormatValidator } from './validation/format-validator.js';
import { HistoryValidator } from './validation/history-validator.js';
import { SchemaValidator } from './validation/schema-validator.js';
import { MCPSyncValidator } from './validation/mcp-sync-validator.js';
import logger from '../utils/logger.js';

/**
 * Tetyana Tool System
 * Main facade for tool management and execution
 */
export class TetyanaToolSystem {
    constructor(mcpManager, llmClient = null) {
        this.mcpManager = mcpManager;
        this.llmClient = llmClient;
        this.extensionManager = null;
        this.inspectionManager = null;  // Legacy inspector
        this.newInspectionManager = null;  // NEW: Enhanced inspection system
        this.dispatcher = null;
        this.historyManager = null;  // NEW: Tool history tracking
        this.llmValidator = null;  // NEW: LLM-based validation (ALWAYS ACTIVE)
        this.validationPipeline = null;  // NEW 2025-10-23: Multi-level validation pipeline
        this.initialized = false;
        this.mode = 'task'; // 'task' or 'chat'
    }

    /**
     * Initialize the tool system
     * Must be called before using any other methods
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        logger.system('tetyana-tool-system', '🚀 Initializing Tetyana Tool System...');

        try {
            // STEP 1: Initialize Extension Manager
            this.extensionManager = new MCPExtensionManager(this.mcpManager);
            await this.extensionManager.initialize();

            // STEP 2: Initialize Inspection Manager (Legacy)
            this.inspectionManager = createDefaultInspectionManager(this.mode);

            // STEP 3: Initialize NEW Inspection Manager with RepetitionInspector
            this.newInspectionManager = new ToolInspectionManager();
            const repetitionInspector = new RepetitionInspector({
                maxConsecutiveRepetitions: 3,
                maxTotalCalls: 10
            });
            this.newInspectionManager.addInspector(repetitionInspector);
            logger.system('tetyana-tool-system', '🔍 Enhanced Inspection Manager initialized');

            // STEP 4: Initialize Tool History Manager
            this.historyManager = new ToolHistoryManager({
                maxSize: 1000,
                antiRepetitionWindow: 100,
                maxFailuresBeforeBlock: 3
            });
            logger.system('tetyana-tool-system', '📊 Tool History Manager initialized (v2.0 with labels)');

            // STEP 4.5: Initialize LLM Tool Validator (ALWAYS ACTIVE if LLM client available)
            if (this.llmClient) {
                this.llmValidator = new LLMToolValidator(this.llmClient);
                logger.system('tetyana-tool-system', '🛡️ LLM Tool Validator initialized (ALWAYS ACTIVE)');
            } else {
                logger.warn('tetyana-tool-system', '⚠️ LLM client not provided, LLM validation disabled');
            }

            // STEP 4.6: Initialize Validation Pipeline (NEW 2025-10-23)
            this.validationPipeline = new ValidationPipeline({
                mcpManager: this.mcpManager,
                historyManager: this.historyManager,
                llmValidator: this.llmValidator
            });

            // Register validators
            this.validationPipeline.registerValidator('format', new FormatValidator());
            this.validationPipeline.registerValidator('history', new HistoryValidator(this.historyManager));
            this.validationPipeline.registerValidator('schema', new SchemaValidator(this.mcpManager));
            this.validationPipeline.registerValidator('mcpSync', new MCPSyncValidator(this.mcpManager));
            
            logger.system('tetyana-tool-system', '🔍 ValidationPipeline initialized (4 validators registered)');

            // STEP 5: Initialize Dispatcher
            this.dispatcher = new ToolDispatcher(
                this.extensionManager,
                this.inspectionManager
            );

            this.initialized = true;

            logger.system('tetyana-tool-system', 
                `✅ Tetyana Tool System ready: ${this.extensionManager.getTotalToolCount()} tools available`);

        } catch (error) {
            logger.error('tetyana-tool-system', 
                `Failed to initialize: ${error.message}`);
            throw error;
        }
    }

    /**
     * Prepare tools and prompt for LLM
     * Main method for tool selection - inspired by Goose's prepare_tools_and_prompt()
     * 
     * @param {Object} options - Preparation options
     * @param {Array<string>} options.selectedServers - Pre-selected MCP servers
     * @param {string} options.userMessage - User's request
     * @param {Object} options.context - Execution context
     * @returns {Object} Prepared tools and prompt
     */
    async prepareToolsAndPrompt(options = {}) {
        this._ensureInitialized();

        const {
            selectedServers = null,
            userMessage = '',
            context = {}
        } = options;

        logger.system('tetyana-tool-system', '🛠️ Preparing tools and prompt...');

        // Use extension manager to prepare tools
        const prepared = this.extensionManager.prepareToolsAndPrompt({
            selectedServers,
            includeSchema: true,
            mode: this.mode
        });

        logger.system('tetyana-tool-system', 
            `📋 Prepared ${prepared.tools.length} tools from ${prepared.metadata.servers.length} servers`);

        if (selectedServers) {
            logger.system('tetyana-tool-system', 
                `🎯 Filtered to servers: ${selectedServers.join(', ')}`);
        }

        // NEW: Add history context for LLM
        const historyContext = this.historyManager.formatForPrompt(5);
        const historyStats = this.historyManager.getStatistics();

        return {
            tools: prepared.tools,
            toolsSummary: prepared.toolsSummary,
            systemPromptAddition: prepared.systemPromptAddition,
            historyContext,  // NEW: History for LLM context
            historyStats,    // NEW: Statistics
            metadata: prepared.metadata
        };
    }

    /**
     * Validate tool calls before execution
     * UPDATED 2025-10-23: Using ValidationPipeline for multi-level validation
     * 
     * @param {Array} toolCalls - Tool calls to validate
     * @param {Object} context - Validation context
     * @returns {Promise<Object>} Validation result
     */
    async validateToolCalls(toolCalls, context = {}) {
        this._ensureInitialized();

        // Run through ValidationPipeline
        const pipelineResult = await this.validationPipeline.validate(toolCalls, context);

        if (!pipelineResult.valid) {
            return {
                valid: false,
                errors: pipelineResult.errors,
                warnings: pipelineResult.warnings,
                rejectedAt: pipelineResult.rejectedAt,
                suggestions: this._extractSuggestions(pipelineResult.errors)
            };
        }

        // Return success with corrections if any
        return {
            valid: true,
            toolCalls: pipelineResult.correctedCalls || toolCalls,
            corrections: pipelineResult.corrections,
            warnings: pipelineResult.warnings,
            metadata: pipelineResult.metadata
        };
    }

    /**
     * Extract suggestions from validation errors
     * @private
     */
    _extractSuggestions(errors) {
        return errors
            .map(e => e.suggestion)
            .filter(Boolean);
    }

    /**
     * LEGACY: Validate tool calls (old method for backward compatibility)
     * @deprecated Use validateToolCalls() instead
     */
    async _legacyValidateToolCalls(toolCalls, context = {}) {
        // Basic format validation
        if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
            return {
                valid: false,
                errors: ['tool_calls must be a non-empty array']
            };
        } // STEP 1: Run repetition inspection
        const inspectionResults = await this.newInspectionManager.inspectTools(toolCalls, context);
        const processedResults = this.newInspectionManager.processResults(inspectionResults);

        // Handle denied tools from repetition inspector
        if (processedResults.denied.length > 0) {
            logger.warn('tetyana-tool-system', 
                `⛔ ${processedResults.denied.length} tool(s) denied by repetition inspector`);
            
            const deniedResults = processedResults.denied.map(d => ({
                success: false,
                error: d.results[0].reason,
                inspector: d.results[0].inspector,
                metadata: d.results[0].metadata
            }));

            return {
                results: deniedResults,
                all_successful: false,
                successful_calls: 0,
                failed_calls: deniedResults.length,
                inspection: {
                    repetition: { denied: processedResults.denied.length },
                    llmValidation: { skipped: true }
                }
            };
        }

        // STEP 2: Run LLM validation (ALWAYS ACTIVE if available)
        if (this.llmValidator) {
            logger.system('tetyana-tool-system', '🛡️ Running LLM validation...');
            
            try {
                const validationResults = await this.llmValidator.validateToolCalls(toolCalls, {
                    userIntent: context.userIntent || context.itemAction || 'Unknown',
                    itemAction: context.itemAction
                });

                const validationCheck = this.llmValidator.checkValidation(validationResults);

                // BLOCK high-risk tools
                if (validationCheck.shouldBlock) {
                    logger.error('tetyana-tool-system', 
                        `🚫 LLM Validator BLOCKED execution: ${validationCheck.summary}`);
                    
                    const blockedResults = validationCheck.highRisk.map(v => ({
                        success: false,
                        error: `BLOCKED by LLM Validator: ${v.reasoning}`,
                        validator: 'llm',
                        risk: v.risk,
                        suggestion: v.suggestion
                    }));

                    return {
                        results: blockedResults,
                        all_successful: false,
                        successful_calls: 0,
                        failed_calls: blockedResults.length,
                        inspection: {
                            repetition: { allowed: processedResults.allowed.length },
                            llmValidation: {
                                blocked: validationCheck.highRisk.length,
                                summary: validationCheck.summary,
                                details: validationCheck.highRisk
                            }
                        }
                    };
                }

                // WARN about medium-risk tools but continue
                if (validationCheck.shouldWarn) {
                    logger.warn('tetyana-tool-system', 
                        `⚠️ LLM Validator warnings: ${validationCheck.summary}`);
                }

                logger.system('tetyana-tool-system', 
                    `✅ LLM validation passed: ${validationCheck.summary}`);

            } catch (error) {
                logger.error('tetyana-tool-system', 
                    `LLM validation error: ${error.message} - continuing with execution`);
            }
        }

        // STEP 3: Execute through dispatcher (includes legacy inspection)
        const result = await this.dispatcher.dispatchToolCalls(toolCalls, context);

        // Add inspection metadata to result
        result.inspection = {
            repetition: {
                denied: processedResults.denied.length,
                requireApproval: processedResults.requireApproval.length,
                allowed: processedResults.allowed.length
            },
            llmValidation: {
                executed: this.llmValidator !== null,
                summary: '✅ Passed validation'
            }
        };

        // NEW: Record each tool call in history
        if (result.results && Array.isArray(result.results)) {
            for (let i = 0; i < result.results.length; i++) {
                const toolCall = toolCalls[i];
                const toolResult = result.results[i];
                
                if (toolCall) {
                    const duration = toolResult.duration || (Date.now() - startTime) / toolCalls.length;
                    
                    // UPDATED 2025-10-23: Use recordExecution with proper metadata
                    this.historyManager.recordExecution(toolCall, {
                        success: toolResult.success || false,
                        error: toolResult.error,
                        duration,
                        sessionId: context.sessionId || context.itemId || 'unknown'
                    });
                }
            }
        }

        logger.system('tetyana-tool-system', 
            `✅ Execution completed: ${result.successful_calls}/${toolCalls.length} successful`);

        return result;
    }

    /**
     * Execute multiple tool calls (batch execution)
     * 
     * @param {Array} toolCalls - Array of tool calls to execute
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution results with inspection metadata
     */
    async executeToolCalls(toolCalls, context = {}) {
        this._ensureInitialized();

        const startTime = Date.now();
        context.mode = this.mode;

        // STEP 1: Run repetition inspection
        const inspectionResults = await this.newInspectionManager.inspectTools(toolCalls, context);
        const processedResults = this.newInspectionManager.processResults(inspectionResults);

        // Handle denied tools from repetition inspector
        if (processedResults.denied.length > 0) {
            logger.warn('tetyana-tool-system', 
                `⛔ ${processedResults.denied.length} tool(s) denied by repetition inspector`);
            
            const deniedResults = processedResults.denied.map(d => ({
                success: false,
                error: d.results[0].reason,
                inspector: d.results[0].inspector,
                metadata: d.results[0].metadata
            }));

            return {
                results: deniedResults,
                all_successful: false,
                successful_calls: 0,
                failed_calls: deniedResults.length,
                inspection: {
                    repetition: { denied: processedResults.denied.length },
                    llmValidation: { skipped: true }
                }
            };
        }

        // STEP 2: Run LLM validation (ALWAYS ACTIVE if available)
        if (this.llmValidator) {
            logger.system('tetyana-tool-system', '🛡️ Running LLM validation...');
            
            try {
                const validationResults = await this.llmValidator.validateToolCalls(toolCalls, {
                    userIntent: context.userIntent || context.currentItem?.action || 'Unknown',
                    itemAction: context.currentItem?.action
                });

                const validationCheck = this.llmValidator.checkValidation(validationResults);

                // BLOCK high-risk tools
                if (validationCheck.shouldBlock) {
                    logger.error('tetyana-tool-system', 
                        `🚫 LLM Validator BLOCKED execution: ${validationCheck.summary}`);
                    
                    const blockedResults = validationCheck.highRisk.map(v => ({
                        success: false,
                        error: `BLOCKED by LLM Validator: ${v.reasoning}`,
                        validator: 'llm',
                        risk: v.risk,
                        suggestion: v.suggestion
                    }));

                    return {
                        results: blockedResults,
                        all_successful: false,
                        successful_calls: 0,
                        failed_calls: blockedResults.length,
                        inspection: {
                            repetition: { allowed: processedResults.allowed.length },
                            llmValidation: {
                                blocked: validationCheck.highRisk.length,
                                summary: validationCheck.summary,
                                details: validationCheck.highRisk
                            }
                        }
                    };
                }

                // WARN about medium-risk tools but continue
                if (validationCheck.shouldWarn) {
                    logger.warn('tetyana-tool-system', 
                        `⚠️ LLM Validator warnings: ${validationCheck.summary}`);
                }

                logger.system('tetyana-tool-system', 
                    `✅ LLM validation passed: ${validationCheck.summary}`);

            } catch (error) {
                logger.error('tetyana-tool-system', 
                    `LLM validation error: ${error.message} - continuing with execution`);
            }
        }

        // STEP 3: Execute through dispatcher (includes legacy inspection)
        const result = await this.dispatcher.dispatchToolCalls(toolCalls, context);

        // Add inspection metadata to result
        result.inspection = {
            repetition: {
                denied: processedResults.denied.length,
                requireApproval: processedResults.requireApproval.length,
                allowed: processedResults.allowed.length
            },
            llmValidation: {
                executed: this.llmValidator !== null,
                summary: '✅ Passed validation'
            }
        };

        // NEW: Record each tool call in history
        if (result.results && Array.isArray(result.results)) {
            for (let i = 0; i < result.results.length; i++) {
                const toolCall = toolCalls[i];
                const toolResult = result.results[i];
                
                if (toolCall) {
                    const duration = toolResult.duration || (Date.now() - startTime) / toolCalls.length;
                    
                    // Record execution in history
                    this.historyManager.recordExecution(toolCall, {
                        success: toolResult.success || false,
                        error: toolResult.error,
                        duration,
                        sessionId: context.sessionId || context.currentItem?.id || 'unknown'
                    });
                }
            }
        }

        logger.system('tetyana-tool-system', 
            `✅ Execution completed: ${result.successful_calls}/${toolCalls.length} successful`);

        return result;
    }

    /**
     * Execute single tool call
     * 
     * @param {Object} toolCall - Tool call to execute
     * @param {string} requestId - Request ID
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     */
    async executeToolCall(toolCall, requestId, context = {}) {
        this._ensureInitialized();

        context.mode = this.mode;

        return await this.dispatcher.dispatchToolCall(toolCall, requestId, context);
    }

    /**
     * Format execution results for LLM
     * 
     * @param {Object} executionResult - Result from executeToolCalls()
     * @returns {Object} Formatted message for LLM
     */
    formatResultsForLLM(executionResult) {
        this._ensureInitialized();

        return this.dispatcher.formatResultsForLLM(executionResult.results);
    }

    /**
     * Set execution mode
     * 
     * @param {string} mode - 'task' or 'chat'
     */
    setMode(mode) {
        this.mode = mode;
        
        if (this.inspectionManager) {
            this.inspectionManager.updatePermissionMode(mode);
        }

        logger.debug('tetyana-tool-system', `Mode set to: ${mode}`);
    }

    /**
     * Get available tools summary
     * Useful for logging and debugging
     */
    getToolsSummary() {
        this._ensureInitialized();

        const tools = this.extensionManager.listTools();
        const byServer = new Map();

        for (const tool of tools) {
            if (!byServer.has(tool.server)) {
                byServer.set(tool.server, []);
            }
            byServer.get(tool.server).push(tool);
        }

        const summary = [];
        for (const [server, serverTools] of byServer) {
            summary.push(`${server}: ${serverTools.length} tools`);
        }

        return summary.join(', ');
    }

    /**
     * Get detailed tools list
     */
    listTools(serverName = null) {
        this._ensureInitialized();

        return this.extensionManager.listTools(serverName);
    }

    /**
     * Get tools from specific servers
     */
    getToolsFromServers(serverNames) {
        this._ensureInitialized();

        return this.extensionManager.getToolsFromServers(serverNames);
    }

    /**
     * Check if server is available
     */
    isServerAvailable(serverName) {
        this._ensureInitialized();

        return this.extensionManager.isExtensionReady(serverName);
    }

    /**
     * Get all available server names
     */
    getAvailableServers() {
        this._ensureInitialized();

        return this.extensionManager.getExtensionNames();
    }

    /**
     * Reset repetition inspector history
     * Useful when starting new task
     */
    resetRepetitionHistory() {
        // Reset new inspection manager
        if (this.newInspectionManager) {
            this.newInspectionManager.resetAll();
            logger.debug('tetyana-tool-system', 'Enhanced inspection manager reset');
        }
        
        // Reset legacy inspector
        if (this.inspectionManager) {
            const repetitionInspector = this.inspectionManager.getInspector('repetition');
            if (repetitionInspector && repetitionInspector.reset) {
                repetitionInspector.reset();
                logger.debug('tetyana-tool-system', 'Legacy repetition history reset');
            }
        }
    }

    /**
     * Ensure system is initialized
     * 
     * @private
     */
    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('TetyanaToolSystem not initialized. Call initialize() first.');
        }
    }

    /**
     * Get tool history
     * NEW: Access to tool execution history
     */
    getToolHistory(limit = 10) {
        this._ensureInitialized();
        return this.historyManager.getRecentCalls(limit);
    }

    /**
     * Get history statistics
     * NEW: Tool usage statistics
     */
    getHistoryStatistics() {
        this._ensureInitialized();
        return this.historyManager.getStatistics();
    }

    /**
     * Get validation pipeline metrics
     * NEW 2025-10-23: Validation performance metrics
     */
    getValidationMetrics() {
        this._ensureInitialized();
        return this.validationPipeline.getMetrics();
    }

    /**
     * Get validation pipeline status
     * NEW 2025-10-23: Pipeline configuration and status
     */
    getValidationStatus() {
        this._ensureInitialized();
        return this.validationPipeline.getStatus();
    }

    /**
     * Clear tool history
     * NEW: Reset history (useful for new sessions)
     */
    clearHistory() {
        if (this.historyManager) {
            this.historyManager.clear();
            logger.system('tetyana-tool-system', '🗑️ Tool history cleared');
        }
    }

    /**
     * Get inspection statistics
     * NEW: Access to inspection system stats
     */
    getInspectionStatistics() {
        this._ensureInitialized();
        return this.newInspectionManager ? this.newInspectionManager.getStatistics() : null;
    }

    /**
     * Get LLM validator statistics
     * NEW: Access to LLM validation stats
     */
    getValidatorStatistics() {
        this._ensureInitialized();
        return this.llmValidator ? this.llmValidator.getStatistics() : null;
    }

    /**
     * Get system statistics
     */
    getStatistics() {
        this._ensureInitialized();

        const historyStats = this.historyManager ? this.historyManager.getStatistics() : null;
        const inspectionStats = this.newInspectionManager ? this.newInspectionManager.getStatistics() : null;
        const validatorStats = this.llmValidator ? this.llmValidator.getStatistics() : null;

        return {
            totalTools: this.extensionManager.getTotalToolCount(),
            totalServers: this.extensionManager.getExtensionNames().length,
            availableServers: this.extensionManager.getExtensionNames(),
            mode: this.mode,
            initialized: this.initialized,
            history: historyStats,  // NEW: Include history stats
            inspection: inspectionStats,  // NEW: Include inspection stats
            llmValidator: validatorStats  // NEW: Include validator stats (ALWAYS ACTIVE)
        };
    }
}

/**
 * Create and initialize Tetyana Tool System
 * Convenience factory function
 * 
 * @param {Object} mcpManager - MCPManager instance
 * @returns {Promise<TetyanaToolSystem>} Initialized tool system
 */
export async function createTetyanaToolSystem(mcpManager) {
    const system = new TetyanaToolSystem(mcpManager);
    await system.initialize();
    return system;
}

export default TetyanaToolSystem;
