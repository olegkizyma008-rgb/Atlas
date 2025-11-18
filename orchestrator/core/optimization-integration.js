/**
 * OPTIMIZATION INTEGRATION
 * Service registry integration for API optimization components
 * 
 * Registers optimized components in DI container and provides
 * seamless integration with existing Atlas4 architecture
 * 
 * Created: 2025-11-13
 */

import { apiOptimizer } from '../ai/api-request-optimizer.js';
import adaptiveThrottler from '../utils/adaptive-request-throttler.js';
import OptimizedWorkflowManager from '../ai/optimized-workflow-manager.js';
import logger from '../utils/logger.js';

export class OptimizationIntegration {
    constructor() {
        this.logger = logger;
        this.initialized = false;
    }

    /**
     * Verify optimization components are registered in DI container
     * (Services are registered in service-registry.js, this just verifies)
     */
    verifyOptimizationServices(container) {
        try {
            // Verify services exist
            const apiOptimizer = container.resolve('apiOptimizer');
            const rateLimiter = container.resolve('rateLimiter');
            const optimizedWorkflowManager = container.resolve('optimizedWorkflowManager');

            if (!apiOptimizer || !rateLimiter || !optimizedWorkflowManager) {
                throw new Error('One or more optimization services failed to resolve');
            }

            this.logger.info('[OPTIMIZATION-INTEGRATION] ✅ All optimization services verified');
            this.initialized = true;

        } catch (error) {
            this.logger.error('[OPTIMIZATION-INTEGRATION] ❌ Failed to verify services:', error.message);
            throw error;
        }
    }


    /**
     * Setup optimization monitoring
     */
    setupOptimizationMonitoring(container) {
        try {
            const apiOptimizer = container.resolve('apiOptimizer');
            const rateLimiter = container.resolve('rateLimiter');

            // Monitor API optimizer events (if EventEmitter)
            if (apiOptimizer && typeof apiOptimizer.on === 'function') {
                apiOptimizer.on('requestOptimized', (data) => {
                    this.logger.debug('[OPTIMIZATION-MONITOR] Request optimized', data);
                });
            }

            // Monitor rate limiter events (if EventEmitter)
            if (rateLimiter && typeof rateLimiter.on === 'function') {
                rateLimiter.on('requestQueued', (data) => {
                    this.logger.debug('[OPTIMIZATION-MONITOR] Request queued', {
                        queueSize: data.queueSize,
                        priority: data.request.priority
                    });
                });

                rateLimiter.on('metricsUpdate', (metrics) => {
                    if (metrics.totalRequests % 10 === 0) { // Log every 10 requests
                        this.logger.info('[OPTIMIZATION-MONITOR] Performance metrics', {
                            successRate: metrics.successRate,
                            avgWaitTime: metrics.avgWaitTime,
                            queueSize: metrics.queueSize,
                            circuitBreakerState: metrics.circuitBreakerState
                        });
                    }
                });
            }

            this.logger.info('[OPTIMIZATION-INTEGRATION] 📊 Optimization monitoring enabled');
        } catch (error) {
            this.logger.error('[OPTIMIZATION-INTEGRATION] ❌ Failed to setup monitoring:', error.message);
        }
    }

    /**
     * Get comprehensive optimization status
     */
    async getOptimizationStatus(container) {
        try {
            const apiOptimizer = container.resolve('apiOptimizer');
            const rateLimiter = container.resolve('rateLimiter');

            const apiHealth = await apiOptimizer.healthCheck();

            return {
                enabled: this.initialized,
                components: {
                    apiOptimizer: {
                        status: apiHealth.status,
                        stats: apiOptimizer.getStats()
                    },
                    rateLimiter: {
                        status: rateLimiter.getHealthStatus().status,
                        metrics: rateLimiter.getMetrics()
                    }
                },
                overallEfficiency: this._calculateOverallEfficiency(container)
            };

        } catch (error) {
            return {
                enabled: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate overall optimization efficiency
     */
    _calculateOverallEfficiency(container) {
        try {
            const apiOptimizer = container.resolve('apiOptimizer');
            const rateLimiter = container.resolve('rateLimiter');

            const apiStats = apiOptimizer.getStats();
            const rateLimiterMetrics = rateLimiter.getMetrics();

            // Calculate efficiency metrics
            const cacheEfficiency = apiStats.totalRequests > 0
                ? apiStats.cacheHits / apiStats.totalRequests
                : 0;

            const requestSavingsRatio = apiStats.totalRequests > 0
                ? apiStats.requestsSaved / apiStats.totalRequests
                : 0;

            const overallEfficiency = (
                cacheEfficiency * 0.5 +
                requestSavingsRatio * 0.5
            );

            return {
                overall: overallEfficiency,
                breakdown: {
                    cacheEfficiency: cacheEfficiency,
                    requestSavings: requestSavingsRatio
                },
                totalRequestsSaved: apiStats.requestsSaved,
                performanceImprovement: overallEfficiency > 0.5 ? 'significant' :
                    overallEfficiency > 0.2 ? 'moderate' : 'minimal'
            };

        } catch (error) {
            this.logger.error('[OPTIMIZATION-INTEGRATION] Failed to calculate efficiency:', error.message);
            return { overall: 0, error: error.message };
        }
    }
}

// Export singleton instance and setup function
export const optimizationIntegration = new OptimizationIntegration();
export const setupOptimizationIntegration = (container) => {
    optimizationIntegration.verifyOptimizationServices(container);
    optimizationIntegration.setupOptimizationMonitoring(container);
    return optimizationIntegration;
};
export default optimizationIntegration;
