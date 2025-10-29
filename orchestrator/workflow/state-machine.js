/**
 * Workflow State Machine
 * Manages complex multi-step processes with defined state transitions
 * Based on refactor.md best practices
 * 
 * @version 1.0.0
 * @date 2025-10-29
 */

class WorkflowStateMachine {
  constructor(logger) {
    this.logger = logger;
    
    // Define states
    this.states = {
      INIT: 'init',
      MODE_SELECTION: 'mode_selection',
      PLANNING: 'planning',
      SERVER_SELECTION: 'server_selection',
      TOOL_PLANNING: 'tool_planning',
      VALIDATING: 'validating',
      EXECUTING: 'executing',
      VERIFYING: 'verifying',
      ERROR_RECOVERY: 'error_recovery',
      COMPLETE: 'complete',
      FAILED: 'failed'
    };
    
    // Define valid transitions
    this.transitions = {
      init: ['mode_selection', 'failed'],
      mode_selection: ['planning', 'failed'],
      planning: ['server_selection', 'complete', 'failed'],
      server_selection: ['tool_planning', 'error_recovery', 'failed'],
      tool_planning: ['validating', 'error_recovery', 'failed'],
      validating: ['executing', 'tool_planning', 'error_recovery'],
      executing: ['verifying', 'error_recovery', 'failed'],
      verifying: ['complete', 'executing', 'error_recovery'],
      error_recovery: ['planning', 'server_selection', 'tool_planning', 'failed'],
      complete: [],
      failed: []
    };
    
    // Current state
    this.currentState = this.states.INIT;
    this.stateHistory = [];
    this.stateData = {};
    this.transitionCallbacks = new Map();
    this.stateTimeouts = new Map();
    
    // Default timeouts (ms)
    this.defaultTimeouts = {
      mode_selection: 5000,
      planning: 10000,
      server_selection: 8000,
      tool_planning: 15000,
      validating: 10000,
      executing: 60000,
      verifying: 30000,
      error_recovery: 20000
    };
    
    // Metrics
    this.metrics = {
      totalTransitions: 0,
      successfulCompletions: 0,
      failures: 0,
      recoveries: 0,
      averageStateTime: {}
    };
  }

  /**
   * Initialize state machine with context
   */
  initialize(context = {}) {
    this.logger.info('State machine initialized', { context });
    this.stateData = { ...context };
    this.currentState = this.states.INIT;
    this.stateHistory = [{ state: this.states.INIT, timestamp: Date.now() }];
    return this;
  }

  /**
   * Transition to a new state
   */
  async transition(newState, data = {}) {
    const fromState = this.currentState;
    
    // Validate transition
    if (!this._isValidTransition(fromState, newState)) {
      const error = `Invalid transition from ${fromState} to ${newState}`;
      this.logger.error(error, { 
        currentState: fromState, 
        attemptedState: newState,
        validTransitions: this.transitions[fromState]
      });
      throw new Error(error);
    }
    
    // Clear any existing timeout
    this._clearStateTimeout();
    
    // Log transition
    this.logger.info('State transition', {
      from: fromState,
      to: newState,
      data: Object.keys(data)
    });
    
    // Update metrics
    this._updateMetrics(fromState, newState);
    
    // Execute exit callback for current state
    await this._executeCallback(`${fromState}_exit`, { fromState, toState: newState });
    
    // Update state
    const previousState = this.currentState;
    this.currentState = newState;
    this.stateHistory.push({
      state: newState,
      timestamp: Date.now(),
      from: previousState,
      data
    });
    
    // Merge new data
    this.stateData = { ...this.stateData, ...data };
    
    // Set timeout for new state
    this._setStateTimeout(newState);
    
    // Execute enter callback for new state
    await this._executeCallback(`${newState}_enter`, { fromState, toState: newState });
    
    // Check for terminal states
    if (newState === this.states.COMPLETE) {
      this.metrics.successfulCompletions++;
      await this._handleCompletion();
    } else if (newState === this.states.FAILED) {
      this.metrics.failures++;
      await this._handleFailure();
    }
    
    return this;
  }

  /**
   * Get current state
   */
  getCurrentState() {
    return {
      state: this.currentState,
      data: this.stateData,
      history: this.stateHistory,
      canTransitionTo: this.transitions[this.currentState] || []
    };
  }

  /**
   * Register callback for state transitions
   */
  onTransition(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.transitionCallbacks.set(event, callback);
    return this;
  }

  /**
   * Check if can transition to state
   */
  canTransitionTo(state) {
    return this._isValidTransition(this.currentState, state);
  }

  /**
   * Attempt error recovery
   */
  async attemptRecovery(error, recoveryData = {}) {
    this.logger.warn('Attempting error recovery', {
      currentState: this.currentState,
      error: error.message
    });
    
    // Only attempt recovery if not already in error_recovery or terminal states
    if (this.currentState === this.states.ERROR_RECOVERY ||
        this.currentState === this.states.COMPLETE ||
        this.currentState === this.states.FAILED) {
      return false;
    }
    
    try {
      await this.transition(this.states.ERROR_RECOVERY, {
        error: error.message,
        previousState: this.currentState,
        recoveryAttempt: (this.stateData.recoveryAttempt || 0) + 1,
        ...recoveryData
      });
      
      this.metrics.recoveries++;
      return true;
    } catch (transitionError) {
      this.logger.error('Failed to transition to error recovery', {
        error: transitionError.message
      });
      return false;
    }
  }

  /**
   * Get state duration
   */
  getStateDuration(state = null) {
    const targetState = state || this.currentState;
    const stateEntry = [...this.stateHistory].reverse().find(h => h.state === targetState);
    
    if (!stateEntry) return 0;
    
    return Date.now() - stateEntry.timestamp;
  }

  /**
   * Get workflow summary
   */
  getSummary() {
    const totalDuration = this.stateHistory.length > 0 
      ? Date.now() - this.stateHistory[0].timestamp 
      : 0;
    
    return {
      currentState: this.currentState,
      statesVisited: this.stateHistory.length,
      totalDuration,
      metrics: this.metrics,
      isComplete: this.currentState === this.states.COMPLETE,
      isFailed: this.currentState === this.states.FAILED,
      recoveryAttempts: this.stateData.recoveryAttempt || 0
    };
  }

  /**
   * Reset state machine
   */
  reset() {
    this.currentState = this.states.INIT;
    this.stateHistory = [{ state: this.states.INIT, timestamp: Date.now() }];
    this.stateData = {};
    this._clearStateTimeout();
    this.logger.info('State machine reset');
    return this;
  }

  // Private methods

  _isValidTransition(from, to) {
    const validTransitions = this.transitions[from];
    return validTransitions && validTransitions.includes(to);
  }

  async _executeCallback(event, data) {
    const callback = this.transitionCallbacks.get(event);
    if (callback) {
      try {
        await callback(data);
      } catch (error) {
        this.logger.error(`Callback error for ${event}`, { error: error.message });
      }
    }
  }

  _setStateTimeout(state) {
    const timeout = this.defaultTimeouts[state];
    if (timeout) {
      this.stateTimeouts.set(state, setTimeout(() => {
        this.logger.warn('State timeout reached', {
          state,
          timeout,
          duration: this.getStateDuration(state)
        });
        
        // Attempt recovery on timeout
        this.attemptRecovery(new Error(`State ${state} timed out after ${timeout}ms`), {
          timeoutState: state
        });
      }, timeout));
    }
  }

  _clearStateTimeout() {
    for (const [state, timeout] of this.stateTimeouts) {
      clearTimeout(timeout);
      this.stateTimeouts.delete(state);
    }
  }

  _updateMetrics(fromState, toState) {
    this.metrics.totalTransitions++;
    
    // Calculate time spent in previous state
    const duration = this.getStateDuration(fromState);
    if (!this.metrics.averageStateTime[fromState]) {
      this.metrics.averageStateTime[fromState] = {
        total: 0,
        count: 0,
        average: 0
      };
    }
    
    const stateMetrics = this.metrics.averageStateTime[fromState];
    stateMetrics.total += duration;
    stateMetrics.count++;
    stateMetrics.average = stateMetrics.total / stateMetrics.count;
  }

  async _handleCompletion() {
    this.logger.info('Workflow completed successfully', {
      duration: this.getStateDuration(),
      statesVisited: this.stateHistory.length
    });
    
    await this._executeCallback('workflow_complete', {
      data: this.stateData,
      summary: this.getSummary()
    });
  }

  async _handleFailure() {
    this.logger.error('Workflow failed', {
      lastState: this.stateHistory[this.stateHistory.length - 2]?.state,
      error: this.stateData.error,
      duration: this.getStateDuration()
    });
    
    await this._executeCallback('workflow_failed', {
      data: this.stateData,
      summary: this.getSummary()
    });
  }
}

/**
 * Factory function to create workflow-specific state machines
 */
class StateMachineFactory {
  static createMCPWorkflow(logger) {
    const machine = new WorkflowStateMachine(logger);
    
    // Register MCP-specific callbacks
    machine.onTransition('tool_planning_enter', async (data) => {
      logger.info('Entering tool planning phase', data);
    });
    
    machine.onTransition('executing_enter', async (data) => {
      logger.info('Starting tool execution', data);
    });
    
    machine.onTransition('error_recovery_enter', async (data) => {
      logger.warn('Entering error recovery', {
        previousState: data.fromState,
        attempt: data.recoveryAttempt
      });
    });
    
    return machine;
  }
  
  static createTaskWorkflow(logger) {
    const machine = new WorkflowStateMachine(logger);
    
    // Customize for task workflow
    machine.transitions.planning = ['server_selection', 'executing', 'complete', 'failed'];
    
    return machine;
  }
}

module.exports = {
  WorkflowStateMachine,
  StateMachineFactory
};
