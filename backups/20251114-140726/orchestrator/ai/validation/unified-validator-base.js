/**
 * Unified Validator Base Class
 * Common interface for all validators with metrics and error handling
 * 
 * @version 1.0.0
 * @date 2025-11-14
 */

import logger from '../../utils/logger.js';

/**
 * Base class for all validators
 */
export class UnifiedValidatorBase {
    constructor(name, options = {}) {
        this.name = name;
        this.config = options.config || {};
        this.enabled = options.enabled !== false;

        // Metrics
        this.metrics = {
            validations: 0,
            successes: 0,
            failures: 0,
            avgDuration: 0,
            errors: []
        };

        logger.debug(`${name}-validator`, `Initialized (enabled: ${this.enabled})`);
    }

    /**
     * Main validation method - must be implemented by subclasses
     */
    async validate(toolCalls, context = {}) {
        throw new Error(`${this.name} validator must implement validate() method`);
    }

    /**
     * Record validation metrics
     */
    recordMetrics(duration, success, error = null) {
        this.metrics.validations++;

        if (success) {
            this.metrics.successes++;
        } else {
            this.metrics.failures++;
            if (error) {
                this.metrics.errors.push({
                    timestamp: Date.now(),
                    error: error.message || error
                });
            }
        }

        // Keep only last 100 errors
        if (this.metrics.errors.length > 100) {
            this.metrics.errors.shift();
        }

        // Update average duration
        const totalDuration = this.metrics.validations;
        this.metrics.avgDuration = Math.round(
            (this.metrics.avgDuration * (totalDuration - 1) + duration) / totalDuration
        );
    }

    /**
     * Get validator metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.validations > 0
                ? (this.metrics.successes / this.metrics.validations * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            validations: 0,
            successes: 0,
            failures: 0,
            avgDuration: 0,
            errors: []
        };
    }

    /**
     * Format validation result
     */
    formatResult(valid, errors = [], warnings = [], corrections = [], correctedCalls = null) {
        return {
            valid,
            errors: errors || [],
            warnings: warnings || [],
            corrections: corrections || [],
            correctedCalls: correctedCalls || null
        };
    }

    /**
     * Create error object
     */
    createError(type, message, details = {}) {
        return {
            type,
            message,
            ...details
        };
    }

    /**
     * Create warning object
     */
    createWarning(type, message, details = {}) {
        return {
            type,
            message,
            ...details
        };
    }

    /**
     * Create correction object
     */
    createCorrection(type, message, details = {}) {
        return {
            type,
            message,
            ...details
        };
    }
}

/**
 * Consolidated Structure Validator
 * Combines format and schema validation
 */
export class StructureValidator extends UnifiedValidatorBase {
    constructor(options = {}) {
        super('structure', options);
        this.toolNameNormalizer = options.toolNameNormalizer;
    }

    async validate(toolCalls, context = {}) {
        const startTime = Date.now();
        const errors = [];
        const warnings = [];
        const corrections = [];

        try {
            for (let i = 0; i < toolCalls.length; i++) {
                const call = toolCalls[i];

                // Check 1: Tool name format
                if (!this.validateToolNameFormat(call)) {
                    errors.push(this.createError(
                        'invalid_tool_name_format',
                        `Invalid tool name format: ${call.tool}`,
                        { index: i, toolCall: call }
                    ));
                }

                // Check 2: Required parameters
                if (!this.validateRequiredParameters(call)) {
                    errors.push(this.createError(
                        'missing_required_parameters',
                        `Missing required parameters for tool: ${call.tool}`,
                        { index: i, toolCall: call }
                    ));
                }

                // Check 3: Parameter types
                const typeErrors = this.validateParameterTypes(call);
                if (typeErrors.length > 0) {
                    warnings.push(...typeErrors.map(e => ({
                        ...e,
                        index: i
                    })));
                }
            }

            const duration = Date.now() - startTime;
            const success = errors.length === 0;
            this.recordMetrics(duration, success, errors.length > 0 ? errors[0] : null);

            return this.formatResult(success, errors, warnings, corrections);
        } catch (error) {
            logger.error('structure-validator', `Validation error: ${error.message}`);
            this.recordMetrics(Date.now() - startTime, false, error);
            return this.formatResult(false, [this.createError('validation_error', error.message)]);
        }
    }

    validateToolNameFormat(call) {
        if (!call.tool || typeof call.tool !== 'string') return false;
        if (!call.server || typeof call.server !== 'string') return false;

        // Tool name should be alphanumeric with underscores
        const toolNamePattern = /^[a-zA-Z0-9_]+$/;
        return toolNamePattern.test(call.tool) && toolNamePattern.test(call.server);
    }

    validateRequiredParameters(call) {
        // Check if parameters object exists
        if (!call.parameters || typeof call.parameters !== 'object') {
            return !call.requiresParameters;
        }
        return true;
    }

    validateParameterTypes(call) {
        const warnings = [];

        if (!call.parameters || typeof call.parameters !== 'object') {
            return warnings;
        }

        // Basic type checking
        for (const [key, value] of Object.entries(call.parameters)) {
            if (value === null || value === undefined) {
                warnings.push(this.createWarning(
                    'null_parameter',
                    `Parameter '${key}' is null or undefined`,
                    { parameter: key }
                ));
            }
        }

        return warnings;
    }
}

/**
 * Consolidated History Validator
 * Combines history and success rate validation
 */
export class HistoryValidator extends UnifiedValidatorBase {
    constructor(historyManager, options = {}) {
        super('history', options);
        this.historyManager = historyManager;
    }

    async validate(toolCalls, context = {}) {
        const startTime = Date.now();
        const errors = [];
        const warnings = [];

        try {
            for (let i = 0; i < toolCalls.length; i++) {
                const call = toolCalls[i];

                // Check 1: Repetition after failures
                const repetition = this.historyManager?.checkRepetitionAfterFailure?.(
                    call,
                    this.config.antiRepetitionWindow || 100
                );

                if (repetition?.blocked) {
                    errors.push(this.createError(
                        'repetition_after_failure',
                        `Tool failed ${repetition.count} times recently`,
                        {
                            index: i,
                            toolCall: call,
                            failureCount: repetition.count,
                            lastError: repetition.lastError
                        }
                    ));
                }

                // Check 2: Low success rate
                const successRate = this.historyManager?.getToolSuccessRate?.(
                    call.server,
                    call.tool
                );

                if (successRate && successRate < (this.config.minSuccessRate || 0.3)) {
                    warnings.push(this.createWarning(
                        'low_success_rate',
                        `Tool has low success rate: ${(successRate * 100).toFixed(0)}%`,
                        {
                            index: i,
                            toolCall: call,
                            successRate,
                            threshold: this.config.minSuccessRate || 0.3
                        }
                    ));
                }
            }

            const duration = Date.now() - startTime;
            const success = errors.length === 0;
            this.recordMetrics(duration, success, errors.length > 0 ? errors[0] : null);

            return this.formatResult(success, errors, warnings);
        } catch (error) {
            logger.error('history-validator', `Validation error: ${error.message}`);
            this.recordMetrics(Date.now() - startTime, false, error);
            return this.formatResult(false, [this.createError('validation_error', error.message)]);
        }
    }
}

/**
 * Consolidated MCP Validator
 * Combines MCP sync and tool existence validation
 */
export class MCPValidator extends UnifiedValidatorBase {
    constructor(mcpManager, options = {}) {
        super('mcp', options);
        this.mcpManager = mcpManager;
    }

    async validate(toolCalls, context = {}) {
        const startTime = Date.now();
        const errors = [];
        const warnings = [];
        const corrections = [];
        let correctedCalls = null;

        try {
            const corrected = [];

            for (let i = 0; i < toolCalls.length; i++) {
                const call = toolCalls[i];

                // Check 1: Tool exists in MCP
                const toolExists = this.mcpManager?.toolExists?.(call.server, call.tool);

                if (!toolExists) {
                    // Try to find similar tool
                    const similar = this.mcpManager?.findSimilarTool?.(call.server, call.tool);

                    if (similar) {
                        corrections.push(this.createCorrection(
                            'tool_not_found_auto_corrected',
                            `Tool '${call.tool}' not found, using similar tool: '${similar.tool}'`,
                            { index: i, original: call.tool, corrected: similar.tool }
                        ));

                        corrected.push({
                            ...call,
                            tool: similar.tool
                        });
                    } else {
                        errors.push(this.createError(
                            'tool_not_found',
                            `Tool '${call.tool}' not found in MCP server '${call.server}'`,
                            { index: i, toolCall: call }
                        ));
                        corrected.push(call);
                    }
                } else {
                    corrected.push(call);
                }
            }

            if (corrections.length > 0) {
                correctedCalls = corrected;
            }

            const duration = Date.now() - startTime;
            const success = errors.length === 0;
            this.recordMetrics(duration, success, errors.length > 0 ? errors[0] : null);

            return this.formatResult(success, errors, warnings, corrections, correctedCalls);
        } catch (error) {
            logger.error('mcp-validator', `Validation error: ${error.message}`);
            this.recordMetrics(Date.now() - startTime, false, error);
            return this.formatResult(false, [this.createError('validation_error', error.message)]);
        }
    }
}

export default UnifiedValidatorBase;
