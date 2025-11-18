/**
 * @fileoverview ContextBuilder - Builds and manages workflow context
 * Provides unified context object for all workflow stages
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Builds and manages workflow context
 * Responsibilities:
 * - Create workflow context
 * - Manage context state
 * - Provide context utilities
 * - Track context changes
 */
export class ContextBuilder {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.contexts = new Map();

        this.logger.system('context-builder', '✅ ContextBuilder initialized');
    }

    /**
     * Create workflow context
     * @param {Object} session - Session object
     * @param {Object} options - Context options
     * @returns {Object} Workflow context
     */
    createContext(session, options = {}) {
        const contextId = this._generateContextId();

        const context = {
            id: contextId,
            session,
            todo: null,
            currentItem: null,
            results: [],
            state: 'initialized',
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...options.metadata
            },
            services: {
                logger: options.logger,
                wsManager: options.wsManager,
                ttsSyncManager: options.ttsSyncManager,
                container: session?.container
            }
        };

        this.contexts.set(contextId, context);

        this.logger.system('context-builder', `✅ Context created: ${contextId}`);

        return context;
    }

    /**
     * Update context state
     * @param {string} contextId - Context ID
     * @param {Object} updates - Updates to apply
     */
    updateContext(contextId, updates) {
        if (!this.contexts.has(contextId)) {
            throw new Error(`Context not found: ${contextId}`);
        }

        const context = this.contexts.get(contextId);

        Object.assign(context, updates);
        context.metadata.updatedAt = new Date().toISOString();

        this.logger.system('context-builder', `✅ Context updated: ${contextId}`);

        return context;
    }

    /**
     * Get context by ID
     * @param {string} contextId - Context ID
     * @returns {Object} Context object
     */
    getContext(contextId) {
        if (!this.contexts.has(contextId)) {
            throw new Error(`Context not found: ${contextId}`);
        }

        return this.contexts.get(contextId);
    }

    /**
     * Add result to context
     * @param {string} contextId - Context ID
     * @param {Object} result - Result to add
     */
    addResult(contextId, result) {
        const context = this.getContext(contextId);
        context.results.push({
            ...result,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Set current item in context
     * @param {string} contextId - Context ID
     * @param {Object} item - TODO item
     */
    setCurrentItem(contextId, item) {
        const context = this.getContext(contextId);
        context.currentItem = item;
        context.metadata.updatedAt = new Date().toISOString();
    }

    /**
     * Set TODO in context
     * @param {string} contextId - Context ID
     * @param {Object} todo - TODO object
     */
    setTodo(contextId, todo) {
        const context = this.getContext(contextId);
        context.todo = todo;
        context.metadata.updatedAt = new Date().toISOString();
    }

    /**
     * Get context summary
     * @param {string} contextId - Context ID
     * @returns {Object} Context summary
     */
    getSummary(contextId) {
        const context = this.getContext(contextId);

        return {
            id: context.id,
            state: context.state,
            itemsProcessed: context.results.length,
            createdAt: context.metadata.createdAt,
            updatedAt: context.metadata.updatedAt,
            duration: new Date(context.metadata.updatedAt) - new Date(context.metadata.createdAt)
        };
    }

    /**
     * Clean up context
     * @param {string} contextId - Context ID
     */
    cleanup(contextId) {
        if (this.contexts.has(contextId)) {
            this.contexts.delete(contextId);
            this.logger.system('context-builder', `✅ Context cleaned up: ${contextId}`);
        }
    }

    /**
     * Get all contexts
     * @returns {Array<Object>}
     */
    getAllContexts() {
        return Array.from(this.contexts.values());
    }

    /**
     * Generate unique context ID
     * @private
     */
    _generateContextId() {
        return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default ContextBuilder;
