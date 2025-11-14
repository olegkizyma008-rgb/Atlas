/**
 * LAZY LOADER
 * Defers initialization of services until first use
 *
 * @version 1.0.0
 * @date 2025-11-14
 */

import logger from './logger.js';

/**
 * Lazy-loaded service wrapper
 */
class LazyService {
    constructor(name, factory, options = {}) {
        this.name = name;
        this.factory = factory;
        this.instance = null;
        this.initialized = false;
        this.initializing = false;
        this.initPromise = null;
        this.timeout = options.timeout || 30000;
        this.retries = options.retries || 2;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * Initialize service
     * @returns {Promise<*>} Service instance
     */
    async initialize() {
        if (this.initialized) {
            return this.instance;
        }

        if (this.initializing) {
            return this.initPromise;
        }

        this.initializing = true;
        this.initPromise = this._initializeWithRetry();

        try {
            this.instance = await this.initPromise;
            this.initialized = true;
            logger.debug(`[LazyLoader] Initialized service: ${this.name}`);
            return this.instance;
        } catch (error) {
            this.initializing = false;
            this.initPromise = null;
            logger.error(`[LazyLoader] Failed to initialize service: ${this.name}`, {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Initialize with retry logic
     * @private
     * @returns {Promise<*>} Service instance
     */
    async _initializeWithRetry(attempt = 1) {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Initialization timeout')), this.timeout)
            );

            return await Promise.race([
                this.factory(),
                timeoutPromise
            ]);
        } catch (error) {
            if (attempt < this.retries) {
                logger.warn(`[LazyLoader] Retry ${attempt}/${this.retries} for ${this.name}`, {
                    error: error.message
                });
                await this.delay(this.retryDelay * attempt);
                return this._initializeWithRetry(attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Get service instance
     * @returns {Promise<*>} Service instance
     */
    async get() {
        return this.initialize();
    }

    /**
     * Check if initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Destroy service
     * @returns {Promise<void>}
     */
    async destroy() {
        if (this.instance && typeof this.instance.destroy === 'function') {
            await this.instance.destroy();
        }
        this.instance = null;
        this.initialized = false;
        this.initializing = false;
        this.initPromise = null;
    }

    /**
     * Delay helper
     * @private
     * @param {number} ms - Milliseconds
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Lazy loader manager
 */
class LazyLoader {
    constructor() {
        this.services = new Map();
    }

    /**
     * Register lazy service
     * @param {string} name - Service name
     * @param {Function} factory - Service factory function
     * @param {Object} options - Service options
     */
    register(name, factory, options = {}) {
        if (this.services.has(name)) {
            logger.warn(`[LazyLoader] Service already registered: ${name}`);
            return;
        }

        this.services.set(name, new LazyService(name, factory, options));
    }

    /**
     * Get lazy service
     * @param {string} name - Service name
     * @returns {Promise<*>} Service instance
     */
    async get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service not registered: ${name}`);
        }
        return service.get();
    }

    /**
     * Check if service is initialized
     * @param {string} name - Service name
     * @returns {boolean} True if initialized
     */
    isInitialized(name) {
        const service = this.services.get(name);
        return service ? service.isInitialized() : false;
    }

    /**
     * Destroy service
     * @param {string} name - Service name
     * @returns {Promise<void>}
     */
    async destroy(name) {
        const service = this.services.get(name);
        if (service) {
            await service.destroy();
        }
    }

    /**
     * Destroy all services
     * @returns {Promise<void>}
     */
    async destroyAll() {
        const promises = Array.from(this.services.values()).map(service => service.destroy());
        await Promise.all(promises);
    }

    /**
     * Get all registered services
     * @returns {Array<string>} Service names
     */
    getRegisteredServices() {
        return Array.from(this.services.keys());
    }

    /**
     * Get initialization status
     * @returns {Object} Status for all services
     */
    getStatus() {
        const status = {};
        for (const [name, service] of this.services) {
            status[name] = {
                initialized: service.isInitialized(),
                initializing: service.initializing
            };
        }
        return status;
    }
}

// Singleton instance
const lazyLoader = new LazyLoader();

export { LazyService };
export default lazyLoader;
