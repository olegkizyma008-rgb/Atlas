/**
 * @fileoverview Error Recovery Strategies - Reusable recovery patterns
 * Phase 7: Error Handling Enhancement
 * 
 * Provides common error recovery strategies:
 * - Retry with exponential backoff
 * - Fallback to alternative implementation
 * - Circuit breaker pattern
 * - Timeout handling
 * 
 * @version 1.0.0
 * @date 2025-11-14
 */

/**
 * Retry strategy with exponential backoff
 * 
 * @param {Function} fn - Function to retry
 * @param {Object} options - Configuration options
 * @returns {Promise} Result of successful execution
 */
export async function retryStrategy(fn, options = {}) {
    const {
        maxAttempts = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        backoffMultiplier = 2,
        logger = null
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (logger && attempt > 1) {
                logger.info(
                    'retry-strategy',
                    `Retry attempt ${attempt}/${maxAttempts}`
                );
            }
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxAttempts) {
                const delay = Math.min(
                    baseDelay * Math.pow(backoffMultiplier, attempt - 1),
                    maxDelay
                );
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Fallback strategy - try primary, fallback to alternative
 * 
 * @param {Function} primaryFn - Primary function
 * @param {Function} fallbackFn - Fallback function
 * @param {Object} options - Configuration options
 * @returns {Promise} Result of primary or fallback
 */
export async function fallbackStrategy(primaryFn, fallbackFn, options = {}) {
    const { logger = null } = options;

    try {
        return await primaryFn();
    } catch (error) {
        if (logger) {
            logger.warn(
                'fallback-strategy',
                'Primary failed, using fallback',
                { error: error.message }
            );
        }
        return await fallbackFn(error);
    }
}

/**
 * Circuit breaker pattern - prevent cascading failures
 * 
 * @param {Function} fn - Function to protect
 * @param {Object} options - Configuration options
 * @returns {Function} Protected function
 */
export function circuitBreakerStrategy(fn, options = {}) {
    const {
        failureThreshold = 5,
        successThreshold = 2,
        timeout = 60000,
        logger = null
    } = options;

    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    let failureCount = 0;
    let successCount = 0;
    let lastFailureTime = null;

    return async (...args) => {
        // Check if circuit should transition from OPEN to HALF_OPEN
        if (state === 'OPEN') {
            if (Date.now() - lastFailureTime > timeout) {
                state = 'HALF_OPEN';
                successCount = 0;
                if (logger) {
                    logger.info('circuit-breaker', 'Circuit transitioned to HALF_OPEN');
                }
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn(...args);

            // Handle success
            if (state === 'HALF_OPEN') {
                successCount++;
                if (successCount >= successThreshold) {
                    state = 'CLOSED';
                    failureCount = 0;
                    if (logger) {
                        logger.info('circuit-breaker', 'Circuit transitioned to CLOSED');
                    }
                }
            } else if (state === 'CLOSED') {
                failureCount = 0;
            }

            return result;
        } catch (error) {
            // Handle failure
            failureCount++;
            lastFailureTime = Date.now();

            if (failureCount >= failureThreshold && state === 'CLOSED') {
                state = 'OPEN';
                if (logger) {
                    logger.warn(
                        'circuit-breaker',
                        'Circuit transitioned to OPEN',
                        { failureCount }
                    );
                }
            }

            if (state === 'HALF_OPEN') {
                state = 'OPEN';
                if (logger) {
                    logger.warn('circuit-breaker', 'Circuit transitioned to OPEN');
                }
            }

            throw error;
        }
    };
}

/**
 * Timeout strategy - fail if operation takes too long
 * 
 * @param {Function} fn - Function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {Object} options - Configuration options
 * @returns {Promise} Result or timeout error
 */
export async function timeoutStrategy(fn, timeoutMs, options = {}) {
    const { logger = null } = options;

    return Promise.race([
        fn(),
        new Promise((_, reject) => {
            setTimeout(() => {
                const error = new Error(`Operation timeout after ${timeoutMs}ms`);
                if (logger) {
                    logger.warn('timeout-strategy', error.message);
                }
                reject(error);
            }, timeoutMs);
        })
    ]);
}

/**
 * Bulkhead strategy - limit concurrent executions
 * 
 * @param {Function} fn - Function to execute
 * @param {Object} options - Configuration options
 * @returns {Function} Protected function
 */
export function bulkheadStrategy(fn, options = {}) {
    const {
        maxConcurrent = 10,
        maxQueueSize = 100,
        logger = null
    } = options;

    let currentCount = 0;
    const queue = [];

    return async (...args) => {
        if (currentCount >= maxConcurrent) {
            if (queue.length >= maxQueueSize) {
                throw new Error('Bulkhead queue is full');
            }

            // Wait for slot to become available
            await new Promise((resolve, reject) => {
                queue.push({ resolve, reject });
            });
        }

        currentCount++;

        try {
            return await fn(...args);
        } finally {
            currentCount--;

            // Process next item in queue
            if (queue.length > 0) {
                const { resolve } = queue.shift();
                resolve();
            }
        }
    };
}

/**
 * Compose multiple strategies
 * 
 * @param {Function} fn - Function to protect
 * @param {Array} strategies - Array of strategy configurations
 * @returns {Function} Protected function with all strategies
 */
export function composeStrategies(fn, strategies = []) {
    let protectedFn = fn;

    // Apply strategies in reverse order (last strategy is innermost)
    for (let i = strategies.length - 1; i >= 0; i--) {
        const { name, options } = strategies[i];

        switch (name) {
            case 'retry':
                protectedFn = (...args) => retryStrategy(() => protectedFn(...args), options);
                break;

            case 'circuitBreaker':
                protectedFn = circuitBreakerStrategy(protectedFn, options);
                break;

            case 'timeout':
                protectedFn = (...args) => timeoutStrategy(() => protectedFn(...args), options.timeoutMs, options);
                break;

            case 'bulkhead':
                protectedFn = bulkheadStrategy(protectedFn, options);
                break;

            default:
                // Unknown strategy, skip
                break;
        }
    }

    return protectedFn;
}

/**
 * Create a resilient function with multiple strategies
 * 
 * @param {Function} fn - Function to protect
 * @param {Object} config - Configuration object
 * @returns {Function} Resilient function
 */
export function createResilientFunction(fn, config = {}) {
    const {
        retry = { maxAttempts: 3, baseDelay: 1000 },
        circuitBreaker = { failureThreshold: 5 },
        timeout = null,
        bulkhead = null,
        logger = null
    } = config;

    const strategies = [];

    if (retry) {
        strategies.push({ name: 'retry', options: { ...retry, logger } });
    }

    if (circuitBreaker) {
        strategies.push({ name: 'circuitBreaker', options: { ...circuitBreaker, logger } });
    }

    if (timeout) {
        strategies.push({ name: 'timeout', options: { ...timeout, logger } });
    }

    if (bulkhead) {
        strategies.push({ name: 'bulkhead', options: { ...bulkhead, logger } });
    }

    return composeStrategies(fn, strategies);
}

export default {
    retryStrategy,
    fallbackStrategy,
    circuitBreakerStrategy,
    timeoutStrategy,
    bulkheadStrategy,
    composeStrategies,
    createResilientFunction
};
