/**
 * @fileoverview Atlas Context Enrichment Processor (Stage 0.5-MCP)
 * Перефразовує та розширює контекст запиту користувача перед створенням TODO
 * 
 * @version 1.0.0
 * @date 2025-10-30
 */

import logger from '../../utils/logger.js';
import { MCP_PROMPTS } from '../../../prompts/mcp/index.js';
import GlobalConfig from '../../../config/atlas-config.js';

/**
 * Atlas Context Enrichment Processor
 * 
 * Аналізує запит користувача та збагачує його:
 * - Уточнює неоднозначні формулювання
 * - Додає неявні вимоги
 * - Розширює технічні деталі
 * - Визначає передумови
 * - Формулює критерії успіху
 */
export class AtlasContextEnrichmentProcessor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.llmClient - LLM client for API calls
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ llmClient, logger: loggerInstance }) {
        this.llmClient = llmClient;
        this.logger = loggerInstance || logger;
    }

    /**
     * Execute context enrichment
     * 
     * @param {Object} context - Stage context
     * @param {string} context.userMessage - Original user request
     * @param {Object} [context.session] - Session context with chat history
     * @returns {Promise<Object>} Enrichment result
     */
    async execute(context) {
        this.logger.system('context-enrichment', '[STAGE-0.5-MCP] 🔍 Starting context enrichment...');

        const { userMessage, session } = context;

        try {
            // Build prompt with context
            const prompt = this._buildEnrichmentPrompt(userMessage, session);

            this.logger.system('context-enrichment', `[STAGE-0.5-MCP] Original: "${userMessage}"`);

            // Call LLM for enrichment
            const enrichmentResult = await this._callLLM(prompt);

            if (!enrichmentResult) {
                throw new Error('LLM returned null/undefined enrichment');
            }

            // Validate enrichment structure
            this._validateEnrichment(enrichmentResult);

            this.logger.system('context-enrichment', `[STAGE-0.5-MCP] ✅ Enriched: "${enrichmentResult.enriched_request}"`);
            this.logger.system('context-enrichment', `[STAGE-0.5-MCP]    Complexity: ${enrichmentResult.estimated_complexity}/10`);
            this.logger.system('context-enrichment', `[STAGE-0.5-MCP]    Implicit requirements: ${enrichmentResult.implicit_requirements?.length || 0}`);
            this.logger.system('context-enrichment', `[STAGE-0.5-MCP]    Prerequisites: ${enrichmentResult.prerequisites?.length || 0}`);

            return {
                success: true,
                enrichment: enrichmentResult,
                enriched_message: enrichmentResult.enriched_request,
                metadata: {
                    original_message: userMessage,
                    complexity: enrichmentResult.estimated_complexity,
                    has_prerequisites: enrichmentResult.prerequisites?.length > 0,
                    technical_specs: enrichmentResult.technical_specifications,
                    prompt: MCP_PROMPTS.ATLAS_CONTEXT_ENRICHMENT?.name || 'atlas_context_enrichment'
                }
            };

        } catch (error) {
            this.logger.error('context-enrichment', `[STAGE-0.5-MCP] ❌ Enrichment failed: ${error.message}`);
            this.logger.error('context-enrichment', error.stack);

            // Fallback: return original message
            return {
                success: false,
                error: error.message,
                enrichment: null,
                enriched_message: userMessage, // Fallback to original
                metadata: {
                    original_message: userMessage,
                    fallback: true
                }
            };
        }
    }

    /**
     * Build enrichment prompt with context
     * @private
     */
    _buildEnrichmentPrompt(userMessage, session) {
        const prompt = MCP_PROMPTS.ATLAS_CONTEXT_ENRICHMENT;
        
        if (!prompt) {
            throw new Error('ATLAS_CONTEXT_ENRICHMENT prompt not found in MCP_PROMPTS');
        }

        // Build chat history context (last 3 messages)
        let chatHistory = '';
        if (session?.chatThread?.messages && session.chatThread.messages.length > 0) {
            const recentMessages = session.chatThread.messages.slice(-3);
            chatHistory = recentMessages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
        }

        // Build previous TODO context if available
        let previousTodo = '';
        if (session?.lastTodo) {
            previousTodo = `Mode: ${session.lastTodo.mode}, Items: ${session.lastTodo.items?.length || 0}`;
        }

        // Replace placeholders
        let systemPrompt = prompt.SYSTEM_PROMPT;
        let userPrompt = prompt.USER_PROMPT
            .replace('{{USER_MESSAGE}}', userMessage)
            .replace('{{CHAT_HISTORY}}', chatHistory || 'No recent conversation')
            .replace('{{PREVIOUS_TODO}}', previousTodo || 'No previous TODO');

        // Handle conditional blocks
        if (!chatHistory) {
            userPrompt = userPrompt.replace(/{{#if CHAT_HISTORY}}[\s\S]*?{{\/if}}/g, '');
        } else {
            userPrompt = userPrompt.replace(/{{#if CHAT_HISTORY}}/g, '').replace(/{{\/if}}/g, '');
        }

        if (!previousTodo) {
            userPrompt = userPrompt.replace(/{{#if PREVIOUS_TODO}}[\s\S]*?{{\/if}}/g, '');
        } else {
            userPrompt = userPrompt.replace(/{{#if PREVIOUS_TODO}}/g, '').replace(/{{\/if}}/g, '');
        }

        return {
            systemPrompt,
            userPrompt
        };
    }

    /**
     * Call LLM for context enrichment
     * @private
     */
    async _callLLM(prompt) {
        // Use configuration from models-config.js
        const modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('context_enrichment');
        const model = modelConfig.model;
        const temperature = modelConfig.temperature;
        const maxTokens = modelConfig.max_tokens;

        this.logger.system('context-enrichment', `[STAGE-0.5-MCP] Calling LLM: ${model} (temp: ${temperature})`);

        const response = await this.llmClient.chat({
            model,
            messages: [
                { role: 'system', content: prompt.systemPrompt },
                { role: 'user', content: prompt.userPrompt }
            ],
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' }
        });

        if (!response?.choices?.[0]?.message?.content) {
            throw new Error('Invalid LLM response structure');
        }

        const content = response.choices[0].message.content.trim();
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            this.logger.error('context-enrichment', `[STAGE-0.5-MCP] JSON parse error: ${parseError.message}`);
            this.logger.error('context-enrichment', `[STAGE-0.5-MCP] Raw content: ${content}`);
            throw new Error(`Failed to parse LLM response as JSON: ${parseError.message}`);
        }
    }

    /**
     * Validate enrichment structure
     * @private
     */
    _validateEnrichment(enrichment) {
        const required = ['original_request', 'enriched_request', 'estimated_complexity'];
        
        for (const field of required) {
            if (!enrichment[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (typeof enrichment.estimated_complexity !== 'number' || 
            enrichment.estimated_complexity < 1 || 
            enrichment.estimated_complexity > 10) {
            throw new Error('estimated_complexity must be a number between 1 and 10');
        }

        // Ensure arrays exist (even if empty)
        enrichment.implicit_requirements = enrichment.implicit_requirements || [];
        enrichment.prerequisites = enrichment.prerequisites || [];
        enrichment.technical_specifications = enrichment.technical_specifications || {};
    }
}
