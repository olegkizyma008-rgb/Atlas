/**
 * WorkflowStateMachine
 * 
 * Formal state machine for Atlas workflow execution
 * Replaces manual state management and scattered conditional logic
 * 
 * States:
 * - WORKFLOW_START: Initial state
 * - MODE_SELECTION: Determine execution mode (chat/task/dev)
 * - CHAT: Chat mode execution
 * - TASK: Task mode execution
 * - DEV: DEV mode execution
 * - CONTEXT_ENRICHMENT: Enrich user message with context
 * - TODO_PLANNING: Create TODO items
 * - ITEM_LOOP: Process each TODO item
 * - SERVER_SELECTION: Select MCP servers
 * - TOOL_PLANNING: Plan tools for execution
 * - EXECUTION: Execute tools
 * - VERIFICATION: Verify execution results
 * - REPLAN: Replan failed items
 * - FINAL_SUMMARY: Generate final summary
 * - WORKFLOW_END: Final state
 * 
 * @class WorkflowStateMachine
 */
class WorkflowStateMachine {
    /**
     * State enum
     */
    static States = {
        WORKFLOW_START: 'WORKFLOW_START',
        MODE_SELECTION: 'MODE_SELECTION',
        CHAT: 'CHAT',
        TASK: 'TASK',
        DEV: 'DEV',
        CONTEXT_ENRICHMENT: 'CONTEXT_ENRICHMENT',
        TODO_PLANNING: 'TODO_PLANNING',
        ITEM_LOOP: 'ITEM_LOOP',
        SERVER_SELECTION: 'SERVER_SELECTION',
        TOOL_PLANNING: 'TOOL_PLANNING',
        EXECUTION: 'EXECUTION',
        VERIFICATION: 'VERIFICATION',
        REPLAN: 'REPLAN',
        FINAL_SUMMARY: 'FINAL_SUMMARY',
        WORKFLOW_END: 'WORKFLOW_END'
    };

    /**
     * Transition rules: from state -> allowed next states
     */
    static TransitionRules = {
        WORKFLOW_START: [WorkflowStateMachine.States.MODE_SELECTION],
        MODE_SELECTION: [
            WorkflowStateMachine.States.CHAT,
            WorkflowStateMachine.States.TASK,
            WorkflowStateMachine.States.DEV
        ],
        CHAT: [WorkflowStateMachine.States.WORKFLOW_END],
        DEV: [
            WorkflowStateMachine.States.DEV,
            WorkflowStateMachine.States.TASK,
            WorkflowStateMachine.States.WORKFLOW_END
        ],
        TASK: [WorkflowStateMachine.States.CONTEXT_ENRICHMENT],
        CONTEXT_ENRICHMENT: [WorkflowStateMachine.States.TODO_PLANNING],
        TODO_PLANNING: [WorkflowStateMachine.States.ITEM_LOOP],
        ITEM_LOOP: [
            WorkflowStateMachine.States.SERVER_SELECTION,
            WorkflowStateMachine.States.FINAL_SUMMARY
        ],
        SERVER_SELECTION: [WorkflowStateMachine.States.TOOL_PLANNING],
        TOOL_PLANNING: [WorkflowStateMachine.States.EXECUTION],
        EXECUTION: [WorkflowStateMachine.States.VERIFICATION],
        VERIFICATION: [
            WorkflowStateMachine.States.ITEM_LOOP,
            WorkflowStateMachine.States.REPLAN
        ],
        REPLAN: [
            WorkflowStateMachine.States.ITEM_LOOP,
            WorkflowStateMachine.States.FINAL_SUMMARY
        ],
        FINAL_SUMMARY: [WorkflowStateMachine.States.WORKFLOW_END],
        WORKFLOW_END: []
    };

    /**
     * Constructor
     * 
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.handlers - State handlers
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.handlers = options.handlers || {};
        this.currentState = WorkflowStateMachine.States.WORKFLOW_START;
        this.previousState = null;
        this.transitionHistory = [];
        this.eventListeners = {};
        this.context = {};
        this.startTime = Date.now();

        this._logStateChange('initialized');
    }

    /**
     * Get current state
     * 
     * @returns {string} Current state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Get previous state
     * 
     * @returns {string} Previous state
     */
    getPreviousState() {
        return this.previousState;
    }

    /**
     * Get transition history
     * 
     * @returns {Array} Array of state transitions
     */
    getHistory() {
        return [...this.transitionHistory];
    }

    /**
     * Check if transition is valid
     * 
     * @param {string} nextState - Target state
     * @returns {boolean} True if transition is valid
     */
    canTransition(nextState) {
        const allowedStates = WorkflowStateMachine.TransitionRules[this.currentState] || [];
        return allowedStates.includes(nextState);
    }

    /**
     * Transition to next state
     * 
     * @param {string} nextState - Target state
     * @param {Object} data - Transition data
     * @returns {Promise<boolean>} True if transition successful
     * @throws {Error} If transition is invalid or fails
     */
    async transition(nextState, data = {}) {
        // Validate state exists
        if (!WorkflowStateMachine.States[nextState]) {
            const error = new Error(`Invalid state: ${nextState} does not exist`);
            error.code = 'INVALID_STATE';
            error.currentState = this.currentState;
            error.attemptedState = nextState;
            error.validStates = Object.keys(WorkflowStateMachine.States);
            this.logger.error(`[StateMachine] Invalid state attempted`, {
                error: error.message,
                code: error.code,
                currentState: this.currentState,
                attemptedState: nextState
            });
            throw error;
        }

        // Validate transition is allowed
        if (!this.canTransition(nextState)) {
            const allowedStates = WorkflowStateMachine.TransitionRules[this.currentState] || [];
            const error = new Error(
                `Invalid transition: ${this.currentState} -> ${nextState}. ` +
                `Allowed transitions: ${allowedStates.join(', ') || 'none'}`
            );
            error.code = 'INVALID_TRANSITION';
            error.currentState = this.currentState;
            error.attemptedState = nextState;
            error.allowedStates = allowedStates;
            this.logger.error(`[StateMachine] Invalid transition attempted`, {
                error: error.message,
                code: error.code,
                from: this.currentState,
                to: nextState,
                allowed: allowedStates
            });
            throw error;
        }

        // Call onExit handler for current state
        const exitHandler = this._getHandler(`${this.currentState}_exit`);
        if (exitHandler) {
            try {
                await exitHandler(this.context, data);
            } catch (error) {
                this.logger.error(`[StateMachine] Exit handler error for ${this.currentState}:`, error);
                throw error;
            }
        }

        // Update state
        this.previousState = this.currentState;
        this.currentState = nextState;

        // Record transition
        this.transitionHistory.push({
            from: this.previousState,
            to: nextState,
            timestamp: Date.now(),
            data
        });

        this._logStateChange('transitioned');

        // Call onEnter handler for new state
        const enterHandler = this._getHandler(`${nextState}_enter`);
        if (enterHandler) {
            try {
                await enterHandler(this.context, data);
            } catch (error) {
                this.logger.error(`[StateMachine] Enter handler error for ${nextState}:`, error);
                throw error;
            }
        }

        // Emit transition event
        this._emit('transition', { from: this.previousState, to: nextState, data });

        return true;
    }

    /**
     * Execute handler for current state
     * 
     * @param {Object} data - Handler data
     * @returns {Promise<Object>} Handler result
     * @throws {Error} If handler execution fails
     */
    async executeHandler(data = {}) {
        const handler = this._getHandler(`${this.currentState}_execute`);
        if (!handler) {
            const error = new Error(`No handler found for state: ${this.currentState}`);
            error.code = 'HANDLER_NOT_FOUND';
            error.state = this.currentState;
            this.logger.error(`[StateMachine] Handler not found`, {
                error: error.message,
                code: error.code,
                state: this.currentState
            });
            throw error;
        }

        try {
            this.logger.info(`[StateMachine] Executing handler for state: ${this.currentState}`);
            const result = await handler(this.context, data);

            if (!result || !result.success) {
                this.logger.warn(`[StateMachine] Handler returned failure for state: ${this.currentState}`, {
                    result
                });
            } else {
                this.logger.info(`[StateMachine] Handler succeeded for state: ${this.currentState}`);
            }

            this._emit('handler_executed', { state: this.currentState, result });
            return result;
        } catch (error) {
            this.logger.error(`[StateMachine] Handler execution failed for state: ${this.currentState}`, {
                error: error.message,
                code: error.code,
                stack: error.stack,
                state: this.currentState
            });
            this._emit('handler_error', { state: this.currentState, error });
            throw error;
        }
    }

    /**
     * Set context data
     * 
     * @param {string} key - Context key
     * @param {*} value - Context value
     */
    setContext(key, value) {
        this.context[key] = value;
    }

    /**
     * Get context data
     * 
     * @param {string} key - Context key
     * @returns {*} Context value
     */
    getContext(key) {
        return this.context[key];
    }

    /**
     * Get all context
     * 
     * @returns {Object} All context data
     */
    getAllContext() {
        return { ...this.context };
    }

    /**
     * Register event listener
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    /**
     * Unregister event listener
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }

    /**
     * Transition with timeout protection
     * 
     * @param {string} nextState - Target state
     * @param {Object} data - Transition data
     * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
     * @returns {Promise<boolean>} True if transition successful
     * @throws {Error} If transition fails or times out
     */
    async transitionWithTimeout(nextState, data = {}, timeoutMs = 30000) {
        return Promise.race([
            this.transition(nextState, data),
            new Promise((_, reject) =>
                setTimeout(() => {
                    const error = new Error(`Transition timeout: ${this.currentState} -> ${nextState} exceeded ${timeoutMs}ms`);
                    error.code = 'TRANSITION_TIMEOUT';
                    error.from = this.currentState;
                    error.to = nextState;
                    error.timeoutMs = timeoutMs;
                    this.logger.error(`[StateMachine] Transition timeout`, {
                        error: error.message,
                        from: this.currentState,
                        to: nextState,
                        timeoutMs
                    });
                    reject(error);
                }, timeoutMs)
            )
        ]);
    }

    /**
     * Execute handler with timeout protection
     * 
     * @param {Object} data - Handler data
     * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
     * @returns {Promise<Object>} Handler result
     * @throws {Error} If handler fails or times out
     */
    async executeHandlerWithTimeout(data = {}, timeoutMs = 30000) {
        return Promise.race([
            this.executeHandler(data),
            new Promise((_, reject) =>
                setTimeout(() => {
                    const error = new Error(`Handler timeout: ${this.currentState} handler exceeded ${timeoutMs}ms`);
                    error.code = 'HANDLER_TIMEOUT';
                    error.state = this.currentState;
                    error.timeoutMs = timeoutMs;
                    this.logger.error(`[StateMachine] Handler timeout`, {
                        error: error.message,
                        state: this.currentState,
                        timeoutMs
                    });
                    reject(error);
                }, timeoutMs)
            )
        ]);
    }

    /**
     * Reset state machine
     */
    reset() {
        this.currentState = WorkflowStateMachine.States.WORKFLOW_START;
        this.previousState = null;
        this.transitionHistory = [];
        this.context = {};
        this.startTime = Date.now();
        this._logStateChange('reset');
    }

    /**
     * Get execution time
     * 
     * @returns {number} Milliseconds elapsed
     */
    getExecutionTime() {
        return Date.now() - this.startTime;
    }

    /**
     * Get state machine status
     * 
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            currentState: this.currentState,
            previousState: this.previousState,
            transitionCount: this.transitionHistory.length,
            executionTime: this.getExecutionTime(),
            contextKeys: Object.keys(this.context)
        };
    }

    /**
     * Private: Get handler
     * 
     * @private
     * @param {string} handlerName - Handler name
     * @returns {Function|null} Handler function or null
     */
    _getHandler(handlerName) {
        return this.handlers[handlerName] || null;
    }

    /**
     * Private: Emit event
     * 
     * @private
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    _emit(event, data) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                this.logger.error(`[StateMachine] Event listener error for ${event}:`, error);
            }
        });
    }

    /**
     * Private: Log state change
     * 
     * @private
     * @param {string} action - Action description
     */
    _logStateChange(action) {
        this.logger.info(`[StateMachine] ${action}: ${this.currentState}`, {
            previousState: this.previousState,
            executionTime: this.getExecutionTime()
        });
    }
}

export default WorkflowStateMachine;
