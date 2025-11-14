/**
 * BASE PROCESSOR CLASS
 * Template for all workflow stage processors
 * Reduces code duplication and ensures consistent patterns
 *
 * @version 1.0.0
 * @date 2025-11-14
 */

import logger from '../../utils/logger.js';

/**
 * Abstract base class for workflow processors
 */
export class BaseProcessor {
    /**
     * @param {Object} options - Processor options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.diContainer - DI Container
     * @param {string} options.stageName - Stage name
     * @param {string} options.agentName - Agent name
     */
    constructor(options = {}) {
        this.logger = options.logger || logger;
        this.diContainer = options.diContainer;
        this.stageName = options.stageName || this.constructor.name;
        this.agentName = options.agentName || 'system';
        this.metrics = {
            startTime: null,
            endTime: null,
            duration: 0,
            success: false,
            retries: 0
        };
    }

    /**
     * Main process method - override in subclasses
     * @param {Object} input - Input data
     * @returns {Promise<Object>} Processing result
     */
    async process(input) {
        throw new Error('process() must be implemented in subclass');
    }

    /**
     * Execute processor with error handling and metrics
     * @param {Object} input - Input data
     * @returns {Promise<Object>} Result with metadata
     */
    async execute(input) {
        this.metrics.startTime = Date.now();

        try {
            this.logger.debug(`[${this.stageName}] Starting`, {
                agent: this.agentName,
                inputKeys: Object.keys(input || {})
            });

            const result = await this.process(input);

            this.metrics.endTime = Date.now();
            this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
            this.metrics.success = true;

            this.logger.debug(`[${this.stageName}] Completed`, {
                agent: this.agentName,
                duration: this.metrics.duration,
                resultKeys: Object.keys(result || {})
            });

            return {
                success: true,
                data: result,
                metadata: { ...this.metrics }
            };
        } catch (error) {
            this.metrics.endTime = Date.now();
            this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
            this.metrics.success = false;

            this.logger.error(`[${this.stageName}] Failed`, {
                agent: this.agentName,
                error: error.message,
                duration: this.metrics.duration
            });

            throw error;
        }
    }

    /**
     * Validate input data
     * @param {Object} input - Input to validate
     * @param {Array<string>} requiredFields - Required field names
     * @returns {boolean} True if valid
     * @throws {Error} If validation fails
     */
    validateInput(input, requiredFields = []) {
        if (!input || typeof input !== 'object') {
            throw new Error(`${this.stageName}: Invalid input type`);
        }

        for (const field of requiredFields) {
            if (!(field in input)) {
                throw new Error(`${this.stageName}: Missing required field: ${field}`);
            }
        }

        return true;
    }

    /**
     * Get service from DI container
     * @param {string} serviceName - Service name
     * @returns {*} Service instance
     */
    getService(serviceName) {
        if (!this.diContainer) {
            throw new Error(`${this.stageName}: DI Container not available`);
        }

        try {
            return this.diContainer.resolve(serviceName);
        } catch (error) {
            this.logger.error(`${this.stageName}: Failed to resolve service`, {
                service: serviceName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Log stage progress
     * @param {string} message - Progress message
     * @param {Object} data - Additional data
     */
    logProgress(message, data = {}) {
        this.logger.info(`[${this.stageName}] ${message}`, {
            agent: this.agentName,
            ...data
        });
    }

    /**
     * Log stage warning
     * @param {string} message - Warning message
     * @param {Object} data - Additional data
     */
    logWarning(message, data = {}) {
        this.logger.warn(`[${this.stageName}] ${message}`, {
            agent: this.agentName,
            ...data
        });
    }

    /**
     * Get metrics
     * @returns {Object} Processor metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            startTime: null,
            endTime: null,
            duration: 0,
            success: false,
            retries: 0
        };
    }
}

/**
 * Async processor with retry support
 */
export class AsyncProcessor extends BaseProcessor {
    /**
     * @param {Object} options - Processor options
     * @param {number} options.maxRetries - Maximum retry attempts
     * @param {number} options.retryDelay - Delay between retries in ms
     */
    constructor(options = {}) {
        super(options);
        this.maxRetries = options.maxRetries || 2;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * Execute with automatic retry
     * @param {Object} input - Input data
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Object>} Result
     */
    async executeWithRetry(input, attempt = 1) {
        try {
            return await this.execute(input);
        } catch (error) {
            if (attempt < this.maxRetries) {
                this.metrics.retries++;
                this.logWarning(`Retry attempt ${attempt}/${this.maxRetries}`, {
                    error: error.message
                });

                await this.delay(this.retryDelay * attempt);
                return this.executeWithRetry(input, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Processor with caching support
 */
export class CachedProcessor extends BaseProcessor {
    constructor(options = {}) {
        super(options);
        this.cache = new Map();
        this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get cache key from input
     * @param {Object} input - Input data
     * @returns {string} Cache key
     */
    getCacheKey(input) {
        return JSON.stringify(input);
    }

    /**
     * Get cached result if available
     * @param {Object} input - Input data
     * @returns {Object|null} Cached result or null
     */
    getCached(input) {
        const key = this.getCacheKey(input);
        const cached = this.cache.get(key);

        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            this.logProgress('Cache hit');
            return cached.result;
        }

        if (cached) {
            this.cache.delete(key);
        }

        return null;
    }

    /**
     * Cache result
     * @param {Object} input - Input data
     * @param {Object} result - Result to cache
     */
    setCached(input, result) {
        const key = this.getCacheKey(input);
        this.cache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

export default BaseProcessor;
