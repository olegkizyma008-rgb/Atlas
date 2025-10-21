/**
 * @fileoverview LLM Tool Validator
 * Uses LLM to validate tool calls before execution for safety and correctness
 * 
 * Inspired by Goose's tool validation system
 * 
 * @version 2.2.0
 * @date 2025-10-21
 */

import logger from '../utils/logger.js';
import SecurityConfig from '../../config/security-config.js';
import { MCP_PROMPTS } from '../../prompts/mcp/index.js';

const {
  LLM_VALIDATOR_CONFIG,
  DANGEROUS_PATTERNS,
  ALLOWED_OPERATIONS,
  RISK_ASSESSMENT,
  checkCommandSafety,
  checkPathSafety
} = SecurityConfig;

/**
 * LLM Tool Validator
 * 
 * Validates tool calls before execution:
 * - Safety checks (dangerous commands, file operations)
 * - Relevance to user intent
 * - Parameter correctness
 * - Risk assessment
 * 
 * ALWAYS ACTIVE - runs on every tool execution
 */
export class LLMToolValidator {
    /**
     * @param {Object} llmClient - LLM client for tool selection
     */
    constructor(llmClient) {
        this.llmClient = llmClient;
        this.config = LLM_VALIDATOR_CONFIG;
        this.validationStats = {
            totalValidations: 0,
            blocked: 0,
            approved: 0,
            warnings: 0
        };
        
        if (!this.config.enabled) {
            logger.warn('llm-tool-validator', '⚠️ LLMToolValidator is DISABLED in security config');
        } else {
            logger.system('llm-tool-validator', 
                `🛡️ LLMToolValidator initialized (model: ${this.config.model}, temp: ${this.config.temperature})`);
        }
    }

    /**
     * Validate tool calls before execution
     * Checks safety, relevance, and parameter correctness
     * 
     * @param {Array<Object>} toolCalls - Tool calls to validate
     * @param {Object} context - Execution context with user intent
     * @returns {Promise<Array<Object>>} Validation results
     */
    async validateToolCalls(toolCalls, context = {}) {
        if (!toolCalls || toolCalls.length === 0) {
            return [];
        }

        // Check if validator is enabled
        if (!this.config.enabled) {
            logger.debug('llm-tool-validator', '⚠️ Validator disabled, skipping validation');
            return toolCalls.map(tc => ({
                tool: `${tc.server}__${tc.tool}`,
                valid: true,
                reasoning: 'Validation disabled in security config',
                risk: 'unknown'
            }));
        }

        this.validationStats.totalValidations++;

        logger.debug('llm-tool-validator', 
            `🛡️ Validating ${toolCalls.length} tool calls...`);

        // STEP 1: Pre-validation with pattern matching
        const preValidation = this._preValidateWithPatterns(toolCalls);
        
        // If critical patterns detected, block immediately
        const criticalBlocks = preValidation.filter(v => v.risk === 'critical' && !v.safe);
        if (criticalBlocks.length > 0 && RISK_ASSESSMENT.autoBlockCritical) {
            logger.error('llm-tool-validator', 
                `🚫 Pre-validation BLOCKED ${criticalBlocks.length} critical operations`);
            
            return preValidation.map(v => ({
                tool: v.tool,
                valid: v.safe,
                reasoning: v.reasoning || 'Passed pre-validation',
                risk: v.risk,
                preValidation: true
            }));
        }

        // STEP 2: LLM validation for complex cases
        const userPrompt = this._buildValidationPrompt(toolCalls, context, preValidation);

        try {
            // Use LLMClient.generate() method
            const responseContent = await this.llmClient.generate({
                systemPrompt: MCP_PROMPTS.LLM_TOOL_VALIDATOR,
                prompt: userPrompt,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens
            });

            const validationResults = this._parseValidation(responseContent, toolCalls);

            // Update stats
            const blocked = validationResults.filter(v => !v.valid && (v.risk === 'high' || v.risk === 'critical')).length;
            const warnings = validationResults.filter(v => !v.valid && v.risk === 'medium').length;
            
            this.validationStats.blocked += blocked;
            this.validationStats.warnings += warnings;
            this.validationStats.approved += (toolCalls.length - blocked - warnings);

            if (blocked > 0) {
                logger.error('llm-tool-validator', 
                    `🚫 BLOCKED ${blocked} tool(s) due to safety concerns`);
            }
            if (warnings > 0) {
                logger.warn('llm-tool-validator', 
                    `⚠️ ${warnings} tool(s) have warnings`);
            }

            return validationResults;

        } catch (error) {
            logger.error('llm-tool-validator', 
                `Validation failed: ${error.message}`);
            
            // Fallback behavior based on config
            const fallbackValid = this.config.fallbackOnError === 'allow';
            
            return toolCalls.map(tc => ({
                tool: `${tc.server}__${tc.tool}`,
                valid: fallbackValid,
                reasoning: `Validation service error - ${this.config.fallbackOnError}ing by default`,
                risk: 'unknown',
                validationError: error.message
            }));
        }
    }

    /**
     * Pre-validate tool calls using pattern matching
     * Fast check before LLM validation
     * 
     * @param {Array<Object>} toolCalls - Tool calls to validate
     * @returns {Array<Object>} Pre-validation results
     * @private
     */
    _preValidateWithPatterns(toolCalls) {
        return toolCalls.map(tc => {
            const toolName = `${tc.server}__${tc.tool}`;
            const params = tc.parameters || {};

            // Check shell commands
            if (tc.tool === 'run_command' || tc.tool === 'execute_command') {
                const command = params.command || params.cmd || '';
                const safety = checkCommandSafety(command);
                
                if (!safety.safe) {
                    return {
                        tool: toolName,
                        safe: false,
                        risk: safety.risk,
                        reasoning: `${safety.reason}: ${safety.pattern}`,
                        pattern: safety.pattern
                    };
                }
            }

            // Check file paths
            if (params.path) {
                const operation = tc.tool.includes('write') || tc.tool.includes('delete') ? 'write' : 'read';
                const safety = checkPathSafety(params.path, operation);
                
                if (!safety.safe) {
                    return {
                        tool: toolName,
                        safe: false,
                        risk: safety.risk,
                        reasoning: `${safety.reason}: ${params.path}`,
                        pattern: safety.pattern
                    };
                }
            }

            // Check if operation is in safe whitelist
            const isSafeRead = ALLOWED_OPERATIONS.safeReadOperations.includes(tc.tool);
            const isSafeBrowser = ALLOWED_OPERATIONS.safeBrowserOperations.includes(tc.tool);
            
            if (isSafeRead || isSafeBrowser) {
                return {
                    tool: toolName,
                    safe: true,
                    risk: 'none',
                    reasoning: 'Operation in safe whitelist'
                };
            }

            // Default: needs LLM validation
            return {
                tool: toolName,
                safe: true,
                risk: 'low',
                reasoning: 'Needs LLM validation'
            };
        });
    }

    /**
     * Build validation prompt for LLM
     * 
     * @param {Array<Object>} toolCalls - Tool calls to validate
     * @param {Object} context - Execution context
     * @param {Array<Object>} preValidation - Pre-validation results
     * @returns {string} Validation prompt
     * @private
     */
    _buildValidationPrompt(toolCalls, context, preValidation = []) {
        const userIntent = context.userIntent || context.itemAction || 'Unknown intent';
        
        const toolCallsFormatted = toolCalls.map((tc, idx) => {
            const preVal = preValidation[idx] || {};
            const preValInfo = preVal.reasoning ? `\n   Pre-validation: ${preVal.reasoning} (risk: ${preVal.risk})` : '';
            
            return `${idx + 1}. ${tc.server}__${tc.tool}
   Parameters: ${JSON.stringify(tc.parameters || {}, null, 2)}${preValInfo}`;
        }).join('\n\n');

        return `User Intent: "${userIntent}"

Planned Tool Calls:
${toolCallsFormatted}

Validate EACH tool call for:

1. **SAFETY**: Is it safe to execute? Check for:
   - Dangerous file paths (/etc/passwd, system files)
   - Destructive commands (rm -rf, delete, drop)
   - Unauthorized access attempts
   - Code injection risks

2. **RELEVANCE**: Does it match the user's intent?

3. **PARAMETERS**: Are parameters correct and complete?

4. **RISK LEVEL**:
   - none: Completely safe (read operations, list)
   - low: Minor risk (write to user files)
   - medium: Moderate risk (system commands, network)
   - high: High risk (delete, modify system)
   - critical: BLOCK IMMEDIATELY (destructive, dangerous)

Return JSON array (one object per tool call):
[
  {
    "tool": "server__toolname",
    "valid": true/false,
    "reasoning": "detailed explanation",
    "risk": "none/low/medium/high/critical",
    "suggestion": "alternative if invalid"
  }
]

Return ONLY the JSON array, no other text.`;
    }

    /**
     * Parse LLM validation response
     * NEW 21.10.2025: Updated to handle new prompt format with {"validations": [...]}
     * 
     * @param {string} content - LLM response
     * @param {Array<Object>} toolCalls - Original tool calls
     * @returns {Array<Object>} Parsed validation results
     * @private
     */
    _parseValidation(content, toolCalls) {
        try {
            // STEP 1: Try to extract JSON from markdown code blocks
            let jsonText = content;
            const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
            }

            // STEP 2: Try to parse as complete JSON object
            let parsed;
            try {
                parsed = JSON.parse(jsonText);
            } catch (e) {
                // STEP 3: Try to extract JSON object from text
                const jsonMatch = jsonText.match(/\{[\s\S]*"validations"[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                } else {
                    // STEP 4: Try to extract array directly (legacy format)
                    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
                    if (arrayMatch) {
                        parsed = { validations: JSON.parse(arrayMatch[0]) };
                    } else {
                        throw new Error('No valid JSON found in response');
                    }
                }
            }

            // Extract validations array
            const validations = parsed.validations || parsed;
            
            if (!Array.isArray(validations)) {
                throw new Error('Validations is not an array');
            }

            logger.debug('llm-tool-validator', 
                `✅ Parsed ${validations.length} validation results`);

            // Ensure we have validation for each tool call
            return toolCalls.map((tc, idx) => {
                const validation = validations[idx] || {};
                
                return {
                    tool: `${tc.server}__${tc.tool}`,
                    valid: validation.valid !== false,  // Default to true if missing
                    reasoning: validation.reasoning || 'No reasoning provided',
                    risk: validation.risk || 'unknown',
                    suggestion: validation.suggestion || null
                };
            });

        } catch (error) {
            logger.error('llm-tool-validator', 
                `Failed to parse validation: ${error.message}`);
            logger.debug('llm-tool-validator', 
                `Raw content: ${content.substring(0, 200)}...`);
            
            // Fallback: approve all with warning
            return toolCalls.map(tc => ({
                tool: `${tc.server}__${tc.tool}`,
                valid: true,
                reasoning: 'Validation parsing failed - allowing with caution',
                risk: 'unknown',
                parseError: error.message
            }));
        }
    }

    /**
     * Check if tool calls passed validation
     * 
     * @param {Array<Object>} validationResults - Validation results
     * @returns {Object} Summary of validation
     */
    checkValidation(validationResults) {
        const invalid = validationResults.filter(v => !v.valid);
        const highRisk = validationResults.filter(v => v.risk === 'high' || v.risk === 'critical');
        const mediumRisk = validationResults.filter(v => v.risk === 'medium');

        return {
            allValid: invalid.length === 0 && highRisk.length === 0,
            shouldBlock: highRisk.length > 0,
            shouldWarn: mediumRisk.length > 0,
            invalid,
            highRisk,
            mediumRisk,
            summary: this._generateSummary(invalid, highRisk, mediumRisk)
        };
    }

    /**
     * Generate validation summary
     * 
     * @param {Array} invalid - Invalid tools
     * @param {Array} highRisk - High risk tools
     * @param {Array} mediumRisk - Medium risk tools
     * @returns {string} Summary message
     * @private
     */
    _generateSummary(invalid, highRisk, mediumRisk) {
        if (highRisk.length > 0) {
            return `🚫 BLOCKED: ${highRisk.length} high-risk tool(s) detected`;
        }
        if (mediumRisk.length > 0) {
            return `⚠️ WARNING: ${mediumRisk.length} medium-risk tool(s) detected`;
        }
        if (invalid.length > 0) {
            return `⚠️ ${invalid.length} tool(s) failed validation`;
        }
        return '✅ All tools passed validation';
    }

    /**
     * Reset validation statistics
     */
    resetStatistics() {
        this.validationStats = {
            totalValidations: 0,
            blocked: 0,
            approved: 0,
            warnings: 0
        };
        logger.debug('llm-tool-validator', 'Statistics reset');
    }

    /**
     * Get validation statistics
     * 
     * @returns {Object} Statistics
     */
    getStatistics() {
        return {
            ...this.validationStats,
            blockRate: this.validationStats.totalValidations > 0 
                ? (this.validationStats.blocked / this.validationStats.totalValidations * 100).toFixed(2) + '%'
                : '0%',
            approvalRate: this.validationStats.totalValidations > 0
                ? (this.validationStats.approved / this.validationStats.totalValidations * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

export default LLMToolValidator;
