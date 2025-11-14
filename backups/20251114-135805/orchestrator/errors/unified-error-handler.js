/**
 * Unified Error Handler
 * Consolidated error handling with intelligent pattern matching and learning
 * 
 * Combines:
 * - Basic strategy pattern from error-handler.js
 * - Intelligent pattern matching from intelligent-error-handler.js
 * - Learning system for continuous improvement
 * 
 * @version 2.0.0
 * @date 2025-11-14
 */

import stateManager from '../state/state-manager.js';
import logger from '../utils/logger.js';

/**
 * Error patterns for intelligent detection
 */
const ERROR_PATTERNS = {
    HTTP_500: {
        pattern: /status code 500|500 Internal Server Error/i,
        category: 'network',
        severity: 'high',
        solutions: [
            { type: 'retry', config: { attempts: 3, backoff: 'exponential' } },
            { type: 'fallback', config: { endpoint: 'secondary' } },
            { type: 'cache', config: { ttl: 300000 } }
        ]
    },

    JSON_PARSE: {
        pattern: /JSON parse failed|Unexpected token|Unexpected end of JSON/i,
        category: 'parsing',
        severity: 'medium',
        solutions: [
            { type: 'sanitize', config: { method: 'fix_quotes' } },
            { type: 'extract', config: { method: 'regex_json' } }
        ]
    },

    TIMEOUT: {
        pattern: /timeout|timed out|ETIMEDOUT/i,
        category: 'network',
        severity: 'medium',
        solutions: [
            { type: 'increase_timeout', config: { multiplier: 1.5 } },
            { type: 'retry', config: { attempts: 2, backoff: 'linear' } },
            { type: 'split_request', config: { chunks: 2 } }
        ]
    },

    CONNECTION_ERROR: {
        pattern: /connection.*refused|ECONNREFUSED|socket hang up/i,
        category: 'network',
        severity: 'high',
        solutions: [
            { type: 'retry', config: { attempts: 3, backoff: 'exponential' } },
            { type: 'fallback', config: { endpoint: 'secondary' } }
        ]
    },

    DEPENDENCY_BLOCKED: {
        pattern: /blocked.*dependencies|Dependencies not completed/i,
        category: 'workflow',
        severity: 'low',
        solutions: [
            { type: 'resolve_deps', config: { method: 'auto_update' } },
            { type: 'skip_optional', config: { threshold: 5 } }
        ]
    },

    UNDEFINED_REFERENCE: {
        pattern: /undefined|null reference|Cannot read property/i,
        category: 'code',
        severity: 'high',
        solutions: [
            { type: 'safe_access', config: { method: 'optional_chaining' } },
            { type: 'validate_input', config: { strict: true } }
        ]
    }
};

/**
 * Error history for learning
 */
class ErrorHistory {
    constructor() {
        this.history = new Map();
        this.successfulSolutions = new Map();
    }

    record(error, solution, success) {
        const key = this.getErrorKey(error);
        if (!this.history.has(key)) {
            this.history.set(key, []);
        }

        this.history.get(key).push({
            timestamp: Date.now(),
            error: error.message,
            solution,
            success
        });

        if (success) {
            const solutionKey = `${key}:${solution.type}`;
            this.successfulSolutions.set(
                solutionKey,
                (this.successfulSolutions.get(solutionKey) || 0) + 1
            );
        }
    }

    getErrorKey(error) {
        const pattern = this.detectPattern(error);
        return pattern ? pattern.name : 'unknown';
    }

    detectPattern(error) {
        const errorStr = error.message || error.toString();
        for (const [name, pattern] of Object.entries(ERROR_PATTERNS)) {
            if (pattern.pattern.test(errorStr)) {
                return { name, ...pattern };
            }
        }
        return null;
    }

    getBestSolution(error) {
        const key = this.getErrorKey(error);
        const solutions = [];

        for (const [solutionKey, count] of this.successfulSolutions.entries()) {
            if (solutionKey.startsWith(`${key}:`)) {
                const solutionType = solutionKey.split(':')[1];
                solutions.push({ type: solutionType, successCount: count });
            }
        }

        solutions.sort((a, b) => b.successCount - a.successCount);
        return solutions[0];
    }
}

/**
 * Unified Error Handler
 */
class UnifiedErrorHandler {
    constructor(options = {}) {
        this.history = new ErrorHistory();
        this.errorStrategies = new Map();
        this.learningEnabled = options.learningEnabled !== false;

        // Metrics
        this.metrics = {
            totalErrors: 0,
            resolvedErrors: 0,
            failedResolutions: 0,
            patternMatches: 0,
            learningImprovements: 0
        };

        this.registerDefaultStrategies();
    }

    /**
     * Register default error strategies
     */
    registerDefaultStrategies() {
        this.registerStrategy('CONNECTION_ERROR', this.handleConnectionError.bind(this));
        this.registerStrategy('TIMEOUT_ERROR', this.handleTimeoutError.bind(this));
        this.registerStrategy('INVALID_INPUT', this.handleInvalidInput.bind(this));
        this.registerStrategy('AGENT_FAILURE', this.handleAgentFailure.bind(this));
        this.registerStrategy('DEFAULT', this.handleGenericError.bind(this));
    }

    /**
     * Register custom error strategy
     */
    registerStrategy(errorType, strategyFn) {
        this.errorStrategies.set(errorType, strategyFn);
    }

    /**
     * Analyze error and detect pattern
     */
    analyzeError(error, context = {}) {
        this.metrics.totalErrors++;

        const errorStr = error.message || error.toString();
        logger.system('unified-error', `🔍 Analyzing error: ${errorStr.substring(0, 100)}`);

        // Find matching pattern
        for (const [name, pattern] of Object.entries(ERROR_PATTERNS)) {
            if (pattern.pattern.test(errorStr)) {
                this.metrics.patternMatches++;
                logger.system('unified-error', `✅ Matched pattern: ${name}`);

                return {
                    type: name,
                    category: pattern.category,
                    severity: pattern.severity,
                    solutions: pattern.solutions,
                    context,
                    original: error
                };
            }
        }

        // Unknown error
        logger.warn('unified-error', `⚠️ Unknown error pattern: ${errorStr.substring(0, 100)}`);
        return {
            type: 'UNKNOWN',
            category: 'unknown',
            severity: 'medium',
            solutions: [
                { type: 'log', config: {} },
                { type: 'retry', config: { attempts: 1 } }
            ],
            context,
            original: error
        };
    }

    /**
     * Main error handling method
     */
    async handleError(error, context = {}) {
        const errorType = error.type || 'DEFAULT';
        const strategy = this.errorStrategies.get(errorType) || this.errorStrategies.get('DEFAULT');

        // Log error
        logger.error(`Error [${errorType}]: ${error.message}`, {
            stage: context.stage,
            errorDetails: error
        });

        // Store in state history
        stateManager.pushToHistory({
            type: 'ERROR',
            errorType,
            message: error.message,
            context
        });

        // Update state with error info
        stateManager.updateState({
            lastError: {
                type: errorType,
                message: error.message,
                timestamp: new Date().toISOString(),
                context
            }
        });

        // Try intelligent resolution first
        if (this.learningEnabled) {
            const analysis = this.analyzeError(error, context);
            const bestSolution = this.history.getBestSolution(error);

            if (bestSolution) {
                logger.system('unified-error',
                    `🎯 Using learned solution: ${bestSolution.type} (${bestSolution.successCount} successes)`);

                const result = await this.applySolution(bestSolution, analysis);
                if (result.success) {
                    this.metrics.learningImprovements++;
                    this.metrics.resolvedErrors++;
                    return result;
                }
            }
        }

        // Fall back to strategy
        return strategy.call(this, error, context);
    }

    /**
     * Apply solution to error
     */
    async applySolution(solution, analysis) {
        try {
            switch (solution.type) {
                case 'retry':
                    return await this.retryWithBackoff(analysis, solution.config);
                case 'fallback':
                    return await this.useFallback(analysis, solution.config);
                case 'cache':
                    return await this.useCache(analysis, solution.config);
                case 'sanitize':
                    return await this.sanitizeData(analysis, solution.config);
                case 'extract':
                    return await this.extractData(analysis, solution.config);
                default:
                    return { success: false, reason: `Unknown solution type: ${solution.type}` };
            }
        } catch (error) {
            logger.error('unified-error', `Solution ${solution.type} failed: ${error.message}`);
            return { success: false, error };
        }
    }

    /**
     * Retry with backoff
     */
    async retryWithBackoff(analysis, config) {
        const { attempts = 3, backoff = 'exponential' } = config;
        const baseDelay = 1000;

        for (let i = 0; i < attempts; i++) {
            try {
                if (analysis.context.retryFunction) {
                    const result = await analysis.context.retryFunction();
                    return { success: true, result };
                }
            } catch (error) {
                if (i === attempts - 1) throw error;

                const delay = backoff === 'exponential'
                    ? baseDelay * Math.pow(2, i)
                    : baseDelay * (i + 1);

                logger.system('unified-error', `Retry ${i + 1}/${attempts} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return { success: false, reason: 'Max retries exceeded' };
    }

    /**
     * Use fallback
     */
    async useFallback(analysis, config) {
        if (analysis.context.fallbackFunction) {
            const result = await analysis.context.fallbackFunction();
            return { success: true, result, fallback: true };
        }
        return { success: false, reason: 'No fallback available' };
    }

    /**
     * Use cache
     */
    async useCache(analysis, config) {
        if (analysis.context.cache) {
            const cached = analysis.context.cache.get(analysis.context.cacheKey);
            if (cached) {
                return { success: true, result: cached, fromCache: true };
            }
        }
        return { success: false, reason: 'No cache available' };
    }

    /**
     * Sanitize data
     */
    async sanitizeData(analysis, config) {
        if (analysis.context.data) {
            let sanitized = analysis.context.data;

            if (config.method === 'fix_quotes') {
                sanitized = sanitized.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
            }

            return { success: true, result: sanitized, sanitized: true };
        }
        return { success: false, reason: 'No data to sanitize' };
    }

    /**
     * Extract data
     */
    async extractData(analysis, config) {
        if (analysis.context.data && config.method === 'regex_json') {
            const match = analysis.context.data.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    const extracted = JSON.parse(match[0]);
                    return { success: true, result: extracted, extracted: true };
                } catch (e) {
                    // Continue to next solution
                }
            }
        }
        return { success: false, reason: 'Could not extract data' };
    }

    /**
     * Default error strategies
     */
    async handleConnectionError(error, context) {
        logger.info('Attempting connection recovery...');
        return { action: 'RETRY', delay: 2000 };
    }

    async handleTimeoutError(error, context) {
        return { action: 'RETRY', delay: 5000 };
    }

    async handleInvalidInput(error, context) {
        return { action: 'REQUEST_CLARIFICATION', details: error.details };
    }

    async handleAgentFailure(error, context) {
        return { action: 'FALLBACK_AGENT', agent: 'fallback' };
    }

    async handleGenericError(error, context) {
        return { action: 'NOTIFY', severity: 'HIGH' };
    }

    /**
     * Get metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalErrors > 0
                ? (this.metrics.resolvedErrors / this.metrics.totalErrors * 100).toFixed(2) + '%'
                : '0%',
            learningEffectiveness: this.metrics.learningImprovements > 0
                ? (this.metrics.learningImprovements / this.metrics.resolvedErrors * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            totalErrors: 0,
            resolvedErrors: 0,
            failedResolutions: 0,
            patternMatches: 0,
            learningImprovements: 0
        };
    }
}

export default new UnifiedErrorHandler({
    learningEnabled: true
});
