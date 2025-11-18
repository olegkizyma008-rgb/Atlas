/**
 * @fileoverview Grisha Verification Strategy Selector
 * LLM-based selection between visual verification and MCP tool verification
 * 
 * UPDATED 2025-11-18: Removed heuristics, rely on LLM eligibility processor
 * 
 * Default Strategy:
 * 1. Visual screenshot verification (primary, for all UI/app interactions)
 * 2. MCP tool verification (fallback, if visual fails)
 * 
 * @version 2.0.0
 * @date 2025-11-18
 */

import logger from '../../utils/logger.js';

/**
 * Verification Strategy Selector
 * Provides default strategy; actual decision delegated to LLM eligibility processor
 */
export class GrishaVerificationStrategy {
    constructor({ logger: loggerInstance }) {
        this.logger = loggerInstance || logger;
    }

    /**
     * Determine verification strategy for a TODO item
     * 
     * FIXED 2025-11-18: Removed all heuristics, return simple visual-first strategy
     * LLM eligibility processor will make final decision based on execution context
     * 
     * @param {Object} item - TODO item to verify
     * @param {Object} execution - Execution results
     * @returns {Object} Strategy decision
     */
    determineStrategy(item, execution) {
        // SIMPLIFIED 2025-11-18: Default to visual verification with MCP fallback
        // LLM eligibility processor will override if needed based on execution analysis
        const strategy = {
            method: 'visual',
            targetApp: null,
            confidence: 70,
            reason: 'Default strategy: visual verification with MCP fallback (LLM eligibility will refine)',
            fallbackToMcp: true,
            mcpFallbackTools: []
        };

        this.logger.system('grisha-verification-strategy',
            `[STRATEGY] Default: ${strategy.method} (confidence: ${strategy.confidence}%)`
        );
        this.logger.system('grisha-verification-strategy',
            `[STRATEGY] Reason: ${strategy.reason}`
        );

        return strategy;
    }

}

export default GrishaVerificationStrategy;
