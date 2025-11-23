/**
 * @fileoverview MCP Error Handler Module
 * Handles error management and recovery for TODO execution
 * Extracted from MCPTodoManager for better modularity
 *
 * @version 1.0.0
 * @date 2025-11-23
 */

import GlobalConfig from '../../config/atlas-config.js';

/**
 * MCP Error Handler - Manages errors and recovery strategies
 */
export class MCPErrorHandler {
    /**
     * @param {Object} options
     * @param {Object} options.logger - Logger instance
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.globalConfig = GlobalConfig;
        this.errorHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Handle error with recovery strategy
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     * @returns {Promise<Object>} Error handling result
     */
    async handleError(error, context = {}) {
        try {
            this.logger.error('mcp-error-handler', `Error occurred: ${error.message}`, {
                context,
                stack: error.stack
            });

            // Record error
            this._recordError(error, context);

            // Determine error type
            const errorType = this._classifyError(error);

            // Get recovery strategy
            const recovery = this._getRecoveryStrategy(errorType, context);

            return {
                errorType,
                message: error.message,
                recovery,
                shouldRetry: recovery.shouldRetry,
                retryDelay: recovery.retryDelay
            };
        } catch (handlingError) {
            this.logger.error('mcp-error-handler', `Error handling failed: ${handlingError.message}`);
            return {
                errorType: 'unknown',
                message: error.message,
                recovery: { shouldRetry: false },
                shouldRetry: false
            };
        }
    }

    /**
     * Log error with context
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     */
    logError(error, context = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            context,
            type: this._classifyError(error)
        };

        this.logger.error('mcp-error-handler', JSON.stringify(logEntry));
        this._recordError(error, context);
    }

    /**
     * Get error history
     * @returns {Array} Error history
     */
    getErrorHistory() {
        return [...this.errorHistory];
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
    }

    /**
     * Classify error type
     * @private
     */
    _classifyError(error) {
        const message = error.message.toLowerCase();

        if (message.includes('timeout')) {
            return 'timeout';
        }
        if (message.includes('network') || message.includes('econnrefused')) {
            return 'network';
        }
        if (message.includes('permission') || message.includes('unauthorized')) {
            return 'permission';
        }
        if (message.includes('not found') || message.includes('enoent')) {
            return 'notfound';
        }
        if (message.includes('invalid') || message.includes('parse')) {
            return 'validation';
        }
        if (message.includes('rate limit') || message.includes('429')) {
            return 'ratelimit';
        }

        return 'unknown';
    }

    /**
     * Get recovery strategy for error type
     * @private
     */
    _getRecoveryStrategy(errorType, context = {}) {
        const strategies = {
            timeout: {
                shouldRetry: true,
                retryDelay: 5000,
                maxRetries: 3,
                description: 'Timeout - retry with longer delay'
            },
            network: {
                shouldRetry: true,
                retryDelay: 10000,
                maxRetries: 5,
                description: 'Network error - retry with exponential backoff'
            },
            permission: {
                shouldRetry: false,
                retryDelay: 0,
                maxRetries: 0,
                description: 'Permission denied - manual intervention required'
            },
            notfound: {
                shouldRetry: false,
                retryDelay: 0,
                maxRetries: 0,
                description: 'Resource not found - check path/configuration'
            },
            validation: {
                shouldRetry: true,
                retryDelay: 2000,
                maxRetries: 2,
                description: 'Validation error - retry with corrected parameters'
            },
            ratelimit: {
                shouldRetry: true,
                retryDelay: 30000,
                maxRetries: 3,
                description: 'Rate limit - retry with longer delay'
            },
            unknown: {
                shouldRetry: true,
                retryDelay: 3000,
                maxRetries: 2,
                description: 'Unknown error - retry with standard delay'
            }
        };

        const strategy = strategies[errorType] || strategies.unknown;

        // Adjust based on context
        if (context.attempt && context.maxAttempts) {
            if (context.attempt >= context.maxAttempts) {
                strategy.shouldRetry = false;
            }
        }

        return strategy;
    }

    /**
     * Record error in history
     * @private
     */
    _recordError(error, context) {
        const entry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            type: this._classifyError(error),
            context: {
                itemId: context.itemId,
                stage: context.stage,
                attempt: context.attempt
            }
        };

        this.errorHistory.push(entry);

        // Keep history size manageable
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }
}

export default MCPErrorHandler;
