/**
 * @fileoverview History Validator
 * Level 2: Валідація на основі історії виконання
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

import logger from '../../utils/logger.js';
import { VALIDATION_CONFIG } from '../../../config/validation-config.js';

/**
 * History Validator
 * Перевіряє tool calls проти історії виконання
 *
 * Перевірки:
 * - Захист від повторень після помилок (3+ failures в останніх 100)
 * - Попередження про низьку успішність (<30%)
 * - Виявлення patterns помилок
 *
 * Performance: ~5ms для 10 tool calls
 */
export class HistoryValidator {
  /**
   * @param {Object} historyManager - Tool History Manager instance
   */
  constructor(historyManager) {
    if (!historyManager) {
      throw new Error('HistoryValidator requires historyManager');
    }

    this.historyManager = historyManager;
    this.config = VALIDATION_CONFIG.history;
    this.validatedCount = 0;

    logger.debug('history-validator', 
      `HistoryValidator initialized (window: ${this.config.antiRepetitionWindow}, maxFailures: ${this.config.maxFailuresBeforeBlock})`);
  }

  /**
   * Validate tool calls against history
   *
   * @param {Array} toolCalls - Tool calls to validate
   * @param {Object} context - Validation context
   * @returns {Promise<Object>} Validation result
   */
  async validate(toolCalls, context = {}) {
    this.validatedCount++;

    const errors = [];
    const warnings = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];

      // Check 1: Repetition after failures
      const repetition = this.historyManager.checkRepetitionAfterFailure(
        call,
        this.config.antiRepetitionWindow
      );

      if (repetition && repetition.blocked) {
        errors.push({
          type: 'repetition_after_failure',
          tool: `${call.server}__${call.tool}`,
          message: `Tool failed ${repetition.count} times in last ${this.config.antiRepetitionWindow} calls`,
          failureCount: repetition.count,
          lastError: repetition.lastError,
          lastTimestamp: repetition.lastTimestamp,
          suggestion: 'Consider using alternative tool or different approach',
          toolCall: call,
          index: i
        });
      }

      // Check 2: Low success rate
      const successRate = this.historyManager.getToolSuccessRate(
        call.server,
        call.tool
      );

      if (successRate < this.config.minSuccessRate && successRate < 1.0) {
        const percentage = (successRate * 100).toFixed(0);
        warnings.push({
          type: 'low_success_rate',
          tool: `${call.server}__${call.tool}`,
          message: `Tool has low success rate: ${percentage}%`,
          successRate,
          threshold: this.config.minSuccessRate,
          suggestion: 'Tool may be unreliable, consider alternatives',
          toolCall: call,
          index: i
        });
      }

      // Check 3: Recent failures pattern
      const recentFailures = this._getRecentFailuresForTool(call);
      if (recentFailures.length >= 2) {
        warnings.push({
          type: 'recent_failures_pattern',
          tool: `${call.server}__${call.tool}`,
          message: `Tool has ${recentFailures.length} recent failures`,
          recentFailures: recentFailures.length,
          lastErrors: recentFailures.slice(0, 3).map(f => f.error).filter(Boolean),
          suggestion: 'Review recent errors before retrying',
          toolCall: call,
          index: i
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get recent failures for specific tool
   * @private
   */
  _getRecentFailuresForTool(toolCall) {
    const recentFailures = this.historyManager.getRecentFailures(50);
    const toolKey = `${toolCall.server}__${toolCall.tool}`;

    return recentFailures.filter(f => f.tool === toolKey);
  }

  /**
   * Get validator statistics
   * @returns {Object} Stats
   */
  getStats() {
    const historyStats = this.historyManager.getStatistics();

    return {
      validatedCount: this.validatedCount,
      historySize: historyStats.totalCalls,
      successRate: historyStats.successRate,
      uniqueTools: historyStats.uniqueTools
    };
  }
}

export default HistoryValidator;
