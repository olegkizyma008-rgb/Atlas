/**
 * Global Rate Limiter Initialization
 * Ensures rate limiter is properly configured on system startup
 * Created: 2025-11-10
 */

import { getRateLimiter } from './api-rate-limiter.js';
import logger from './logger.js';

/**
 * Initialize the global rate limiter with optimal settings
 */
export function initializeRateLimiter() {
  const rateLimiter = getRateLimiter({
    // Timing configuration
    minDelay: 2000,           // 2 seconds minimum between API calls
    maxDelay: 60000,          // 60 seconds maximum backoff
    
    // Concurrency control - CRITICAL: Only 1 call at a time
    maxConcurrent: 1,         // Prevents simultaneous calls
    
    // Retry configuration
    retryAttempts: 2,         // 2 retries for failed requests
    backoffMultiplier: 2,     // Double delay on each retry
    
    // Queue management
    queueTimeout: 60000,      // 60 seconds max wait in queue
    
    // Burst protection
    burstLimit: 3,            // Max 3 calls per minute
    burstWindow: 60000,       // 1 minute window for burst limit
  });

  // Log rate limiter statistics periodically
  setInterval(() => {
    const stats = rateLimiter.getStats();
    if (stats.totalRequests > 0) {
      logger.debug('rate-limiter', `[RATE-LIMITER] Stats: ${JSON.stringify({
        total: stats.totalRequests,
        success: stats.successfulRequests,
        failed: stats.failedRequests,
        queued: stats.queueLength,
        active: stats.activeRequests,
        avgWait: Math.round(stats.averageWaitTime) + 'ms',
        currentDelay: Math.round(stats.currentDelay) + 'ms'
      })}`);
    }
  }, 30000); // Log every 30 seconds

  // Handle process shutdown gracefully
  process.on('SIGINT', () => {
    logger.info('rate-limiter', '[RATE-LIMITER] Shutting down, clearing queue...');
    rateLimiter.clearQueue();
  });

  process.on('SIGTERM', () => {
    logger.info('rate-limiter', '[RATE-LIMITER] Terminating, clearing queue...');
    rateLimiter.clearQueue();
  });

  logger.system('rate-limiter', '[RATE-LIMITER] ✅ Global rate limiter initialized with optimal settings');
  
  return rateLimiter;
}

// Export for use in other modules
export default initializeRateLimiter;
