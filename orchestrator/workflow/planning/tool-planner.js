/**
 * @fileoverview ToolPlanner - Plans tools needed for TODO items
 * Analyzes items and selects appropriate MCP tools
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Plans tools for TODO items
 * Responsibilities:
 * - Analyze item requirements
 * - Select appropriate tools
 * - Generate tool schemas
 * - Handle tool filtering
 */
export class ToolPlanner {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpManager - MCP manager instance
     * @param {Object} dependencies.llmClient - LLM client for analysis
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.mcpManager = options.mcpManager;
        this.llmClient = options.llmClient;
        this.logger = options.logger || console;

        this.logger.system('tool-planner', '✅ ToolPlanner initialized');
    }

    /**
     * Plan tools for a TODO item
     * @param {Object} item - TODO item
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Tool plan
     */
    async plan(item, session) {
        const planId = this._generatePlanId();

        this.logger.system('tool-planner', `[${planId}] Planning tools for item ${item.id}`, {
            action: item.action.substring(0, 50)
        });

        try {
            // Step 1: Get available tools
            const availableTools = this._getAvailableTools(item);

            // Step 2: Filter tools based on item requirements
            const selectedTools = this._filterTools(availableTools, item);

            // Step 3: Generate tool schemas
            const toolSchemas = this._generateSchemas(selectedTools);

            const plan = {
                planId,
                itemId: item.id,
                availableTools: availableTools.length,
                selectedTools: selectedTools.length,
                tools: selectedTools,
                schemas: toolSchemas,
                created_at: new Date().toISOString()
            };

            this.logger.system('tool-planner', `[${planId}] Tool plan created`, {
                selectedCount: selectedTools.length
            });

            return plan;

        } catch (error) {
            this.logger.error('tool-planner', `[${planId}] Failed to plan tools`, {
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Get available tools from MCP manager
     * @private
     */
    _getAvailableTools(item) {
        try {
            if (!this.mcpManager) {
                this.logger.warn('tool-planner', 'MCP Manager not available');
                return [];
            }

            // If item specifies servers, get tools from those servers
            if (item.mcp_servers && item.mcp_servers.length > 0) {
                return this.mcpManager.getToolsFromServers(item.mcp_servers) || [];
            }

            // Otherwise get all available tools
            if (typeof this.mcpManager.listTools === 'function') {
                return this.mcpManager.listTools() || [];
            }

            return [];

        } catch (error) {
            this.logger.warn('tool-planner', `Failed to get available tools: ${error.message}`);
            return [];
        }
    }

    /**
     * Filter tools based on item requirements
     * @private
     */
    _filterTools(availableTools, item) {
        if (!availableTools || availableTools.length === 0) {
            return [];
        }

        // If item specifies needed tools, filter to those
        if (item.tools_needed && item.tools_needed.length > 0) {
            return availableTools.filter(tool =>
                item.tools_needed.includes(tool.name)
            );
        }

        // Otherwise return all available tools
        return availableTools;
    }

    /**
     * Generate tool schemas
     * @private
     */
    _generateSchemas(tools) {
        return tools.map(tool => ({
            name: tool.name,
            description: tool.description || '',
            parameters: tool.inputSchema || {},
            server: tool.server || 'unknown'
        }));
    }

    /**
     * Generate unique plan ID
     * @private
     */
    _generatePlanId() {
        return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default ToolPlanner;
