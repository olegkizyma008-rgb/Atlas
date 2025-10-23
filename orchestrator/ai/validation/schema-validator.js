/**
 * @fileoverview Schema Validator
 * Level 3: Валідація параметрів через inputSchema
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

import logger from '../../utils/logger.js';

/**
 * Schema Validator
 * Перевіряє параметри tool calls проти inputSchema з MCP
 *
 * Перевірки:
 * - Required parameters
 * - Parameter types (string, number, boolean, array, object)
 * - Enum values
 * - Pattern matching (regex)
 * - Auto-correction назв параметрів (fuzzy matching)
 *
 * Performance: ~10ms для 10 tool calls
 */
export class SchemaValidator {
  /**
   * @param {Object} mcpManager - MCP Manager instance
   */
  constructor(mcpManager) {
    if (!mcpManager) {
      throw new Error('SchemaValidator requires mcpManager');
    }

    this.mcpManager = mcpManager;
    this.validatedCount = 0;
    this.correctionRules = null;

    logger.debug('schema-validator', 'SchemaValidator initialized');
  }

  /**
   * Validate tool calls against inputSchema
   *
   * @param {Array} toolCalls - Tool calls to validate
   * @param {Object} context - Validation context
   * @returns {Promise<Object>} Validation result
   */
  async validate(toolCalls, context = {}) {
    this.validatedCount++;

    const errors = [];
    const warnings = [];
    const corrections = [];
    const correctedCalls = [];

    // Lazy load correction rules
    if (!this.correctionRules) {
      this.correctionRules = this._generateCorrectionRules();
    }

    for (let i = 0; i < toolCalls.length; i++) {
      const call = { ...toolCalls[i] };
      let corrected = false;

      // Get tool definition from MCP
      const server = this.mcpManager.servers.get(call.server);
      if (!server || !Array.isArray(server.tools)) {
        warnings.push({
          type: 'server_not_found',
          message: `Server '${call.server}' not available for schema validation`,
          toolCall: call,
          index: i
        });
        correctedCalls.push(call);
        continue;
      }

      // FIXED 2025-10-23: Try to find tool with both formats
      // MCP tools may have full name (server__tool) or short name (tool)
      let toolDef = server.tools.find(t => t.name === call.tool);
      
      // If not found, try without server prefix
      if (!toolDef && call.tool.includes('__')) {
        const toolNameWithoutPrefix = call.tool.split('__')[1];
        toolDef = server.tools.find(t => t.name === toolNameWithoutPrefix);
      }
      
      // If still not found, try with server prefix
      if (!toolDef && !call.tool.includes('__')) {
        const toolNameWithPrefix = `${call.server}__${call.tool}`;
        toolDef = server.tools.find(t => t.name === toolNameWithPrefix);
      }
      
      const toolName = toolDef ? toolDef.name : call.tool;
      if (!toolDef) {
        warnings.push({
          type: 'tool_not_found',
          message: `Tool '${toolName}' not found on server '${call.server}'`,
          toolCall: call,
          index: i
        });
        correctedCalls.push(call);
        continue;
      }

      // Validate parameters against inputSchema
      if (toolDef.inputSchema && toolDef.inputSchema.properties) {
        const validation = this._validateParameters(
          call.parameters,
          toolDef.inputSchema,
          call.server,
          toolName
        );

        // Apply auto-corrections
        if (validation.correctedParams) {
          call.parameters = validation.correctedParams;
          corrected = true;

          corrections.push({
            tool: `${call.server}__${call.tool}`,
            corrections: validation.corrections,
            index: i
          });
        }

        // Collect errors
        if (validation.errors.length > 0) {
          errors.push(...validation.errors.map(e => ({
            ...e,
            tool: `${call.server}__${call.tool}`,
            toolCall: call,
            index: i
          })));
        }

        // Collect warnings
        if (validation.warnings.length > 0) {
          warnings.push(...validation.warnings.map(w => ({
            ...w,
            tool: `${call.server}__${call.tool}`,
            toolCall: call,
            index: i
          })));
        }
      }

      correctedCalls.push(call);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrections,
      correctedCalls: corrections.length > 0 ? correctedCalls : null
    };
  }

  /**
   * Validate parameters against inputSchema
   * @private
   */
  _validateParameters(params, schema, server, tool) {
    const errors = [];
    const warnings = [];
    const corrections = [];
    let correctedParams = { ...params };
    let hasCorrections = false;

    const props = schema.properties || {};
    const required = schema.required || [];

    // Check required parameters
    for (const requiredParam of required) {
      if (!(requiredParam in params)) {
        // Try auto-correction
        const similar = this._findSimilarKey(Object.keys(params), requiredParam);
        if (similar) {
          correctedParams[requiredParam] = correctedParams[similar];
          delete correctedParams[similar];
          hasCorrections = true;

          corrections.push({
            type: 'parameter_renamed',
            from: similar,
            to: requiredParam,
            value: correctedParams[requiredParam]
          });
        } else {
          errors.push({
            type: 'missing_required_parameter',
            parameter: requiredParam,
            message: `Missing required parameter: '${requiredParam}'`
          });
        }
      }
    }

    // Validate parameter types and values
    for (const [paramName, paramValue] of Object.entries(params)) {
      const propDef = props[paramName];

      if (!propDef) {
        // Unknown parameter - try auto-correction
        const similar = this._findSimilarKey(Object.keys(props), paramName);
        if (similar) {
          correctedParams[similar] = correctedParams[paramName];
          delete correctedParams[paramName];
          hasCorrections = true;

          corrections.push({
            type: 'parameter_renamed',
            from: paramName,
            to: similar,
            value: correctedParams[similar]
          });
        } else {
          warnings.push({
            type: 'unknown_parameter',
            parameter: paramName,
            message: `Unknown parameter: '${paramName}'`,
            availableParameters: Object.keys(props)
          });
        }
        continue;
      }

      // Type validation with auto-correction
      const expectedType = propDef.type;
      const actualType = this._getType(paramValue);

      if (expectedType && expectedType !== actualType) {
        // ENHANCED 2025-10-23: Auto-correct common type mismatches
        let correctedValue = null;
        let canCorrect = false;
        
        // Empty string → empty array
        if (expectedType === 'array' && actualType === 'string' && paramValue === '') {
          correctedValue = [];
          canCorrect = true;
        }
        // Empty string → null (for optional parameters)
        else if (actualType === 'string' && paramValue === '' && !required.includes(paramName)) {
          correctedValue = null;
          canCorrect = true;
        }
        // String number → number
        else if (expectedType === 'number' && actualType === 'string' && !isNaN(paramValue)) {
          correctedValue = Number(paramValue);
          canCorrect = true;
        }
        // String boolean → boolean
        else if (expectedType === 'boolean' && actualType === 'string') {
          if (paramValue.toLowerCase() === 'true') {
            correctedValue = true;
            canCorrect = true;
          } else if (paramValue.toLowerCase() === 'false') {
            correctedValue = false;
            canCorrect = true;
          }
        }
        // Single value → array
        else if (expectedType === 'array' && actualType !== 'array' && actualType !== 'null') {
          correctedValue = [paramValue];
          canCorrect = true;
        }
        
        if (canCorrect) {
          correctedParams[paramName] = correctedValue;
          hasCorrections = true;
          
          corrections.push({
            type: 'type_corrected',
            parameter: paramName,
            from: actualType,
            to: expectedType,
            oldValue: paramValue,
            newValue: correctedValue
          });
        } else {
          errors.push({
            type: 'invalid_parameter_type',
            parameter: paramName,
            expectedType,
            actualType,
            value: paramValue,
            message: `Parameter '${paramName}' should be ${expectedType}, got ${actualType}`
          });
        }
      }

      // Enum validation
      if (propDef.enum && !propDef.enum.includes(paramValue)) {
        errors.push({
          type: 'invalid_enum_value',
          parameter: paramName,
          value: paramValue,
          validValues: propDef.enum,
          message: `Parameter '${paramName}' must be one of: ${propDef.enum.join(', ')}`
        });
      }

      // Pattern validation (regex)
      if (propDef.pattern && typeof paramValue === 'string') {
        try {
          const regex = new RegExp(propDef.pattern);
          if (!regex.test(paramValue)) {
            errors.push({
              type: 'pattern_mismatch',
              parameter: paramName,
              value: paramValue,
              pattern: propDef.pattern,
              message: `Parameter '${paramName}' doesn't match pattern: ${propDef.pattern}`
            });
          }
        } catch (e) {
          warnings.push({
            type: 'invalid_pattern',
            parameter: paramName,
            pattern: propDef.pattern,
            message: `Invalid regex pattern in schema: ${e.message}`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrections,
      correctedParams: hasCorrections ? correctedParams : null
    };
  }

  /**
   * Get JavaScript type of value
   * ENHANCED 2025-10-23: Better type detection
   * @private
   */
  _getType(value) {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value;
  }

  /**
   * Find similar key using fuzzy matching
   * @private
   */
  _findSimilarKey(keys, target) {
    if (!keys || keys.length === 0) return null;

    const targetLower = target.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const key of keys) {
      const keyLower = key.toLowerCase();
      let score = 0;

      // Exact match
      if (keyLower === targetLower) return key;

      // Substring match
      if (keyLower.includes(targetLower)) {
        score += 0.8;
      } else if (targetLower.includes(keyLower)) {
        score += 0.7;
      }

      // Levenshtein distance
      const distance = this._levenshteinDistance(targetLower, keyLower);
      const maxLen = Math.max(targetLower.length, keyLower.length);
      const similarity = 1 - (distance / maxLen);
      score += similarity * 0.5;

      // Starts with
      if (keyLower.startsWith(targetLower) || targetLower.startsWith(keyLower)) {
        score += 0.3;
      }

      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = key;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance
   * @private
   */
  _levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Generate correction rules from all tools
   * @private
   */
  _generateCorrectionRules() {
    const rules = new Map();

    // Common parameter name variations
    const commonMappings = {
      'path': ['file_path', 'filepath', 'file', 'filename'],
      'url': ['link', 'href', 'website', 'uri'],
      'selector': ['css_selector', 'element', 'target'],
      'text': ['content', 'value', 'input', 'data'],
      'timeout': ['wait', 'delay', 'duration']
    };

    for (const [correct, variations] of Object.entries(commonMappings)) {
      for (const variant of variations) {
        rules.set(variant, correct);
      }
    }

    return rules;
  }

  /**
   * Get validator statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      validatedCount: this.validatedCount,
      correctionRulesCount: this.correctionRules ? this.correctionRules.size : 0
    };
  }
}

export default SchemaValidator;
