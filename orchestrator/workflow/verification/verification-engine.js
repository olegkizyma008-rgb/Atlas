/**
 * @fileoverview VerificationEngine - Verifies TODO item execution results
 * Coordinates multiple verification methods (MCP, LLM, adaptive)
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Verifies execution results
 * Responsibilities:
 * - Select appropriate verification method
 * - Execute verification
 * - Aggregate results
 * - Provide confidence scores
 */
export class VerificationEngine {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpVerifier - MCP-based verifier (optional)
     * @param {Object} dependencies.llmVerifier - LLM-based verifier (optional)
     * @param {Object} dependencies.adaptiveVerifier - Adaptive verifier (optional)
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.mcpVerifier = options.mcpVerifier;
        this.llmVerifier = options.llmVerifier;
        this.adaptiveVerifier = options.adaptiveVerifier;
        this.logger = options.logger || console;

        this.logger.system('verification-engine', '✅ VerificationEngine initialized');
    }

    /**
     * Verify execution result
     * @param {Object} item - TODO item
     * @param {Object} execResult - Execution result
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Verification result
     */
    async verify(item, execResult, session) {
        const verifyId = this._generateVerifyId();

        this.logger.system('verification-engine', `[${verifyId}] Verifying item ${item.id}`);

        try {
            // Select verification method based on item and result
            const verifier = this._selectVerifier(item, execResult);

            if (!verifier) {
                this.logger.warn('verification-engine', `[${verifyId}] No verifier available, assuming success`);
                return {
                    verified: true,
                    confidence: 50,
                    reason: 'No verifier available',
                    method: 'none'
                };
            }

            // Execute verification
            const result = await verifier.verify(item, execResult, session);

            this.logger.system('verification-engine', `[${verifyId}] Verification completed`, {
                verified: result.verified,
                confidence: result.confidence,
                method: result.method
            });

            return result;

        } catch (error) {
            this.logger.error('verification-engine', `[${verifyId}] Verification failed`, {
                error: error.message
            });

            return {
                verified: false,
                confidence: 0,
                reason: error.message,
                method: 'error'
            };
        }
    }

    /**
     * Select appropriate verifier
     * @private
     */
    _selectVerifier(item, execResult) {
        // Priority order: Adaptive > LLM > MCP > None

        if (this.adaptiveVerifier) {
            return this.adaptiveVerifier;
        }

        if (this.llmVerifier) {
            return this.llmVerifier;
        }

        if (this.mcpVerifier) {
            return this.mcpVerifier;
        }

        return null;
    }

    /**
     * Generate unique verify ID
     * @private
     */
    _generateVerifyId() {
        return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default VerificationEngine;
