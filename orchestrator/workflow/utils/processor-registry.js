/**
 * @fileoverview ProcessorRegistry - Centralized processor management
 * Registers and resolves workflow processors
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Registry for workflow processors
 * Responsibilities:
 * - Register processors
 * - Resolve processors by name
 * - Manage processor lifecycle
 * - Provide processor metadata
 */
export class ProcessorRegistry {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.processors = new Map();
        this.metadata = new Map();

        this.logger.system('processor-registry', '✅ ProcessorRegistry initialized');
    }

    /**
     * Register a processor
     * @param {string} name - Processor name
     * @param {Object} processor - Processor instance
     * @param {Object} metadata - Processor metadata
     */
    register(name, processor, metadata = {}) {
        if (!name || !processor) {
            throw new Error('Processor name and instance are required');
        }

        this.processors.set(name, processor);
        this.metadata.set(name, {
            name,
            registered_at: new Date().toISOString(),
            ...metadata
        });

        this.logger.system('processor-registry', `✅ Processor registered: ${name}`);
    }

    /**
     * Resolve processor by name
     * @param {string} name - Processor name
     * @returns {Object} Processor instance
     */
    resolve(name) {
        if (!this.processors.has(name)) {
            throw new Error(`Processor not found: ${name}`);
        }

        return this.processors.get(name);
    }

    /**
     * Check if processor exists
     * @param {string} name - Processor name
     * @returns {boolean}
     */
    has(name) {
        return this.processors.has(name);
    }

    /**
     * Get all registered processors
     * @returns {Array<string>}
     */
    getAll() {
        return Array.from(this.processors.keys());
    }

    /**
     * Get processor metadata
     * @param {string} name - Processor name
     * @returns {Object}
     */
    getMetadata(name) {
        if (!this.metadata.has(name)) {
            return null;
        }

        return this.metadata.get(name);
    }

    /**
     * Unregister processor
     * @param {string} name - Processor name
     */
    unregister(name) {
        if (this.processors.has(name)) {
            this.processors.delete(name);
            this.metadata.delete(name);
            this.logger.system('processor-registry', `✅ Processor unregistered: ${name}`);
        }
    }

    /**
     * Get registry statistics
     * @returns {Object}
     */
    getStats() {
        return {
            totalProcessors: this.processors.size,
            processors: this.getAll(),
            timestamp: new Date().toISOString()
        };
    }
}

export default ProcessorRegistry;
