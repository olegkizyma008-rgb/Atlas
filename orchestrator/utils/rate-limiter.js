/**
 * @fileoverview Advanced Rate Limiter with Exponential Backoff
 * Handles 429 errors and prevents API overload
 * 
 * @version 1.0.0
 * @date 2025-11-07
 */

import logger from './logger.js';

export class RateLimiter {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 5;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 60000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitterRange = options.jitterRange || 0.3;
    this.requestQueue = new Map();
    this.rateLimitWindows = new Map();
  }

  /**
   * Execute request with rate limiting and retry logic
   */
  async executeWithRetry(fn, context = {}) {
    const { endpoint = 'default', priority = 0 } = context;
    let attempt = 0;
    let lastError;

    while (attempt < this.maxRetries) {
      try {
        // Check if we're in a rate limit window
        const waitTime = this.getWaitTime(endpoint);
        if (waitTime > 0) {
          logger.info(`[RATE-LIMITER] Waiting ${waitTime}ms before attempt ${attempt + 1}/${this.maxRetries}`, {
            endpoint,
            category: 'rate-limiter'
          });
          await this.delay(waitTime);
        }

        // Execute the function
        const result = await fn();

        // Success - clear any rate limit window
        this.clearRateLimit(endpoint);
        return result;

      } catch (error) {
        lastError = error;
        attempt++;

        if (this.isRateLimitError(error)) {
          const backoffDelay = this.calculateBackoff(attempt, error);
          this.setRateLimit(endpoint, backoffDelay);

          logger.warn(`[RATE-LIMITER] Rate limit hit (429), retry ${attempt}/${this.maxRetries} after ${backoffDelay}ms`, {
            endpoint,
            attempt,
            delay: backoffDelay,
            category: 'rate-limiter'
          });

          if (attempt >= this.maxRetries) {
            throw new Error(`Rate limit exceeded after ${this.maxRetries} attempts: ${error.message}`);
          }
        } else if (this.isRetryableError(error)) {
          const backoffDelay = this.calculateBackoff(attempt);
          logger.warn(`[RATE-LIMITER] Retryable error, attempt ${attempt}/${this.maxRetries}`, {
            error: error.message,
            delay: backoffDelay,
            category: 'rate-limiter'
          });

          if (attempt < this.maxRetries) {
            await this.delay(backoffDelay);
          }
        } else {
          // Non-retryable error
          throw error;
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.maxRetries} attempts`);
  }

  /**
   * Calculate exponential backoff with jitter
   * FIXED 2025-11-18: Reduced jitter from 30% to 10% for more predictable delays
   */
  calculateBackoff(attempt, error = null) {
    // Check if server provided Retry-After header
    if (error && error.retryAfter) {
      return Math.min(error.retryAfter * 1000, this.maxDelay);
    }

    // Exponential backoff: base * (multiplier ^ attempt)
    let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);

    // FIXED 2025-11-18: Reduce jitter from 30% to 10% for predictability
    // Add jitter to prevent thundering herd (but less aggressive)
    const jitter = delay * 0.1 * (Math.random() - 0.5);
    delay = Math.max(this.baseDelay, delay + jitter);

    // Cap at maximum delay
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Check if error is rate limit related
   */
  isRateLimitError(error) {
    return error.status === 429 ||
      error.message?.includes('429') ||
      error.message?.toLowerCase().includes('rate limit');
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status) ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('timeout');
  }

  /**
   * Set rate limit window for endpoint
   */
  setRateLimit(endpoint, duration) {
    this.rateLimitWindows.set(endpoint, {
      until: Date.now() + duration,
      duration
    });
  }

  /**
   * Clear rate limit for endpoint
   */
  clearRateLimit(endpoint) {
    this.rateLimitWindows.delete(endpoint);
  }

  /**
   * Get wait time for endpoint
   */
  getWaitTime(endpoint) {
    const window = this.rateLimitWindows.get(endpoint);
    if (!window) return 0;

    const remaining = window.until - Date.now();
    if (remaining <= 0) {
      this.clearRateLimit(endpoint);
      return 0;
    }

    return remaining;
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a rate-limited version of a function
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      return this.executeWithRetry(() => fn(...args), context);
    };
  }
}

// Singleton instance for global use
export const globalRateLimiter = new RateLimiter({
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  backoffMultiplier: 2.5,
  jitterRange: 0.3
});

export default RateLimiter;
