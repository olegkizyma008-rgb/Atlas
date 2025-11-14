/**
 * UNIFIED RATE LIMITER
 * Centralized rate limiting with service-specific rules and request pooling
 *
 * @version 2.0.0
 * @date 2025-11-14
 */

/**
 * Request queue entry
 */
class QueuedRequest {
    constructor(serviceName, fn, priority = 0, timeout = 30000) {
        this.serviceName = serviceName;
        this.fn = fn;
        this.priority = priority;
        this.timeout = timeout;
        this.createdAt = Date.now();
        this.resolve = null;
        this.reject = null;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    async execute() {
        try {
            const result = await this.fn();
            this.resolve(result);
        } catch (error) {
            this.reject(error);
        }
    }

    isExpired() {
        return Date.now() - this.createdAt > this.timeout;
    }
}

/**
 * Service-specific rate limiter
 */
class ServiceRateLimiter {
    constructor(serviceName, config = {}) {
        this.serviceName = serviceName;
        this.config = {
            minDelay: config.minDelay || 500,
            maxDelay: config.maxDelay || 30000,
            maxConcurrent: config.maxConcurrent || 3,
            maxRetries: config.maxRetries || 2,
            burstLimit: config.burstLimit || 10,
            burstWindow: config.burstWindow || 60000,
            backoffMultiplier: config.backoffMultiplier || 2,
            jitterFactor: config.jitterFactor || 0.1
        };

        this.queue = [];
        this.activeRequests = 0;
        this.lastRequestTime = 0;
        this.currentDelay = this.config.minDelay;
        this.burstCount = 0;
        this.burstResetTime = Date.now();
        this.failureCount = 0;
        this.circuitBreakerOpen = false;
        this.circuitBreakerResetTime = 0;
    }

    /**
     * Add request to queue
     * @param {Function} fn - Function to execute
     * @param {number} priority - Request priority (higher = earlier)
     * @param {number} timeout - Request timeout in ms
     * @returns {Promise} Result promise
     */
    async queue(fn, priority = 0, timeout = 30000) {
        if (this.circuitBreakerOpen) {
            if (Date.now() < this.circuitBreakerResetTime) {
                throw new Error(`Circuit breaker open for ${this.serviceName}`);
            }
            this.circuitBreakerOpen = false;
        }

        const request = new QueuedRequest(this.serviceName, fn, priority, timeout);
        this.queue.push(request);
        this.queue.sort((a, b) => b.priority - a.priority);

        this.processQueue();
        return request.promise;
    }

    /**
     * Process queued requests
     */
    async processQueue() {
        while (this.queue.length > 0 && this.activeRequests < this.config.maxConcurrent) {
            const request = this.queue.shift();

            if (request.isExpired()) {
                request.reject(new Error('Request timeout in queue'));
                continue;
            }

            this.activeRequests++;
            this.executeRequest(request);
        }
    }

    /**
     * Execute single request with rate limiting
     */
    async executeRequest(request) {
        try {
            // Check burst limit
            const now = Date.now();
            if (now - this.burstResetTime > this.config.burstWindow) {
                this.burstCount = 0;
                this.burstResetTime = now;
            }

            if (this.burstCount >= this.config.burstLimit) {
                const waitTime = this.config.burstWindow - (now - this.burstResetTime);
                await this.delay(waitTime);
            }

            // Apply rate limiting delay
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.currentDelay) {
                await this.delay(this.currentDelay - timeSinceLastRequest);
            }

            this.lastRequestTime = Date.now();
            this.burstCount++;

            // Execute request
            await request.execute();

            // Reset on success
            this.currentDelay = this.config.minDelay;
            this.failureCount = 0;
        } catch (error) {
            this.failureCount++;

            // Implement exponential backoff
            if (this.failureCount >= this.config.maxRetries) {
                this.circuitBreakerOpen = true;
                this.circuitBreakerResetTime = Date.now() + this.currentDelay * 2;
                request.reject(error);
            } else {
                // Exponential backoff with jitter
                const jitter = this.config.minDelay * this.config.jitterFactor * Math.random();
                this.currentDelay = Math.min(
                    this.config.maxDelay,
                    this.currentDelay * this.config.backoffMultiplier + jitter
                );

                // Retry
                this.queue.unshift(request);
                this.processQueue();
            }
        } finally {
            this.activeRequests--;
            this.processQueue();
        }
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get limiter statistics
     */
    getStats() {
        return {
            serviceName: this.serviceName,
            queueLength: this.queue.length,
            activeRequests: this.activeRequests,
            currentDelay: this.currentDelay,
            failureCount: this.failureCount,
            circuitBreakerOpen: this.circuitBreakerOpen,
            burstCount: this.burstCount
        };
    }

    /**
     * Reset limiter
     */
    reset() {
        this.queue = [];
        this.activeRequests = 0;
        this.currentDelay = this.config.minDelay;
        this.failureCount = 0;
        this.circuitBreakerOpen = false;
        this.burstCount = 0;
    }
}

/**
 * Unified Rate Limiter Manager
 */
class UnifiedRateLimiter {
    constructor() {
        this.limiters = new Map();
        this.defaultConfig = {
            minDelay: 500,
            maxDelay: 30000,
            maxConcurrent: 3,
            maxRetries: 2,
            burstLimit: 10,
            burstWindow: 60000
        };
    }

    /**
     * Register service with custom config
     * @param {string} serviceName - Service name
     * @param {Object} config - Service config
     */
    registerService(serviceName, config = {}) {
        const mergedConfig = { ...this.defaultConfig, ...config };
        this.limiters.set(serviceName, new ServiceRateLimiter(serviceName, mergedConfig));
    }

    /**
     * Get or create limiter for service
     * @param {string} serviceName - Service name
     * @returns {ServiceRateLimiter} Rate limiter
     */
    getLimiter(serviceName) {
        if (!this.limiters.has(serviceName)) {
            this.registerService(serviceName);
        }
        return this.limiters.get(serviceName);
    }

    /**
     * Queue request for service
     * @param {string} serviceName - Service name
     * @param {Function} fn - Function to execute
     * @param {number} priority - Request priority
     * @param {number} timeout - Request timeout
     * @returns {Promise} Result promise
     */
    async queue(serviceName, fn, priority = 0, timeout = 30000) {
        const limiter = this.getLimiter(serviceName);
        return limiter.queue(fn, priority, timeout);
    }

    /**
     * Get all statistics
     * @returns {Object} Stats for all services
     */
    getStats() {
        const stats = {};
        for (const [name, limiter] of this.limiters) {
            stats[name] = limiter.getStats();
        }
        return stats;
    }

    /**
     * Reset specific service
     * @param {string} serviceName - Service name
     */
    resetService(serviceName) {
        const limiter = this.limiters.get(serviceName);
        if (limiter) {
            limiter.reset();
        }
    }

    /**
     * Reset all services
     */
    resetAll() {
        for (const limiter of this.limiters.values()) {
            limiter.reset();
        }
    }
}

// Singleton instance
const unifiedRateLimiter = new UnifiedRateLimiter();

// Pre-configure common services
unifiedRateLimiter.registerService('llm', {
    minDelay: 1000,
    maxConcurrent: 1,
    maxRetries: 2,
    burstLimit: 3
});

unifiedRateLimiter.registerService('mcp', {
    minDelay: 500,
    maxConcurrent: 2,
    maxRetries: 2,
    burstLimit: 5
});

unifiedRateLimiter.registerService('tts', {
    minDelay: 2000,
    maxConcurrent: 1,
    maxRetries: 3,
    burstLimit: 2
});

unifiedRateLimiter.registerService('vision', {
    minDelay: 1500,
    maxConcurrent: 1,
    maxRetries: 2,
    burstLimit: 3
});

export default unifiedRateLimiter;
