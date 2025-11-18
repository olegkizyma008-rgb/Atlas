/**
 * @fileoverview ToolExecutor - Executes planned tools
 * Handles tool invocation with error handling and retries
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Executes tools for TODO items
 * Responsibilities:
 * - Execute planned tools
 * - Handle tool errors
 * - Manage rate limiting
 * - Track execution results
 */
export class ToolExecutor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpManager - MCP manager instance
     * @param {Object} dependencies.rateLimiter - Rate limiter instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.mcpManager = options.mcpManager;
        this.rateLimiter = options.rateLimiter;
        this.logger = options.logger || console;

        this.logger.system('tool-executor', '✅ ToolExecutor initialized');
    }

    /**
     * Execute tools for a TODO item
     * @param {Object} item - TODO item
     * @param {Object} plan - Tool plan from ToolPlanner
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Execution results
     */
    async execute(item, plan, session) {
        const executionId = this._generateExecutionId();

        this.logger.system('tool-executor', `[${executionId}] Executing tools for item ${item.id}`, {
            toolCount: plan.tools?.length || 0
        });

        try {
            if (!plan.tools || plan.tools.length === 0) {
                this.logger.warn('tool-executor', `[${executionId}] No tools to execute`);
                return {
                    success: true,
                    executionId,
                    toolCount: 0,
                    results: []
                };
            }

            const results = [];

            // Execute each tool
            for (const tool of plan.tools) {
                try {
                    const result = await this._executeTool(tool, item, executionId);
                    results.push(result);
                } catch (error) {
                    this.logger.error('tool-executor', `[${executionId}] Tool execution failed: ${tool.name}`, {
                        error: error.message
                    });

                    results.push({
                        toolName: tool.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            const success = results.some(r => r.success);

            this.logger.system('tool-executor', `[${executionId}] Tool execution completed`, {
                totalTools: results.length,
                successful: results.filter(r => r.success).length
            });

            return {
                success,
                executionId,
                toolCount: results.length,
                results
            };

        } catch (error) {
            this.logger.error('tool-executor', `[${executionId}] Tool execution failed`, {
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Execute single tool
     * @private
     */
    async _executeTool(tool, item, executionId) {
        const toolId = `${tool.server}/${tool.name}`;

        this.logger.system('tool-executor', `[${executionId}] Executing tool: ${toolId}`);

        try {
            if (!this.mcpManager) {
                throw new Error('MCP Manager not available');
            }

            // Apply rate limiting
            const execute = async () => {
                return await this.mcpManager.callTool(
                    tool.server,
                    tool.name,
                    item.parameters || {}
                );
            };

            let result;
            if (this.rateLimiter) {
                result = await this.rateLimiter.throttledRequest(execute, {
                    priority: 7,
                    timeout: 30000
                });
            } else {
                result = await execute();
            }

            return {
                toolName: tool.name,
                server: tool.server,
                success: true,
                result
            };

        } catch (error) {
            this.logger.error('tool-executor', `[${executionId}] Tool failed: ${toolId}`, {
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Generate unique execution ID
     * @private
     */
    _generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default ToolExecutor;
