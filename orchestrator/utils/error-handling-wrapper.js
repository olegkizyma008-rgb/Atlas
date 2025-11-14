/**
 * @fileoverview Error Handling Wrapper - Unified error handling for async operations
 * Phase 7: Error Handling Enhancement
 * 
 * Provides reusable wrapper for consistent error handling, logging, and recovery
 * 
 * @version 1.0.0
 * @date 2025-11-14
 */

/**
 * Wraps async function with unified error handling
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} context - Context information (component, operation, etc.)
 * @param {Object} options - Configuration options
 * @returns {Promise} Result of function execution or recovery
 */
export async function withErrorHandling(
    fn,
    context = {},
    options = {}
) {
    const {
        retryCount = 0,
        retryDelay = 1000,
        fallback = null,
        logLevel = 'error',
        telemetry = true,
        timeout = null,
        logger = null
    } = options;

    const startTime = Date.now();

    try {
        // Execute with optional timeout
        if (timeout) {
            return await executeWithTimeout(fn, timeout);
        }
        return await fn();
    } catch (error) {
        const duration = Date.now() - startTime;

        // Log error
        if (logger) {
            logError(logger, error, context, logLevel, duration);
        }

        // Record telemetry
        if (telemetry) {
            recordErrorMetric(error, context, duration);
        }

        // Retry if configured
        if (retryCount > 0) {
            return await retryWithBackoff(
                fn,
                retryCount,
                retryDelay,
                context,
                logger
            );
        }

        // Use fallback if configured
        if (fallback) {
            if (logger) {
                logger.warn(
                    context.component || 'error-wrapper',
                    `Using fallback for ${context.operation || 'operation'}`,
                    { error: error.message }
                );
            }
            return await fallback(error, context);
        }

        // Re-throw if no recovery strategy
        throw error;
    }
}

/**
 * Wraps sync function with unified error handling
 * 
 * @param {Function} fn - Sync function to execute
 * @param {Object} context - Context information
 * @param {Object} options - Configuration options
 * @returns {*} Result of function execution or recovery
 */
export function withErrorHandlingSync(
    fn,
    context = {},
    options = {}
) {
    const {
        fallback = null,
        logLevel = 'error',
        telemetry = true,
        logger = null
    } = options;

    const startTime = Date.now();

    try {
        return fn();
    } catch (error) {
        const duration = Date.now() - startTime;

        // Log error
        if (logger) {
            logError(logger, error, context, logLevel, duration);
        }

        // Record telemetry
        if (telemetry) {
            recordErrorMetric(error, context, duration);
        }

        // Use fallback if configured
        if (fallback) {
            if (logger) {
                logger.warn(
                    context.component || 'error-wrapper',
                    `Using fallback for ${context.operation || 'operation'}`,
                    { error: error.message }
                );
            }
            return fallback(error, context);
        }

        // Re-throw if no recovery strategy
        throw error;
    }
}

/**
 * Executes function with timeout
 * 
 * @param {Function} fn - Function to execute
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Result or timeout error
 */
async function executeWithTimeout(fn, timeout) {
    return Promise.race([
        fn(),
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(`Operation timeout after ${timeout}ms`)),
                timeout
            )
        )
    ]);
}

/**
 * Retries function with exponential backoff
 * 
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {Object} context - Context information
 * @param {Object} logger - Logger instance
 * @returns {Promise} Result of successful execution
 */
async function retryWithBackoff(
    fn,
    maxAttempts,
    baseDelay,
    context,
    logger
) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (logger && attempt > 1) {
                logger.info(
                    context.component || 'error-wrapper',
                    `Retry attempt ${attempt}/${maxAttempts} for ${context.operation || 'operation'}`
                );
            }
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxAttempts) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Logs error with context
 * 
 * @param {Object} logger - Logger instance
 * @param {Error} error - Error object
 * @param {Object} context - Context information
 * @param {string} logLevel - Log level (error, warn, info)
 * @param {number} duration - Operation duration
 */
function logError(logger, error, context, logLevel, duration) {
    const message = `${context.operation || 'Operation'} failed`;
    const metadata = {
        error: error.message,
        errorType: error.constructor.name,
        duration: `${duration}ms`,
        ...context
    };

    if (logLevel === 'error') {
        logger.error(context.component || 'error-wrapper', message, metadata);
    } else if (logLevel === 'warn') {
        logger.warn(context.component || 'error-wrapper', message, metadata);
    } else {
        logger.info(context.component || 'error-wrapper', message, metadata);
    }
}

/**
 * Records error metric for telemetry
 * 
 * @param {Error} error - Error object
 * @param {Object} context - Context information
 * @param {number} duration - Operation duration
 */
function recordErrorMetric(error, context, duration) {
    // This would integrate with telemetry system
    // For now, it's a placeholder for future telemetry integration
    if (global.telemetry && typeof global.telemetry.recordError === 'function') {
        global.telemetry.recordError({
            error: error.message,
            errorType: error.constructor.name,
            component: context.component,
            operation: context.operation,
            duration
        });
    }
}

/**
 * Creates a wrapped version of a function
 * 
 * @param {Function} fn - Function to wrap
 * @param {Object} context - Context information
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped function
 */
export function createErrorHandledFunction(fn, context = {}, options = {}) {
    return async (...args) => {
        return withErrorHandling(
            () => fn(...args),
            context,
            options
        );
    };
}

/**
 * Creates a wrapped version of a sync function
 * 
 * @param {Function} fn - Function to wrap
 * @param {Object} context - Context information
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped function
 */
export function createErrorHandledFunctionSync(fn, context = {}, options = {}) {
    return (...args) => {
        return withErrorHandlingSync(
            () => fn(...args),
            context,
            options
        );
    };
}

export default {
    withErrorHandling,
    withErrorHandlingSync,
    createErrorHandledFunction,
    createErrorHandledFunctionSync
};
