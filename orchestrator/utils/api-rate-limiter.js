/**
 * API Rate Limiter with Queue Management
 * Prevents simultaneous API calls and manages rate limits
 * Created: 2025-11-10
 */

import { EventEmitter } from 'events';

class APIRateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.config = {
      minDelay: options.minDelay || 1000,           // Minimum 1 second between calls
      maxDelay: options.maxDelay || 30000,          // Maximum 30 seconds for backoff
      maxConcurrent: options.maxConcurrent || 1,    // Only 1 call at a time by default
      retryAttempts: options.retryAttempts || 3,    // Max retry attempts
      backoffMultiplier: options.backoffMultiplier || 2, // Exponential backoff multiplier
      queueTimeout: options.queueTimeout || 60000,  // 60 seconds queue timeout
      burstLimit: options.burstLimit || 30,         // Max calls per burst window (allows dense fallback sequences)
      burstWindow: options.burstWindow || 15000,    // Burst window in ms (rapid recovery between bursts)
    };
    
    // State management
    this.queue = [];
    this.activeRequests = 0;
    this.lastCallTime = 0;
    this.isProcessing = false;
    this.callHistory = [];
    this.consecutiveErrors = 0;
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      queuedRequests: 0,
      droppedRequests: 0,
      averageWaitTime: 0,
      currentDelay: this.config.minDelay
    };
    
    // Start queue processor
    this.startQueueProcessor();
  }
  
  /**
   * Main entry point for making rate-limited API calls
   */
  async call(requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fn: requestFn,
        resolve,
        reject,
        attempts: 0,
        priority: options.priority || 0,
        timeout: options.timeout || this.config.queueTimeout,
        retryable: options.retryable !== false,
        metadata: options.metadata || {},
        queuedAt: Date.now()
      };
      
      // Check burst limit
      if (!this.checkBurstLimit()) {
        this.stats.droppedRequests++;
        reject(new Error('RATE_LIMIT_EXCEEDED: Burst limit reached'));
        return;
      }
      
      // Add to queue with priority sorting
      this.addToQueue(request);
      
      // Set timeout for queue
      setTimeout(() => {
        const index = this.queue.findIndex(r => r.id === request.id);
        if (index !== -1) {
          this.queue.splice(index, 1);
          this.stats.droppedRequests++;
          reject(new Error('REQUEST_TIMEOUT: Request timed out in queue'));
        }
      }, request.timeout);
    });
  }
  
  /**
   * Add request to queue with priority sorting
   */
  addToQueue(request) {
    this.queue.push(request);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.stats.queuedRequests = this.queue.length;
    this.emit('queued', { id: request.id, queueLength: this.queue.length });
  }
  
  /**
   * Check if we're within burst limits
   */
  checkBurstLimit() {
    const now = Date.now();
    const windowStart = now - this.config.burstWindow;
    
    // Clean old history
    this.callHistory = this.callHistory.filter(time => time > windowStart);
    
    // Check if we can make another call
    return this.callHistory.length < this.config.burstLimit;
  }
  
  /**
   * Process queued requests
   */
  startQueueProcessor() {
    setInterval(() => {
      if (!this.isProcessing && this.queue.length > 0) {
        this.processQueue();
      }
    }, 100); // Check every 100ms
  }
  
  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.activeRequests >= this.config.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.queue.length > 0 && this.activeRequests < this.config.maxConcurrent) {
      // Calculate delay based on last call time
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      const requiredDelay = this.calculateDelay();
      
      if (timeSinceLastCall < requiredDelay) {
        const waitTime = requiredDelay - timeSinceLastCall;
        this.emit('waiting', { delay: waitTime, queueLength: this.queue.length });
        await this.sleep(waitTime);
      }
      
      // Get next request
      const request = this.queue.shift();
      if (!request) continue;
      
      // Update stats
      const waitTime = Date.now() - request.queuedAt;
      this.stats.averageWaitTime = 
        (this.stats.averageWaitTime * this.stats.totalRequests + waitTime) / 
        (this.stats.totalRequests + 1);
      
      // Execute request
      this.executeRequest(request);
      
      // Small delay between dequeuing to prevent tight loops
      await this.sleep(50);
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Execute a single request with retry logic
   */
  async executeRequest(request) {
    this.activeRequests++;
    this.stats.totalRequests++;
    this.lastCallTime = Date.now();
    this.callHistory.push(this.lastCallTime);
    
    try {
      this.emit('executing', { 
        id: request.id, 
        attempt: request.attempts + 1,
        activeRequests: this.activeRequests 
      });
      
      // Execute the actual request function
      const result = await request.fn();
      
      // Success
      this.stats.successfulRequests++;
      this.consecutiveErrors = 0;
      this.stats.currentDelay = Math.max(
        this.config.minDelay,
        this.stats.currentDelay * 0.9 // Gradually reduce delay on success
      );
      
      request.resolve(result);
      this.emit('success', { id: request.id });
      
    } catch (error) {
      request.attempts++;
      this.consecutiveErrors++;
      
      // Check if it's a rate limit error
      const isRateLimitError = this.isRateLimitError(error);
      
      if (isRateLimitError) {
        // Increase delay exponentially for rate limit errors
        this.stats.currentDelay = Math.min(
          this.config.maxDelay,
          this.stats.currentDelay * this.config.backoffMultiplier
        );
      }
      
      // Retry logic
      if (request.retryable && request.attempts < this.config.retryAttempts) {
        const retryDelay = this.calculateRetryDelay(request.attempts);
        
        this.emit('retry', { 
          id: request.id, 
          attempt: request.attempts,
          delay: retryDelay,
          error: error.message 
        });
        
        // Re-queue with higher priority
        request.priority += 10;
        
        setTimeout(() => {
          this.addToQueue(request);
        }, retryDelay);
        
      } else {
        // Final failure
        this.stats.failedRequests++;
        request.reject(error);
        this.emit('failed', { id: request.id, error: error.message });
      }
    } finally {
      this.activeRequests--;
      this.stats.queuedRequests = this.queue.length;
    }
  }
  
  /**
   * Calculate current delay based on system state
   */
  calculateDelay() {
    // Base delay
    let delay = this.stats.currentDelay;
    
    // Increase delay if we have consecutive errors
    if (this.consecutiveErrors > 0) {
      delay = Math.min(
        this.config.maxDelay,
        delay * Math.pow(1.5, this.consecutiveErrors)
      );
    }
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 500;
    
    return Math.floor(delay + jitter);
  }
  
  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt) {
    const baseDelay = this.config.minDelay;
    const delay = baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 1000;
    
    return Math.min(this.config.maxDelay, delay + jitter);
  }
  
  /**
   * Check if error is rate limit related
   */
  isRateLimitError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStatus = error.response?.status;
    
    return (
      errorStatus === 429 ||
      errorStatus === 503 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('throttl')
    );
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeRequests: this.activeRequests,
      queueLength: this.queue.length,
      consecutiveErrors: this.consecutiveErrors,
      callsInWindow: this.callHistory.length
    };
  }
  
  /**
   * Clear the queue
   */
  clearQueue() {
    const dropped = this.queue.length;
    this.queue.forEach(request => {
      request.reject(new Error('QUEUE_CLEARED: Queue was manually cleared'));
    });
    this.queue = [];
    this.stats.droppedRequests += dropped;
    this.emit('queue-cleared', { dropped });
  }
  
  /**
   * Reset rate limiter state
   */
  reset() {
    this.clearQueue();
    this.activeRequests = 0;
    this.lastCallTime = 0;
    this.consecutiveErrors = 0;
    this.callHistory = [];
    this.stats.currentDelay = this.config.minDelay;
    this.emit('reset');
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create rate limiter instance
 */
function getRateLimiter(options = {}) {
  if (!instance) {
    instance = new APIRateLimiter(options);
    
    // Log important events
    instance.on('waiting', ({ delay, queueLength }) => {
      console.log(`[RATE-LIMITER] ⏱️ Waiting ${delay}ms before next call (${queueLength} in queue)`);
    });
    
    instance.on('retry', ({ id, attempt, delay, error }) => {
      console.log(`[RATE-LIMITER] 🔄 Retrying ${id} (attempt ${attempt}) after ${delay}ms - ${error}`);
    });
    
    instance.on('failed', ({ id, error }) => {
      console.error(`[RATE-LIMITER] ❌ Request ${id} failed: ${error}`);
    });
  }
  
  return instance;
}

export {
  APIRateLimiter,
  getRateLimiter
};
