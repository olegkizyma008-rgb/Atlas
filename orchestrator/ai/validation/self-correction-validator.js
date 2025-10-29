/**
 * Self-Correction Validator
 * Implements multi-level validation with self-correction cycles
 * Based on best practices from refactor.md
 * 
 * @version 1.0.0
 * @date 2025-10-29
 */

class SelfCorrectionValidator {
  constructor(logger, llmClient) {
    this.logger = logger;
    this.llmClient = llmClient;
    this.maxCorrectionAttempts = 3;
    this.correctionModel = process.env.MCP_MODEL_VALIDATION || 'atlas-gpt-4o-mini';
    this.correctionTemperature = 0.1;
  }

  /**
   * Validates tool plan with self-correction cycle
   * @param {Array} toolPlan - Array of tool calls to validate
   * @param {Object} context - Execution context with task details
   * @returns {Object} Validation result with corrected plan if needed
   */
  async validate(toolPlan, context) {
    const startTime = Date.now();
    let currentPlan = toolPlan;
    let attempts = 0;
    let validationHistory = [];

    this.logger.info('Starting self-correction validation', {
      initialPlanLength: toolPlan.length,
      maxAttempts: this.maxCorrectionAttempts
    });

    while (attempts < this.maxCorrectionAttempts) {
      attempts++;
      
      // Step 1: Analyze current plan for issues
      const analysis = await this._analyzePlan(currentPlan, context);
      validationHistory.push(analysis);

      if (analysis.isValid) {
        this.logger.info('Plan validated successfully', {
          attempts,
          duration: Date.now() - startTime
        });
        
        return {
          success: true,
          validated: true,
          correctedPlan: currentPlan,
          attempts,
          history: validationHistory,
          confidence: analysis.confidence
        };
      }

      // Step 2: If last attempt, return with errors
      if (attempts >= this.maxCorrectionAttempts) {
        this.logger.warn('Max correction attempts reached', {
          attempts,
          errors: analysis.errors
        });
        
        return {
          success: false,
          validated: false,
          errors: analysis.errors,
          attempts,
          history: validationHistory,
          confidence: analysis.confidence
        };
      }

      // Step 3: Request self-correction from LLM
      const correctionResult = await this._requestCorrection(
        currentPlan,
        analysis.errors,
        context
      );

      if (!correctionResult.success) {
        this.logger.error('Failed to get correction from LLM', {
          attempt: attempts,
          error: correctionResult.error
        });
        break;
      }

      currentPlan = correctionResult.correctedPlan;
      this.logger.info('Plan corrected', {
        attempt: attempts,
        corrections: correctionResult.corrections
      });
    }

    return {
      success: false,
      validated: false,
      errors: ['Failed to validate after maximum attempts'],
      attempts,
      history: validationHistory
    };
  }

  /**
   * Analyzes plan for common issues
   */
  async _analyzePlan(toolPlan, context) {
    const errors = [];
    const warnings = [];
    let confidence = 100;

    // Check 1: Tool name format
    for (const tool of toolPlan) {
      if (!tool.tool || !tool.tool.includes('__')) {
        errors.push({
          type: 'INVALID_TOOL_NAME',
          tool: tool.tool,
          message: `Tool name must follow server__tool format: ${tool.tool}`
        });
        confidence -= 20;
      }

      // Check server prefix matches
      if (tool.server && tool.tool) {
        const expectedPrefix = `${tool.server}__`;
        if (!tool.tool.startsWith(expectedPrefix)) {
          errors.push({
            type: 'MISMATCHED_SERVER',
            tool: tool.tool,
            server: tool.server,
            message: `Tool ${tool.tool} doesn't match server ${tool.server}`
          });
          confidence -= 15;
        }
      }
    }

    // Check 2: Required parameters
    if (context.availableTools) {
      for (const tool of toolPlan) {
        const toolSchema = this._findToolSchema(tool.tool, context.availableTools);
        if (toolSchema && toolSchema.inputSchema) {
          const required = toolSchema.inputSchema.required || [];
          const provided = Object.keys(tool.parameters || {});
          
          for (const param of required) {
            if (!provided.includes(param)) {
              errors.push({
                type: 'MISSING_PARAMETER',
                tool: tool.tool,
                parameter: param,
                message: `Missing required parameter: ${param}`
              });
              confidence -= 10;
            }
          }
        }
      }
    }

    // Check 3: Path validation for filesystem
    for (const tool of toolPlan) {
      if (tool.server === 'filesystem' && tool.parameters) {
        if (tool.parameters.path) {
          // Check for relative paths
          if (tool.parameters.path.startsWith('./') || 
              tool.parameters.path.startsWith('../')) {
            errors.push({
              type: 'RELATIVE_PATH',
              tool: tool.tool,
              path: tool.parameters.path,
              message: 'Use absolute paths only, not relative paths'
            });
            confidence -= 10;
          }

          // Check for placeholder paths
          if (tool.parameters.path.includes('<') || 
              tool.parameters.path.includes('username')) {
            errors.push({
              type: 'PLACEHOLDER_PATH',
              tool: tool.tool,
              path: tool.parameters.path,
              message: 'Replace placeholder with actual path (/Users/dev/...)'
            });
            confidence -= 15;
          }
        }
      }
    }

    // Check 4: Logical sequence
    const sequence = this._checkLogicalSequence(toolPlan);
    if (!sequence.isValid) {
      warnings.push({
        type: 'SEQUENCE_WARNING',
        message: sequence.message,
        suggestion: sequence.suggestion
      });
      confidence -= 5;
    }

    // Check 5: Efficiency
    if (toolPlan.length > 10) {
      warnings.push({
        type: 'EFFICIENCY_WARNING',
        message: `Plan has ${toolPlan.length} tools, consider splitting into subtasks`,
        suggestion: 'Break down into smaller, focused tasks'
      });
      confidence -= 5;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: Math.max(0, confidence),
      toolCount: toolPlan.length
    };
  }

  /**
   * Request correction from LLM
   */
  async _requestCorrection(toolPlan, errors, context) {
    const prompt = this._buildCorrectionPrompt(toolPlan, errors, context);
    
    try {
      const response = await this.llmClient.generateResponse({
        model: this.correctionModel,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: this.correctionTemperature,
        response_format: { type: 'json_object' }
      });

      const correctionData = JSON.parse(response.content);
      
      if (!correctionData.corrected_plan || !Array.isArray(correctionData.corrected_plan)) {
        throw new Error('Invalid correction response format');
      }

      return {
        success: true,
        correctedPlan: correctionData.corrected_plan,
        corrections: correctionData.corrections || [],
        reasoning: correctionData.reasoning
      };
    } catch (error) {
      this.logger.error('Failed to get correction from LLM', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build correction prompt
   */
  _buildCorrectionPrompt(toolPlan, errors, context) {
    const system = `You are a tool plan validator and corrector. Your job is to fix errors in MCP tool plans.

CRITICAL RULES:
1. Fix ONLY the specific errors mentioned
2. Keep the overall plan structure intact
3. Ensure all tool names follow server__tool format
4. Use absolute paths for filesystem operations
5. Include all required parameters from schema
6. Return ONLY valid JSON

COMMON FIXES:
- INVALID_TOOL_NAME: Add server prefix (filesystem__read_file)
- MISSING_PARAMETER: Add required parameter with appropriate value
- RELATIVE_PATH: Convert to absolute (/Users/dev/Desktop/...)
- PLACEHOLDER_PATH: Replace with actual path
- MISMATCHED_SERVER: Fix server or tool name to match`;

    const user = `Fix the following tool plan based on the errors found:

CURRENT PLAN:
${JSON.stringify(toolPlan, null, 2)}

ERRORS TO FIX:
${errors.map(e => `- ${e.type}: ${e.message}`).join('\n')}

CONTEXT:
- Task: ${context.action || 'Not specified'}
- Available Tools: ${context.availableTools ? 'Provided' : 'Not provided'}

Return JSON in this format:
{
  "corrected_plan": [/* Fixed array of tool calls */],
  "corrections": ["List of changes made"],
  "reasoning": "Brief explanation of fixes"
}`;

    return { system, user };
  }

  /**
   * Check logical sequence of operations
   */
  _checkLogicalSequence(toolPlan) {
    const issues = [];
    
    // Check: Create directory before writing files
    const writeOps = toolPlan.filter(t => 
      t.tool && t.tool.includes('write_file'));
    const createDirOps = toolPlan.filter(t => 
      t.tool && t.tool.includes('create_directory'));
    
    for (const writeOp of writeOps) {
      if (writeOp.parameters && writeOp.parameters.path) {
        const dirPath = writeOp.parameters.path.substring(0, 
          writeOp.parameters.path.lastIndexOf('/'));
        
        const hasDirCreate = createDirOps.some(dirOp => 
          dirOp.parameters && dirOp.parameters.path === dirPath);
        
        if (!hasDirCreate && !dirPath.includes('/Desktop') && 
            !dirPath.includes('/Documents') && !dirPath.includes('/Downloads')) {
          issues.push(`Writing to ${writeOp.parameters.path} without creating parent directory`);
        }
      }
    }

    // Check: Read after write in same plan
    const readOps = toolPlan.filter(t => 
      t.tool && t.tool.includes('read_file'));
    
    for (let i = 0; i < readOps.length; i++) {
      const readOp = readOps[i];
      const readIndex = toolPlan.indexOf(readOp);
      
      const writeBeforeRead = writeOps.find(writeOp => {
        const writeIndex = toolPlan.indexOf(writeOp);
        return writeIndex < readIndex && 
               writeOp.parameters?.path === readOp.parameters?.path;
      });
      
      if (writeBeforeRead) {
        issues.push(`Reading file immediately after writing at ${readOp.parameters.path}`);
      }
    }

    if (issues.length > 0) {
      return {
        isValid: false,
        message: `Sequence issues found: ${issues.length}`,
        suggestion: issues[0]
      };
    }

    return {
      isValid: true,
      message: 'Sequence is logical'
    };
  }

  /**
   * Find tool schema from available tools
   */
  _findToolSchema(toolName, availableTools) {
    if (!toolName || !availableTools) return null;
    
    return availableTools.find(tool => {
      // Match exact name
      if (tool.name === toolName) return true;
      
      // Match with server prefix
      const parts = toolName.split('__');
      if (parts.length === 2) {
        return tool.name === parts[1] && tool.server === parts[0];
      }
      
      return false;
    });
  }
}

module.exports = SelfCorrectionValidator;
