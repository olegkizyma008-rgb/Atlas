/**
 * @fileoverview Format Validator
 * Level 1: Швидка перевірка формату tool calls
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

import logger from '../../utils/logger.js';

/**
 * Format Validator
 * Перевіряє базовий формат tool calls без звернення до MCP
 *
 * Перевірки:
 * - Наявність обов'язкових полів (server, tool, parameters)
 * - Формат назви інструменту (server__tool)
 * - Типи даних
 *
 * Performance: ~1ms для 10 tool calls
 */
export class FormatValidator {
  constructor() {
    this.validatedCount = 0;
    logger.debug('format-validator', 'FormatValidator initialized');
  }

  /**
   * Validate tool calls format
   *
   * @param {Array} toolCalls - Tool calls to validate
   * @param {Object} context - Validation context (unused)
   * @returns {Promise<Object>} Validation result
   */
  async validate(toolCalls, context = {}) {
    this.validatedCount++;

    const errors = [];
    const warnings = [];

    if (!Array.isArray(toolCalls)) {
      return {
        valid: false,
        errors: [{
          type: 'invalid_input',
          message: 'tool_calls must be an array',
          toolCall: null
        }],
        warnings: []
      };
    }

    if (toolCalls.length === 0) {
      return {
        valid: false,
        errors: [{
          type: 'empty_array',
          message: 'tool_calls array is empty',
          toolCall: null
        }],
        warnings: []
      };
    }

    // Validate each tool call
    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const callErrors = this._validateToolCall(call, i);

      if (callErrors.length > 0) {
        errors.push(...callErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate single tool call
   * @private
   */
  _validateToolCall(call, index) {
    const errors = [];

    // Check if call is an object
    if (!call || typeof call !== 'object') {
      errors.push({
        type: 'invalid_type',
        message: `Tool call at index ${index} must be an object`,
        toolCall: call,
        index
      });
      return errors;
    }

    // Check required fields
    const requiredFields = ['server', 'tool', 'parameters'];
    for (const field of requiredFields) {
      if (!(field in call)) {
        errors.push({
          type: 'missing_field',
          message: `Missing required field: '${field}'`,
          field,
          toolCall: call,
          index
        });
      }
    }

    // If missing required fields, skip further validation
    if (errors.length > 0) {
      return errors;
    }

    // Validate server field
    if (typeof call.server !== 'string' || call.server.trim() === '') {
      errors.push({
        type: 'invalid_server',
        message: 'Field "server" must be a non-empty string',
        toolCall: call,
        index
      });
    }

    // Validate tool field
    if (typeof call.tool !== 'string' || call.tool.trim() === '') {
      errors.push({
        type: 'invalid_tool',
        message: 'Field "tool" must be a non-empty string',
        toolCall: call,
        index
      });
    } else {
      // Check tool name format (should be server__tool)
      const toolName = call.tool;
      const hasDoubleUnderscore = toolName.includes('__');

      if (!hasDoubleUnderscore) {
        errors.push({
          type: 'invalid_tool_format',
          message: `Tool name must follow format "server__tool", got: "${toolName}"`,
          toolCall: call,
          index,
          suggestion: `Did you mean: "${call.server}__${toolName}"?`
        });
      } else {
        // Check if prefix matches server
        const [prefix] = toolName.split('__');
        if (prefix !== call.server) {
          errors.push({
            type: 'tool_server_mismatch',
            message: `Tool prefix "${prefix}" doesn't match server "${call.server}"`,
            toolCall: call,
            index,
            suggestion: `Tool should start with "${call.server}__"`
          });
        }
      }
    }

    // Validate parameters field
    if (typeof call.parameters !== 'object' || call.parameters === null) {
      errors.push({
        type: 'invalid_parameters',
        message: 'Field "parameters" must be an object',
        toolCall: call,
        index
      });
    }

    // Check for array parameters (common mistake)
    if (Array.isArray(call.parameters)) {
      errors.push({
        type: 'invalid_parameters',
        message: 'Field "parameters" must be an object, not an array',
        toolCall: call,
        index
      });
    }

    return errors;
  }

  /**
   * Get validator statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      validatedCount: this.validatedCount
    };
  }
}

export default FormatValidator;
