/**
 * FALLBACK LLM INTEGRATION
 * Інтеграція з локальним fallback LLM сервером
 */

import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import * as agentProtocol from '../agents/agent-protocol.js';
import GlobalConfig from '../../config/atlas-config.js';
import modelChecker from './model-availability-checker.js';
import adaptiveThrottler from '../utils/adaptive-request-throttler.js';

// Model registry - dynamically built from GlobalConfig (lazy loaded)
let MODELS_CACHE = null;

function getAvailableModels() {
  if (MODELS_CACHE) return MODELS_CACHE;

  const models = [];

  try {
    // Add models from AI_MODEL_CONFIG
    if (GlobalConfig.AI_MODEL_CONFIG?.models) {
      Object.values(GlobalConfig.AI_MODEL_CONFIG.models).forEach(config => {
        if (config.model && !models.includes(config.model)) {
          models.push(config.model);
        }
      });
    }

    // Add models from MCP_MODEL_CONFIG
    if (GlobalConfig.MCP_MODEL_CONFIG?.stages) {
      Object.values(GlobalConfig.MCP_MODEL_CONFIG.stages).forEach(config => {
        if (config.model && !models.includes(config.model)) {
          models.push(config.model);
        }
      });
    }
  } catch (error) {
    logger.warn('[FALLBACK-LLM] Failed to load models from GlobalConfig, using defaults');
  }

  // Fallback to basic models if config failed
  if (models.length === 0) {
    models.push('atlas-ministral-3b', 'atlas-gpt-4o-mini');
  }

  MODELS_CACHE = models;
  return models;
}

const MODELS = getAvailableModels();

// Token budget controls
const MAX_INPUT_TOKENS = parseInt((process.env && process.env.FALLBACK_MAX_INPUT_TOKENS) || '8000', 10);
const TRUNCATE_STRATEGY = String((process.env && process.env.FALLBACK_TRUNCATE_STRATEGY) || 'clip').toLowerCase();

// Estimate token usage (approximate: 1 token ~= 4 chars)
function estimateTokens(messages) {
  try {
    let totalChars = 0;
    for (const m of messages) {
      const c = typeof m?.content === 'string'
        ? m.content
        : Array.isArray(m?.content)
          ? m.content.map(x => (typeof x?.text === 'string' ? x.text : '')).join(' ')
          : '';
      totalChars += (c || '').length;
    }
    return Math.ceil(totalChars / 4);
  } catch {
    return 0;
  }
}

function truncateToBudget(messages, budgetTokens) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user') || messages[messages.length - 1];
  const str = typeof lastUser?.content === 'string'
    ? lastUser.content
    : Array.isArray(lastUser?.content)
      ? lastUser.content.map(x => (typeof x?.text === 'string' ? x.text : '')).join(' ')
      : '';
  const maxChars = Math.max(0, budgetTokens * 4);
  const clipped = str.length > maxChars ? (str.slice(0, maxChars) + '…') : str;
  return [{ role: 'user', content: clipped }];
}

// Chat completion function
export async function chatCompletion(messages, options = {}) {
  const {
    model = MODELS[0],
    max_tokens = 400,
    temperature = 0.7,
    stream = false,
    baseUrl = 'http://localhost:4000'
  } = options;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array is required and cannot be empty');
  }

  const promptTokens = estimateTokens(messages);
  let effectiveMessages = messages;
  let atlas_truncated = false;

  if (promptTokens > MAX_INPUT_TOKENS) {
    if (TRUNCATE_STRATEGY === 'reject') {
      throw new Error(`Token limit exceeded: ${promptTokens} > ${MAX_INPUT_TOKENS}`);
    } else {
      effectiveMessages = truncateToBudget(messages, MAX_INPUT_TOKENS);
      atlas_truncated = true;
    }
  }

  try {
    const response = await adaptiveThrottler.throttledRequest(
      async () => axios.post(`${baseUrl}/v1/chat/completions`, {
        model,
        messages: effectiveMessages,
        max_tokens,
        temperature,
        stream
      }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      }),
      { priority: 10, metadata: { type: 'fallback_llm', model } }
    );

    if (stream) {
      return response; // Return raw response for streaming
    }

    return {
      id: response.data.id,
      object: response.data.object,
      created: response.data.created,
      model: response.data.model,
      choices: response.data.choices,
      usage: {
        ...response.data.usage,
        atlas_truncated
      }
    };
  } catch (error) {
    console.error('[FALLBACK-LLM] Request failed:', error.message);

    // UPDATED 2025-11-10: Try alternative models via ModelAvailabilityChecker (CACHED)
    if (error.response?.status === 429 || error.response?.status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
      console.log('[FALLBACK-LLM] 🔄 Trying alternative models...');

      try {
        // FIXED 2025-11-10: Use cached fetchAvailableModels instead of direct GET /v1/models
        const apiModels = await modelChecker.fetchAvailableModels();

        if (!apiModels || apiModels.length === 0) {
          throw new Error('No models available from API');
        }

        // CRITICAL 2025-11-10: Limit to first 5 models to prevent burst
        const modelsToTry = apiModels.slice(0, 5).map(m => m.id);
        console.log(`[FALLBACK-LLM] 🔍 Checking ${modelsToTry.length} models (limited from ${apiModels.length})`);

        // Try each available model with delays
        for (const altModel of modelsToTry) {
          if (altModel === model) continue; // Skip the failed model

          const modelResult = await modelChecker.getAvailableModel(altModel, null, 'general');
          if (modelResult.available) {
            console.log(`[FALLBACK-LLM] ✅ Trying alternative model: ${altModel}`);

            const retryResponse = await adaptiveThrottler.throttledRequest(
              async () => axios.post(`${baseUrl}/v1/chat/completions`, {
                model: altModel,
                messages: effectiveMessages,
                max_tokens,
                temperature,
                stream
              }, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
              }),
              { priority: 8, retryable: false, metadata: { type: 'fallback_retry', model: altModel } }
            );

            return {
              id: retryResponse.data.id,
              object: retryResponse.data.object,
              created: retryResponse.data.created,
              model: retryResponse.data.model,
              choices: retryResponse.data.choices,
              usage: {
                ...retryResponse.data.usage,
                atlas_truncated,
                atlas_fallback_model: altModel
              }
            };
          }
        }
      } catch (fallbackError) {
        console.error('[FALLBACK-LLM] All alternative models failed:', fallbackError.message);
      }
    }

    // Ultimate fallback to simple rule-based response
    const userMsg = effectiveMessages.slice().reverse().find(m => m.role === 'user')?.content || '';
    const reply = generateSimpleReply(userMsg, model);

    return {
      id: 'fallback_' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: reply },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: atlas_truncated ? MAX_INPUT_TOKENS : promptTokens,
        completion_tokens: Math.ceil(reply.length / 4),
        total_tokens: (atlas_truncated ? MAX_INPUT_TOKENS : promptTokens) + Math.ceil(reply.length / 4),
        atlas_truncated,
        atlas_rule_based: true
      }
    };
  }
}

// Export available models list
export function getAvailableModelsList() {
  return MODELS.map(m => ({
    id: m,
    object: 'model',
    created: Date.now(),
    owned_by: 'atlas-fallback'
  }));
}

// Process function for agent protocol compatibility
export async function process(input, options = {}) {
  try {
    logger.info('Активація запасної LLM моделі');

    // Форматування запиту згідно протоколу
    const query = agentProtocol.createQuery(input, {
      isFallback: true,
      options
    });

    // Перетворення input в формат messages для chatCompletion
    const messages = Array.isArray(input) ? input : [{ role: 'user', content: input }];
    const result = await chatCompletion(messages, options);

    // Форматування відповіді згідно протоколу
    return agentProtocol.createResponse(result);
  } catch (error) {
    logger.error(`Помилка запасної LLM: ${error.message}`);
    return agentProtocol.createError(error.message, 'FALLBACK_LLM_ERROR');
  }
}

// Simple rule-based reply generation
function generateSimpleReply(user, model) {
  const u = String(user || '').trim();
  if (!u) return 'Я тут. Чим допомогти?';
  if (/привіт|вітаю|hello|hi/i.test(u)) return 'Привіт! Я локальний фолбек. Чим допомогти?';
  if (/як.*зват|хто ти|your name/i.test(u)) return 'Я локальний фолбек ATLAS. Можете продовжити питання.';

  // lightweight echo with safety cap
  const maxLen = 600;
  const echo = u.length > maxLen ? u.slice(0, maxLen) + '…' : u;
  return `Коротко по суті: ${echo}`;
}
