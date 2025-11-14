/**
 * PERFORMANCE MONITOR
 * Tracks performance metrics across the system
 *
 * @version 1.0.0
 * @date 2025-11-14
 */

import logger from './logger.js';

/**
 * Performance metric tracker
 */
class MetricTracker {
    constructor(name, options = {}) {
        this.name = name;
        this.measurements = [];
        this.maxMeasurements = options.maxMeasurements || 1000;
        this.slowThreshold = options.slowThreshold || 1000; // 1 second
        this.stats = {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: -Infinity,
            slowCount: 0
        };
    }

    /**
     * Record measurement
     * @param {number} duration - Duration in milliseconds
     * @param {Object} metadata - Additional metadata
     */
    record(duration, metadata = {}) {
        this.measurements.push({
            timestamp: Date.now(),
            duration,
            ...metadata
        });

        if (this.measurements.length > this.maxMeasurements) {
            this.measurements.shift();
        }

        this.stats.count++;
        this.stats.totalTime += duration;
        this.stats.minTime = Math.min(this.stats.minTime, duration);
        this.stats.maxTime = Math.max(this.stats.maxTime, duration);

        if (duration > this.slowThreshold) {
            this.stats.slowCount++;
        }
    }

    /**
     * Get statistics
     * @returns {Object} Stats
     */
    getStats() {
        const avgTime = this.stats.count > 0 ? this.stats.totalTime / this.stats.count : 0;
        const p95 = this.getPercentile(95);
        const p99 = this.getPercentile(99);

        return {
            name: this.name,
            count: this.stats.count,
            avgTime: avgTime.toFixed(2),
            minTime: this.stats.minTime === Infinity ? 0 : this.stats.minTime,
            maxTime: this.stats.maxTime,
            p95: p95.toFixed(2),
            p99: p99.toFixed(2),
            slowCount: this.stats.slowCount,
            slowPercentage: ((this.stats.slowCount / this.stats.count) * 100).toFixed(2)
        };
    }

    /**
     * Get percentile
     * @param {number} percentile - Percentile (0-100)
     * @returns {number} Value at percentile
     */
    getPercentile(percentile) {
        if (this.measurements.length === 0) return 0;

        const sorted = this.measurements
            .map(m => m.duration)
            .sort((a, b) => a - b);

        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Get recent measurements
     * @param {number} count - Number of recent measurements
     * @returns {Array} Recent measurements
     */
    getRecent(count = 10) {
        return this.measurements.slice(-count);
    }

    /**
     * Clear measurements
     */
    clear() {
        this.measurements = [];
        this.stats = {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: -Infinity,
            slowCount: 0
        };
    }
}

/**
 * Performance monitor
 */
class PerformanceMonitor {
    constructor() {
        this.trackers = new Map();
        this.timers = new Map();
    }

    /**
     * Create or get metric tracker
     * @param {string} name - Metric name
     * @param {Object} options - Tracker options
     * @returns {MetricTracker} Tracker instance
     */
    getTracker(name, options = {}) {
        if (!this.trackers.has(name)) {
            this.trackers.set(name, new MetricTracker(name, options));
        }
        return this.trackers.get(name);
    }

    /**
     * Record metric
     * @param {string} name - Metric name
     * @param {number} duration - Duration in ms
     * @param {Object} metadata - Metadata
     */
    record(name, duration, metadata = {}) {
        const tracker = this.getTracker(name);
        tracker.record(duration, metadata);
    }

    /**
     * Start timer
     * @param {string} name - Timer name
     * @returns {Function} Stop function
     */
    startTimer(name) {
        const startTime = Date.now();
        const timerId = `${name}_${Date.now()}_${Math.random()}`;

        return (metadata = {}) => {
            const duration = Date.now() - startTime;
            this.record(name, duration, metadata);
            return duration;
        };
    }

    /**
     * Measure function execution
     * @param {string} name - Metric name
     * @param {Function} fn - Function to measure
     * @param {Object} metadata - Metadata
     * @returns {*} Function result
     */
    measure(name, fn, metadata = {}) {
        const startTime = Date.now();
        try {
            const result = fn();
            const duration = Date.now() - startTime;
            this.record(name, duration, metadata);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.record(name, duration, { ...metadata, error: true });
            throw error;
        }
    }

    /**
     * Measure async function execution
     * @param {string} name - Metric name
     * @param {Function} fn - Async function to measure
     * @param {Object} metadata - Metadata
     * @returns {Promise} Function result
     */
    async measureAsync(name, fn, metadata = {}) {
        const startTime = Date.now();
        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            this.record(name, duration, metadata);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.record(name, duration, { ...metadata, error: true });
            throw error;
        }
    }

    /**
     * Get all statistics
     * @returns {Object} All stats
     */
    getAllStats() {
        const stats = {};
        for (const [name, tracker] of this.trackers) {
            stats[name] = tracker.getStats();
        }
        return stats;
    }

    /**
     * Get statistics for specific metric
     * @param {string} name - Metric name
     * @returns {Object} Stats
     */
    getStats(name) {
        const tracker = this.trackers.get(name);
        return tracker ? tracker.getStats() : null;
    }

    /**
     * Log statistics
     * @param {string} name - Metric name (optional)
     */
    logStats(name = null) {
        if (name) {
            const stats = this.getStats(name);
            if (stats) {
                logger.info(`Performance: ${name}`, stats);
            }
        } else {
            const allStats = this.getAllStats();
            for (const [metricName, stats] of Object.entries(allStats)) {
                logger.info(`Performance: ${metricName}`, stats);
            }
        }
    }

    /**
     * Clear all trackers
     */
    clear() {
        this.trackers.clear();
    }

    /**
     * Clear specific tracker
     * @param {string} name - Tracker name
     */
    clearTracker(name) {
        const tracker = this.trackers.get(name);
        if (tracker) {
            tracker.clear();
        }
    }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export { MetricTracker };
export default performanceMonitor;
