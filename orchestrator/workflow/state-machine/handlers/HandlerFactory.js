/**
 * HandlerFactory
 * 
 * Factory for creating and managing state handlers
 * Provides centralized handler instantiation and registration
 * 
 * @class HandlerFactory
 */
const StateHandler = require('./StateHandler');
const ModeSelectionHandler = require('./ModeSelectionHandler');
const ChatHandler = require('./ChatHandler');
const DevHandler = require('./DevHandler');
const TaskHandler = require('./TaskHandler');
const ContextEnrichmentHandler = require('./ContextEnrichmentHandler');
const TodoPlanningHandler = require('./TodoPlanningHandler');
const ItemLoopHandler = require('./ItemLoopHandler');
const ServerSelectionHandler = require('./ServerSelectionHandler');
const ToolPlanningHandler = require('./ToolPlanningHandler');
const ExecutionHandler = require('./ExecutionHandler');
const VerificationHandler = require('./VerificationHandler');
const ReplanHandler = require('./ReplanHandler');
const FinalSummaryHandler = require('./FinalSummaryHandler');

class HandlerFactory {
    /**
     * Constructor
     * 
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.processors - Processors object
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.processors = options.processors || {};
        this.handlers = {};
        this._initializeHandlers();
    }

    /**
     * Initialize all handlers
     * 
     * @private
     */
    _initializeHandlers() {
        const handlerClasses = {
            MODE_SELECTION: ModeSelectionHandler,
            CHAT: ChatHandler,
            DEV: DevHandler,
            TASK: TaskHandler,
            CONTEXT_ENRICHMENT: ContextEnrichmentHandler,
            TODO_PLANNING: TodoPlanningHandler,
            ITEM_LOOP: ItemLoopHandler,
            SERVER_SELECTION: ServerSelectionHandler,
            TOOL_PLANNING: ToolPlanningHandler,
            EXECUTION: ExecutionHandler,
            VERIFICATION: VerificationHandler,
            REPLAN: ReplanHandler,
            FINAL_SUMMARY: FinalSummaryHandler
        };

        for (const [state, HandlerClass] of Object.entries(handlerClasses)) {
            this.handlers[state] = new HandlerClass({
                logger: this.logger,
                processors: this.processors
            });
        }

        this.logger.info('[HandlerFactory] Initialized 13 handlers');
    }

    /**
     * Get handler for state
     * 
     * @param {string} state - State name
     * @returns {StateHandler} Handler instance
     */
    getHandler(state) {
        const handler = this.handlers[state];
        if (!handler) {
            throw new Error(`Handler not found for state: ${state}`);
        }
        return handler;
    }

    /**
     * Get all handlers
     * 
     * @returns {Object} All handlers
     */
    getAllHandlers() {
        return { ...this.handlers };
    }

    /**
     * Register custom handler
     * 
     * @param {string} state - State name
     * @param {StateHandler} handler - Handler instance
     */
    registerHandler(state, handler) {
        if (!(handler instanceof StateHandler)) {
            throw new Error(`Handler must extend StateHandler`);
        }
        this.handlers[state] = handler;
        this.logger.info(`[HandlerFactory] Registered handler for state: ${state}`);
    }

    /**
     * Execute handler for state
     * 
     * @param {string} state - State name
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Handler result
     */
    async executeHandler(state, context, data = {}) {
        const handler = this.getHandler(state);
        return handler.execute(context, data);
    }

    /**
     * Get handler names
     * 
     * @returns {Array} Array of handler state names
     */
    getHandlerNames() {
        return Object.keys(this.handlers);
    }
}

module.exports = HandlerFactory;
