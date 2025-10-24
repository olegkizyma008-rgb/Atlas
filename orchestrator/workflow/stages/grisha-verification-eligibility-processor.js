/**
 * @fileoverview Grisha Verification Eligibility Processor (Stage 2.3-routing)
 * Determines optimal verification path: visual vs data-driven (MCP tools)
 * 
 * CREATED 2025-10-22: Smart routing before verification execution
 * - Analyzes TODO item and execution results
 * - Routes to visual verification OR data-driven MCP checks
 * - Provides additional verification tools when needed
 * 
 * @version 1.0.0
 * @date 2025-10-22
 */

import logger from '../../utils/logger.js';
import { MCP_PROMPTS } from '../../../prompts/mcp/index.js';
import { MCP_MODEL_CONFIG } from '../../../config/models-config.js';

/**
 * Grisha Verification Eligibility Processor
 * 
 * Analyzes verification requirements and determines:
 * 1. Whether visual verification is possible/optimal
 * 2. What additional MCP checks should be performed
 * 3. Recommended verification path (visual/data/hybrid)
 */
export class GrishaVerificationEligibilityProcessor {
    /**
     * @param {Object} dependencies
     * @param {Function} dependencies.callLLM - LLM client function
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ callLLM, logger: loggerInstance }) {
        this.callLLM = callLLM;
        this.logger = loggerInstance || logger;
    }

    /**
     * Execute verification eligibility analysis
     * 
     * @param {Object} context - Stage context
     * @param {Object} context.currentItem - Current TODO item
     * @param {Object} context.execution - Execution results from Stage 2.2
     * @param {Object} context.verificationStrategy - Strategy from GrishaVerificationStrategy
     * @returns {Promise<Object>} Eligibility decision
     */
    async execute(context) {
        const { currentItem, execution, verificationStrategy } = context;

        if (!currentItem) {
            throw new Error('currentItem is required for eligibility analysis');
        }

        if (!execution) {
            throw new Error('execution results are required for eligibility analysis');
        }

        try {
            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] 🎯 Analyzing verification eligibility for item ${currentItem.id}`);
            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] Action: ${currentItem.action}`);
            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] Success criteria: ${currentItem.success_criteria}`);

            // Build heuristic signals from strategy
            const heuristicSignals = this._buildHeuristicSignals(verificationStrategy);

            // UNIVERSAL ALGORITHM 2025-10-24: Extract used servers from execution
            const usedServers = this._extractUsedServersFromExecution(execution);

            // Prepare prompt with execution summary
            const executionSummary = this._buildExecutionSummary(execution, usedServers);
            
            const prompt = MCP_PROMPTS.GRISHA_VERIFICATION_ELIGIBILITY;
            const userPrompt = prompt.USER_PROMPT
                .replace('{{item_action}}', currentItem.action)
                .replace('{{success_criteria}}', currentItem.success_criteria)
                .replace('{{execution_summary}}', executionSummary)
                .replace('{{heuristic_visual_confidence}}', heuristicSignals.visualConfidence)
                .replace('{{heuristic_mcp_reason}}', heuristicSignals.mcpReason);

            // Get model config for this stage
            const modelConfig = MCP_MODEL_CONFIG.getStageConfig('verification_eligibility');

            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] 🤖 Calling LLM: ${modelConfig.model}`);
            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] 🌡️  Temperature: ${modelConfig.temperature}`);

            // Call LLM for eligibility decision
            const llmResponse = await this.callLLM({
                systemPrompt: prompt.SYSTEM_PROMPT,
                userPrompt: userPrompt,
                model: modelConfig.model,
                temperature: modelConfig.temperature,
                max_tokens: modelConfig.max_tokens
            });

            // Parse response (expecting clean JSON)
            const decision = this._parseEligibilityResponse(llmResponse);

            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] ✅ Decision: ${decision.recommended_path.toUpperCase()}`);
            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] 📊 Visual possible: ${decision.visual_possible}`);
            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] 📊 Confidence: ${decision.confidence}%`);
            this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] 💡 Reason: ${decision.reason}`);
            
            if (decision.additional_checks && decision.additional_checks.length > 0) {
                this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] 🔧 Additional checks: ${decision.additional_checks.length}`);
                decision.additional_checks.forEach((check, idx) => {
                    this.logger.system('grisha-eligibility', `[GRISHA-ROUTING]   ${idx + 1}. ${check.tool} - ${check.description}`);
                });
            }

            return {
                success: true,
                decision,
                metadata: {
                    itemId: currentItem.id,
                    recommendedPath: decision.recommended_path,
                    visualPossible: decision.visual_possible,
                    confidence: decision.confidence,
                    additionalChecksCount: decision.additional_checks?.length || 0
                }
            };

        } catch (error) {
            this.logger.error(`[GRISHA-ROUTING] ❌ Eligibility analysis failed: ${error.message}`, {
                category: 'grisha-eligibility',
                component: 'grisha-verification-eligibility',
                stack: error.stack
            });

            // Fallback: default to visual verification
            this.logger.system('grisha-eligibility', '[GRISHA-ROUTING] ⚠️  Falling back to visual verification');

            return {
                success: false,
                decision: {
                    visual_possible: true,
                    confidence: 50,
                    reason: `Помилка аналізу: ${error.message}. Використовую візуальну верифікацію за замовчуванням.`,
                    recommended_path: 'visual',
                    additional_checks: [],
                    allow_visual_fallback: true,
                    analysis_focus: 'Загальна перевірка',
                    notes: 'Fallback decision due to analysis error'
                },
                error: error.message,
                metadata: {
                    itemId: currentItem.id,
                    fallback: true
                }
            };
        }
    }

    /**
     * Extract used MCP servers from execution results
     * UNIVERSAL ALGORITHM 2025-10-24: Analyzes tool names to determine servers
     * 
     * @param {Object} execution - Execution results
     * @returns {Array<string>} List of used server names
     * @private
     */
    _extractUsedServersFromExecution(execution) {
        const serversUsed = new Set();
        
        if (execution && execution.results && Array.isArray(execution.results)) {
            for (const result of execution.results) {
                const toolName = (result.tool || '').toLowerCase();
                
                // Extract server from tool name format: server__tool or server__server__tool
                // Universal pattern matching for any server
                if (toolName.includes('__')) {
                    const parts = toolName.split('__');
                    if (parts.length >= 2) {
                        const server = parts[0];
                        serversUsed.add(server);
                    }
                }
            }
        }
        
        return Array.from(serversUsed);
    }

    /**
     * Build heuristic signals from verification strategy
     * 
     * @param {Object} strategy - Verification strategy from GrishaVerificationStrategy
     * @returns {Object} Heuristic signals
     * @private
     */
    _buildHeuristicSignals(strategy) {
        if (!strategy) {
            return {
                visualConfidence: 50,
                mcpReason: 'No strategy provided'
            };
        }

        // Extract visual confidence from strategy
        const visualConfidence = strategy.method === 'visual' ? strategy.confidence : 30;

        // Build MCP reason
        let mcpReason = 'None detected';
        if (strategy.method === 'mcp') {
            mcpReason = `${strategy.mcpServer} server recommended (confidence: ${strategy.confidence}%)`;
        } else if (strategy.mcpFallbackTools && strategy.mcpFallbackTools.length > 0) {
            mcpReason = `Fallback tools available: ${strategy.mcpFallbackTools.join(', ')}`;
        }

        return {
            visualConfidence,
            mcpReason
        };
    }

    /**
     * Build execution summary from results
     * ENHANCED 2025-10-24: Includes server information for better routing
     * 
     * @param {Object} execution - Execution results
     * @param {Array<string>} usedServers - List of used servers
     * @returns {string} Summary text
     * @private
     */
    _buildExecutionSummary(execution, usedServers = []) {
        if (!execution || !execution.results) {
            return 'No execution results available';
        }

        const lines = [];
        lines.push(`Total tools executed: ${execution.results.length}`);
        lines.push(`All successful: ${execution.all_successful ? 'Yes' : 'No'}`);
        
        // UNIVERSAL: Show which servers were used
        if (usedServers.length > 0) {
            lines.push(`MCP Servers used: ${usedServers.join(', ')}`);
            lines.push('Note: For verification, PREFER the same servers that were used in execution.');
        }
        
        lines.push('\nTools used:');

        for (const result of execution.results) {
            const status = result.success ? '✅' : '❌';
            const toolName = result.tool || 'unknown';
            const errorInfo = result.error ? ` (${String(result.error).substring(0, 50)})` : '';
            lines.push(`  ${status} ${toolName}${errorInfo}`);
        }

        return lines.join('\n');
    }

    /**
     * Parse LLM response for eligibility decision
     * 
     * @param {string} response - Raw LLM response
     * @returns {Object} Parsed decision
     * @private
     */
    _parseEligibilityResponse(response) {
        try {
            // Clean response (remove markdown code blocks if present)
            let cleaned = response.trim();
            
            // Remove markdown code blocks
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Parse JSON
            const decision = JSON.parse(cleaned);

            // Validate required fields
            if (typeof decision.visual_possible !== 'boolean') {
                throw new Error('Missing or invalid visual_possible field');
            }

            if (typeof decision.confidence !== 'number') {
                throw new Error('Missing or invalid confidence field');
            }

            if (!decision.recommended_path || !['visual', 'data', 'hybrid'].includes(decision.recommended_path)) {
                throw new Error('Missing or invalid recommended_path field');
            }

            // Ensure additional_checks is an array
            if (!Array.isArray(decision.additional_checks)) {
                decision.additional_checks = [];
            }

            // Validate tool format in additional_checks (must use server__tool format)
            decision.additional_checks.forEach((check, idx) => {
                if (check.tool && !check.tool.includes('__')) {
                    this.logger.warn(`[GRISHA-ROUTING] ⚠️  Invalid tool format in check ${idx + 1}: ${check.tool} (missing server__ prefix)`, {
                        category: 'grisha-eligibility'
                    });
                    // Auto-fix if possible
                    if (check.server) {
                        check.tool = `${check.server}__${check.tool}`;
                        this.logger.system('grisha-eligibility', `[GRISHA-ROUTING] 🔧 Auto-fixed to: ${check.tool}`);
                    }
                }
            });

            return decision;

        } catch (error) {
            this.logger.error(`[GRISHA-ROUTING] ❌ Failed to parse eligibility response: ${error.message}`, {
                category: 'grisha-eligibility',
                response: response.substring(0, 500)
            });

            // Attempt fallback parsing
            return this._fallbackParsing(response);
        }
    }

    /**
     * Fallback parsing for malformed responses
     * 
     * @param {string} response - Raw response
     * @returns {Object} Best-effort parsed decision
     * @private
     */
    _fallbackParsing(response) {
        this.logger.system('grisha-eligibility', '[GRISHA-ROUTING] 🔄 Attempting fallback parsing...');

        // Default fallback decision
        const fallback = {
            visual_possible: true,
            confidence: 50,
            reason: 'Не вдалося розпарсити відповідь LLM. Використовую візуальну верифікацію.',
            recommended_path: 'visual',
            additional_checks: [],
            allow_visual_fallback: true,
            analysis_focus: 'Загальна перевірка',
            notes: 'Fallback parsing used'
        };

        // Try to extract some information from response
        const lowerResponse = response.toLowerCase();
        
        if (lowerResponse.includes('data') || lowerResponse.includes('mcp') || lowerResponse.includes('filesystem')) {
            fallback.recommended_path = 'data';
            fallback.reason = 'Виявлено згадки про дані/MCP інструменти';
        }

        if (lowerResponse.includes('hybrid')) {
            fallback.recommended_path = 'hybrid';
        }

        return fallback;
    }
}

export default GrishaVerificationEligibilityProcessor;
