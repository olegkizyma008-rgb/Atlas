/**
 * @fileoverview AdaptiveVerifier - Adaptive verification strategy selection
 * Chooses best verification method based on context and confidence
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Adaptive verifier that selects best verification strategy
 * Responsibilities:
 * - Select appropriate verifier based on context
 * - Coordinate multiple verifiers
 * - Aggregate verification results
 * - Provide adaptive confidence scoring
 */
export class AdaptiveVerifier {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpVerifier - MCP verifier instance
     * @param {Object} dependencies.llmVerifier - LLM verifier instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.mcpVerifier = options.mcpVerifier;
        this.llmVerifier = options.llmVerifier;
        this.logger = options.logger || console;

        this.logger.system('adaptive-verifier', '✅ AdaptiveVerifier initialized');
    }

    /**
     * Verify execution result adaptively
     * @param {Object} item - TODO item
     * @param {Object} execResult - Execution result
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Verification result
     */
    async verify(item, execResult, session) {
        const verifyId = this._generateVerifyId();

        this.logger.system('adaptive-verifier', `[${verifyId}] Starting adaptive verification`, {
            itemId: item.id,
            hasResult: !!execResult
        });

        try {
            // Step 1: Determine verification strategy
            const strategy = this._selectStrategy(item, execResult);

            this.logger.system('adaptive-verifier', `[${verifyId}] Selected strategy: ${strategy}`);

            // Step 2: Execute verification based on strategy
            let result;

            if (strategy === 'mcp_first') {
                result = await this._verifyMCPFirst(item, execResult, session, verifyId);
            } else if (strategy === 'llm_first') {
                result = await this._verifyLLMFirst(item, execResult, session, verifyId);
            } else if (strategy === 'combined') {
                result = await this._verifyCombined(item, execResult, session, verifyId);
            } else {
                result = await this._verifyFallback(item, execResult, verifyId);
            }

            this.logger.system('adaptive-verifier', `[${verifyId}] Adaptive verification completed`, {
                verified: result.verified,
                confidence: result.confidence,
                strategy: result.strategy
            });

            return result;

        } catch (error) {
            this.logger.error('adaptive-verifier', `[${verifyId}] Verification failed`, {
                error: error.message
            });

            return {
                verified: false,
                confidence: 0,
                reason: error.message,
                method: 'adaptive_error',
                strategy: 'error'
            };
        }
    }

    /**
     * Select verification strategy
     * @private
     */
    _selectStrategy(item, execResult) {
        // If result has MCP-specific data, use MCP first
        if (execResult && (execResult.server || execResult.tool || execResult.mcp_result)) {
            return 'mcp_first';
        }

        // If result is complex, use LLM for analysis
        if (execResult && typeof execResult === 'object' && Object.keys(execResult).length > 5) {
            return 'combined';
        }

        // If success criteria is complex, use LLM
        if (item.success_criteria && item.success_criteria.length > 100) {
            return 'llm_first';
        }

        // Default: use combined approach
        return 'combined';
    }

    /**
     * Verify with MCP first, fallback to LLM
     * @private
     */
    async _verifyMCPFirst(item, execResult, session, verifyId) {
        try {
            if (this.mcpVerifier) {
                const mcpResult = await this.mcpVerifier.verify(item, execResult, session);
                if (mcpResult.confidence > 70) {
                    return {
                        ...mcpResult,
                        method: 'adaptive_mcp_first',
                        strategy: 'mcp_first'
                    };
                }
            }

            // Fallback to LLM
            if (this.llmVerifier) {
                const llmResult = await this.llmVerifier.verify(item, execResult, session);
                return {
                    ...llmResult,
                    method: 'adaptive_mcp_llm_fallback',
                    strategy: 'mcp_first_llm_fallback'
                };
            }

            return this._verifyFallback(item, execResult, verifyId);

        } catch (error) {
            this.logger.warn('adaptive-verifier', `MCP first verification failed: ${error.message}`);
            return this._verifyFallback(item, execResult, verifyId);
        }
    }

    /**
     * Verify with LLM first, fallback to MCP
     * @private
     */
    async _verifyLLMFirst(item, execResult, session, verifyId) {
        try {
            if (this.llmVerifier) {
                const llmResult = await this.llmVerifier.verify(item, execResult, session);
                if (llmResult.confidence > 70) {
                    return {
                        ...llmResult,
                        method: 'adaptive_llm_first',
                        strategy: 'llm_first'
                    };
                }
            }

            // Fallback to MCP
            if (this.mcpVerifier) {
                const mcpResult = await this.mcpVerifier.verify(item, execResult, session);
                return {
                    ...mcpResult,
                    method: 'adaptive_llm_mcp_fallback',
                    strategy: 'llm_first_mcp_fallback'
                };
            }

            return this._verifyFallback(item, execResult, verifyId);

        } catch (error) {
            this.logger.warn('adaptive-verifier', `LLM first verification failed: ${error.message}`);
            return this._verifyFallback(item, execResult, verifyId);
        }
    }

    /**
     * Verify using combined approach
     * @private
     */
    async _verifyCombined(item, execResult, session, verifyId) {
        const results = [];

        // Try MCP verification
        if (this.mcpVerifier) {
            try {
                const mcpResult = await this.mcpVerifier.verify(item, execResult, session);
                results.push(mcpResult);
            } catch (error) {
                this.logger.warn('adaptive-verifier', `MCP verification failed: ${error.message}`);
            }
        }

        // Try LLM verification
        if (this.llmVerifier) {
            try {
                const llmResult = await this.llmVerifier.verify(item, execResult, session);
                results.push(llmResult);
            } catch (error) {
                this.logger.warn('adaptive-verifier', `LLM verification failed: ${error.message}`);
            }
        }

        // Aggregate results
        if (results.length === 0) {
            return this._verifyFallback(item, execResult, verifyId);
        }

        return this._aggregateResults(results, 'combined');
    }

    /**
     * Fallback verification
     * @private
     */
    _verifyFallback(item, execResult, verifyId) {
        const isSuccessful = this._checkSuccess(execResult);

        return {
            verified: isSuccessful,
            confidence: isSuccessful ? 60 : 20,
            reason: isSuccessful ? 'Heuristic verification passed' : 'Heuristic verification failed',
            method: 'adaptive_fallback',
            strategy: 'fallback'
        };
    }

    /**
     * Aggregate verification results
     * @private
     */
    _aggregateResults(results, strategy) {
        if (results.length === 0) {
            return {
                verified: true,
                confidence: 50,
                reason: 'No verification results',
                method: 'adaptive_combined',
                strategy
            };
        }

        // Calculate average confidence
        const avgConfidence = Math.round(
            results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length
        );

        // Determine overall verification
        const verifiedCount = results.filter(r => r.verified).length;
        const verified = verifiedCount > results.length / 2;

        // Combine reasons
        const reasons = results
            .map(r => `${r.method}: ${r.reason}`)
            .join('; ');

        return {
            verified,
            confidence: avgConfidence,
            reason: reasons,
            method: 'adaptive_combined',
            strategy,
            details: {
                resultCount: results.length,
                verifiedCount,
                results
            }
        };
    }

    /**
     * Check if result indicates success
     * @private
     */
    _checkSuccess(result) {
        if (!result) {
            return false;
        }

        if (result.success === true) return true;
        if (result.verified === true) return true;
        if (result.status === 'success' || result.status === 'completed') return true;
        if (result.error === false || result.error === null) return true;

        return false;
    }

    /**
     * Generate unique verify ID
     * @private
     */
    _generateVerifyId() {
        return `verify_adaptive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default AdaptiveVerifier;
