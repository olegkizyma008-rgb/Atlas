/**
 * @fileoverview Validation Pipeline
 * Багаторівнева валідація MCP tool calls з раннім відсіюванням
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

import logger from '../../utils/logger.js';
import { VALIDATION_CONFIG, getEnabledStages, isStageCritical } from '../../../config/validation-config.js';

/**
 * Validation Pipeline
 * Виконує послідовну валідацію через множину validators з early rejection
 *
 * Архітектура:
 * 1. Format Validation (CRITICAL, ~1ms)
 * 2. History Validation (NON-CRITICAL, ~5ms)
 * 3. Schema Validation (CRITICAL, ~10ms)
 * 4. MCP Sync Validation (CRITICAL, ~100ms)
 * 5. LLM Validation (NON-CRITICAL, ~500ms)
 *
 * Early Rejection: Якщо CRITICAL stage failed → зупинка
 */
export class ValidationPipeline {
  /**
   * @param {Object} options - Configuration
   * @param {Object} options.mcpManager - MCP Manager instance
   * @param {Object} options.historyManager - Tool History Manager instance
   * @param {Object} options.llmValidator - LLM Validator instance (optional)
   */
  constructor(options = {}) {
    this.mcpManager = options.mcpManager;
    this.historyManager = options.historyManager;
    this.llmValidator = options.llmValidator;

    this.validators = new Map();
    this.config = VALIDATION_CONFIG;

    // Metrics
    this.metrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      avgDuration: 0,
      stageMetrics: {}
    };

    logger.system('validation-pipeline', '🔍 ValidationPipeline initialized');
  }

  /**
   * Register a validator for a specific stage
   *
   * @param {string} stageName - Stage name (format, history, schema, mcpSync, llm)
   * @param {Object} validator - Validator instance with validate() method
   */
  registerValidator(stageName, validator) {
    if (!validator || typeof validator.validate !== 'function') {
      throw new Error(`Validator for stage '${stageName}' must have validate() method`);
    }

    this.validators.set(stageName, validator);
    logger.debug('validation-pipeline', `Registered validator: ${stageName}`);
  }

  /**
   * Validate tool calls through the pipeline
   * Main entry point
   *
   * @param {Array} toolCalls - Tool calls to validate
   * @param {Object} context - Validation context
   * @returns {Promise<Object>} Validation result
   */
  async validate(toolCalls, context = {}) {
    const startTime = Date.now();
    this.metrics.totalValidations++;

    logger.system('validation-pipeline', `🔍 Starting validation for ${toolCalls.length} tool calls`);

    const result = {
      valid: true,
      toolCalls: [...toolCalls],  // Copy for potential modifications
      errors: [],
      warnings: [],
      corrections: [],
      rejectedAt: null,
      stages: {},
      metadata: {
        totalDuration: 0,
        stagesExecuted: 0,
        earlyRejection: false
      }
    };

    // Get enabled stages in priority order
    const stages = getEnabledStages();

    // Execute stages sequentially
    for (const stage of stages) {
      const stageName = stage.name;
      const validator = this.validators.get(stageName);

      if (!validator) {
        logger.warn('validation-pipeline', `⚠️ No validator registered for stage: ${stageName}`);
        continue;
      }

      logger.debug('validation-pipeline', `[Stage ${stage.priority}] ${stageName} (${stage.critical ? 'CRITICAL' : 'NON-CRITICAL'})`);

      const stageStartTime = Date.now();

      try {
        // Execute stage with timeout
        const stageResult = await this._executeStageWithTimeout(
          validator,
          result.toolCalls,
          context,
          stage.timeout
        );

        const stageDuration = Date.now() - stageStartTime;

        // Store stage result
        result.stages[stageName] = {
          ...stageResult,
          duration: stageDuration,
          critical: stage.critical
        };

        result.metadata.stagesExecuted++;

        // Update metrics
        this._updateStageMetrics(stageName, stageDuration, stageResult.valid);

        // Accumulate warnings
        if (stageResult.warnings && stageResult.warnings.length > 0) {
          result.warnings.push(...stageResult.warnings.map(w => ({
            stage: stageName,
            ...w
          })));
        }

        // Accumulate corrections
        if (stageResult.corrections && stageResult.corrections.length > 0) {
          result.corrections.push(...stageResult.corrections.map(c => ({
            stage: stageName,
            ...c
          })));

          // Apply corrections to tool calls
          if (stageResult.correctedCalls) {
            result.toolCalls = stageResult.correctedCalls;
          }
        }

        // EARLY REJECTION: Critical stage failed
        if (!stageResult.valid && stage.critical) {
          result.valid = false;
          result.rejectedAt = stageName;
          result.metadata.earlyRejection = true;

          // Accumulate errors
          result.errors.push(...stageResult.errors.map(e => ({
            stage: stageName,
            critical: true,
            ...e
          })));

          logger.warn('validation-pipeline',
            `❌ REJECTED at stage: ${stageName} (${stageResult.errors.length} errors)`);

          break;  // EARLY EXIT
        }

        // Non-critical stage failed - continue with warnings
        if (!stageResult.valid && !stage.critical) {
          result.warnings.push(...stageResult.errors.map(e => ({
            stage: stageName,
            critical: false,
            ...e
          })));

          logger.debug('validation-pipeline',
            `⚠️ Stage ${stageName} failed (non-critical, continuing)`);
        }

      } catch (error) {
        logger.error('validation-pipeline',
          `❌ Stage ${stageName} threw error: ${error.message}`);

        // Critical stage error = rejection
        if (stage.critical) {
          result.valid = false;
          result.rejectedAt = stageName;
          result.metadata.earlyRejection = true;
          result.errors.push({
            stage: stageName,
            critical: true,
            error: error.message,
            type: 'stage_error'
          });
          break;
        } else {
          // Non-critical stage error = warning
          result.warnings.push({
            stage: stageName,
            critical: false,
            error: error.message,
            type: 'stage_error'
          });
        }
      }
    }

    // Calculate total duration
    result.metadata.totalDuration = Date.now() - startTime;

    // Update global metrics
    if (result.valid) {
      this.metrics.successfulValidations++;
    } else {
      this.metrics.failedValidations++;
    }

    const totalDuration = this.metrics.totalValidations;
    this.metrics.avgDuration = Math.round(
      (this.metrics.avgDuration * (totalDuration - 1) + result.metadata.totalDuration) / totalDuration
    );

    // Log result
    if (result.valid) {
      logger.system('validation-pipeline',
        `✅ Validation PASSED (${result.metadata.totalDuration}ms, ${result.metadata.stagesExecuted} stages)`);

      if (result.corrections.length > 0) {
        logger.system('validation-pipeline',
          `🔧 Applied ${result.corrections.length} auto-corrections`);
      }
    } else {
      logger.warn('validation-pipeline',
        `❌ Validation FAILED at ${result.rejectedAt} (${result.metadata.totalDuration}ms)`);
      logger.warn('validation-pipeline',
        `Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);
    }

    // Log slow validations
    if (this.config.performance.logSlowValidations &&
        result.metadata.totalDuration > this.config.performance.slowValidationThreshold) {
      logger.warn('validation-pipeline',
        `⏱️ Slow validation detected: ${result.metadata.totalDuration}ms (threshold: ${this.config.performance.slowValidationThreshold}ms)`);
    }

    return result;
  }

  /**
   * Execute stage with timeout
   * @private
   */
  async _executeStageWithTimeout(validator, toolCalls, context, timeout) {
    return Promise.race([
      validator.validate(toolCalls, context),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Stage timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Update stage metrics
   * @private
   */
  _updateStageMetrics(stageName, duration, valid) {
    if (!this.metrics.stageMetrics[stageName]) {
      this.metrics.stageMetrics[stageName] = {
        calls: 0,
        successes: 0,
        failures: 0,
        avgDuration: 0
      };
    }

    const metrics = this.metrics.stageMetrics[stageName];
    metrics.calls++;

    if (valid) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }

    metrics.avgDuration = Math.round(
      (metrics.avgDuration * (metrics.calls - 1) + duration) / metrics.calls
    );
  }

  /**
   * Get validation metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalValidations > 0
        ? this.metrics.successfulValidations / this.metrics.totalValidations
        : 0
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      avgDuration: 0,
      stageMetrics: {}
    };

    logger.system('validation-pipeline', 'Metrics reset');
  }

  /**
   * Get pipeline status
   * @returns {Object} Status
   */
  getStatus() {
    const stages = getEnabledStages();
    const registeredValidators = Array.from(this.validators.keys());

    return {
      enabled: this.config.pipeline.enabled,
      earlyRejection: this.config.pipeline.earlyRejection,
      totalStages: stages.length,
      registeredValidators: registeredValidators.length,
      stages: stages.map(s => ({
        name: s.name,
        critical: s.critical,
        registered: this.validators.has(s.name),
        priority: s.priority
      })),
      metrics: this.getMetrics()
    };
  }
}

export default ValidationPipeline;
