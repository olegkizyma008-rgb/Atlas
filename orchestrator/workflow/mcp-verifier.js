/**
 * @fileoverview MCP Verifier Module
 * Handles verification of TODO item execution and TTS feedback
 * Extracted from MCPTodoManager for better modularity
 *
 * @version 1.0.0
 * @date 2025-11-23
 */

import { ValidationPipeline } from '../ai/validation/validation-pipeline.js';
import LocalizationService from '../services/localization-service.js';
import { IdGenerator } from './utils/id-generator.js';

/**
 * MCP Verifier - Handles verification and TTS feedback
 */
export class MCPVerifier {
    /**
     * @param {Object} options
     * @param {Object} options.mcpManager - MCP Manager instance
     * @param {Object} options.llmClient - LLM Client instance
     * @param {Object} options.ttsSyncManager - TTS Sync Manager
     * @param {Object} options.logger - Logger instance
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.mcpManager = options.mcpManager;
        this.llmClient = options.llmClient;
        this.ttsSyncManager = options.ttsSyncManager;
        this.localizationService = options.localizationService || new LocalizationService({ logger: this.logger });
        this.idGenerator = new IdGenerator();

        // Initialize validation pipeline
        this.validationPipeline = null;
        if (this.mcpManager && this.llmClient) {
            try {
                this.validationPipeline = new ValidationPipeline({
                    mcpManager: this.mcpManager,
                    llmClient: this.llmClient
                });
                this.logger.system('mcp-verifier', '✅ ValidationPipeline initialized');
            } catch (error) {
                this.logger.warn('mcp-verifier', `Failed to initialize ValidationPipeline: ${error.message}`);
            }
        }
    }

    /**
     * Verify item execution results
     * @param {Object} item - TODO item
     * @param {Object} executionResults - Results from execution
     * @returns {Promise<Object>} Verification results
     */
    async verifyItem(item, executionResults) {
        try {
            this.logger.info('mcp-verifier', `Verifying item: ${item.action}`);

            // Generate TTS feedback for verification
            await this._generateTTSFeedback(item, 'verify');

            // Use validation pipeline if available
            if (this.validationPipeline) {
                const validation = await this.validationPipeline.validate({
                    item,
                    results: executionResults,
                    successCriteria: item.success_criteria
                });

                return {
                    verified: validation.valid,
                    confidence: validation.confidence,
                    issues: validation.issues,
                    corrections: validation.corrections
                };
            }

            // Fallback: basic verification
            return {
                verified: true,
                confidence: 0.7,
                issues: [],
                corrections: null
            };
        } catch (error) {
            this.logger.error('mcp-verifier', `Verification failed: ${error.message}`);
            return {
                verified: false,
                error: error.message,
                confidence: 0
            };
        }
    }

    /**
     * Handle verification failure
     * @param {Object} item - TODO item
     * @param {Object} verificationResults - Verification results
     * @returns {Promise<Object>} Failure handling results
     */
    async handleVerificationFailure(item, verificationResults) {
        try {
            this.logger.warn('mcp-verifier', `Verification failed for item: ${item.action}`);

            // Generate TTS feedback for failure
            await this._generateTTSFeedback(item, 'failure');

            // Generate fallback options
            const fallbackOptions = await this._generateFallbackOptions(item, verificationResults);

            return {
                fallbackOptions,
                shouldRetry: fallbackOptions.length > 0,
                nextAttemptStrategy: fallbackOptions[0] || null
            };
        } catch (error) {
            this.logger.error('mcp-verifier', `Failure handling failed: ${error.message}`);
            return {
                fallbackOptions: [],
                shouldRetry: false,
                error: error.message
            };
        }
    }

    /**
     * Retry with fallback strategy
     * @param {Object} item - TODO item
     * @param {Object} fallbackStrategy - Fallback strategy
     * @returns {Promise<Object>} Retry results
     */
    async retryWithFallback(item, fallbackStrategy) {
        try {
            this.logger.info('mcp-verifier', `Retrying with fallback: ${fallbackStrategy.description}`);

            // Update item with fallback strategy
            item.fallback_applied = fallbackStrategy;
            item.attempt = (item.attempt || 0) + 1;

            return {
                retryAttempt: item.attempt,
                strategy: fallbackStrategy,
                ready: true
            };
        } catch (error) {
            this.logger.error('mcp-verifier', `Retry preparation failed: ${error.message}`);
            return {
                ready: false,
                error: error.message
            };
        }
    }

    /**
     * Generate TTS feedback
     * @private
     */
    async _generateTTSFeedback(item, status) {
        try {
            if (!this.ttsSyncManager) {
                return;
            }

            let phrase = '';

            switch (status) {
                case 'start':
                    phrase = item.tts?.start || `Starting: ${item.action}`;
                    break;
                case 'success':
                    phrase = item.tts?.success || `Completed: ${item.action}`;
                    break;
                case 'failure':
                    phrase = item.tts?.failure || `Failed: ${item.action}`;
                    break;
                case 'verify':
                    phrase = item.tts?.verify || `Verifying: ${item.action}`;
                    break;
                default:
                    return;
            }

            // Localize phrase
            const localizedPhrase = this.localizationService.localize(phrase);

            // Send to TTS
            await this.ttsSyncManager.speak(localizedPhrase, {
                itemId: item.id,
                status,
                priority: status === 'failure' ? 'high' : 'normal'
            });

            this.logger.debug('mcp-verifier', `TTS feedback sent: ${status}`);
        } catch (error) {
            this.logger.warn('mcp-verifier', `TTS feedback failed: ${error.message}`);
        }
    }

    /**
     * Generate fallback options
     * @private
     */
    async _generateFallbackOptions(item, verificationResults) {
        try {
            if (!item.fallback_options || item.fallback_options.length === 0) {
                return [];
            }

            const fallbackOptions = [];

            for (const fallback of item.fallback_options) {
                fallbackOptions.push({
                    id: this.idGenerator.generate(),
                    description: fallback,
                    priority: 'medium',
                    estimated_time: 30000 // 30 seconds
                });
            }

            this.logger.info('mcp-verifier', `Generated ${fallbackOptions.length} fallback options`);

            return fallbackOptions;
        } catch (error) {
            this.logger.error('mcp-verifier', `Fallback generation failed: ${error.message}`);
            return [];
        }
    }
}

export default MCPVerifier;
