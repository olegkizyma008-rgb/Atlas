/**
 * @fileoverview Tool Dispatcher - Precise tool execution system
 * Inspired by Goose's dispatch_tool_call architecture
 * 
 * Handles:
 * - Tool call routing and validation
 * - Execution with proper error handling
 * - Result formatting and streaming
 * - Cancellation support
 * 
 * @version 5.0.0
 * @date 2025-10-20
 */

import logger from '../utils/logger.js';

/**
 * Tool Dispatcher
 * Routes and executes tool calls with validation
 */
export class ToolDispatcher {
    constructor(extensionManager, inspectionManager) {
        this.extensionManager = extensionManager;
        this.inspectionManager = inspectionManager;
    }

    /**
     * Dispatch single tool call
     * Main routing method inspired by Goose's dispatch_tool_call()
     * 
     * @param {Object} toolCall - Tool call to execute
     * @param {string} requestId - Unique request ID
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     */
    async dispatchToolCall(toolCall, requestId, context = {}) {
        logger.debug('tool-dispatcher', 
            `🔧 Dispatching tool: ${toolCall.server}__${toolCall.tool}`);

        const startTime = Date.now();

        try {
            // STEP 1: Validate tool call format
            this._validateToolCallFormat(toolCall);

            // STEP 2: Check if extension exists and is ready
            if (!this.extensionManager.isExtensionReady(toolCall.server)) {
                throw new Error(`Server not ready: ${toolCall.server}`);
            }

            // STEP 3: Execute through extension manager
            const result = await this.extensionManager.dispatchToolCall(toolCall);

            const executionTime = Date.now() - startTime;

            logger.debug('tool-dispatcher', 
                `✅ Tool executed in ${executionTime}ms: ${toolCall.server}__${toolCall.tool}`);

            // STEP 4: Format result
            return {
                requestId,
                success: result.success,
                result: result.result,
                error: result.error || null,
                metadata: {
                    server: toolCall.server,
                    tool: toolCall.tool,
                    executionTime,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;

            logger.error('tool-dispatcher', 
                `❌ Tool execution failed: ${toolCall.server}__${toolCall.tool} - ${error.message}`);

            return {
                requestId,
                success: false,
                result: null,
                error: error.message,
                metadata: {
                    server: toolCall.server,
                    tool: toolCall.tool,
                    executionTime,
                    timestamp: new Date().toISOString(),
                    errorType: error.name
                }
            };
        }
    }

    /**
     * Dispatch multiple tool calls with inspection
     * Complete workflow: inspect → categorize → execute
     * 
     * @param {Array} toolCalls - Tool calls to execute
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution results
     */
    async dispatchToolCalls(toolCalls, context = {}) {
        logger.system('tool-dispatcher', 
            `🚀 Dispatching ${toolCalls.length} tool calls...`);

        const workflowStart = Date.now();

        // STEP 1: Inspect tool calls
        const inspectionResult = await this.inspectionManager.inspectTools(
            toolCalls, 
            context
        );

        // Safely access inspection results with defaults
        const approved = inspectionResult?.approved?.length || 0;
        const needsApproval = inspectionResult?.needsApproval?.length || 0;
        const denied = inspectionResult?.denied?.length || 0;

        logger.system('tool-dispatcher', 
            `📋 Inspection: ${approved} approved, ` +
            `${needsApproval} need approval, ` +
            `${denied} denied`);

        // STEP 2: Handle denied tools
        // FIXED 2025-11-02: Add safety check for undefined denied array
        const deniedResults = (inspectionResult.denied || []).map(call => ({
            requestId: call.id || `${call.server}__${call.tool}`,
            success: false,
            result: null,
            error: 'Tool call denied by security inspection',
            metadata: {
                server: call.server,
                tool: call.tool,
                denied: true,
                inspectionResults: call.inspectionResults
            }
        }));

        // STEP 3: Execute approved tools
        // FIXED 2025-11-02: Add safety check for undefined approved array
        const approvedResults = await this._executeApprovedTools(
            inspectionResult.approved || [],
            context
        );

        // STEP 4: Handle tools needing approval
        // In automated mode, we'll execute them anyway (can be changed)
        // In interactive mode, this would wait for user confirmation
        // FIXED 2025-11-02: Add safety check for undefined needsApproval array
        const approvalResults = context.autoApprove 
            ? await this._executeApprovedTools(inspectionResult.needsApproval || [], context)
            : (inspectionResult.needsApproval || []).map(call => ({
                requestId: call.id || `${call.server}__${call.tool}`,
                success: false,
                result: null,
                error: 'Tool requires user approval',
                metadata: {
                    server: call.server,
                    tool: call.tool,
                    needsApproval: true,
                    securityMessage: call.securityMessage
                }
            }));

        // STEP 5: Combine all results
        const allResults = [
            ...approvedResults,
            ...approvalResults,
            ...deniedResults
        ];

        const successfulCalls = allResults.filter(r => r.success).length;
        const failedCalls = allResults.filter(r => !r.success).length;

        const workflowTime = Date.now() - workflowStart;

        logger.system('tool-dispatcher', 
            `✅ Workflow completed in ${workflowTime}ms: ` +
            `${successfulCalls} successful, ${failedCalls} failed`);

        return {
            all_successful: failedCalls === 0,
            successful_calls: successfulCalls,
            failed_calls: failedCalls,
            results: allResults,
            execution_time_ms: workflowTime,
            inspection: {
                approved: inspectionResult.approved.length,
                needsApproval: inspectionResult.needsApproval.length,
                denied: inspectionResult.denied.length
            }
        };
    }

    /**
     * Execute approved tools sequentially
     * 
     * @private
     */
    async _executeApprovedTools(toolCalls, context) {
        const results = [];

        for (const call of toolCalls) {
            const requestId = call.id || `${call.server}__${call.tool}`;
            const result = await this.dispatchToolCall(call, requestId, context);
            results.push(result);

            // Record call for repetition detection
            const repetitionInspector = this.inspectionManager.getInspector('repetition');
            if (repetitionInspector && repetitionInspector.recordCall) {
                repetitionInspector.recordCall(call);
            }
        }

        return results;
    }

    /**
     * Validate tool call format
     * 
     * @private
     */
    _validateToolCallFormat(toolCall) {
        if (!toolCall.server) {
            throw new Error('Tool call missing server name');
        }

        if (!toolCall.tool) {
            throw new Error('Tool call missing tool name');
        }

        if (toolCall.parameters && typeof toolCall.parameters !== 'object') {
            throw new Error('Tool parameters must be an object');
        }
    }

    /**
     * Format tool result for LLM
     * Converts MCP result to LLM-friendly format
     * 
     * @param {Object} result - Tool execution result
     * @returns {Object} Formatted result
     */
    formatResultForLLM(result) {
        if (!result.success) {
            return {
                role: 'user',
                content: [
                    {
                        type: 'tool_result',
                        tool_use_id: result.requestId,
                        content: `Error: ${result.error}`,
                        is_error: true
                    }
                ]
            };
        }

        // Extract text content from MCP result
        let content = '';
        
        if (result.result && result.result.content) {
            // MCP format: { content: [{ type: 'text', text: '...' }] }
            if (Array.isArray(result.result.content)) {
                content = result.result.content
                    .filter(c => c.type === 'text')
                    .map(c => c.text)
                    .join('\n');
            } else if (typeof result.result.content === 'string') {
                content = result.result.content;
            }
        } else if (typeof result.result === 'string') {
            content = result.result;
        } else {
            content = JSON.stringify(result.result, null, 2);
        }

        return {
            role: 'user',
            content: [
                {
                    type: 'tool_result',
                    tool_use_id: result.requestId,
                    content: content,
                    is_error: false
                }
            ]
        };
    }

    /**
     * Format multiple results for LLM
     * 
     * @param {Array} results - Array of tool execution results
     * @returns {Object} Formatted message for LLM
     */
    formatResultsForLLM(results) {
        const toolResults = results.map(r => this.formatResultForLLM(r));
        
        // Combine all tool results into single user message
        const allContent = toolResults.flatMap(tr => tr.content);

        return {
            role: 'user',
            content: allContent
        };
    }
}

export default ToolDispatcher;
