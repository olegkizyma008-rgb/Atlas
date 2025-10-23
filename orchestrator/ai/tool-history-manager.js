/**
 * @fileoverview Tool History Manager
 * Tracks tool execution history for LLM context and pattern detection
 * 
 * Inspired by Goose's RouterToolSelector history tracking
 * 
 * @version 2.0.0
 * @date 2025-10-23
 * @updated Added SUCCESS/FAILURE labels and anti-repetition protection
 */

import logger from '../utils/logger.js';

/**
 * Manages tool execution history
 * 
 * Features:
 * - Tracks last 100 tool calls
 * - Records success/failure rates
 * - Provides formatted context for LLM prompts
 * - Detects usage patterns
 */
export class ToolHistoryManager {
    /**
     * @param {Object} options - Configuration options
     * @param {number} options.maxSize - Maximum history size (default: 1000)
     * @param {number} options.antiRepetitionWindow - Window for anti-repetition check (default: 100)
     * @param {number} options.maxFailuresBeforeBlock - Max failures before blocking (default: 3)
     */
    constructor(options = {}) {
        this.history = [];  // Array of ToolCallEntry with labels
        this.maxSize = options.maxSize || 1000;  // UPDATED: Increased from 100 to 1000
        this.antiRepetitionWindow = options.antiRepetitionWindow || 100;  // NEW
        this.maxFailuresBeforeBlock = options.maxFailuresBeforeBlock || 3;  // NEW
        this.callCounts = new Map();  // tool -> total count
        this.successRates = new Map();  // tool -> { success, total }
        
        logger.system('tool-history', 
            `ToolHistoryManager initialized (maxSize: ${this.maxSize}, antiRepetitionWindow: ${this.antiRepetitionWindow})`);
    }

    /**
     * Record a tool call execution
     * UPDATED 2025-10-23: Added label field (SUCCESS/FAILURE)
     * 
     * @param {string} server - MCP server name
     * @param {string} tool - Tool name
     * @param {Object} params - Tool parameters
     * @param {boolean} success - Execution success
     * @param {number} duration - Execution duration in ms
     * @param {Object} metadata - Additional metadata (error, sessionId, etc)
     */
    recordToolCall(server, tool, params, success, duration, metadata = {}) {
        const toolKey = `${server}__${tool}`;
        
        const entry = {
            tool: toolKey,
            server,
            toolName: tool,
            params,
            success,
            label: success ? 'SUCCESS' : 'FAILURE',  // NEW: Label field
            duration,
            timestamp: Date.now(),
            error: metadata.error || null,  // NEW: Store error if present
            sessionId: metadata.sessionId || null,  // NEW: Track session
            metadata
        };

        // Add to history
        this.history.push(entry);
        
        // Maintain max size (FIFO)
        if (this.history.length > this.maxSize) {
            this.history.shift();
        }

        // Update call counts
        const count = this.callCounts.get(toolKey) || 0;
        this.callCounts.set(toolKey, count + 1);

        // Update success rates
        const stats = this.successRates.get(toolKey) || { success: 0, total: 0 };
        stats.total++;
        if (success) {
            stats.success++;
        }
        this.successRates.set(toolKey, stats);

        logger.debug('tool-history', 
            `Recorded: ${toolKey} [${entry.label}] ${duration}ms${entry.error ? ` - ${entry.error}` : ''}`);
    }

    /**
     * Record execution from tool call result
     * Convenience method that extracts data from result object
     * NEW 2025-10-23
     * 
     * @param {Object} toolCall - Tool call object {server, tool, parameters}
     * @param {Object} result - Execution result {success, error, duration, ...}
     */
    recordExecution(toolCall, result) {
        this.recordToolCall(
            toolCall.server,
            toolCall.tool,
            toolCall.parameters,
            result.success || false,
            result.duration || 0,
            {
                error: result.error,
                sessionId: result.sessionId,
                ...result.metadata
            }
        );
    }

    /**
     * Get recent tool calls
     * 
     * @param {number} limit - Number of recent calls to return
     * @returns {Array<Object>} Recent tool calls (newest first)
     */
    getRecentCalls(limit = 10) {
        return this.history.slice(-limit).reverse();
    }

    /**
     * Get all calls for a specific tool
     * 
     * @param {string} server - MCP server name
     * @param {string} tool - Tool name
     * @returns {Array<Object>} Tool calls
     */
    getToolCalls(server, tool) {
        const toolKey = `${server}__${tool}`;
        return this.history.filter(entry => entry.tool === toolKey);
    }

    /**
     * Get total call count for a tool
     * 
     * @param {string} server - MCP server name
     * @param {string} tool - Tool name
     * @returns {number} Total calls
     */
    getToolCallCount(server, tool) {
        const toolKey = `${server}__${tool}`;
        return this.callCounts.get(toolKey) || 0;
    }

    /**
     * Get success rate for a tool
     * UPDATED 2025-10-23: Return 1.0 for unknown tools (optimistic default)
     * 
     * @param {string} server - MCP server name
     * @param {string} tool - Tool name
     * @returns {number} Success rate (0.0 - 1.0)
     */
    getToolSuccessRate(server, tool) {
        const toolKey = `${server}__${tool}`;
        const stats = this.successRates.get(toolKey);
        
        if (!stats || stats.total === 0) {
            return 1.0;  // UPDATED: Unknown tools = 100% (optimistic)
        }
        
        return stats.success / stats.total;
    }

    /**
     * Format history for LLM prompt context
     * 
     * @param {number} limit - Number of recent calls to include
     * @returns {string} Formatted history
     */
    formatForPrompt(limit = 5) {
        const recent = this.getRecentCalls(limit);
        
        if (recent.length === 0) {
            return 'No previous tool calls in this session.';
        }

        const lines = ['Recent tool usage:'];
        
        for (const call of recent) {
            const status = call.success ? '✅' : '❌';
            const timeAgo = this._formatTimeAgo(Date.now() - call.timestamp);
            lines.push(`- ${call.tool} ${status} (${timeAgo})`);
        }

        return lines.join('\n');
    }

    /**
     * Format detailed history with statistics
     * 
     * @param {number} limit - Number of recent calls to include
     * @returns {string} Detailed formatted history
     */
    formatDetailedForPrompt(limit = 5) {
        const recent = this.getRecentCalls(limit);
        
        if (recent.length === 0) {
            return 'No previous tool calls in this session.';
        }

        const lines = ['Recent tool usage (with statistics):'];
        
        for (const call of recent) {
            const status = call.success ? '✅' : '❌';
            const timeAgo = this._formatTimeAgo(Date.now() - call.timestamp);
            const successRate = this.getToolSuccessRate(call.server, call.toolName);
            const totalCalls = this.getToolCallCount(call.server, call.toolName);
            
            lines.push(
                `- ${call.tool} ${status} (${timeAgo}) ` +
                `[Success rate: ${(successRate * 100).toFixed(0)}%, Total calls: ${totalCalls}]`
            );
        }

        return lines.join('\n');
    }

    /**
     * Get statistics summary
     * 
     * @returns {Object} Statistics
     */
    getStatistics() {
        const totalCalls = this.history.length;
        const successfulCalls = this.history.filter(e => e.success).length;
        const failedCalls = totalCalls - successfulCalls;
        
        const uniqueTools = new Set(this.history.map(e => e.tool)).size;
        
        const avgDuration = totalCalls > 0
            ? this.history.reduce((sum, e) => sum + e.duration, 0) / totalCalls
            : 0;

        return {
            totalCalls,
            successfulCalls,
            failedCalls,
            successRate: totalCalls > 0 ? successfulCalls / totalCalls : 0,
            uniqueTools,
            avgDuration: Math.round(avgDuration)
        };
    }

    /**
     * Get recent failures for a specific tool
     * NEW 2025-10-23
     * 
     * @param {number} count - Number of recent records to check (default: 50)
     * @returns {Array<Object>} Recent failed tool calls
     */
    getRecentFailures(count = 50) {
        return this.history
            .slice(-count)
            .filter(entry => entry.label === 'FAILURE')
            .reverse();
    }

    /**
     * Check if tool is repeating after recent failures
     * NEW 2025-10-23 - Anti-repetition protection
     * 
     * @param {Object} toolCall - Tool call to check {server, tool}
     * @param {number} lookbackCount - How many recent records to check
     * @returns {Object|null} Repetition info or null if safe
     */
    checkRepetitionAfterFailure(toolCall, lookbackCount = null) {
        const window = lookbackCount || this.antiRepetitionWindow;
        const toolKey = `${toolCall.server}__${toolCall.tool}`;
        
        // Get recent history within window
        const recentWindow = this.history.slice(-window);
        const toolHistory = recentWindow.filter(e => e.tool === toolKey);
        
        if (toolHistory.length === 0) {
            return null;  // No history, safe to execute
        }
        
        // Count consecutive failures
        const failures = toolHistory.filter(e => e.label === 'FAILURE');
        
        if (failures.length >= this.maxFailuresBeforeBlock) {
            return {
                count: failures.length,
                lastError: failures[failures.length - 1].error,
                lastTimestamp: failures[failures.length - 1].timestamp,
                blocked: true
            };
        }
        
        return null;  // Safe to execute
    }

    /**
     * Detect if a tool is being repeated excessively
     * 
     * @param {string} server - MCP server name
     * @param {string} tool - Tool name
     * @param {number} threshold - Repetition threshold
     * @returns {boolean} True if tool is repeated excessively
     */
    isToolRepeatedExcessively(server, tool, threshold = 5) {
        const recent = this.getRecentCalls(threshold + 1);
        const toolKey = `${server}__${tool}`;
        
        const recentCount = recent.filter(e => e.tool === toolKey).length;
        return recentCount > threshold;
    }

    /**
     * Clear all history
     */
    clear() {
        this.history = [];
        this.callCounts.clear();
        this.successRates.clear();
        
        logger.system('tool-history', 'History cleared');
    }

    /**
     * Export history for debugging
     * 
     * @returns {Object} Exported history data
     */
    export() {
        return {
            history: this.history,
            callCounts: Object.fromEntries(this.callCounts),
            successRates: Object.fromEntries(this.successRates),
            statistics: this.getStatistics()
        };
    }

    /**
     * Format time ago string
     * 
     * @param {number} ms - Milliseconds ago
     * @returns {string} Formatted time
     * @private
     */
    _formatTimeAgo(ms) {
        if (ms < 1000) {
            return 'just now';
        } else if (ms < 60000) {
            const seconds = Math.floor(ms / 1000);
            return `${seconds}s ago`;
        } else if (ms < 3600000) {
            const minutes = Math.floor(ms / 60000);
            return `${minutes}m ago`;
        } else {
            const hours = Math.floor(ms / 3600000);
            return `${hours}h ago`;
        }
    }
}

export default ToolHistoryManager;
