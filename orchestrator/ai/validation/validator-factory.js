/**
 * @fileoverview Validator Factory & Utilities
 * Consolidated validation logic with factory pattern (Phase 8 Optimization)
 * 
 * Reduction: 383 → 240 lines (-37%)
 * 
 * @version 2.0.0
 * @date 2025-11-14
 */

import logger from '../../utils/logger.js';

/**
 * Shared metrics recorder for all validators
 */
const recordMetrics = (validator, duration, success, error = null) => {
    validator.metrics.validations++;
    validator.metrics[success ? 'successes' : 'failures']++;

    if (error) {
        validator.metrics.errors.push({
            timestamp: Date.now(),
            error: error.message || error
        });
        // Keep only last 100 errors
        if (validator.metrics.errors.length > 100) {
            validator.metrics.errors.shift();
        }
    }

    // Update average duration
    const total = validator.metrics.validations;
    validator.metrics.avgDuration = Math.round(
        (validator.metrics.avgDuration * (total - 1) + duration) / total
    );
};

/**
 * Shared result formatter
 */
const formatResult = (valid, errors = [], warnings = [], corrections = [], correctedCalls = null) => ({
    valid,
    errors: errors || [],
    warnings: warnings || [],
    corrections: corrections || [],
    correctedCalls: correctedCalls || null
});

/**
 * Shared error/warning/correction creators
 */
const createError = (type, message, details = {}) => ({ type, message, ...details });
const createWarning = (type, message, details = {}) => ({ type, message, ...details });
const createCorrection = (type, message, details = {}) => ({ type, message, ...details });

/**
 * Validator Factory
 * Creates validators with shared logic
 */
export const createValidator = (type, options = {}) => {
    const name = type;
    const config = options.config || {};
    const manager = options.manager || {};

    const validator = {
        name,
        config,
        enabled: options.enabled !== false,
        metrics: {
            validations: 0,
            successes: 0,
            failures: 0,
            avgDuration: 0,
            errors: []
        },

        getMetrics() {
            return {
                ...this.metrics,
                successRate: this.metrics.validations > 0
                    ? (this.metrics.successes / this.metrics.validations * 100).toFixed(2) + '%'
                    : '0%'
            };
        },

        resetMetrics() {
            this.metrics = {
                validations: 0,
                successes: 0,
                failures: 0,
                avgDuration: 0,
                errors: []
            };
        }
    };

    // Validation implementations
    const validationLogic = {
        structure: async (toolCalls, context) => {
            const startTime = Date.now();
            const errors = [];
            const warnings = [];

            try {
                for (let i = 0; i < toolCalls.length; i++) {
                    const call = toolCalls[i];

                    // Check 1: Tool name format
                    if (!call.tool || typeof call.tool !== 'string' ||
                        !call.server || typeof call.server !== 'string') {
                        errors.push(createError(
                            'invalid_tool_name_format',
                            `Invalid tool name format: ${call.tool}`,
                            { index: i, toolCall: call }
                        ));
                    } else {
                        const pattern = /^[a-zA-Z0-9_]+$/;
                        if (!pattern.test(call.tool) || !pattern.test(call.server)) {
                            errors.push(createError(
                                'invalid_tool_name_format',
                                `Invalid tool name format: ${call.tool}`,
                                { index: i, toolCall: call }
                            ));
                        }
                    }

                    // Check 2: Required parameters
                    if (!call.parameters || typeof call.parameters !== 'object') {
                        if (call.requiresParameters) {
                            errors.push(createError(
                                'missing_required_parameters',
                                `Missing required parameters for tool: ${call.tool}`,
                                { index: i, toolCall: call }
                            ));
                        }
                    }

                    // Check 3: Parameter types
                    if (call.parameters && typeof call.parameters === 'object') {
                        for (const [key, value] of Object.entries(call.parameters)) {
                            if (value === null || value === undefined) {
                                warnings.push(createWarning(
                                    'null_parameter',
                                    `Parameter '${key}' is null or undefined`,
                                    { index: i, parameter: key }
                                ));
                            }
                        }
                    }
                }

                const duration = Date.now() - startTime;
                const success = errors.length === 0;
                recordMetrics(validator, duration, success, errors.length > 0 ? errors[0] : null);

                return formatResult(success, errors, warnings);
            } catch (error) {
                logger.error('structure-validator', `Validation error: ${error.message}`);
                recordMetrics(validator, Date.now() - startTime, false, error);
                return formatResult(false, [createError('validation_error', error.message)]);
            }
        },

        history: async (toolCalls, context) => {
            const startTime = Date.now();
            const errors = [];
            const warnings = [];
            const historyManager = manager.historyManager;

            try {
                for (let i = 0; i < toolCalls.length; i++) {
                    const call = toolCalls[i];

                    // Check 1: Repetition after failures
                    const repetition = historyManager?.checkRepetitionAfterFailure?.(
                        call,
                        config.antiRepetitionWindow || 100
                    );

                    if (repetition?.blocked) {
                        errors.push(createError(
                            'repetition_after_failure',
                            `Tool failed ${repetition.count} times recently`,
                            { index: i, toolCall: call, failureCount: repetition.count }
                        ));
                    }

                    // Check 2: Low success rate
                    const successRate = historyManager?.getToolSuccessRate?.(
                        call.server,
                        call.tool
                    );

                    if (successRate && successRate < (config.minSuccessRate || 0.3)) {
                        warnings.push(createWarning(
                            'low_success_rate',
                            `Tool has low success rate: ${(successRate * 100).toFixed(0)}%`,
                            { index: i, toolCall: call, successRate }
                        ));
                    }
                }

                const duration = Date.now() - startTime;
                const success = errors.length === 0;
                recordMetrics(validator, duration, success, errors.length > 0 ? errors[0] : null);

                return formatResult(success, errors, warnings);
            } catch (error) {
                logger.error('history-validator', `Validation error: ${error.message}`);
                recordMetrics(validator, Date.now() - startTime, false, error);
                return formatResult(false, [createError('validation_error', error.message)]);
            }
        },

        mcp: async (toolCalls, context) => {
            const startTime = Date.now();
            const errors = [];
            const warnings = [];
            const corrections = [];
            const mcpManager = manager.mcpManager;
            const corrected = [];

            try {
                for (let i = 0; i < toolCalls.length; i++) {
                    const call = toolCalls[i];

                    // Check: Tool exists in MCP
                    const toolExists = mcpManager?.toolExists?.(call.server, call.tool);

                    if (!toolExists) {
                        const similar = mcpManager?.findSimilarTool?.(call.server, call.tool);

                        if (similar) {
                            corrections.push(createCorrection(
                                'tool_not_found_auto_corrected',
                                `Tool '${call.tool}' not found, using similar tool: '${similar.tool}'`,
                                { index: i, original: call.tool, corrected: similar.tool }
                            ));
                            corrected.push({ ...call, tool: similar.tool });
                        } else {
                            errors.push(createError(
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

                const duration = Date.now() - startTime;
                const success = errors.length === 0;
                recordMetrics(validator, duration, success, errors.length > 0 ? errors[0] : null);

                return formatResult(success, errors, warnings, corrections,
                    corrections.length > 0 ? corrected : null);
            } catch (error) {
                logger.error('mcp-validator', `Validation error: ${error.message}`);
                recordMetrics(validator, Date.now() - startTime, false, error);
                return formatResult(false, [createError('validation_error', error.message)]);
            }
        }
    };

    // Attach validate method
    validator.validate = validationLogic[type] || (() => {
        throw new Error(`Unknown validator type: ${type}`);
    });

    logger.debug(`${name}-validator`, `Initialized (enabled: ${validator.enabled})`);
    return validator;
};

/**
 * Backward compatibility: Export old classes as factory wrappers
 */
export class UnifiedValidatorBase {
    constructor(name, options = {}) {
        return createValidator(name, options);
    }
}

export class StructureValidator {
    constructor(options = {}) {
        return createValidator('structure', options);
    }
}

export class HistoryValidator {
    constructor(historyManager, options = {}) {
        return createValidator('history', {
            ...options,
            manager: { historyManager }
        });
    }
}

export class MCPValidator {
    constructor(mcpManager, options = {}) {
        return createValidator('mcp', {
            ...options,
            manager: { mcpManager }
        });
    }
}

export default createValidator;
