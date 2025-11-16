import axios from 'axios';
import { getLocalLLMFallback } from '../ai/local-llm-fallback.js';

/**
 * Build default headers for LLM HTTP requests.
 * Supports multiple environment variable names so the user can supply
 * credentials without editing source code.
 *
 * Supported env vars:
 * - MCP_LLM_API_KEY (preferred)
 * - LLM_API_KEY
 * - OPENROUTER_API_KEY (legacy support)
 * - MCP_LLM_AUTH_HEADER (override header name, defaults to Authorization)
 * - MCP_LLM_HTTP_REFERER (optional HTTP-Referer header)
 * - MCP_LLM_X_TITLE (optional X-Title header)
 *
 * @param {Object} [extraHeaders] Optional extra headers that override defaults
 * @returns {Object} Headers object ready for axios/fetch
 */
export function buildLLMHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  const rawKey = process.env.MCP_LLM_API_KEY
    || process.env.LLM_API_KEY
    || process.env.OPENROUTER_API_KEY
    || '';

  if (rawKey) {
    const headerName = process.env.MCP_LLM_AUTH_HEADER || 'Authorization';
    headers[headerName] = rawKey.startsWith('Bearer ') ? rawKey : `Bearer ${rawKey}`;
  }

  const referer = process.env.MCP_LLM_HTTP_REFERER;
  if (referer) {
    headers['HTTP-Referer'] = referer;
  }

  const title = process.env.MCP_LLM_X_TITLE;
  if (title) {
    headers['X-Title'] = title;
  }

  return headers;
}

/**
 * Wrapper around axios.post that automatically injects authorization headers
 * from environment variables. Additional axios config (timeout, maxContentLength,
 * validateStatus, etc.) can be supplied via the options argument.
 *
 * FIXED 2025-11-16: Added fallback to local LLM when API is unavailable
 *
 * @param {string} apiUrl Target LLM endpoint URL
 * @param {Object} payload Request payload
 * @param {Object} [options] Optional request options
 * @param {number} [options.timeout=60000] Request timeout in milliseconds
 * @param {number} [options.maxContentLength] axios maxContentLength override
 * @param {Object} [options.headers] Additional headers to merge
 * @param {function} [options.validateStatus] axios validateStatus callback
 * @returns {Promise<import('axios').AxiosResponse>} Axios response promise
 */
export async function postToLLM(apiUrl, payload, options = {}) {
  const {
    headers: extraHeaders,
    timeout,
    ...restOptions
  } = options;

  const axiosConfig = {
    ...restOptions,
    timeout: timeout ?? 60000,
    headers: buildLLMHeaders(extraHeaders)
  };

  try {
    return await axios.post(apiUrl, payload, axiosConfig);
  } catch (error) {
    // FIXED 2025-11-16: Fallback to local LLM on connection errors
    if (error.code === 'ECONNREFUSED' || error.message.includes('Connection refused')) {
      console.warn(`[LLM-API-CLIENT] ⚠️ LLM API unavailable (${apiUrl}), using local fallback`);

      const localLLM = getLocalLLMFallback();
      const response = await localLLM.chatCompletion(
        payload.messages,
        {
          model: payload.model,
          max_tokens: payload.max_tokens,
          temperature: payload.temperature
        }
      );

      // Convert to axios response format
      return {
        status: 200,
        data: response,
        headers: {},
        config: axiosConfig
      };
    }

    // Re-throw other errors
    throw error;
  }
}
