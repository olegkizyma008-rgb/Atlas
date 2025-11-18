/**
 * @fileoverview MCPVerifier - MCP-based verification of execution results
 * Wraps grisha-verify-item-processor for verification coordination
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * MCP-based verifier using MCP tools and servers
 * Responsibilities:
 * - Verify results using MCP tools
 * - Coordinate with MCP servers
 * - Provide confidence scores
 * - Handle MCP-specific verification
 */
export class MCPVerifier {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpManager - MCP manager instance
     * @param {Object} dependencies.grishaVerifyProcessor - Grisha verify processor (optional)
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.mcpManager = options.mcpManager;
        this.grishaVerifyProcessor = options.grishaVerifyProcessor;
        this.logger = options.logger || console;

        this.logger.system('mcp-verifier', '✅ MCPVerifier initialized');
    }

    /**
     * Verify execution result using MCP
     * @param {Object} item - TODO item
     * @param {Object} execResult - Execution result
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Verification result
     */
    async verify(item, execResult, session) {
        const verifyId = this._generateVerifyId();

        this.logger.system('mcp-verifier', `[${verifyId}] Starting MCP verification`, {
            itemId: item.id,
            hasResult: !!execResult
        });

        try {
            // Step 1: Check if result exists
            if (!execResult) {
                return {
                    verified: false,
                    confidence: 0,
                    reason: 'No execution result provided',
                    method: 'mcp',
                    details: { verifyId }
                };
            }

            // Step 2: Use Grisha processor if available
            if (this.grishaVerifyProcessor) {
                try {
                    const grishaResult = await this._verifyWithGrisha(item, execResult, session, verifyId);
                    if (grishaResult) {
                        return grishaResult;
                    }
                } catch (error) {
                    this.logger.warn('mcp-verifier', `[${verifyId}] Grisha verification failed: ${error.message}`);
                }
            }

            // Step 3: Use MCP tools for verification
            const mcpResult = await this._verifyWithMCP(item, execResult, session, verifyId);

            this.logger.system('mcp-verifier', `[${verifyId}] MCP verification completed`, {
                verified: mcpResult.verified,
                confidence: mcpResult.confidence
            });

            return mcpResult;

        } catch (error) {
            this.logger.error('mcp-verifier', `[${verifyId}] Verification failed`, {
                error: error.message
            });

            return {
                verified: false,
                confidence: 0,
                reason: error.message,
                method: 'mcp',
                error: true
            };
        }
    }

    /**
     * Verify using Grisha processor
     * @private
     */
    async _verifyWithGrisha(item, execResult, session, verifyId) {
        try {
            if (!this.grishaVerifyProcessor.execute) {
                return null;
            }

            const result = await this.grishaVerifyProcessor.execute({
                item,
                result: execResult,
                session
            });

            if (result) {
                return {
                    verified: result.verified || result.success,
                    confidence: result.confidence || (result.verified ? 85 : 0),
                    reason: result.reason || result.message,
                    method: 'mcp_grisha',
                    details: result
                };
            }

            return null;

        } catch (error) {
            this.logger.warn('mcp-verifier', `[${verifyId}] Grisha processor error: ${error.message}`);
            return null;
        }
    }

    /**
     * Verify using MCP tools
     * @private
     */
    async _verifyWithMCP(item, execResult, session, verifyId) {
        try {
            if (!this.mcpManager) {
                this.logger.warn('mcp-verifier', `[${verifyId}] MCP Manager not available`);
                return {
                    verified: true,
                    confidence: 50,
                    reason: 'MCP Manager not available - assuming success',
                    method: 'mcp_fallback'
                };
            }

            // Check if result indicates success
            const isSuccessful = this._checkSuccess(execResult);

            // Build verification context
            const verificationContext = {
                action: item.action,
                successCriteria: item.success_criteria,
                result: execResult,
                timestamp: new Date().toISOString()
            };

            // Attempt to call verification tools if available
            const toolResult = await this._callVerificationTools(verificationContext, verifyId);

            if (toolResult) {
                return toolResult;
            }

            // Fallback: use heuristic verification
            return {
                verified: isSuccessful,
                confidence: isSuccessful ? 75 : 25,
                reason: isSuccessful ? 'Result indicates success' : 'Result indicates failure',
                method: 'mcp_heuristic',
                details: verificationContext
            };

        } catch (error) {
            this.logger.error('mcp-verifier', `[${verifyId}] MCP verification error: ${error.message}`);

            return {
                verified: false,
                confidence: 0,
                reason: error.message,
                method: 'mcp_error'
            };
        }
    }

    /**
     * Call verification tools
     * @private
     */
    async _callVerificationTools(context, verifyId) {
        try {
            if (!this.mcpManager || !this.mcpManager.callTool) {
                return null;
            }

            // Try to find verification tools
            const tools = this.mcpManager.listTools?.() || [];
            const verifyTools = tools.filter(t =>
                t.name?.toLowerCase().includes('verify') ||
                t.name?.toLowerCase().includes('check') ||
                t.name?.toLowerCase().includes('validate')
            );

            if (verifyTools.length === 0) {
                return null;
            }

            // Call first available verification tool
            const tool = verifyTools[0];
            const result = await this.mcpManager.callTool(
                tool.server,
                tool.name,
                context
            );

            if (result) {
                return {
                    verified: result.verified || result.success || result.valid,
                    confidence: result.confidence || 80,
                    reason: result.reason || result.message || 'Verification tool result',
                    method: 'mcp_tool',
                    details: result
                };
            }

            return null;

        } catch (error) {
            this.logger.warn('mcp-verifier', `Failed to call verification tools: ${error.message}`);
            return null;
        }
    }

    /**
     * Check if result indicates success
     * @private
     */
    _checkSuccess(result) {
        if (!result) {
            return false;
        }

        // Check common success indicators
        if (result.success === true) return true;
        if (result.verified === true) return true;
        if (result.status === 'success' || result.status === 'completed') return true;
        if (result.error === false || result.error === null) return true;
        if (result.ok === true) return true;

        // Check for failure indicators
        if (result.success === false) return false;
        if (result.verified === false) return false;
        if (result.status === 'failed' || result.status === 'error') return false;
        if (result.error === true) return false;

        // Default: assume success if result exists
        return true;
    }

    /**
     * Generate unique verify ID
     * @private
     */
    _generateVerifyId() {
        return `verify_mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default MCPVerifier;
