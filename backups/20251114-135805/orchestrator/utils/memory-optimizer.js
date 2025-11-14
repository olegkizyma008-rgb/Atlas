/**
 * MEMORY OPTIMIZER
 * Provides memory monitoring, optimization, and cleanup utilities
 *
 * @version 1.0.0
 * @date 2025-11-14
 */

import logger from './logger.js';

/**
 * Memory pool for reusing buffers
 */
class BufferPool {
    constructor(bufferSize = 1024 * 1024, poolSize = 10) {
        this.bufferSize = bufferSize;
        this.pool = [];
        this.maxPoolSize = poolSize;
        this.stats = {
            allocated: 0,
            reused: 0,
            released: 0
        };

        // Pre-allocate pool
        for (let i = 0; i < poolSize; i++) {
            this.pool.push(Buffer.allocUnsafe(bufferSize));
        }
        this.stats.allocated = poolSize;
    }

    /**
     * Get buffer from pool
     * @returns {Buffer} Buffer instance
     */
    acquire() {
        if (this.pool.length > 0) {
            this.stats.reused++;
            return this.pool.pop();
        }

        this.stats.allocated++;
        return Buffer.allocUnsafe(this.bufferSize);
    }

    /**
     * Return buffer to pool
     * @param {Buffer} buffer - Buffer to return
     */
    release(buffer) {
        if (this.pool.length < this.maxPoolSize) {
            buffer.fill(0);
            this.pool.push(buffer);
        }
        this.stats.released++;
    }

    /**
     * Get pool statistics
     * @returns {Object} Stats
     */
    getStats() {
        return {
            ...this.stats,
            poolSize: this.pool.length,
            maxPoolSize: this.maxPoolSize
        };
    }

    /**
     * Clear pool
     */
    clear() {
        this.pool = [];
        this.stats = {
            allocated: 0,
            reused: 0,
            released: 0
        };
    }
}

/**
 * Memory monitor
 */
class MemoryMonitor {
    constructor(options = {}) {
        this.warningThreshold = options.warningThreshold || 0.8; // 80%
        this.criticalThreshold = options.criticalThreshold || 0.95; // 95%
        this.checkInterval = options.checkInterval || 30000; // 30 seconds
        this.maxHeapSize = options.maxHeapSize || this.getMaxHeapSize();
        this.history = [];
        this.maxHistorySize = options.maxHistorySize || 100;
        this.isMonitoring = false;
    }

    /**
     * Get max heap size
     * @returns {number} Max heap in bytes
     */
    getMaxHeapSize() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage().heapTotal;
        }
        return 0;
    }

    /**
     * Get current memory usage
     * @returns {Object} Memory stats
     */
    getMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            return {
                heapUsed: usage.heapUsed,
                heapTotal: usage.heapTotal,
                external: usage.external,
                rss: usage.rss,
                percentage: (usage.heapUsed / usage.heapTotal) * 100
            };
        }

        return {
            heapUsed: 0,
            heapTotal: 0,
            external: 0,
            rss: 0,
            percentage: 0
        };
    }

    /**
     * Start monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.checkMemory();
        }, this.checkInterval);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.isMonitoring = false;
        }
    }

    /**
     * Check memory and log warnings
     */
    checkMemory() {
        const usage = this.getMemoryUsage();
        this.recordHistory(usage);

        if (usage.percentage > this.criticalThreshold * 100) {
            logger.error('CRITICAL: Memory usage critical', {
                percentage: usage.percentage.toFixed(2),
                heapUsed: this.formatBytes(usage.heapUsed),
                heapTotal: this.formatBytes(usage.heapTotal)
            });
            this.triggerGarbageCollection();
        } else if (usage.percentage > this.warningThreshold * 100) {
            logger.warn('WARNING: Memory usage high', {
                percentage: usage.percentage.toFixed(2),
                heapUsed: this.formatBytes(usage.heapUsed),
                heapTotal: this.formatBytes(usage.heapTotal)
            });
        }
    }

    /**
     * Record memory usage in history
     * @param {Object} usage - Memory usage
     */
    recordHistory(usage) {
        this.history.push({
            timestamp: Date.now(),
            ...usage
        });

        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Get memory history
     * @returns {Array} Memory history
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Trigger garbage collection
     */
    triggerGarbageCollection() {
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
            logger.info('Garbage collection triggered');
        }
    }

    /**
     * Format bytes to human readable
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * Get statistics
     * @returns {Object} Stats
     */
    getStats() {
        const usage = this.getMemoryUsage();
        const avgUsage = this.history.length > 0
            ? this.history.reduce((sum, h) => sum + h.percentage, 0) / this.history.length
            : 0;

        return {
            current: usage,
            average: avgUsage.toFixed(2),
            history: this.history.length,
            isMonitoring: this.isMonitoring
        };
    }
}

/**
 * Object pool for frequently created objects
 */
class ObjectPool {
    constructor(Factory, initialSize = 10) {
        this.Factory = Factory;
        this.pool = [];
        this.active = new Set();
        this.stats = {
            created: 0,
            reused: 0,
            released: 0
        };

        // Pre-allocate
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(new Factory());
        }
        this.stats.created = initialSize;
    }

    /**
     * Acquire object from pool
     * @returns {*} Object instance
     */
    acquire() {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
            this.stats.reused++;
        } else {
            obj = new this.Factory();
            this.stats.created++;
        }

        this.active.add(obj);
        return obj;
    }

    /**
     * Release object back to pool
     * @param {*} obj - Object to release
     */
    release(obj) {
        if (this.active.has(obj)) {
            this.active.delete(obj);
            if (typeof obj.reset === 'function') {
                obj.reset();
            }
            this.pool.push(obj);
            this.stats.released++;
        }
    }

    /**
     * Get statistics
     * @returns {Object} Stats
     */
    getStats() {
        return {
            ...this.stats,
            poolSize: this.pool.length,
            activeObjects: this.active.size
        };
    }

    /**
     * Clear pool
     */
    clear() {
        this.pool = [];
        this.active.clear();
    }
}

/**
 * Memory optimizer singleton
 */
class MemoryOptimizer {
    constructor() {
        this.bufferPool = new BufferPool();
        this.memoryMonitor = new MemoryMonitor();
        this.objectPools = new Map();
    }

    /**
     * Get buffer pool
     * @returns {BufferPool} Buffer pool instance
     */
    getBufferPool() {
        return this.bufferPool;
    }

    /**
     * Get memory monitor
     * @returns {MemoryMonitor} Memory monitor instance
     */
    getMemoryMonitor() {
        return this.memoryMonitor;
    }

    /**
     * Create or get object pool
     * @param {string} name - Pool name
     * @param {Function} Factory - Object factory
     * @param {number} initialSize - Initial pool size
     * @returns {ObjectPool} Object pool
     */
    getObjectPool(name, Factory, initialSize = 10) {
        if (!this.objectPools.has(name)) {
            this.objectPools.set(name, new ObjectPool(Factory, initialSize));
        }
        return this.objectPools.get(name);
    }

    /**
     * Get all statistics
     * @returns {Object} All stats
     */
    getStats() {
        const poolStats = {};
        for (const [name, pool] of this.objectPools) {
            poolStats[name] = pool.getStats();
        }

        return {
            bufferPool: this.bufferPool.getStats(),
            memory: this.memoryMonitor.getStats(),
            objectPools: poolStats
        };
    }

    /**
     * Start monitoring
     */
    startMonitoring() {
        this.memoryMonitor.startMonitoring();
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.memoryMonitor.stopMonitoring();
    }
}

// Singleton instance
const memoryOptimizer = new MemoryOptimizer();

export { BufferPool, MemoryMonitor, ObjectPool };
export default memoryOptimizer;
