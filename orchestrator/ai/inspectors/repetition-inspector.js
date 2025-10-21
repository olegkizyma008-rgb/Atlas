/**
 * @fileoverview Repetition Inspector
 * Detects and prevents tool call loops and excessive repetitions
 * 
 * Inspired by Goose's RepetitionInspector
 * 
 * @version 1.0.0
 * @date 2025-10-21
 */

import logger from '../../utils/logger.js';

/**
 * Repetition Inspector
 * 
 * Detects two types of repetitions:
 * 1. Consecutive repetitions - same tool with same params called repeatedly
 * 2. Total call count - tool called too many times overall
 * 
 * Returns inspection results with actions: ALLOW, DENY, REQUIRE_APPROVAL
 */
export class RepetitionInspector {
    /**
     * @param {Object} options - Configuration options
     * @param {number} options.maxConsecutiveRepetitions - Max consecutive calls (default: 3)
     * @param {number} options.maxTotalCalls - Max total calls per tool (default: 10)
     */
    constructor(options = {}) {
        this.name = 'repetition';
        this.maxConsecutiveRepetitions = options.maxConsecutiveRepetitions || 3;
        this.maxTotalCalls = options.maxTotalCalls || 10;
        
        // State tracking
        this.lastCall = null;  // { tool, paramsKey }
        this.consecutiveCount = 0;
        this.callCounts = new Map();  // tool -> count
        
        this.enabled = true;
        
        logger.system('repetition-inspector', 
            `Initialized (maxConsecutive: ${this.maxConsecutiveRepetitions}, maxTotal: ${this.maxTotalCalls})`);
    }

    /**
     * Inspect tool calls for repetition patterns
     * 
     * @param {Array<Object>} toolCalls - Tool calls to inspect
     * @param {Object} context - Execution context
     * @returns {Promise<Array<Object>>} Inspection results
     */
    async inspect(toolCalls, context = {}) {
        const results = [];

        for (const toolCall of toolCalls) {
            const toolKey = `${toolCall.server}__${toolCall.tool}`;
            const paramsKey = this._generateParamsKey(toolCall.parameters);
            const fullKey = `${toolKey}:${paramsKey}`;

            // Check consecutive repetitions
            const consecutiveResult = this._checkConsecutiveRepetition(fullKey, toolKey, toolCall);
            if (consecutiveResult) {
                results.push(consecutiveResult);
                continue;  // Skip total count check if already denied
            }

            // Check total call count
            const totalCountResult = this._checkTotalCallCount(toolKey, toolCall);
            if (totalCountResult) {
                results.push(totalCountResult);
            }

            // Update state for next check
            this._updateState(fullKey, toolKey);
        }

        if (results.length > 0) {
            logger.warn('repetition-inspector', 
                `Detected ${results.length} repetition issue(s)`);
        }

        return results;
    }

    /**
     * Check for consecutive repetitions
     * 
     * @param {string} fullKey - Tool + params key
     * @param {string} toolKey - Tool key
     * @param {Object} toolCall - Tool call object
     * @returns {Object|null} Inspection result or null
     * @private
     */
    _checkConsecutiveRepetition(fullKey, toolKey, toolCall) {
        if (this.lastCall === fullKey) {
            this.consecutiveCount++;
            
            if (this.consecutiveCount > this.maxConsecutiveRepetitions) {
                logger.error('repetition-inspector', 
                    `DENIED: ${toolKey} repeated ${this.consecutiveCount} times consecutively`);
                
                return {
                    toolCall,
                    action: 'DENY',
                    reason: `Tool "${toolKey}" has been called ${this.consecutiveCount} times in a row with identical parameters. This appears to be a loop.`,
                    confidence: 1.0,
                    inspector: this.name,
                    metadata: {
                        consecutiveCount: this.consecutiveCount,
                        maxAllowed: this.maxConsecutiveRepetitions,
                        type: 'consecutive_repetition'
                    }
                };
            }
        } else {
            // Different call, reset consecutive counter
            this.consecutiveCount = 1;
        }

        return null;
    }

    /**
     * Check total call count for a tool
     * 
     * @param {string} toolKey - Tool key
     * @param {Object} toolCall - Tool call object
     * @returns {Object|null} Inspection result or null
     * @private
     */
    _checkTotalCallCount(toolKey, toolCall) {
        const currentCount = this.callCounts.get(toolKey) || 0;
        
        if (currentCount >= this.maxTotalCalls) {
            logger.warn('repetition-inspector', 
                `APPROVAL REQUIRED: ${toolKey} called ${currentCount} times total`);
            
            return {
                toolCall,
                action: 'REQUIRE_APPROVAL',
                reason: `Tool "${toolKey}" has been called ${currentCount} times in this session. This is unusually high and may indicate an issue.`,
                confidence: 0.8,
                inspector: this.name,
                metadata: {
                    totalCalls: currentCount,
                    maxAllowed: this.maxTotalCalls,
                    type: 'excessive_total_calls'
                }
            };
        }

        return null;
    }

    /**
     * Update internal state after inspection
     * 
     * @param {string} fullKey - Tool + params key
     * @param {string} toolKey - Tool key
     * @private
     */
    _updateState(fullKey, toolKey) {
        this.lastCall = fullKey;
        
        const count = this.callCounts.get(toolKey) || 0;
        this.callCounts.set(toolKey, count + 1);
    }

    /**
     * Generate consistent key from parameters
     * 
     * @param {Object} params - Tool parameters
     * @returns {string} Parameters key
     * @private
     */
    _generateParamsKey(params) {
        if (!params || Object.keys(params).length === 0) {
            return 'empty';
        }

        try {
            // Sort keys for consistent hashing
            const sorted = Object.keys(params).sort().reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {});
            
            return JSON.stringify(sorted);
        } catch (error) {
            logger.warn('repetition-inspector', `Failed to generate params key: ${error.message}`);
            return 'error';
        }
    }

    /**
     * Check if inspector is enabled
     * 
     * @returns {boolean} Enabled status
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Reset inspector state
     * Useful when starting a new task or session
     */
    reset() {
        this.lastCall = null;
        this.consecutiveCount = 0;
        this.callCounts.clear();
        
        logger.debug('repetition-inspector', 'State reset');
    }

    /**
     * Get current statistics
     * 
     * @returns {Object} Statistics
     */
    getStatistics() {
        return {
            consecutiveCount: this.consecutiveCount,
            lastCall: this.lastCall,
            totalTrackedTools: this.callCounts.size,
            callCounts: Object.fromEntries(this.callCounts)
        };
    }

    /**
     * Check if a specific tool is being repeated excessively
     * 
     * @param {string} server - Server name
     * @param {string} tool - Tool name
     * @returns {boolean} True if excessive
     */
    isToolRepeatedExcessively(server, tool) {
        const toolKey = `${server}__${tool}`;
        const count = this.callCounts.get(toolKey) || 0;
        return count > this.maxTotalCalls;
    }

    /**
     * Get call count for a specific tool
     * 
     * @param {string} server - Server name
     * @param {string} tool - Tool name
     * @returns {number} Call count
     */
    getToolCallCount(server, tool) {
        const toolKey = `${server}__${tool}`;
        return this.callCounts.get(toolKey) || 0;
    }
}

export default RepetitionInspector;
