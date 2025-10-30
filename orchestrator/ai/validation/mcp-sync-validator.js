/**
 * @fileoverview MCP Sync Validator
 * Level 4: Звірка з актуальним tools/list від MCP (КРИТИЧНИЙ)
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

import logger from '../../utils/logger.js';
import { VALIDATION_CONFIG } from '../../../config/validation-config.js';

/**
 * MCP Sync Validator
 * Перевіряє tool calls проти РЕАЛЬНИХ інструментів з MCP servers
 *
 * Особливості:
 * - Викликає tools/list для отримання актуального списку
 * - Кешування на 60 секунд
 * - Автокорекція назв через fuzzy matching з РЕАЛЬНИМИ даними
 * - Fallback на кешований список якщо MCP недоступний
 *
 * Performance: ~100ms для 10 tool calls (з кешем)
 */
export class MCPSyncValidator {
  /**
   * @param {Object} mcpManager - MCP Manager instance
   */
  constructor(mcpManager) {
    if (!mcpManager) {
      throw new Error('MCPSyncValidator requires mcpManager');
    }

    this.mcpManager = mcpManager;
    this.config = VALIDATION_CONFIG.mcpSync;
    this.cache = new Map();  // serverName -> { tools, timestamp }
    this.validatedCount = 0;

    logger.debug('mcp-sync-validator',
      `MCPSyncValidator initialized (cacheTTL: ${this.config.cacheTTL}ms, autoCorrect: ${this.config.autoCorrect})`);
  }

  /**
   * Validate tool calls against actual MCP tools/list
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

    // Get actual tools list from all servers
    const actualToolsMap = await this._getActualToolsList();

    for (let i = 0; i < toolCalls.length; i++) {
      const call = { ...toolCalls[i] };
      let corrected = false;

      const serverTools = actualToolsMap.get(call.server);

      if (!serverTools) {
        errors.push({
          type: 'server_not_available',
          message: `Server '${call.server}' not available`,
          availableServers: Array.from(actualToolsMap.keys()),
          toolCall: call,
          index: i
        });
        correctedCalls.push(call);
        continue;
      }

      // FIXED 2025-10-31: Check tool existence with flexible name matching
      // MCP tools may have different formats:
      // 1. applescript_execute (server_tool with single _)
      // 2. applescript__execute (server__tool with double __)
      // 3. execute (just tool name)
      let toolExists = serverTools.some(t => t.name === call.tool);
      
      // If not found, try without server prefix (after double __)
      if (!toolExists && call.tool.includes('__')) {
        const toolNameWithoutPrefix = call.tool.split('__')[1];
        toolExists = serverTools.some(t => t.name === toolNameWithoutPrefix);
        
        // CRITICAL FIX: Also try server_tool format (single underscore)
        // applescript__execute → look for applescript_execute
        if (!toolExists) {
          const serverToolFormat = `${call.server}_${toolNameWithoutPrefix}`;
          toolExists = serverTools.some(t => t.name === serverToolFormat);
        }
      }
      
      // If still not found, try with server prefix
      if (!toolExists && !call.tool.includes('__')) {
        const toolNameWithPrefix = `${call.server}__${call.tool}`;
        toolExists = serverTools.some(t => t.name === toolNameWithPrefix);
      }
      
      const toolName = call.tool;

      if (!toolExists) {
        // Auto-correction через fuzzy matching з РЕАЛЬНИМИ інструментами
        if (this.config.autoCorrect) {
          const realToolNames = serverTools.map(t => t.name);
          const correctedTool = this._findSimilarTool(toolName, realToolNames);

          if (correctedTool && correctedTool.similarity >= this.config.similarityThreshold) {
            // Автокорекція
            const oldTool = call.tool;
            call.tool = call.tool.includes('__')
              ? `${call.server}__${correctedTool.name}`
              : correctedTool.name;

            corrected = true;

            corrections.push({
              type: 'tool_name_corrected',
              tool: `${call.server}__${toolName}`,
              original: oldTool,
              corrected: call.tool,
              similarity: correctedTool.similarity,
              source: 'mcp_tools_list',
              index: i
            });

            logger.debug('mcp-sync-validator',
              `Auto-corrected: ${oldTool} → ${call.tool} (similarity: ${(correctedTool.similarity * 100).toFixed(0)}%)`);
          } else {
            // Не знайдено схожого інструменту
            errors.push({
              type: 'tool_not_found_in_mcp',
              message: `Tool '${toolName}' not found in MCP server's tools/list`,
              server: call.server,
              tool: toolName,
              availableTools: realToolNames.slice(0, 10),
              totalTools: realToolNames.length,
              suggestion: correctedTool
                ? `Did you mean: ${correctedTool.name}? (similarity: ${(correctedTool.similarity * 100).toFixed(0)}%)`
                : 'No similar tools found',
              toolCall: call,
              index: i
            });
          }
        } else {
          // Auto-correction вимкнено
          const realToolNames = serverTools.map(t => t.name);
          errors.push({
            type: 'tool_not_found_in_mcp',
            message: `Tool '${toolName}' not found in MCP server's tools/list`,
            server: call.server,
            tool: toolName,
            availableTools: realToolNames.slice(0, 10),
            totalTools: realToolNames.length,
            toolCall: call,
            index: i
          });
        }
      }

      correctedCalls.push(call);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrections,
      correctedCalls: corrections.length > 0 ? correctedCalls : null,
      metadata: {
        cacheHits: this._getCacheHits(actualToolsMap),
        cacheMisses: this._getCacheMisses(actualToolsMap)
      }
    };
  }

  /**
   * Get actual tools list from all MCP servers
   * With caching (60 seconds TTL)
   * @private
   */
  async _getActualToolsList() {
    const now = Date.now();
    const toolsMap = new Map();

    for (const [serverName, server] of this.mcpManager.servers.entries()) {
      // Check cache
      const cached = this.cache.get(serverName);
      if (cached && (now - cached.timestamp) < this.config.cacheTTL) {
        toolsMap.set(serverName, cached.tools);
        continue;
      }

      // Request fresh tools/list from MCP
      try {
        // Використовуємо існуючий метод requestToolsList якщо є
        if (typeof server.requestToolsList === 'function') {
          await server.requestToolsList();
        }

        const tools = server.getTools();
        toolsMap.set(serverName, tools);

        // Update cache
        this.cache.set(serverName, {
          tools,
          timestamp: now
        });

        logger.debug('mcp-sync-validator',
          `Refreshed tools list for ${serverName}: ${tools.length} tools`);

      } catch (error) {
        logger.warn('mcp-sync-validator',
          `Failed to get tools from ${serverName}: ${error.message}`);

        // Fallback на кешований список або існуючий
        if (cached) {
          logger.debug('mcp-sync-validator',
            `Using cached tools for ${serverName} (stale)`);
          toolsMap.set(serverName, cached.tools);
        } else if (Array.isArray(server.tools)) {
          logger.debug('mcp-sync-validator',
            `Using existing tools for ${serverName}`);
          toolsMap.set(serverName, server.tools);
        } else {
          logger.warn('mcp-sync-validator',
            `No tools available for ${serverName}`);
          toolsMap.set(serverName, []);
        }
      }
    }

    return toolsMap;
  }

  /**
   * Find similar tool using fuzzy matching
   * @private
   */
  _findSimilarTool(target, candidates) {
    if (!candidates || candidates.length === 0) return null;

    const targetLower = target.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const candidateLower = candidate.toLowerCase();
      let score = 0;

      // Exact match
      if (candidateLower === targetLower) {
        return { name: candidate, similarity: 1.0 };
      }

      // Substring match
      if (candidateLower.includes(targetLower)) {
        score += 0.8;
      } else if (targetLower.includes(candidateLower)) {
        score += 0.7;
      }

      // Levenshtein distance
      const distance = this._levenshteinDistance(targetLower, candidateLower);
      const maxLen = Math.max(targetLower.length, candidateLower.length);
      const similarity = 1 - (distance / maxLen);
      score += similarity * 0.5;

      // Starts with
      if (candidateLower.startsWith(targetLower) || targetLower.startsWith(candidateLower)) {
        score += 0.3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch ? { name: bestMatch, similarity: bestScore } : null;
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
   * Get cache hits count
   * @private
   */
  _getCacheHits(toolsMap) {
    let hits = 0;
    const now = Date.now();

    for (const serverName of toolsMap.keys()) {
      const cached = this.cache.get(serverName);
      if (cached && (now - cached.timestamp) < this.config.cacheTTL) {
        hits++;
      }
    }

    return hits;
  }

  /**
   * Get cache misses count
   * @private
   */
  _getCacheMisses(toolsMap) {
    return toolsMap.size - this._getCacheHits(toolsMap);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.debug('mcp-sync-validator', 'Cache cleared');
  }

  /**
   * Get validator statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      validatedCount: this.validatedCount,
      cacheSize: this.cache.size,
      cacheTTL: this.config.cacheTTL
    };
  }
}

export default MCPSyncValidator;
