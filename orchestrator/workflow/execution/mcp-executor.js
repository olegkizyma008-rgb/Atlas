/**
 * @fileoverview MCPExecutor - MCP-specific tool execution
 * Wraps tetyana-execute-tools-processor for MCP execution
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * MCP-specific executor for tool execution
 * Responsibilities:
 * - Execute tools via MCP servers
 * - Wrap tetyana-execute-tools-processor
 * - Handle MCP-specific execution logic
 * - Manage MCP tool calls
 */
export class MCPExecutor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpManager - MCP manager instance
     * @param {Object} dependencies.tetyanaProcessor - Tetyana execute processor (optional)
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.mcpManager = options.mcpManager;
        this.tetyanaProcessor = options.tetyanaProcessor;
        this.logger = options.logger || console;

        this.logger.system('mcp-executor', '✅ MCPExecutor initialized');
    }

    /**
     * Execute tools via MCP
     * @param {Object} item - TODO item
     * @param {Object} plan - Tool plan
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Execution result
     */
    async execute(item, plan, session) {
        const executionId = this._generateExecutionId();

        this.logger.system('mcp-executor', `[${executionId}] Starting MCP execution`, {
            itemId: item.id,
            toolCount: plan.tools?.length || 0
        });

        try {
            // Step 1: Try using Tetyana processor if available
            if (this.tetyanaProcessor) {
                try {
                    const tetyanaResult = await this._executeWithTetyana(item, plan, session, executionId);
                    if (tetyanaResult) {
                        return tetyanaResult;
                    }
                } catch (error) {
                    this.logger.warn('mcp-executor', `[${executionId}] Tetyana execution failed: ${error.message}`);
                }
            }

            // Step 2: Use MCP manager for execution
            const mcpResult = await this._executeWithMCP(item, plan, session, executionId);

            this.logger.system('mcp-executor', `[${executionId}] MCP execution completed`, {
                success: mcpResult.success,
                toolsExecuted: mcpResult.toolsExecuted || 0
            });

            return mcpResult;

        } catch (error) {
            this.logger.error('mcp-executor', `[${executionId}] Execution failed`, {
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Execute using Tetyana processor
     * @private
     */
    async _executeWithTetyana(item, plan, session, executionId) {
        try {
            if (!this.tetyanaProcessor.execute) {
                return null;
            }

            const result = await this.tetyanaProcessor.execute({
                item,
                plan,
                session
            });

            if (result) {
                return {
                    success: result.success || result.executed,
                    toolsExecuted: result.toolsExecuted || 1,
                    result,
                    method: 'mcp_tetyana',
                    executionId
                };
            }

            return null;

        } catch (error) {
            this.logger.warn('mcp-executor', `[${executionId}] Tetyana processor error: ${error.message}`);
            return null;
        }
    }

    /**
     * Execute using MCP manager
     * @private
     */
    async _executeWithMCP(item, plan, session, executionId) {
        try {
            if (!this.mcpManager) {
                throw new Error('MCP Manager not available');
            }

            if (!plan.tools || plan.tools.length === 0) {
                return {
                    success: true,
                    toolsExecuted: 0,
                    result: { message: 'No tools to execute' },
                    method: 'mcp_direct',
                    executionId
                };
            }

            const results = [];

            // Execute each tool
            for (const tool of plan.tools) {
                try {
                    const result = await this._executeTool(tool, item, executionId);
                    results.push(result);
                } catch (error) {
                    this.logger.error('mcp-executor', `[${executionId}] Tool execution failed: ${tool.name}`, {
                        error: error.message
                    });

                    results.push({
                        toolName: tool.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const success = successCount > 0;

            return {
                success,
                toolsExecuted: results.length,
                successCount,
                result: results,
                method: 'mcp_direct',
                executionId
            };

        } catch (error) {
            this.logger.error('mcp-executor', `[${executionId}] MCP execution error: ${error.message}`);

            return {
                success: false,
                toolsExecuted: 0,
                error: error.message,
                method: 'mcp_error',
                executionId
            };
        }
    }

    /**
     * Execute single tool
     * @private
     */
    async _executeTool(tool, item, executionId) {
        try {
            if (!this.mcpManager.callTool) {
                throw new Error('MCP Manager does not have callTool method');
            }

            const result = await this.mcpManager.callTool(
                tool.server,
                tool.name,
                item.parameters || {}
            );

            return {
                toolName: tool.name,
                server: tool.server,
                success: true,
                result
            };

        } catch (error) {
            this.logger.error('mcp-executor', `[${executionId}] Tool failed: ${tool.name}`, {
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
        return `exec_mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default MCPExecutor;
