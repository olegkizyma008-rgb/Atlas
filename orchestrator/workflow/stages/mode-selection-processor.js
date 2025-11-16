/**
 * @fileoverview Mode Selection Processor (Stage 0-MCP)
 * Determines if user request is chat or task mode
 * 
 * @version 5.0.0
 * @date 2025-10-16
 */

import logger from '../../utils/logger.js';
import { MCP_PROMPTS } from '../../../prompts/mcp/index.js';
import axios from 'axios';
import GlobalConfig from '../../../config/atlas-config.js';

/**
 * Mode Selection Processor
 * 
 * Analyzes user requests and determines:
 * - chat: Simple conversation, Atlas can respond directly
 * - task: Requires MCP tools and multi-agent workflow
 */
export class ModeSelectionProcessor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.llmClient - LLM client for reasoning
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ llmClient, logger: loggerInstance }) {
        this.llmClient = llmClient;
        this.logger = loggerInstance || logger;

        // Get API endpoint and model from GlobalConfig (lazy evaluation)
        this.apiEndpoint = null;
        this.apiTimeout = 60000;
        this.modelConfig = null;
    }

    _ensureConfig() {
        if (!this.modelConfig) {
            // Safe access to apiEndpoint config
            const apiConfig = GlobalConfig.MCP_MODEL_CONFIG?.apiEndpoint;

            // Validate apiConfig structure and provide fallback
            if (!apiConfig || typeof apiConfig !== 'object') {
                this.logger.warn('mode-selection', '[STAGE-0-MCP] ⚠️ apiEndpoint config not found, using fallback');
                this.apiEndpoint = 'http://localhost:4000/v1/chat/completions';
                this.apiTimeout = 60000;
            } else {
                this.apiEndpoint = (apiConfig.useFallback && apiConfig.fallback)
                    ? apiConfig.fallback
                    : (apiConfig.primary || 'http://localhost:4000/v1/chat/completions');
                this.apiTimeout = apiConfig.timeout || 60000;
            }

            this.modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('mode_selection');

            this.logger.system('mode-selection', `[STAGE-0-MCP] 🔧 Using API: ${this.apiEndpoint}, Model: ${this.modelConfig.model}`);
        }
    }

    /**
     * Execute mode selection
     * 
     * @param {Object} context - Stage context
     * @param {string} context.userMessage - User request
     * @param {Object} [context.session] - Session context
     * @returns {Promise<Object>} Selection result with mode
     */
    async execute(context) {
        this._ensureConfig();
        this.logger.system('mode-selection', '[STAGE-0-MCP] 🔍 Starting mode selection...');

        const { userMessage, session } = context;

        try {
            const prompt = MCP_PROMPTS.MODE_SELECTION;

            this.logger.system('mode-selection', `[STAGE-0-MCP] Analyzing: "${userMessage}"`);

            // Build messages for LLM
            const messages = [
                { role: 'system', content: prompt.SYSTEM_PROMPT },
                { role: 'user', content: prompt.buildUserPrompt(userMessage) }
            ];

            // FIXED 2025-11-06: Retry with fallback model on rate limit
            let response;
            let usedModel = this.modelConfig.model;

            try {
                // Try primary model first
                this.logger.system('mode-selection', `[STAGE-0-MCP] Calling API: ${this.apiEndpoint}`);
                this.logger.system('mode-selection', `[STAGE-0-MCP] Primary model: ${usedModel}`);

                response = await axios.post(this.apiEndpoint, {
                    model: usedModel,
                    messages,
                    temperature: this.modelConfig.temperature,
                    max_tokens: this.modelConfig.max_tokens
                }, {
                    timeout: this.apiTimeout
                });

            } catch (primaryError) {
                // Check if it's a rate limit error (429 or 500 with RATE_LIMIT code)
                const isRateLimit = primaryError.response?.status === 429 ||
                    (primaryError.response?.status === 500 &&
                        primaryError.response?.data?.error?.code === 'RATE_LIMIT');

                if (isRateLimit) {
                    // FIXED 2025-11-16: Add exponential backoff for rate limit
                    const retryAfter = primaryError.response?.data?.error?.retry_after_ms ||
                        primaryError.response?.headers?.['retry-after'] * 1000 ||
                        35000; // Default 35 seconds

                    this.logger.warn(`[STAGE-0-MCP] ⚠️ Rate limit (429) - waiting ${retryAfter}ms before retry`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter));

                    if (this.modelConfig.fallback) {
                        this.logger.warn('[STAGE-0-MCP] ⚠️ Trying fallback model after rate limit');
                        this.logger.warn(`[STAGE-0-MCP] Fallback model: ${this.modelConfig.fallback}`);

                        // Retry with fallback model
                        usedModel = this.modelConfig.fallback;
                        response = await axios.post(this.apiEndpoint, {
                            model: usedModel,
                            messages,
                            temperature: this.modelConfig.temperature,
                            max_tokens: this.modelConfig.max_tokens
                        }, {
                            timeout: this.apiTimeout
                        });
                    } else {
                        // No fallback - retry with primary model after wait
                        response = await axios.post(this.apiEndpoint, {
                            model: usedModel,
                            messages,
                            temperature: this.modelConfig.temperature,
                            max_tokens: this.modelConfig.max_tokens
                        }, {
                            timeout: this.apiTimeout
                        });
                    }
                } else {
                    // Not a rate limit - rethrow
                    throw primaryError;
                }
            }

            this.logger.system('mode-selection', `[STAGE-0-MCP] Response received: status=${response.status}, model=${usedModel}`);

            if (!response.data || !response.data.choices || response.data.choices.length === 0) {
                throw new Error('Invalid API response structure');
            }

            const rawResponse = response.data.choices[0].message.content;

            this.logger.system('mode-selection', `[STAGE-0-MCP] Raw response: ${rawResponse}`);

            // Parse JSON response
            const result = this._parseResponse(rawResponse);

            this.logger.system('mode-selection', `[STAGE-0-MCP] ✅ Mode: ${result.mode} (confidence: ${result.confidence})`);
            this.logger.system('mode-selection', `[STAGE-0-MCP]    Reasoning: ${result.reasoning}`);

            return {
                success: true,
                mode: result.mode,
                confidence: result.confidence,
                reasoning: result.reasoning,
                metadata: {
                    userMessage,
                    timestamp: new Date().toISOString(),
                    prompt: 'MODE_SELECTION',
                    model: usedModel
                }
            };

        } catch (error) {
            this.logger.error(`[STAGE-0-MCP] Mode selection failed: ${error.message}`);
            this.logger.error(`[STAGE-0-MCP] Error stack: ${error.stack}`);
            this.logger.error(`[STAGE-0-MCP] Error name: ${error.name}`);

            // Log axios-specific details
            if (error.response) {
                this.logger.error(`[STAGE-0-MCP] API Response Error: status=${error.response.status}, data=${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                this.logger.error(`[STAGE-0-MCP] No response received from API`);
            }

            // DEV mode keyword detection fallback (NEW 28.10.2025)
            const devKeywords = [
                'самоаналіз',
                'само аналіз',
                'режим дев',
                'dev mode',
                'analyze yourself',
                'self analysis',
                'self-analysis',
                'внутрішній аналіз',
                'зазирнути в себе',
                'code intervention'
            ];

            const lowerMessage = userMessage?.toLowerCase?.() || '';
            const devDetected = devKeywords.some((keyword) => lowerMessage.includes(keyword));

            if (devDetected) {
                this.logger.warn('[STAGE-0-MCP] ⚠️ API failed, але знайдено DEV ключові слова — вмикаю DEV режим');
                return {
                    success: true,
                    mode: 'dev',
                    confidence: 0.8,
                    reasoning: 'API error, але повідомлення містить явні DEV ключові слова'
                };
            }

            // TASK mode keyword detection fallback (NEW 04.11.2025)
            // Detect action verbs and explicit task requests
            const taskKeywords = [
                // Explicit task mode requests
                'режим таск', 'task mode', 'через таск', 'в таск режимі',
                'виконай через таск', 'зроби через таск',

                // Action verbs (imperative form)
                'виконай', 'зроби', 'відкрий', 'запусти', 'знайди',
                'створи', 'встанови', 'завантаж', 'збережи',
                'перейди', 'натисни', 'введи', 'напиши',
                'скачай', 'включи', 'виключи', 'закрий',

                // English action verbs
                'execute', 'open', 'launch', 'run', 'find',
                'create', 'install', 'download', 'save',
                'navigate', 'click', 'type', 'write'
            ];

            const taskDetected = taskKeywords.some((keyword) => lowerMessage.includes(keyword));

            if (taskDetected) {
                this.logger.warn('[STAGE-0-MCP] ⚠️ API failed, але знайдено TASK ключові слова — вмикаю TASK режим');
                return {
                    success: true,
                    mode: 'task',
                    confidence: 0.7,
                    reasoning: 'API error, але повідомлення містить дієслова дії або явний запит task mode'
                };
            }

            // FIXED 16.10.2025: Default to chat mode on error (intelligent fallback)
            // Only if no task/dev keywords detected
            this.logger.warn(`[STAGE-0-MCP] ⚠️ Intelligent fallback: використовую CHAT mode замість task`);
            return {
                success: true,
                mode: 'chat',
                confidence: 0.5,
                reasoning: 'Помилка класифікації, використовую chat mode (інтелектуальний fallback)'
            };
        }
    }

    /**
     * Parse LLM response to extract mode selection
     * @private
     */
    _parseResponse(rawResponse) {
        try {
            // Clean markdown wrappers if present
            let cleanResponse = rawResponse.trim();
            cleanResponse = cleanResponse
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

            // Parse JSON
            const parsed = JSON.parse(cleanResponse);

            // Intelligent mode mapping for non-standard values
            const modeMapping = {
                'greeting': 'chat',
                'gratitude': 'chat',
                'thanks': 'chat',
                'appreciation': 'chat',
                'conversation': 'chat',
                'question': 'chat',
                'inquiry': 'chat',
                'informal inquiry': 'chat',
                'personal inquiry': 'chat',
                'casual inquiry': 'chat',
                'casual': 'chat',
                'informal': 'chat',
                'casual/informal': 'chat',
                'friendly': 'chat',
                'personal': 'chat',
                'chat_mode': 'chat',
                'task_mode': 'task',
                'action': 'task',
                'command': 'task'
            };

            // Map mode if needed
            let normalizedMode = parsed.mode;
            if (parsed.mode && modeMapping[parsed.mode.toLowerCase()]) {
                normalizedMode = modeMapping[parsed.mode.toLowerCase()];
                this.logger.system('mode-selection', `[STAGE-0-MCP] 🔄 Mapped "${parsed.mode}" → "${normalizedMode}"`);
            }

            // Validate structure
            if (!normalizedMode || !['chat', 'task', 'dev'].includes(normalizedMode)) {
                throw new Error(`Invalid mode after mapping: ${parsed.mode} → ${normalizedMode}`);
            }

            // Convert string confidence to number
            let confidence = parsed.confidence;
            if (typeof confidence === 'string') {
                const confidenceMap = {
                    'high': 0.95,
                    'medium': 0.7,
                    'low': 0.5,
                    'very_high': 0.98,
                    'very_low': 0.3
                };
                if (confidenceMap[confidence.toLowerCase()]) {
                    confidence = confidenceMap[confidence.toLowerCase()];
                    this.logger.system('mode-selection', `[STAGE-0-MCP] 🔄 Converted confidence "${parsed.confidence}" → ${confidence}`);
                } else {
                    // Try to parse as number
                    confidence = parseFloat(confidence);
                }
            }

            // Normalize confidence if it's a percentage (> 1)
            if (typeof confidence === 'number' && confidence > 1) {
                const originalConfidence = confidence;
                confidence = confidence / 100;
                this.logger.system('mode-selection', `[STAGE-0-MCP] 🔄 Normalized confidence ${originalConfidence} → ${confidence}`);
            }

            if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
                throw new Error(`Invalid confidence after conversion: ${parsed.confidence} → ${confidence}`);
            }

            return {
                mode: normalizedMode,
                confidence: confidence,
                reasoning: parsed.reasoning || 'No reasoning provided'
            };

        } catch (error) {
            this.logger.warn('mode-selection', `Failed to parse response: ${error.message}`);
            this.logger.warn('mode-selection', `Raw response: ${rawResponse}`);

            // Try to fix JavaScript object notation (unquoted keys)
            try {
                const fixedJson = cleanResponse
                    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Quote unquoted keys
                    .replace(/:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}])/g, ': "$1"$2') // Quote unquoted string values
                    .replace(/:\s*true\s*([,}])/g, ': true$1') // Keep boolean true
                    .replace(/:\s*false\s*([,}])/g, ': false$1') // Keep boolean false
                    .replace(/:\s*null\s*([,}])/g, ': null$1') // Keep null
                    .replace(/:\s*(\d+(?:\.\d+)?)\s*([,}])/g, ': $1$2'); // Keep numbers

                const parsed = JSON.parse(fixedJson);
                this.logger.system('mode-selection', '[STAGE-0-MCP] ✅ Successfully converted JavaScript object notation to JSON');

                // Validate structure
                if (parsed.mode && ['chat', 'task'].includes(parsed.mode)) {
                    return {
                        mode: parsed.mode,
                        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
                        reasoning: parsed.reasoning || 'Fixed JavaScript object notation'
                    };
                }
            } catch (fixError) {
                // Continue to simple fallback parsing
            }

            // Simple fallback parsing
            if (rawResponse.toLowerCase().includes('"mode":"chat"') ||
                rawResponse.toLowerCase().includes("'mode':'chat'")) {
                return { mode: 'chat', confidence: 0.7, reasoning: 'Fallback parsing' };
            }

            return { mode: 'task', confidence: 0.7, reasoning: 'Fallback parsing (default)' };
        }
    }
}

export default ModeSelectionProcessor;
