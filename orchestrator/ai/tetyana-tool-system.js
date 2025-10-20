/**
 * @fileoverview Tetyana Tool System - Integrated Goose-inspired tool management
 * Main integration module that combines all components
 * 
 * Architecture:
 * - MCPExtensionManager: Tool discovery and management
 * - ToolInspectionManager: Security and validation
 * - ToolDispatcher: Execution and routing
 * 
 * @version 5.0.0
 * @date 2025-10-20
 */

import { MCPExtensionManager } from './mcp-extension-manager.js';
import { createDefaultInspectionManager } from './tool-inspectors.js';
import { ToolDispatcher } from './tool-dispatcher.js';
import logger from '../utils/logger.js';

/**
 * Tetyana Tool System
 * Main facade for tool management and execution
 */
export class TetyanaToolSystem {
    constructor(mcpManager) {
        this.mcpManager = mcpManager;
        this.extensionManager = null;
        this.inspectionManager = null;
        this.dispatcher = null;
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

            // STEP 2: Initialize Inspection Manager
            this.inspectionManager = createDefaultInspectionManager(this.mode);

            // STEP 3: Initialize Dispatcher
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

        return {
            tools: prepared.tools,
            toolsSummary: prepared.toolsSummary,
            systemPromptAddition: prepared.systemPromptAddition,
            metadata: prepared.metadata
        };
    }

    /**
     * Validate tool calls before execution
     * 
     * @param {Array} toolCalls - Tool calls to validate
     * @returns {Object} Validation result
     */
    validateToolCalls(toolCalls) {
        this._ensureInitialized();

        return this.extensionManager.validateToolCalls(toolCalls);
    }

    /**
     * Execute tool calls with full inspection pipeline
     * Main execution method
     * 
     * @param {Array} toolCalls - Tool calls to execute
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution results
     */
    async executeToolCalls(toolCalls, context = {}) {
        this._ensureInitialized();

        logger.system('tetyana-tool-system', 
            `⚙️ Executing ${toolCalls.length} tool calls...`);

        // Add mode to context
        context.mode = this.mode;

        // Execute through dispatcher (includes inspection)
        const result = await this.dispatcher.dispatchToolCalls(toolCalls, context);

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
        if (this.inspectionManager) {
            const repetitionInspector = this.inspectionManager.getInspector('repetition');
            if (repetitionInspector && repetitionInspector.reset) {
                repetitionInspector.reset();
                logger.debug('tetyana-tool-system', 'Repetition history reset');
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
     * Get system statistics
     */
    getStatistics() {
        this._ensureInitialized();

        return {
            totalTools: this.extensionManager.getTotalToolCount(),
            totalServers: this.extensionManager.getExtensionNames().length,
            availableServers: this.extensionManager.getExtensionNames(),
            mode: this.mode,
            initialized: this.initialized
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
