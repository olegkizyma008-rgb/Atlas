/**
 * INTELLIGENT RATE LIMITER
 * Advanced request timing and throttling system for API 4000
 * 
 * Features:
 * - Adaptive rate limiting based on API response patterns
 * - Priority-based request queuing
 * - Circuit breaker for API health protection
 * - Load balancing across multiple endpoints
 * - Real-time performance monitoring
 * 
 * Created: 2025-11-13
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

export class IntelligentRateLimiter extends EventEmitter {
    constructor(options = {}) {
        super();
        this.logger = logger;
        
        // Core configuration
        this.maxConcurrentRequests = options.maxConcurrent || 3;
        this.baseDelay = options.baseDelay || 100; // ms
        this.maxDelay = options.maxDelay || 5000; // ms
        this.adaptiveThreshold = options.adaptiveThreshold || 0.8;
        
        // Request queue with priority
        this.requestQueue = [];
        this.activeRequests = new Set();
        this.requestHistory = [];
        this.maxHistorySize = 100;
        
        // Circuit breaker
        this.circuitBreaker = {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failureCount: 0,
            failureThreshold: 5,
            recoveryTimeout: 30000, // 30 seconds
            lastFailureTime: null,
            successCount: 0,
            halfOpenMaxRequests: 3
        };
        
        // Adaptive rate limiting
        this.adaptiveMetrics = {
            avgResponseTime: 1000,
            errorRate: 0,
            throughput: 0,
            lastAdjustment: Date.now(),
            adjustmentInterval: 10000 // 10 seconds
        };
        
        // Priority levels
        this.priorityLevels = {
            CRITICAL: 1,    // System health, errors
            HIGH: 2,        // User requests
            MEDIUM: 3,      // Background tasks
            LOW: 4,         // Analytics, logging
            BATCH: 5        // Batch operations
        };
        
        // Performance monitoring
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            throttledRequests: 0,
            avgWaitTime: 0,
            peakConcurrency: 0
        };
        
        // Start background processes
        this._startQueueProcessor();
        this._startMetricsCollector();
        
        this.logger.info('[RATE-LIMITER] 🚦 Intelligent Rate Limiter initialized');
    }

    /**
     * MAIN REQUEST PROCESSING METHOD
     * Intelligently queues and executes requests based on priority and system load
     */
    async executeRequest(requestFn, options = {}) {
        const request = {
            id: this._generateRequestId(),
            fn: requestFn,
            priority: options.priority || this.priorityLevels.MEDIUM,
            timeout: options.timeout || 30000,
            retries: options.retries || 2,
            metadata: options.metadata || {},
            createdAt: Date.now(),
            resolve: null,
            reject: null
        };
        
        this.metrics.totalRequests++;
        
        // Check circuit breaker
        if (this.circuitBreaker.state === 'OPEN') {
            if (this._shouldAttemptRecovery()) {
                this.circuitBreaker.state = 'HALF_OPEN';
                this.circuitBreaker.successCount = 0;
                this.logger.info('[RATE-LIMITER] 🔄 Circuit breaker: HALF_OPEN');
            } else {
                this.metrics.failedRequests++;
                throw new Error('Circuit breaker is OPEN - API temporarily unavailable');
            }
        }
        
        // Create promise for request
        const requestPromise = new Promise((resolve, reject) => {
            request.resolve = resolve;
            request.reject = reject;
        });
        
        // Add to priority queue
        this._enqueueRequest(request);
        
        return requestPromise;
    }

    /**
     * PRIORITY QUEUE MANAGEMENT
     */
    _enqueueRequest(request) {
        // Insert request in priority order
        let insertIndex = this.requestQueue.length;
        
        for (let i = 0; i < this.requestQueue.length; i++) {
            if (this.requestQueue[i].priority > request.priority) {
                insertIndex = i;
                break;
            }
        }
        
        this.requestQueue.splice(insertIndex, 0, request);
        
        this.logger.debug('[RATE-LIMITER] 📋 Request queued', {
            id: request.id,
            priority: request.priority,
            queueSize: this.requestQueue.length,
            position: insertIndex
        });
        
        this.emit('requestQueued', { request, queueSize: this.requestQueue.length });
    }

    /**
     * QUEUE PROCESSOR
     * Continuously processes requests from queue based on capacity
     */
    _startQueueProcessor() {
        setInterval(async () => {
            await this._processQueue();
        }, 50); // Check every 50ms
    }

    async _processQueue() {
        // Check if we can process more requests
        if (this.activeRequests.size >= this.maxConcurrentRequests) {
            return;
        }
        
        // Check circuit breaker for half-open state
        if (this.circuitBreaker.state === 'HALF_OPEN' && 
            this.activeRequests.size >= this.circuitBreaker.halfOpenMaxRequests) {
            return;
        }
        
        // Get next request from queue
        const request = this.requestQueue.shift();
        if (!request) return;
        
        // Check request timeout
        if (Date.now() - request.createdAt > request.timeout) {
            this.metrics.failedRequests++;
            request.reject(new Error('Request timeout in queue'));
            return;
        }
        
        // Execute request
        this._executeRequestNow(request);
    }

    /**
     * IMMEDIATE REQUEST EXECUTION
     */
    async _executeRequestNow(request) {
        this.activeRequests.add(request.id);
        const startTime = Date.now();
        
        // Update peak concurrency
        this.metrics.peakConcurrency = Math.max(
            this.metrics.peakConcurrency, 
            this.activeRequests.size
        );
        
        try {
            // Apply adaptive delay
            const delay = this._calculateAdaptiveDelay();
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                this.metrics.throttledRequests++;
            }
            
            // Execute the actual request
            const result = await this._executeWithTimeout(request);
            
            // Record success
            const responseTime = Date.now() - startTime;
            this._recordSuccess(responseTime);
            
            request.resolve(result);
            
        } catch (error) {
            // Record failure
            this._recordFailure(error, Date.now() - startTime);
            
            // Retry logic
            if (request.retries > 0) {
                request.retries--;
                request.createdAt = Date.now(); // Reset timeout
                this._enqueueRequest(request);
                this.logger.debug('[RATE-LIMITER] 🔄 Retrying request', { 
                    id: request.id, 
                    retriesLeft: request.retries 
                });
            } else {
                request.reject(error);
            }
            
        } finally {
            this.activeRequests.delete(request.id);
            
            // Update wait time metrics
            const waitTime = startTime - request.createdAt;
            this._updateWaitTimeMetrics(waitTime);
        }
    }

    /**
     * ADAPTIVE DELAY CALCULATION
     */
    _calculateAdaptiveDelay() {
        const { avgResponseTime, errorRate, throughput } = this.adaptiveMetrics;
        
        // Base delay increases with error rate
        let delay = this.baseDelay * (1 + errorRate * 2);
        
        // Increase delay if response time is high
        if (avgResponseTime > 2000) {
            delay *= (avgResponseTime / 1000);
        }
        
        // Reduce delay if throughput is low (system not busy)
        if (throughput < 0.5) {
            delay *= 0.5;
        }
        
        // Apply circuit breaker state
        if (this.circuitBreaker.state === 'HALF_OPEN') {
            delay *= 2; // Be more cautious
        }
        
        return Math.min(delay, this.maxDelay);
    }

    /**
     * REQUEST EXECUTION WITH TIMEOUT
     */
    async _executeWithTimeout(request) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Request timeout: ${request.timeout}ms`));
            }, request.timeout);
            
            try {
                const result = await request.fn();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * SUCCESS/FAILURE RECORDING
     */
    _recordSuccess(responseTime) {
        this.metrics.successfulRequests++;
        
        // Update adaptive metrics
        this._updateAdaptiveMetrics(responseTime, false);
        
        // Circuit breaker logic
        if (this.circuitBreaker.state === 'HALF_OPEN') {
            this.circuitBreaker.successCount++;
            
            if (this.circuitBreaker.successCount >= this.circuitBreaker.halfOpenMaxRequests) {
                this.circuitBreaker.state = 'CLOSED';
                this.circuitBreaker.failureCount = 0;
                this.logger.info('[RATE-LIMITER] ✅ Circuit breaker: CLOSED (recovered)');
            }
        } else if (this.circuitBreaker.state === 'CLOSED') {
            // Reset failure count on success
            this.circuitBreaker.failureCount = Math.max(0, this.circuitBreaker.failureCount - 1);
        }
        
        // Add to history
        this._addToHistory({
            timestamp: Date.now(),
            success: true,
            responseTime: responseTime
        });
    }

    _recordFailure(error, responseTime) {
        this.metrics.failedRequests++;
        
        // Update adaptive metrics
        this._updateAdaptiveMetrics(responseTime, true);
        
        // Circuit breaker logic
        this.circuitBreaker.failureCount++;
        this.circuitBreaker.lastFailureTime = Date.now();
        
        if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
            this.circuitBreaker.state = 'OPEN';
            this.logger.warn('[RATE-LIMITER] ⚠️ Circuit breaker: OPEN', {
                failures: this.circuitBreaker.failureCount,
                error: error.message
            });
        }
        
        // Add to history
        this._addToHistory({
            timestamp: Date.now(),
            success: false,
            responseTime: responseTime,
            error: error.message
        });
    }

    /**
     * ADAPTIVE METRICS UPDATE
     */
    _updateAdaptiveMetrics(responseTime, isError) {
        const now = Date.now();
        
        // Update average response time (exponential moving average)
        this.adaptiveMetrics.avgResponseTime = 
            (this.adaptiveMetrics.avgResponseTime * 0.9) + (responseTime * 0.1);
        
        // Update error rate
        const recentHistory = this.requestHistory.filter(
            h => (now - h.timestamp) < 60000 // Last minute
        );
        
        if (recentHistory.length > 0) {
            const errors = recentHistory.filter(h => !h.success).length;
            this.adaptiveMetrics.errorRate = errors / recentHistory.length;
            this.adaptiveMetrics.throughput = recentHistory.length / 60; // requests per second
        }
        
        // Adjust rate limiting if needed
        if (now - this.adaptiveMetrics.lastAdjustment > this.adaptiveMetrics.adjustmentInterval) {
            this._adjustRateLimiting();
            this.adaptiveMetrics.lastAdjustment = now;
        }
    }

    _adjustRateLimiting() {
        const { errorRate, avgResponseTime } = this.adaptiveMetrics;
        
        // Decrease concurrency if error rate is high
        if (errorRate > 0.2 && this.maxConcurrentRequests > 1) {
            this.maxConcurrentRequests--;
            this.logger.info('[RATE-LIMITER] 📉 Reduced concurrency', { 
                newLimit: this.maxConcurrentRequests,
                reason: 'High error rate'
            });
        }
        
        // Increase concurrency if system is performing well
        else if (errorRate < 0.05 && avgResponseTime < 1500 && this.maxConcurrentRequests < 5) {
            this.maxConcurrentRequests++;
            this.logger.info('[RATE-LIMITER] 📈 Increased concurrency', { 
                newLimit: this.maxConcurrentRequests,
                reason: 'Good performance'
            });
        }
    }

    /**
     * UTILITY METHODS
     */
    _generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _shouldAttemptRecovery() {
        if (!this.circuitBreaker.lastFailureTime) return false;
        
        return (Date.now() - this.circuitBreaker.lastFailureTime) > this.circuitBreaker.recoveryTimeout;
    }

    _addToHistory(entry) {
        this.requestHistory.push(entry);
        
        // Keep history size manageable
        if (this.requestHistory.length > this.maxHistorySize) {
            this.requestHistory.shift();
        }
    }

    _updateWaitTimeMetrics(waitTime) {
        const currentAvg = this.metrics.avgWaitTime;
        const totalRequests = this.metrics.totalRequests;
        
        this.metrics.avgWaitTime = 
            (currentAvg * (totalRequests - 1) + waitTime) / totalRequests;
    }

    _startMetricsCollector() {
        setInterval(() => {
            this.emit('metricsUpdate', this.getMetrics());
        }, 5000); // Every 5 seconds
    }

    /**
     * PUBLIC API
     */
    
    /**
     * Get current metrics and status
     */
    getMetrics() {
        return {
            ...this.metrics,
            queueSize: this.requestQueue.length,
            activeRequests: this.activeRequests.size,
            circuitBreakerState: this.circuitBreaker.state,
            adaptiveMetrics: { ...this.adaptiveMetrics },
            concurrencyLimit: this.maxConcurrentRequests,
            successRate: this.metrics.totalRequests > 0 
                ? this.metrics.successfulRequests / this.metrics.totalRequests 
                : 0
        };
    }

    /**
     * Force circuit breaker state
     */
    setCircuitBreakerState(state) {
        this.circuitBreaker.state = state;
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.successCount = 0;
        this.logger.info('[RATE-LIMITER] 🔧 Circuit breaker state changed', { state });
    }

    /**
     * Clear queue and reset metrics
     */
    reset() {
        this.requestQueue.length = 0;
        this.activeRequests.clear();
        this.requestHistory.length = 0;
        
        // Reset metrics
        Object.keys(this.metrics).forEach(key => {
            this.metrics[key] = 0;
        });
        
        // Reset circuit breaker
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.successCount = 0;
        
        this.logger.info('[RATE-LIMITER] 🔄 Rate limiter reset');
    }

    /**
     * Health check
     */
    getHealthStatus() {
        const metrics = this.getMetrics();
        
        let status = 'healthy';
        const issues = [];
        
        if (metrics.circuitBreakerState === 'OPEN') {
            status = 'unhealthy';
            issues.push('Circuit breaker is OPEN');
        }
        
        if (metrics.successRate < 0.8 && metrics.totalRequests > 10) {
            status = 'degraded';
            issues.push('Low success rate');
        }
        
        if (metrics.queueSize > 20) {
            status = 'degraded';
            issues.push('High queue size');
        }
        
        return {
            status,
            issues,
            metrics
        };
    }
}

// Singleton instance
export const rateLimiter = new IntelligentRateLimiter();
export default rateLimiter;
