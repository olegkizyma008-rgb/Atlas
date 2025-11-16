/**
 * @fileoverview MCP Server Selection Processor (Stage 2.0-MCP)
 * Аналізує TODO item і визначає 1-2 найрелевантніших MCP серверів
 * Оптимізує кількість tools для Тетяни з 92+ до 30-50
 * 
 * @version 4.2.0
 * @date 2025-10-15
 */

import logger from '../../utils/logger.js';
import axios from 'axios';
import GlobalConfig, { getModelByType } from '../../../config/atlas-config.js';

export class ServerSelectionProcessor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpManager - MCPManager instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ mcpManager, logger: loggerInstance }) {
        this.mcpManager = mcpManager;
        this.logger = loggerInstance || logger;
    }

    /**
     * Виконати підбір MCP серверів для TODO item
     * 
     * @param {Object} context - Stage context
     * @param {Object} context.currentItem - Current TODO item
     * @param {Object} context.todo - Full TODO list
     * @returns {Promise<Object>} Selected servers result
     */
    async execute(context) {
        this.logger.system('server-selection', '[STAGE-2.0-MCP] 🔍 Selecting MCP servers...');

        const { currentItem, todo, container } = context;

        if (!currentItem) {
            throw new Error('currentItem is required for server selection');
        }

        try {
            this.logger.system('server-selection', `[STAGE-2.0-MCP] Item ${currentItem.id}: ${currentItem.action}`);

            // Отримати список доступних MCP серверів
            const availableServers = this._getAvailableServers();

            // NEW: Use Router Classifier for initial fast filtering if available
            let preFilteredServers = availableServers;
            if (context.suggestedServers && context.suggestedServers.length > 0) {
                // Router already narrowed down the selection
                preFilteredServers = availableServers.filter(s =>
                    context.suggestedServers.includes(s.name)
                );
                this.logger.system('server-selection',
                    `[STAGE-2.0-MCP] Using router suggestions: ${context.suggestedServers.join(', ')}`);
            }

            const serversDescription = this._buildServersDescription(preFilteredServers);

            this.logger.system('server-selection', `[STAGE-2.0-MCP] Available servers: ${preFilteredServers.map(s => s.name).join(', ')}`);

            // Викликати LLM для аналізу
            const result = await this._analyzeAndSelectServers(currentItem, serversDescription);

            this.logger.system('server-selection', `[STAGE-2.0-MCP] ✅ Selected: ${result.selected_servers.join(', ')} (confidence: ${result.confidence})`);

            // NEW 19.10.2025: Перевірка кількості серверів (max 2)
            if (result.selected_servers.length > 2) {
                this.logger.warn(`[STAGE-2.0-MCP] ⚠️ Too many servers selected (${result.selected_servers.length}). Item needs split.`, {
                    category: 'server-selection',
                    component: 'server-selection'
                });

                return {
                    success: false,
                    needs_split: true,
                    reasoning: `Item requires ${result.selected_servers.length} servers, but maximum is 2. Should be split into multiple simpler items.`,
                    selected_servers: result.selected_servers,
                    suggested_splits: [
                        `${result.selected_servers.slice(0, 2).join(' + ')}: first part`,
                        `${result.selected_servers.slice(2).join(' + ')}: second part`
                    ],
                    summary: `🔀 Пункт потребує ${result.selected_servers.length} серверів (макс 2). Розбиваю...`,
                    metadata: {
                        itemId: currentItem.id,
                        stage: 'server-selection',
                        requiresSplit: true,
                        serversCount: result.selected_servers.length
                    }
                };
            }

            // Валідація вибраних серверів
            const validation = this._validateSelectedServers(result.selected_servers, availableServers);

            if (!validation.valid) {
                this.logger.warn(`[STAGE-2.0-MCP] ⚠️ Server validation FAILED: ${validation.errors.join(', ')}`, {
                    category: 'server-selection',
                    component: 'server-selection'
                });

                return {
                    success: false,
                    error: 'Invalid servers selected',
                    validationErrors: validation.errors,
                    summary: '⚠️ LLM обрав невалідні сервери',
                    metadata: {
                        itemId: currentItem.id,
                        stage: 'server-selection',
                        needsRetry: true
                    }
                };
            }

            // Успішний результат
            return {
                success: true,
                selected_servers: result.selected_servers,
                selected_prompts: result.selected_prompts,  // NEW: Pass prompts to tool planning stage
                reasoning: result.reasoning,
                confidence: result.confidence,
                summary: `✅ Обрано сервери: ${result.selected_servers.join(', ')}`,
                metadata: {
                    itemId: currentItem.id,
                    stage: 'server-selection',
                    serversCount: result.selected_servers.length,
                    toolsCount: this._countToolsForServers(result.selected_servers)
                }
            };

        } catch (error) {
            this.logger.error(`[STAGE-2.0-MCP] ❌ Server selection failed: ${error.message}`, {
                category: 'server-selection',
                component: 'server-selection',
                errorName: error.name,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * Отримати список доступних MCP серверів
     * @private
     * @returns {Array<Object>} Список серверів з metadata
     */
    _getAvailableServers() {
        const servers = [];

        for (const [name, server] of this.mcpManager.servers.entries()) {
            if (!Array.isArray(server.tools)) continue;

            servers.push({
                name: name,
                toolsCount: server.tools.length,
                tools: server.tools.map(t => t.name)
            });
        }

        return servers;
    }

    /**
     * Створити текстовий опис серверів для LLM
     * @private
     * @param {Array<Object>} servers - Список серверів
     * @returns {string} Текстовий опис
     */
    _buildServersDescription(servers) {
        const lines = servers.map(s => {
            const toolSample = s.tools.slice(0, 5).join(', ');
            const moreCount = s.toolsCount > 5 ? ` (+${s.toolsCount - 5} more)` : '';
            return `- **${s.name}** (${s.toolsCount} tools): ${toolSample}${moreCount}`;
        });

        return lines.join('\n');
    }

    /**
     * Викликати LLM для аналізу та підбору серверів
     * @private
     * @param {Object} item - TODO item
     * @param {string} serversDescription - Опис доступних серверів
     * @returns {Promise<Object>} {selected_servers, reasoning, confidence}
     */
    async _analyzeAndSelectServers(item, serversDescription) {
        // 🎯 CRITICAL: Якщо Atlas вже вказав сервери - використовуй їх!
        if (item.mcp_servers && Array.isArray(item.mcp_servers) && item.mcp_servers.length > 0) {
            this.logger.system('server-selection', `[STAGE-2.0-MCP] 🎯 Atlas pre-selected servers: ${item.mcp_servers.join(', ')}`);

            // Валідуємо що сервери існують
            const availableServerNames = Array.from(this.mcpManager.servers.keys());
            const validServers = item.mcp_servers.filter(s => availableServerNames.includes(s));

            if (validServers.length > 0) {
                this.logger.system('server-selection', `[STAGE-2.0-MCP] ✅ Using Atlas recommendation: ${validServers.join(', ')}`);

                return {
                    selected_servers: validServers,
                    reasoning: `Atlas pre-selected these servers based on task analysis`,
                    confidence: 0.98,
                    selected_prompts: this._assignPromptsForServers(validServers)
                };
            }
        }

        // Завантажити промпт
        const { default: prompt } = await import('../../../prompts/mcp/stage2_0_server_selection.js');

        // Побудувати user message з контекстом про рекомендації Atlas
        const atlasRecommendation = item.mcp_servers && item.mcp_servers.length > 0
            ? `\n\n⚠️ ВАЖЛИВО: Atlas рекомендує сервери: ${item.mcp_servers.join(', ')}\nЯкщо ці сервери підходять - використовуй їх. Змінюй тільки якщо є вагома причина.`
            : '';

        const userMessage = prompt.USER_PROMPT
            .replace('{{ITEM_ID}}', item.id)
            .replace('{{ITEM_ACTION}}', item.action)
            .replace('{{SUCCESS_CRITERIA}}', item.success_criteria || 'Виконати завдання успішно')
            .replace('{{MCP_SERVERS_LIST}}', serversDescription) + atlasRecommendation;

        // Викликати LLM API (швидкий endpoint для classification)
        const modelConfig = getModelByType('classification');

        this.logger.debug('server-selection', `[STAGE-2.0-MCP] Calling LLM API: ${modelConfig.model}`);

        const apiUrl = GlobalConfig.AI_MODEL_CONFIG.apiEndpoint.primary;

        // FIXED 2025-11-16: Add rate limit handling with exponential backoff
        let apiResponse;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                apiResponse = await axios.post(apiUrl, {
                    model: modelConfig.model,
                    messages: [
                        { role: 'system', content: prompt.SYSTEM_PROMPT },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: modelConfig.temperature,
                    max_tokens: modelConfig.max_tokens
                }, {
                    timeout: 60000, // 60s timeout
                    validateStatus: (status) => status < 600
                });

                // Check for rate limit
                if (apiResponse.status === 429) {
                    retryCount++;
                    const retryAfter = apiResponse.data?.error?.retry_after_ms ||
                        apiResponse.headers?.['retry-after'] * 1000 ||
                        35000; // Default 35 seconds

                    if (retryCount < maxRetries) {
                        this.logger.warn(`[STAGE-2.0-MCP] ⚠️ Rate limit (429) - waiting ${retryAfter}ms before retry ${retryCount}/${maxRetries}`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter));
                        continue;
                    }
                }

                // Success or non-retryable error
                break;

            } catch (error) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    throw error;
                }

                const delay = Math.min(10000 * Math.pow(2, retryCount - 1), 60000);
                this.logger.warn(`[STAGE-2.0-MCP] Retry ${retryCount}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        const rawResponse = apiResponse.data.choices[0].message.content;

        this.logger.debug('server-selection', `[STAGE-2.0-MCP] Raw LLM response: ${rawResponse.substring(0, 200)}`);

        // Парсинг JSON (з очищенням markdown)
        const parsed = this._parseServerSelectionResponse(rawResponse);

        return parsed;
    }

    /**
     * Парсити відповідь LLM (з очищенням markdown)
     * @private
     * @param {string} response - Raw LLM response
     * @returns {Object} Parsed result
     */
    _parseServerSelectionResponse(response) {
        let cleanResponse = response;

        if (typeof response === 'string') {
            // Видалити markdown wrappers
            cleanResponse = response
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
        }

        // First attempt: standard JSON parsing
        try {
            const parsed = JSON.parse(cleanResponse);
            return this._validateAndProcessParsedResponse(parsed);

        } catch (error) {
            this.logger.warn(`[STAGE-2.0-MCP] Standard JSON parse failed: ${error.message}. Trying fallback parsing...`, {
                category: 'server-selection',
                component: 'server-selection'
            });

            // Second attempt: Fix JavaScript object notation and incomplete JSON
            try {
                let fixedJson = cleanResponse;

                // Convert JavaScript object notation to valid JSON (unquoted keys)
                fixedJson = fixedJson
                    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
                    .replace(/:\s*'([^']*)'/g, ': "$1"')  // Single quotes to double quotes
                    .replace(/,\s*}/g, '}')  // Remove trailing commas
                    .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

                // FIXED 2025-11-16: Handle incomplete fractional numbers (e.g., "0." at end)
                // Replace incomplete numbers like "0." with "0"
                fixedJson = fixedJson.replace(/:\s*(\d+)\.\s*([,}\]])/g, ': $1$2');

                // Handle incomplete JSON by trying to complete it
                if (!fixedJson.endsWith('}') && !fixedJson.endsWith(']')) {
                    // Try to find the last complete structure
                    const openBraces = (fixedJson.match(/{/g) || []).length;
                    const closeBraces = (fixedJson.match(/}/g) || []).length;
                    const openBrackets = (fixedJson.match(/\[/g) || []).length;
                    const closeBrackets = (fixedJson.match(/]/g) || []).length;

                    // Add missing closing braces/brackets
                    for (let i = 0; i < openBraces - closeBraces; i++) {
                        fixedJson += '}';
                    }
                    for (let i = 0; i < openBrackets - closeBrackets; i++) {
                        fixedJson += ']';
                    }
                }

                const parsed = JSON.parse(fixedJson);
                this.logger.system('server-selection', '[STAGE-2.0-MCP] ✅ Fallback JSON parsing successful');
                return this._validateAndProcessParsedResponse(parsed);

            } catch (fallbackError) {
                this.logger.error(`[STAGE-2.0-MCP] ❌ Fallback JSON parse also failed: ${fallbackError.message}`, {
                    category: 'server-selection',
                    component: 'server-selection',
                    rawResponse: cleanResponse.substring(0, 500)
                });

                // Third attempt: Extract servers using regex as last resort
                return this._extractServersWithRegex(cleanResponse);
            }
        }
    }

    /**
     * Validate and process parsed response
     * @private
     * @param {Object} parsed - Parsed JSON object
     * @returns {Object} Processed result
     */
    _validateAndProcessParsedResponse(parsed) {
        // Валідація структури
        if (!parsed.selected_servers || !Array.isArray(parsed.selected_servers)) {
            throw new Error('Invalid response: selected_servers must be an array');
        }

        if (parsed.selected_servers.length === 0) {
            throw new Error('Invalid response: selected_servers cannot be empty');
        }

        if (parsed.selected_servers.length > 2) {
            this.logger.warn('[STAGE-2.0-MCP] ⚠️ LLM selected >2 servers, trimming to 2', {
                category: 'server-selection',
                component: 'server-selection'
            });
            parsed.selected_servers = parsed.selected_servers.slice(0, 2);
        }

        // Auto-assign specialized prompts based on selected servers
        const selected_prompts = this._assignPromptsForServers(parsed.selected_servers);

        this.logger.system('server-selection', `[STAGE-2.0-MCP] 🎯 Auto-assigned prompts: ${selected_prompts.join(', ')}`);

        return {
            selected_servers: parsed.selected_servers,
            selected_prompts: selected_prompts.length > 0 ? selected_prompts : null,
            reasoning: parsed.reasoning || 'No reasoning provided',
            confidence: parsed.confidence || 0.5
        };
    }

    /**
     * Assign prompts for selected servers
     * @private
     * @param {Array<string>} servers - Selected server names
     * @returns {Array<string>} Assigned prompt names
     */
    _assignPromptsForServers(servers) {
        // Dynamic prompt mapping based on server names
        // Convention: TETYANA_PLAN_TOOLS_{SERVER_NAME_UPPERCASE}
        return servers
            .map(server => `TETYANA_PLAN_TOOLS_${server.toUpperCase()}`)
            .filter(Boolean);
    }

    /**
     * Extract servers using regex as last resort fallback
     * @private
     * @param {string} response - Raw response
     * @returns {Object} Extracted result with fallback servers
     */
    _extractServersWithRegex(response) {
        this.logger.warn('[STAGE-2.0-MCP] ⚠️ Using regex fallback for server extraction', {
            category: 'server-selection',
            component: 'server-selection'
        });

        // Try to extract server names using regex patterns
        const serverPatterns = [
            /["']?playwright["']?/gi,
            /["']?filesystem["']?/gi,
            /["']?shell["']?/gi,
            /["']?applescript["']?/gi,
            /["']?memory["']?/gi,
            /["']?java_sdk["']?/gi,
            /["']?python_sdk["']?/gi
        ];

        const foundServers = [];
        for (const pattern of serverPatterns) {
            const matches = response.match(pattern);
            if (matches) {
                const serverName = matches[0].replace(/["']/g, '').toLowerCase();
                if (!foundServers.includes(serverName)) {
                    foundServers.push(serverName);
                }
            }
        }

        // If no servers found, default to playwright (most common for web scraping)
        if (foundServers.length === 0) {
            foundServers.push('playwright');
            this.logger.warn('[STAGE-2.0-MCP] ⚠️ No servers detected, defaulting to playwright', {
                category: 'server-selection',
                component: 'server-selection'
            });
        }

        // Limit to 2 servers
        const selected_servers = foundServers.slice(0, 2);

        // Auto-assign prompts using dynamic convention
        const extracted = selected_servers;
        const selected_prompts = extracted
            .map(server => `TETYANA_PLAN_TOOLS_${server.toUpperCase()}`)
            .filter(Boolean);

        this.logger.system('server-selection', `[STAGE-2.0-MCP] 🔧 Regex fallback result - servers: ${selected_servers.join(', ')}, prompts: ${selected_prompts.join(', ')}`);

        return {
            selected_servers,
            selected_prompts: selected_prompts.length > 0 ? selected_prompts : null,
            reasoning: 'Extracted using regex fallback due to JSON parsing failure',
            confidence: 0.3  // Lower confidence for fallback method
        };
    }

    /**
     * Валідувати вибрані сервери
     * @private
     * @param {Array<string>} selectedServers - Обрані сервери
     * @param {Array<Object>} availableServers - Доступні сервери
     * @returns {Object} {valid, errors}
     */
    _validateSelectedServers(selectedServers, availableServers) {
        const errors = [];
        const availableNames = availableServers.map(s => s.name);

        for (const serverName of selectedServers) {
            if (!availableNames.includes(serverName)) {
                errors.push(`Server '${serverName}' not available. Available: ${availableNames.join(', ')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Підрахувати кількість tools для вибраних серверів
     * @private
     * @param {Array<string>} selectedServers - Обрані сервери
     * @returns {number} Total tools count
     */
    _countToolsForServers(selectedServers) {
        let count = 0;

        for (const serverName of selectedServers) {
            const server = this.mcpManager.servers.get(serverName);
            if (server && Array.isArray(server.tools)) {
                count += server.tools.length;
            }
        }

        return count;
    }
}

export default ServerSelectionProcessor;
