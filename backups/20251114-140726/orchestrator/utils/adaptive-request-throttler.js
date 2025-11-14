/**
 * ADAPTIVE REQUEST THROTTLER
 * Intelligent request throttling with adaptive delays and batching
 * 
 * Features:
 * - Adaptive delays based on API response times
 * - Request batching to reduce total API calls
 * - Intelligent queue prioritization
 * - Load-aware throttling
 * - Automatic backoff on errors
 * - Request deduplication
 * 
 * @version 1.0
 * @date 2025-11-14
 */

import logger from './logger.js';

class AdaptiveRequestThrottler {
    constructor(options = {}) {
        this.logger = logger;

        // Configuration
        this.config = {
            // Base delays (in ms)
            minDelay: options.minDelay || 500,        // Minimum 500ms between requests
            maxDelay: options.maxDelay || 5000,       // Maximum 5 seconds
            baseDelay: options.baseDelay || 1000,    // Base 1 second delay

            // Batching
            batchSize: options.batchSize || 3,        // Batch up to 3 similar requests
            batchWaitTime: options.batchWaitTime || 200, // Wait 200ms to collect batch

            // Adaptive tuning
            targetResponseTime: options.targetResponseTime || 2000, // Target 2 second response
            adaptiveAdjustment: options.adaptiveAdjustment || 0.1,  // 10% adjustment per cycle

            // Load management
            maxConcurrent: options.maxConcurrent || 1,  // Only 1 concurrent request
            maxQueueSize: options.maxQueueSize || 50,   // Max 50 queued requests

            // Error handling
            errorBackoffMultiplier: options.errorBackoffMultiplier || 1.5,
            maxErrorBackoff: options.maxErrorBackoff || 10000, // Max 10 second backoff
        };

        // State
        this.queue = [];
        this.activeRequests = 0;
        this.lastRequestTime = 0;
        this.currentDelay = this.config.baseDelay;
        this.batchQueues = new Map(); // For request batching
        this.pendingRequests = new Map(); // For deduplication
        this.requestHistory = []; // For adaptive tuning

        // Statistics
        this.stats = {
            totalRequests: 0,
            batchedRequests: 0,
            deduplicatedRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            averageDelay: this.config.baseDelay,
            currentQueueSize: 0,
            totalDelayTime: 0,
        };

        this.logger.info('[ADAPTIVE-THROTTLER] ✅ Initialized with base delay:', this.config.baseDelay);
    }

    /**
     * Main method: Queue a request with adaptive throttling
     */
    async throttledRequest(requestFn, options = {}) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const priority = options.priority || 0;
        const batchKey = options.batchKey || null;
        const timeout = options.timeout || 60000;

        // Check queue size
        if (this.queue.length >= this.config.maxQueueSize) {
            this.logger.warn('[ADAPTIVE-THROTTLER] ⚠️ Queue full, rejecting request');
            throw new Error('REQUEST_QUEUE_FULL');
        }

        // Check for deduplication
        if (batchKey && this.pendingRequests.has(batchKey)) {
            this.stats.deduplicatedRequests++;
            this.logger.debug('[ADAPTIVE-THROTTLER] 🔄 Deduplicating request:', batchKey);
            return await this.pendingRequests.get(batchKey);
        }

        return new Promise((resolve, reject) => {
            const request = {
                id: requestId,
                fn: requestFn,
                priority,
                batchKey,
                resolve,
                reject,
                queuedAt: Date.now(),
                timeout,
            };

            // Try batching if applicable
            if (batchKey && this._canBatch(batchKey)) {
                this._addToBatch(batchKey, request);
            } else {
                this._addToQueue(request);
            }

            // Set timeout
            setTimeout(() => {
                const idx = this.queue.findIndex(r => r.id === requestId);
                if (idx !== -1) {
                    this.queue.splice(idx, 1);
                    this.stats.totalRequests++;
                    reject(new Error('REQUEST_TIMEOUT'));
                }
            }, timeout);
        });
    }

    /**
     * Add request to main queue with priority sorting
     */
    _addToQueue(request) {
        this.queue.push(request);
        this.queue.sort((a, b) => b.priority - a.priority);
        this.stats.currentQueueSize = this.queue.length;

        this.logger.debug('[ADAPTIVE-THROTTLER] 📋 Request queued', {
            queueSize: this.queue.length,
            priority: request.priority,
        });

        this._processQueue();
    }

    /**
     * Batching system
     */
    _canBatch(batchKey) {
        if (!batchKey) return false;
        const batch = this.batchQueues.get(batchKey) || [];
        return batch.length < this.config.batchSize;
    }

    _addToBatch(batchKey, request) {
        if (!this.batchQueues.has(batchKey)) {
            this.batchQueues.set(batchKey, []);

            // Schedule batch processing
            setTimeout(() => {
                this._processBatch(batchKey);
            }, this.config.batchWaitTime);
        }

        const batch = this.batchQueues.get(batchKey);
        batch.push(request);

        this.logger.debug('[ADAPTIVE-THROTTLER] 📦 Added to batch', {
            batchKey,
            batchSize: batch.length,
        });
    }

    _processBatch(batchKey) {
        const batch = this.batchQueues.get(batchKey) || [];
        if (batch.length === 0) return;

        this.batchQueues.delete(batchKey);
        this.stats.batchedRequests += batch.length;

        // Add batch requests to main queue with same priority
        batch.forEach(request => {
            this._addToQueue(request);
        });
    }

    /**
     * Process queue with adaptive delays
     */
    async _processQueue() {
        if (this.activeRequests >= this.config.maxConcurrent || this.queue.length === 0) {
            return;
        }

        // Calculate delay
        const delay = this._calculateAdaptiveDelay();
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;

        if (timeSinceLastRequest < delay) {
            const waitTime = delay - timeSinceLastRequest;
            this.stats.totalDelayTime += waitTime;

            this.logger.debug('[ADAPTIVE-THROTTLER] ⏳ Waiting before next request', {
                waitTime,
                currentDelay: this.currentDelay,
                queueSize: this.queue.length,
            });

            await this._sleep(waitTime);
        }

        // Get next request
        const request = this.queue.shift();
        if (!request) return;

        this.stats.currentQueueSize = this.queue.length;

        // Execute request
        this._executeRequest(request);

        // Continue processing
        if (this.queue.length > 0) {
            setImmediate(() => this._processQueue());
        }
    }

    /**
     * Calculate adaptive delay based on system state
     */
    _calculateAdaptiveDelay() {
        let delay = this.currentDelay;

        // Adjust based on queue size (more requests = shorter delay)
        if (this.queue.length > 10) {
            delay *= 0.8; // Reduce delay by 20%
        } else if (this.queue.length > 20) {
            delay *= 0.6; // Reduce delay by 40%
        }

        // Adjust based on response times
        if (this.stats.averageResponseTime > this.config.targetResponseTime) {
            delay *= (1 + this.config.adaptiveAdjustment);
        } else if (this.stats.averageResponseTime < this.config.targetResponseTime * 0.5) {
            delay *= (1 - this.config.adaptiveAdjustment);
        }

        // Clamp to min/max
        delay = Math.max(this.config.minDelay, Math.min(this.config.maxDelay, delay));

        return Math.floor(delay);
    }

    /**
     * Execute request with error handling
     */
    async _executeRequest(request) {
        this.activeRequests++;
        this.stats.totalRequests++;
        this.lastRequestTime = Date.now();

        const startTime = Date.now();

        try {
            this.logger.debug('[ADAPTIVE-THROTTLER] 🚀 Executing request', {
                id: request.id,
                queueSize: this.queue.length,
            });

            // Execute the request
            const result = await request.fn();

            // Success
            const responseTime = Date.now() - startTime;
            this._updateStats(responseTime, true);
            this.stats.successfulRequests++;

            // Adaptive tuning: reduce delay on success
            this.currentDelay = Math.max(
                this.config.minDelay,
                this.currentDelay * (1 - this.config.adaptiveAdjustment * 0.5)
            );

            request.resolve(result);

            this.logger.debug('[ADAPTIVE-THROTTLER] ✅ Request successful', {
                responseTime,
                currentDelay: this.currentDelay,
            });

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(responseTime, false);
            this.stats.failedRequests++;

            // Adaptive tuning: increase delay on error
            this.currentDelay = Math.min(
                this.config.maxErrorBackoff,
                this.currentDelay * this.config.errorBackoffMultiplier
            );

            this.logger.warn('[ADAPTIVE-THROTTLER] ❌ Request failed', {
                error: error.message,
                newDelay: this.currentDelay,
            });

            request.reject(error);
        } finally {
            this.activeRequests--;
            this.stats.averageDelay = this.currentDelay;

            // Clear deduplication cache
            if (request.batchKey) {
                this.pendingRequests.delete(request.batchKey);
            }
        }
    }

    /**
     * Update statistics with response time
     */
    _updateStats(responseTime, success) {
        const count = this.stats.totalRequests;
        const prevAvg = this.stats.averageResponseTime;

        this.stats.averageResponseTime = (prevAvg * (count - 1) + responseTime) / count;

        // Keep history for trend analysis
        this.requestHistory.push({
            time: Date.now(),
            responseTime,
            success,
        });

        // Keep only last 100 requests
        if (this.requestHistory.length > 100) {
            this.requestHistory.shift();
        }
    }

    /**
     * Sleep utility
     */
    _sleep(ms) {
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
            batchQueuesCount: this.batchQueues.size,
            pendingRequestsCount: this.pendingRequests.size,
            efficiency: this.stats.totalRequests > 0
                ? (this.stats.batchedRequests + this.stats.deduplicatedRequests) / this.stats.totalRequests
                : 0,
        };
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        const stats = this.getStats();
        const successRate = stats.totalRequests > 0
            ? stats.successfulRequests / stats.totalRequests
            : 1;

        return {
            status: successRate > 0.9 ? 'healthy' : successRate > 0.7 ? 'degraded' : 'unhealthy',
            successRate,
            averageDelay: stats.averageDelay,
            queueSize: stats.queueLength,
            efficiency: stats.efficiency,
        };
    }

    /**
     * Reset throttler
     */
    reset() {
        this.queue = [];
        this.activeRequests = 0;
        this.currentDelay = this.config.baseDelay;
        this.batchQueues.clear();
        this.pendingRequests.clear();
        this.lastRequestTime = 0;

        this.logger.info('[ADAPTIVE-THROTTLER] 🔄 Throttler reset');
    }
}

// Singleton instance
export const adaptiveThrottler = new AdaptiveRequestThrottler({
    minDelay: 300,           // 300ms minimum
    maxDelay: 3000,          // 3 seconds maximum
    baseDelay: 800,          // 800ms base delay
    batchSize: 3,            // Batch up to 3 requests
    batchWaitTime: 150,      // Wait 150ms for batching
    targetResponseTime: 2000, // Target 2 second response
});

export default adaptiveThrottler;
