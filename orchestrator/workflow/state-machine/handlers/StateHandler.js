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
     * Log handler warning
     * 
     * @protected
     * @param {string} message - Warning message
     * @param {Object} data - Log data
     */
    _logWarn(message, data = {}) {
        this.logger.warn(`[${this.name}] ${message}`, data);
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
            code: error.code,
            stack: error.stack
        });
    }

    /**
     * Log debug information
     * 
     * @protected
     * @param {string} message - Debug message
     * @param {Object} data - Log data
     */
    _logDebug(message, data = {}) {
        if (this.logger.debug) {
            this.logger.debug(`[${this.name}] ${message}`, data);
        }
    }

    /**
     * Get processor with error handling
     * 
     * @protected
     * @param {string} processorName - Processor name
     * @returns {Object} Processor instance
     * @throws {Error} If processor not found
     */
    _getProcessor(processorName) {
        const processor = this.processors[processorName];
        if (!processor) {
            const error = new Error(`Processor not found: ${processorName}`);
            error.code = 'PROCESSOR_NOT_FOUND';
            error.processorName = processorName;
            error.availableProcessors = Object.keys(this.processors);
            this._logError(`Processor not found: ${processorName}`, error);
            throw error;
        }
        return processor;
    }

    /**
     * Validate context has required fields
     * 
     * @protected
     * @param {Object} context - Context to validate
     * @param {Array<string>} requiredFields - Required field names
     * @returns {boolean} True if all required fields present
     * @throws {Error} If required fields missing
     */
    _validateContext(context, requiredFields = []) {
        const missing = requiredFields.filter(field => !context[field]);
        if (missing.length > 0) {
            const error = new Error(`Missing required context fields: ${missing.join(', ')}`);
            error.code = 'INVALID_CONTEXT';
            error.missing = missing;
            error.required = requiredFields;
            this._logError(`Invalid context`, error);
            throw error;
        }
        return true;
    }
}

export default StateHandler;
