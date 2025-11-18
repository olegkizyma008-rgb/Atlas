/**
 * StateHandler
 * 
 * Base class for all state handlers
 * Provides common interface and utilities for state execution
 * 
 * @abstract
 * @class StateHandler
 */
class StateHandler {
    /**
     * Constructor
     * 
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.processors - Processors object
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.processors = options.processors || {};
        this.name = this.constructor.name;
    }

    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return true;
    }

    /**
     * Execute handler
     * 
     * @abstract
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Handler result
     */
    async execute(context, data) {
        throw new Error(`${this.name}.execute() not implemented`);
    }

    /**
     * Rollback handler execution
     * 
     * @param {Object} context - State machine context
     * @param {Object} result - Previous execution result
     * @returns {Promise<void>}
     */
    async rollback(context, result) {
        // Override in subclass if needed
    }

    /**
     * Log handler execution
     * 
     * @protected
     * @param {string} message - Log message
     * @param {Object} data - Log data
     */
    _log(message, data = {}) {
        this.logger.info(`[${this.name}] ${message}`, data);
    }

    /**
     * Log handler error
     * 
     * @protected
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    _logError(message, error) {
        this.logger.error(`[${this.name}] ${message}`, {
            error: error.message,
            stack: error.stack
        });
    }

    /**
     * Get processor
     * 
     * @protected
     * @param {string} processorName - Processor name
     * @returns {Object} Processor instance
     */
    _getProcessor(processorName) {
        const processor = this.processors[processorName];
        if (!processor) {
            throw new Error(`Processor not found: ${processorName}`);
        }
        return processor;
    }
}

module.exports = StateHandler;
