# Phase 2.5 Error Handling & Logging Implementation Plan

**Date**: 2025-11-18  
**Status**: READY FOR IMPLEMENTATION  
**Objective**: Add comprehensive error handling, logging, and timeout management

---

## 📋 Implementation Checklist

### 1. Invalid State Transition Handling

**Objective**: Prevent and handle invalid state transitions

#### Implementation Points
- [ ] Validate state exists before transition
- [ ] Validate transition is allowed from current state
- [ ] Throw descriptive error on invalid transition
- [ ] Log all transition attempts (valid and invalid)
- [ ] Provide recovery suggestions in error messages

**Code Location**: `WorkflowStateMachine.js` - `transition()` method

**Example**:
```javascript
async transition(newState) {
  if (!this.constructor.States[newState]) {
    const error = new Error(`Invalid state: ${newState}`);
    error.code = 'INVALID_STATE';
    error.currentState = this.currentState;
    error.attemptedState = newState;
    this.logger.error('[STATE-MACHINE] Invalid state transition', error);
    throw error;
  }
  
  // Validate transition is allowed
  const allowedTransitions = this.getValidTransitions();
  if (!allowedTransitions.includes(newState)) {
    const error = new Error(
      `Cannot transition from ${this.currentState} to ${newState}. ` +
      `Allowed: ${allowedTransitions.join(', ')}`
    );
    error.code = 'INVALID_TRANSITION';
    this.logger.error('[STATE-MACHINE] Invalid transition', error);
    throw error;
  }
  
  this.currentState = newState;
  this.logger.info(`[STATE-MACHINE] Transitioned to ${newState}`);
}
```

### 2. Handler Error Handling

**Objective**: Catch and handle errors from handlers gracefully

#### Implementation Points
- [ ] Wrap handler execution in try-catch
- [ ] Log handler errors with context
- [ ] Provide fallback behavior
- [ ] Preserve error context for debugging
- [ ] Allow error recovery or graceful degradation

**Code Location**: `WorkflowStateMachine.js` - `executeHandler()` method

**Example**:
```javascript
async executeHandler(data = {}) {
  const handler = this.getHandler(this.currentState);
  
  try {
    this.logger.debug(`[HANDLER] Executing ${this.currentState} handler`);
    const result = await handler.execute(this.context, data);
    
    if (!result.success) {
      this.logger.warn(`[HANDLER] ${this.currentState} handler returned failure`, {
        result
      });
    }
    
    return result;
  } catch (error) {
    this.logger.error(`[HANDLER] ${this.currentState} handler failed`, {
      error: error.message,
      stack: error.stack,
      state: this.currentState,
      context: this._sanitizeContext()
    });
    
    throw new Error(
      `Handler execution failed in state ${this.currentState}: ${error.message}`
    );
  }
}
```

### 3. Centralized Logging

**Objective**: Implement consistent, structured logging across all handlers

#### Logging Levels
- **ERROR**: Critical failures that stop execution
- **WARN**: Non-critical issues that may affect results
- **INFO**: Important state changes and milestones
- **DEBUG**: Detailed execution information

#### Implementation Points
- [ ] Create logging utility for handlers
- [ ] Standardize log format across all handlers
- [ ] Include context in all log messages
- [ ] Log state transitions
- [ ] Log handler execution start/end
- [ ] Log error details with stack traces
- [ ] Log metrics and performance data

**Code Location**: `StateHandler.js` - logging methods

**Example**:
```javascript
class StateHandler {
  _log(message, data = {}) {
    this.logger.info(`[${this.constructor.name}] ${message}`, {
      state: this.state,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  _logError(message, error, data = {}) {
    this.logger.error(`[${this.constructor.name}] ${message}`, {
      state: this.state,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  _logDebug(message, data = {}) {
    this.logger.debug(`[${this.constructor.name}] ${message}`, {
      state: this.state,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}
```

### 4. Timeout Handling

**Objective**: Prevent infinite loops and long-running operations

#### Implementation Points
- [ ] Add timeout for state transitions
- [ ] Add timeout for handler execution
- [ ] Add timeout for item processing
- [ ] Configurable timeout values
- [ ] Graceful timeout recovery
- [ ] Timeout logging and metrics

**Timeout Values** (Recommended):
- State transition: 30 seconds
- Handler execution: 60 seconds
- Item processing: 120 seconds
- Total workflow: 600 seconds (10 minutes)

**Code Location**: `WorkflowStateMachine.js` - new methods

**Example**:
```javascript
async executeHandlerWithTimeout(data = {}, timeoutMs = 60000) {
  return Promise.race([
    this.executeHandler(data),
    new Promise((_, reject) =>
      setTimeout(() => {
        const error = new Error(
          `Handler execution timeout after ${timeoutMs}ms in state ${this.currentState}`
        );
        error.code = 'HANDLER_TIMEOUT';
        reject(error);
      }, timeoutMs)
    )
  ]).catch(error => {
    if (error.code === 'HANDLER_TIMEOUT') {
      this.logger.error('[STATE-MACHINE] Handler timeout', {
        state: this.currentState,
        timeoutMs
      });
    }
    throw error;
  });
}
```

### 5. Processor Error Handling

**Objective**: Handle errors from processors gracefully

#### Implementation Points
- [ ] Validate processor result
- [ ] Check for processor errors
- [ ] Log processor failures
- [ ] Provide fallback values
- [ ] Allow retry logic

**Example**:
```javascript
async execute(context, data = {}) {
  try {
    const processor = this._getProcessor('contextEnrichmentProcessor');
    
    if (!processor) {
      throw new Error('Processor not available');
    }

    const result = await processor.execute(data);
    
    if (!result || !result.success) {
      throw new Error(
        `Processor failed: ${result?.error || 'Unknown error'}`
      );
    }

    return result;
  } catch (error) {
    this._logError('Processor execution failed', error);
    throw error;
  }
}
```

### 6. Context Validation

**Objective**: Ensure context is valid before and after each state

#### Implementation Points
- [ ] Validate required context fields
- [ ] Check context data types
- [ ] Verify context not corrupted
- [ ] Log context changes
- [ ] Sanitize sensitive data in logs

**Example**:
```javascript
_validateContext() {
  const required = ['userMessage', 'session', 'container'];
  const missing = required.filter(field => !this.context[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required context: ${missing.join(', ')}`);
  }
}

_sanitizeContext() {
  const sanitized = { ...this.context };
  // Remove sensitive data
  delete sanitized.container;
  delete sanitized.res;
  return sanitized;
}
```

---

## 🧪 Error Scenarios to Handle

### Scenario 1: Missing Handler
```
Error: Handler not found for state: UNKNOWN_STATE
Recovery: Throw error, log, provide state list
```

### Scenario 2: Processor Failure
```
Error: contextEnrichmentProcessor.execute() throws
Recovery: Log error, throw with context, allow retry
```

### Scenario 3: Invalid Transition
```
Error: Cannot transition from CHAT to ITEM_LOOP
Recovery: Log error, provide valid transitions, throw
```

### Scenario 4: Handler Timeout
```
Error: Handler execution exceeds 60 seconds
Recovery: Log timeout, cancel operation, throw error
```

### Scenario 5: Context Corruption
```
Error: Context missing required fields
Recovery: Log corruption, throw error, provide context dump
```

### Scenario 6: Item Processing Error
```
Error: Item fails after max retries
Recovery: Mark as failed, log error, continue to next item
```

---

## 📊 Logging Strategy

### Log Format
```
[COMPONENT] [LEVEL] Message
{
  timestamp: ISO8601,
  state: current_state,
  sessionId: session_id,
  duration: milliseconds,
  error: error_message,
  stack: stack_trace,
  context: sanitized_context
}
```

### Log Levels Distribution
- **ERROR** (5%): Critical failures
- **WARN** (10%): Non-critical issues
- **INFO** (30%): State changes, milestones
- **DEBUG** (55%): Detailed execution

### Log Aggregation
- All logs include timestamp
- All logs include state/component
- All logs include session ID
- Error logs include stack traces
- Performance logs include duration

---

## 🎯 Success Criteria

- ✅ All invalid transitions caught and logged
- ✅ All handler errors caught and logged
- ✅ All processor errors caught and logged
- ✅ Consistent logging format across all handlers
- ✅ Timeouts prevent infinite loops
- ✅ Context validation prevents corruption
- ✅ Error messages are descriptive
- ✅ Recovery paths are available
- ✅ No unhandled promise rejections
- ✅ Performance metrics logged

---

## 📝 Implementation Order

1. **WorkflowStateMachine.js** - Add transition validation and timeout handling
2. **StateHandler.js** - Add logging methods and context validation
3. **All Handlers** - Add error handling and logging
4. **Processors** - Add error validation and logging
5. **Integration** - Test error scenarios

---

## ⏱️ Estimated Timeline

| Task                         | Time          |
| ---------------------------- | ------------- |
| WorkflowStateMachine updates | 30 min        |
| StateHandler updates         | 30 min        |
| Handler error handling       | 1 hour        |
| Processor error handling     | 30 min        |
| Integration testing          | 1 hour        |
| **Total**                    | **3.5 hours** |

---

**Status**: Ready for implementation  
**Complexity**: Medium (systematic updates across multiple files)  
**Risk**: Low (additive changes, no breaking changes)  
**Recommendation**: Implement systematically, test each component

