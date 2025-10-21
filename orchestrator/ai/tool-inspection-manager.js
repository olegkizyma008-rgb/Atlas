/**
 * @fileoverview Tool Inspection Manager
 * Coordinates multiple tool inspectors for security and validation
 * 
 * Inspired by Goose's ToolInspectionManager
 * 
 * @version 1.0.0
 * @date 2025-10-21
 */

import logger from '../utils/logger.js';

/**
 * Tool Inspection Manager
 * 
 * Manages multiple inspectors and coordinates their results:
 * - RepetitionInspector: Detects loops
 * - PermissionInspector: Checks user permissions
 * - SecurityInspector: Validates safety
 * 
 * Inspectors run in order and can return:
 * - ALLOW: Tool is safe to execute
 * - DENY: Tool must be blocked
 * - REQUIRE_APPROVAL: User confirmation needed
 */
export class ToolInspectionManager {
    constructor() {
        this.inspectors = [];
        
        logger.system('tool-inspection', 'ToolInspectionManager initialized');
    }

    /**
     * Add an inspector to the pipeline
     * Inspectors run in the order they are added
     * 
     * @param {Object} inspector - Inspector instance
     */
    addInspector(inspector) {
        if (!inspector || typeof inspector.inspect !== 'function') {
            throw new Error('Inspector must have an inspect() method');
        }

        this.inspectors.push(inspector);
        
        logger.system('tool-inspection', 
            `Added inspector: ${inspector.name || 'unnamed'}`);
    }

    /**
     * Inspect tool calls through all registered inspectors
     * 
     * @param {Array<Object>} toolCalls - Tool calls to inspect
     * @param {Object} context - Execution context
     * @returns {Promise<Array<Object>>} Combined inspection results
     */
    async inspectTools(toolCalls, context = {}) {
        const allResults = [];

        for (const inspector of this.inspectors) {
            // Skip disabled inspectors
            if (inspector.isEnabled && !inspector.isEnabled()) {
                logger.debug('tool-inspection', 
                    `Skipping disabled inspector: ${inspector.name}`);
                continue;
            }

            try {
                logger.debug('tool-inspection', 
                    `Running inspector: ${inspector.name || 'unnamed'}`);

                const results = await inspector.inspect(toolCalls, context);
                
                if (results && Array.isArray(results) && results.length > 0) {
                    logger.debug('tool-inspection', 
                        `Inspector ${inspector.name} returned ${results.length} result(s)`);
                    allResults.push(...results);
                }

            } catch (error) {
                logger.error('tool-inspection', 
                    `Inspector ${inspector.name} failed: ${error.message}`);
                // Continue with other inspectors even if one fails
            }
        }

        // Log summary
        if (allResults.length > 0) {
            const denied = allResults.filter(r => r.action === 'DENY').length;
            const requireApproval = allResults.filter(r => r.action === 'REQUIRE_APPROVAL').length;
            
            logger.system('tool-inspection', 
                `Inspection complete: ${denied} denied, ${requireApproval} need approval`);
        }

        return allResults;
    }

    /**
     * Get a specific inspector by name
     * 
     * @param {string} name - Inspector name
     * @returns {Object|null} Inspector instance or null
     */
    getInspector(name) {
        return this.inspectors.find(i => i.name === name) || null;
    }

    /**
     * Get all registered inspector names
     * 
     * @returns {Array<string>} Inspector names
     */
    getInspectorNames() {
        return this.inspectors.map(i => i.name || 'unnamed');
    }

    /**
     * Remove an inspector by name
     * 
     * @param {string} name - Inspector name
     * @returns {boolean} True if removed
     */
    removeInspector(name) {
        const index = this.inspectors.findIndex(i => i.name === name);
        
        if (index !== -1) {
            this.inspectors.splice(index, 1);
            logger.system('tool-inspection', `Removed inspector: ${name}`);
            return true;
        }
        
        return false;
    }

    /**
     * Clear all inspectors
     */
    clearInspectors() {
        this.inspectors = [];
        logger.system('tool-inspection', 'All inspectors cleared');
    }

    /**
     * Process inspection results and determine actions
     * 
     * @param {Array<Object>} results - Inspection results
     * @returns {Object} Processed actions
     */
    processResults(results) {
        const processed = {
            allowed: [],
            denied: [],
            requireApproval: [],
            allAllowed: true
        };

        // Group results by tool call
        const resultsByTool = new Map();
        
        for (const result of results) {
            const toolKey = this._getToolKey(result.toolCall);
            
            if (!resultsByTool.has(toolKey)) {
                resultsByTool.set(toolKey, []);
            }
            
            resultsByTool.get(toolKey).push(result);
        }

        // Determine action for each tool (DENY takes precedence)
        for (const [toolKey, toolResults] of resultsByTool) {
            const hasDeny = toolResults.some(r => r.action === 'DENY');
            const hasRequireApproval = toolResults.some(r => r.action === 'REQUIRE_APPROVAL');

            if (hasDeny) {
                processed.denied.push({
                    tool: toolKey,
                    results: toolResults.filter(r => r.action === 'DENY')
                });
                processed.allAllowed = false;
            } else if (hasRequireApproval) {
                processed.requireApproval.push({
                    tool: toolKey,
                    results: toolResults.filter(r => r.action === 'REQUIRE_APPROVAL')
                });
                processed.allAllowed = false;
            } else {
                processed.allowed.push(toolKey);
            }
        }

        return processed;
    }

    /**
     * Get tool key from tool call
     * 
     * @param {Object} toolCall - Tool call object
     * @returns {string} Tool key
     * @private
     */
    _getToolKey(toolCall) {
        return `${toolCall.server}__${toolCall.tool}`;
    }

    /**
     * Get statistics from all inspectors
     * 
     * @returns {Object} Combined statistics
     */
    getStatistics() {
        const stats = {
            totalInspectors: this.inspectors.length,
            inspectors: {}
        };

        for (const inspector of this.inspectors) {
            if (inspector.getStatistics) {
                stats.inspectors[inspector.name] = inspector.getStatistics();
            }
        }

        return stats;
    }

    /**
     * Reset all inspectors
     * Useful when starting a new task
     */
    resetAll() {
        for (const inspector of this.inspectors) {
            if (inspector.reset) {
                inspector.reset();
            }
        }
        
        logger.system('tool-inspection', 'All inspectors reset');
    }
}

export default ToolInspectionManager;
