/**
 * @fileoverview LLM Client - для MCP backend reasoning
 * Використовується коли MCP backend потребує LLM для planning або генерації відповідей
 * 
 * @version 4.0.0
 * @date 2025-10-13
 */

import logger from '../utils/logger.js';
import { globalRateLimiter } from '../utils/rate-limiter.js';

/**
 * LLM Client для MCP mode
 * Використовує той самий endpoint що й система (port 4000)
 */
export class LLMClient {
  /**
   * @param {Object} config - LLM конфігурація з AI_BACKEND_CONFIG.providers.mcp.llm
   */
  constructor(config) {
    this.config = config;
    this.provider = config.provider || 'atlas';
    this.endpoint = config.apiEndpoint || 'http://localhost:4000/v1/chat/completions';
    // Use model from config, fallback to global config
    this.model = config.model;
    this.temperature = config.temperature || 0.3;
  }

  /**
   * Ініціалізація LLM client
   */
  async initialize() {
    logger.system('llm-client', `[LLM Client] Initializing (${this.model} @ ${this.endpoint})`);

    // Перевірка доступності endpoint з retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const healthCheck = await fetch(this.endpoint.replace('/v1/chat/completions', '/health'), {
          method: 'GET',
          signal: controller.signal
        }).catch(() => null);
        
        clearTimeout(timeoutId);

        if (healthCheck && healthCheck.ok) {
          logger.system('llm-client', '[LLM Client] ✅ LLM endpoint is available');
          return;
        } else {
          logger.warn('llm-client', `[LLM Client] ⚠️ LLM endpoint health check failed (attempt ${4 - retries}/3)`);
        }
      } catch (error) {
        logger.warn('llm-client', `[LLM Client] ⚠️ Could not verify endpoint: ${error.message} (attempt ${4 - retries}/3)`);
      }
      
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    logger.error('[LLM Client] Failed to verify endpoint after 3 attempts', {
      category: 'llm-client',
      component: 'llm-client'
    });
  }

  /**
   * Згенерувати відповідь через LLM
   * 
   * @param {Object} options - Параметри генерації
   * @param {string} options.prompt - Основний prompt
   * @param {string} options.systemPrompt - System prompt (опціонально)
   * @param {Array} options.context - Історія розмови (опціонально)
   * @param {Array} options.toolResults - Результати виконання tools (опціонально)
   * @param {number} options.temperature - Temperature для LLM (опціонально)
   * @param {number} options.max_tokens - Max tokens для відповіді (опціонально)
   * @returns {Promise<string>} Згенерована відповідь
   */
  async generate(options) {
    const { 
      prompt, 
      systemPrompt, 
      context = [], 
      toolResults = [],
      temperature,
      max_tokens
    } = options;

    logger.debug('llm-client', '[LLM Client] Generating response', {
      model: this.model,
      promptLength: prompt.length,
      contextMessages: context.length,
      toolResults: toolResults.length
    });

    // Побудувати messages для LLM
    const messages = [];

    // System prompt
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Context history
    if (context.length > 0) {
      messages.push(...context);
    }

    // Tool results (якщо є)
    if (toolResults.length > 0) {
      const toolSummary = this._formatToolResults(toolResults);
      messages.push({
        role: 'system',
        content: `TOOL EXECUTION RESULTS:\n${toolSummary}`
      });
    }

    // User prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    // API request with optional parameters
    const response = await this.complete(messages, {
      temperature,
      max_tokens
    });

    return response;
  }

  /**
   * Chat - викликає LLM API для генерації відповіді (OpenAI-compatible format)
   * @param {Object} options - Chat completion options
   * @returns {Promise<Object>} Full API response with choices
   */
  async chat(options) {
    const {
      model = this.model,
      messages,
      temperature = this.temperature,
      max_tokens = 1000,
      response_format = null
    } = options;

    // Use rate limiter for API calls
    return globalRateLimiter.executeWithRetry(async () => {
      const requestBody = {
        model,
        messages,
        temperature,
        max_tokens
      };

      // Add response_format if specified (for JSON mode)
      if (response_format) {
        requestBody.response_format = response_format;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = new Error(`LLM API error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid LLM API response format');
      }

      return data; // Return full response for compatibility
    }, { 
      endpoint: this.endpoint,
      priority: 1 
    });
  }

  /**
   * Complete - викликає LLM API для генерації відповіді
   * @param {Array} messages - Масив повідомлень для LLM
   * @param {Object} options - Додаткові опції
   * @returns {Promise<string>} Згенерована відповідь
   * @private
   */
  async complete(messages, options = {}) {
    const temperature = options.temperature || this.temperature;
    const max_tokens = options.max_tokens || 1000;

    // Use rate limiter for API calls
    return globalRateLimiter.executeWithRetry(async () => {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens
        })
      });

      if (!response.ok) {
        const error = new Error(`LLM API error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid LLM API response format');
      }

      return data.choices[0].message.content;
    }, {
      endpoint: this.endpoint,
      priority: 1
    });
  }

  /**
   * Форматувати tool results для передачі в LLM
   * @private
   */
  _formatToolResults(toolResults) {
    return toolResults.map((result, index) => {
      if (result.success) {
        return `${index + 1}. ✅ ${result.tool}: ${JSON.stringify(result.result, null, 2)}`;
      } else {
        return `${index + 1}. ❌ ${result.tool}: Error - ${result.error}`;
      }
    }).join('\n\n');
  }

  /**
   * Streaming generation (для майбутнього)
   * @param {Object} options - Параметри генерації
   * @param {Function} onChunk - Callback для кожного chunk
   */
  async generateStream(options, onChunk) {
    // TODO: Implement streaming через Server-Sent Events
    throw new Error('Streaming not implemented yet');
  }

  /**
   * Graceful shutdown (немає процесів для зупинки)
   */
  async shutdown() {
    logger.system('llm-client', '[LLM Client] Shutting down (no active processes)');
    // HTTP client не потребує cleanup
  }
}

export default LLMClient;
