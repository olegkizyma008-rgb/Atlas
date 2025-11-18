/**
 * @fileoverview FallbackHandler - Handles execution failures and fallbacks
 * Provides fallback strategies when primary execution fails
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Handles execution failures and provides fallback strategies
 * Responsibilities:
 * - Detect execution failures
 * - Select fallback strategy
 * - Execute fallback options
 * - Track fallback attempts
 */
export class FallbackHandler {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.toolExecutor - Tool executor instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.toolExecutor = options.toolExecutor;
        this.logger = options.logger || console;

        this.logger.system('fallback-handler', '✅ FallbackHandler initialized');
    }

    /**
     * Handle execution failure
     * @param {Object} item - TODO item
     * @param {Object} error - Error object
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Fallback result
     */
    async handle(item, error, context = {}) {
        const handlerId = this._generateHandlerId();

        this.logger.system('fallback-handler', `[${handlerId}] Handling execution failure`, {
            itemId: item.id,
            error: error?.message
        });

        try {
            // Step 1: Determine failure type
            const failureType = this._determineFailureType(error);

            // Step 2: Select fallback strategy
            const strategy = this._selectStrategy(item, failureType);

            this.logger.system('fallback-handler', `[${handlerId}] Selected strategy: ${strategy}`);

            // Step 3: Execute fallback
            let result;

            if (strategy === 'retry') {
                result = await this._executeRetry(item, context, handlerId);
            } else if (strategy === 'alternative') {
                result = await this._executeAlternative(item, context, handlerId);
            } else if (strategy === 'simplify') {
                result = await this._executeSimplified(item, context, handlerId);
            } else if (strategy === 'skip') {
                result = this._executeSkip(item, handlerId);
            } else {
                result = this._executeDefault(item, handlerId);
            }

            this.logger.system('fallback-handler', `[${handlerId}] Fallback handling completed`, {
                strategy,
                success: result.success
            });

            return result;

        } catch (error) {
            this.logger.error('fallback-handler', `[${handlerId}] Fallback handling failed`, {
                error: error.message
            });

            return {
                success: false,
                strategy: 'error',
                error: error.message,
                handlerId
            };
        }
    }

    /**
     * Determine failure type
     * @private
     */
    _determineFailureType(error) {
        if (!error) {
            return 'unknown';
        }

        const message = error.message?.toLowerCase() || '';

        if (message.includes('timeout')) {
            return 'timeout';
        }

        if (message.includes('not found') || message.includes('unavailable')) {
            return 'unavailable';
        }

        if (message.includes('invalid') || message.includes('bad')) {
            return 'invalid';
        }

        if (message.includes('permission') || message.includes('unauthorized')) {
            return 'permission';
        }

        if (message.includes('rate') || message.includes('limit')) {
            return 'rate_limit';
        }

        return 'unknown';
    }

    /**
     * Select fallback strategy
     * @private
     */
    _selectStrategy(item, failureType) {
        // Timeout: retry with longer timeout
        if (failureType === 'timeout') {
            return 'retry';
        }

        // Unavailable: try alternative tools
        if (failureType === 'unavailable') {
            return 'alternative';
        }

        // Invalid: simplify the request
        if (failureType === 'invalid') {
            return 'simplify';
        }

        // Permission: skip or simplify
        if (failureType === 'permission') {
            return 'simplify';
        }

        // Rate limit: retry with backoff
        if (failureType === 'rate_limit') {
            return 'retry';
        }

        // Unknown: try alternative
        return 'alternative';
    }

    /**
     * Execute retry strategy
     * @private
     */
    async _executeRetry(item, context, handlerId) {
        try {
            this.logger.system('fallback-handler', `[${handlerId}] Executing retry strategy`);

            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, context.attempt || 0), 10000);
            await this._delay(delay);

            // Retry execution
            if (this.toolExecutor && this.toolExecutor.execute) {
                const result = await this.toolExecutor.execute(item, context.plan, context.session);
                return {
                    success: result.success,
                    strategy: 'retry',
                    result,
                    handlerId
                };
            }

            return {
                success: false,
                strategy: 'retry',
                error: 'Tool executor not available',
                handlerId
            };

        } catch (error) {
            this.logger.warn('fallback-handler', `[${handlerId}] Retry failed: ${error.message}`);

            return {
                success: false,
                strategy: 'retry',
                error: error.message,
                handlerId
            };
        }
    }

    /**
     * Execute alternative strategy
     * @private
     */
    async _executeAlternative(item, context, handlerId) {
        try {
            this.logger.system('fallback-handler', `[${handlerId}] Executing alternative strategy`);

            // Use fallback options if available
            if (item.fallback_options && item.fallback_options.length > 0) {
                const fallbackOption = item.fallback_options[0];

                this.logger.system('fallback-handler', `[${handlerId}] Using fallback option: ${fallbackOption}`);

                return {
                    success: true,
                    strategy: 'alternative',
                    result: {
                        method: 'fallback_option',
                        option: fallbackOption
                    },
                    handlerId
                };
            }

            return {
                success: false,
                strategy: 'alternative',
                error: 'No fallback options available',
                handlerId
            };

        } catch (error) {
            this.logger.warn('fallback-handler', `[${handlerId}] Alternative failed: ${error.message}`);

            return {
                success: false,
                strategy: 'alternative',
                error: error.message,
                handlerId
            };
        }
    }

    /**
     * Execute simplified strategy
     * @private
     */
    async _executeSimplified(item, context, handlerId) {
        try {
            this.logger.system('fallback-handler', `[${handlerId}] Executing simplified strategy`);

            // Simplify the item
            const simplifiedItem = {
                ...item,
                parameters: {},
                action: item.action.substring(0, 50) // Truncate action
            };

            if (this.toolExecutor && this.toolExecutor.execute) {
                const result = await this.toolExecutor.execute(simplifiedItem, context.plan, context.session);
                return {
                    success: result.success,
                    strategy: 'simplify',
                    result,
                    handlerId
                };
            }

            return {
                success: false,
                strategy: 'simplify',
                error: 'Tool executor not available',
                handlerId
            };

        } catch (error) {
            this.logger.warn('fallback-handler', `[${handlerId}] Simplify failed: ${error.message}`);

            return {
                success: false,
                strategy: 'simplify',
                error: error.message,
                handlerId
            };
        }
    }

    /**
     * Execute skip strategy
     * @private
     */
    _executeSkip(item, handlerId) {
        this.logger.system('fallback-handler', `[${handlerId}] Executing skip strategy`);

        return {
            success: true,
            strategy: 'skip',
            result: {
                message: 'Item skipped due to execution failure',
                itemId: item.id
            },
            handlerId
        };
    }

    /**
     * Execute default strategy
     * @private
     */
    _executeDefault(item, handlerId) {
        this.logger.system('fallback-handler', `[${handlerId}] Executing default strategy`);

        return {
            success: false,
            strategy: 'default',
            error: 'No suitable fallback strategy found',
            handlerId
        };
    }

    /**
     * Delay execution
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique handler ID
     * @private
     */
    _generateHandlerId() {
        return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default FallbackHandler;
