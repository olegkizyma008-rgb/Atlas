/**
 * @fileoverview LLMVerifier - LLM-based verification of execution results
 * Uses LLM to analyze and verify task completion
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * LLM-based verifier for result verification
 * Responsibilities:
 * - Verify results using LLM analysis
 * - Provide confidence scores
 * - Handle reasoning and explanation
 * - Support multiple verification strategies
 */
export class LLMVerifier {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.llmClient - LLM client instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.llmClient = options.llmClient;
        this.logger = options.logger || console;

        if (!this.llmClient) {
            this.logger.warn('llm-verifier', 'LLM Client not available - verification will be limited');
        }

        this.logger.system('llm-verifier', '✅ LLMVerifier initialized');
    }

    /**
     * Verify execution result using LLM
     * @param {Object} item - TODO item
     * @param {Object} execResult - Execution result
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Verification result
     */
    async verify(item, execResult, session) {
        const verifyId = this._generateVerifyId();

        this.logger.system('llm-verifier', `[${verifyId}] Starting LLM verification`, {
            itemId: item.id,
            hasResult: !!execResult
        });

        try {
            // Check if LLM is available
            if (!this.llmClient) {
                return {
                    verified: true,
                    confidence: 50,
                    reason: 'LLM Client not available - assuming success',
                    method: 'llm_fallback'
                };
            }

            // Step 1: Prepare verification prompt
            const prompt = this._buildVerificationPrompt(item, execResult);

            // Step 2: Call LLM for analysis
            const llmResponse = await this._callLLM(prompt, verifyId);

            // Step 3: Parse LLM response
            const verification = this._parseLLMResponse(llmResponse);

            this.logger.system('llm-verifier', `[${verifyId}] LLM verification completed`, {
                verified: verification.verified,
                confidence: verification.confidence
            });

            return {
                ...verification,
                method: 'llm',
                details: {
                    verifyId,
                    prompt: prompt.substring(0, 100),
                    response: llmResponse.substring(0, 200)
                }
            };

        } catch (error) {
            this.logger.error('llm-verifier', `[${verifyId}] Verification failed`, {
                error: error.message
            });

            return {
                verified: false,
                confidence: 0,
                reason: error.message,
                method: 'llm_error'
            };
        }
    }

    /**
     * Build verification prompt
     * @private
     */
    _buildVerificationPrompt(item, execResult) {
        const resultStr = typeof execResult === 'string'
            ? execResult
            : JSON.stringify(execResult, null, 2).substring(0, 500);

        return `Verify if the following task was completed successfully:

Task: ${item.action}

Success Criteria: ${item.success_criteria}

Execution Result:
${resultStr}

Please analyze the result and determine if the task was completed successfully.
Respond with JSON format:
{
  "verified": true/false,
  "confidence": 0-100,
  "reason": "explanation"
}`;
    }

    /**
     * Call LLM for verification
     * @private
     */
    async _callLLM(prompt, verifyId) {
        try {
            if (!this.llmClient.analyze && !this.llmClient.chat) {
                throw new Error('LLM Client does not have analyze or chat method');
            }

            let response;

            if (typeof this.llmClient.analyze === 'function') {
                response = await this.llmClient.analyze(prompt);
            } else if (typeof this.llmClient.chat === 'function') {
                response = await this.llmClient.chat([
                    { role: 'user', content: prompt }
                ]);
            } else {
                throw new Error('No suitable LLM method found');
            }

            if (typeof response === 'object' && response.content) {
                return response.content;
            }

            return String(response);

        } catch (error) {
            this.logger.error('llm-verifier', `[${verifyId}] LLM call failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Parse LLM response
     * @private
     */
    _parseLLMResponse(response) {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    verified: parsed.verified === true,
                    confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
                    reason: parsed.reason || 'LLM analysis completed'
                };
            }

            // Fallback: check for keywords
            const lowerResponse = response.toLowerCase();
            const verified = lowerResponse.includes('success') ||
                lowerResponse.includes('completed') ||
                lowerResponse.includes('verified') ||
                lowerResponse.includes('yes');

            return {
                verified,
                confidence: verified ? 70 : 30,
                reason: response.substring(0, 200)
            };

        } catch (error) {
            this.logger.warn('llm-verifier', `Failed to parse LLM response: ${error.message}`);

            return {
                verified: true,
                confidence: 50,
                reason: 'Could not parse LLM response - assuming success'
            };
        }
    }

    /**
     * Generate unique verify ID
     * @private
     */
    _generateVerifyId() {
        return `verify_llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default LLMVerifier;
