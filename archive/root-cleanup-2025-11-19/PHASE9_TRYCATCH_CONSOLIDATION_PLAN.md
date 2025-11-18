# Phase 9: Try-Catch Pattern Consolidation
**Target**: 30-40% code reduction in error handling
**Status**: PLANNING
**Date**: 2025-11-14

## Current State Analysis

### Try-Catch Patterns Found
From grep analysis:
- `optimization-integration.js`: 4 catch blocks
- `di-container.js`: 4 catch blocks
- `service-registry.js`: 4 catch blocks
- `application.js`: 5 catch blocks
- Plus many more across orchestrator

### Common Patterns Identified

**Pattern 1: Standard Error Logging**
```javascript
try {
    // ... operation
} catch (error) {
    logger.error('component', `Error: ${error.message}`);
}
```

**Pattern 2: Error with Fallback**
```javascript
try {
    // ... operation
} catch (error) {
    logger.warn('component', `Failed: ${error.message}`);
    return fallbackValue;
}
```

**Pattern 3: Error with Retry**
```javascript
try {
    // ... operation
} catch (error) {
    logger.error('component', `Attempt failed: ${error.message}`);
    // retry logic
}
```

**Pattern 4: Error with Recovery**
```javascript
try {
    // ... operation
} catch (error) {
    logger.error('component', `Error: ${error.message}`);
    await recoveryFunction();
}
```

## Optimization Strategy

### 1. Create Error Handler Utilities
**New File**: `orchestrator/utils/error-handler.js`
- Centralized error handling functions
- Consistent logging patterns
- Reusable recovery strategies

```javascript
export const handleError = (error, logger, component, options = {}) => {
    const { level = 'error', fallback = null, retry = null } = options;
    
    logger[level](component, `${options.message || 'Error'}: ${error.message}`);
    
    if (fallback) return fallback;
    if (retry) return retry();
    throw error;
};

export const withErrorHandling = async (fn, logger, component, options = {}) => {
    try {
        return await fn();
    } catch (error) {
        return handleError(error, logger, component, options);
    }
};
```

### 2. Consolidate Try-Catch Blocks
**Reduction**: 30-40% of error handling code

**Before:**
```javascript
try {
    const result = await operation();
    logger.info('component', 'Success');
    return result;
} catch (error) {
    logger.error('component', `Operation failed: ${error.message}`);
    return null;
}
```

**After:**
```javascript
return await withErrorHandling(
    () => operation(),
    logger,
    'component',
    { fallback: null }
);
```

### 3. Create Error Recovery Patterns
**New File**: `orchestrator/utils/error-recovery.js`
- Retry with exponential backoff
- Circuit breaker pattern
- Fallback strategies
- Timeout handling

```javascript
export const retryWithBackoff = async (fn, maxAttempts = 3, delay = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxAttempts - 1) throw error;
            await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
        }
    }
};

export const withCircuitBreaker = (fn, threshold = 3, timeout = 60000) => {
    // Implementation
};
```

### 4. Update Core Components
**Files to Update:**
- `orchestrator/core/application.js`
- `orchestrator/core/di-container.js`
- `orchestrator/core/service-registry.js`
- `orchestrator/core/optimization-integration.js`
- `orchestrator/workflow/mcp-todo-manager.js`
- `orchestrator/services/*.js`

**Pattern:**
- Replace try-catch with utility functions
- Maintain same behavior
- Improve consistency
- Reduce code duplication

## Expected Results

### Code Reduction
- Error handling utilities: ~150 lines (new)
- Removed try-catch blocks: ~400-500 lines
- Updated imports/calls: ~100 lines
- **Net Reduction**: 250-350 lines (-30-40%)

### Quality Improvements
- Consistent error handling across system
- Centralized logging patterns
- Reusable recovery strategies
- Better error tracking
- Improved testability

### Performance
- Slightly faster (less code)
- Better memory usage
- Improved error recovery

## Implementation Plan

### Step 1: Create Error Handler Utilities
- Create `error-handler.js` with core functions
- Create `error-recovery.js` with recovery patterns
- Add comprehensive documentation
- Create unit tests

### Step 2: Identify High-Impact Files
- Count try-catch blocks in each file
- Prioritize files with most blocks
- Estimate reduction per file

### Step 3: Refactor Core Components
- Update `application.js` (5 catch blocks)
- Update `service-registry.js` (4 catch blocks)
- Update `di-container.js` (4 catch blocks)
- Update `optimization-integration.js` (4 catch blocks)

### Step 4: Refactor Services
- Update all service files
- Update workflow files
- Update AI components

### Step 5: Testing & Verification
- Run full test suite
- Verify error handling works
- Check logging consistency
- Performance benchmarking

## Files to Create
1. `orchestrator/utils/error-handler.js` (~150 lines)
2. `orchestrator/utils/error-recovery.js` (~100 lines)
3. Tests for error utilities

## Files to Modify
- `orchestrator/core/application.js`
- `orchestrator/core/di-container.js`
- `orchestrator/core/service-registry.js`
- `orchestrator/core/optimization-integration.js`
- All service files
- All workflow files

## Success Criteria
- ✅ 30-40% code reduction in error handling
- ✅ All existing tests pass
- ✅ No breaking changes
- ✅ Consistent error handling
- ✅ Better error recovery

## Timeline
- Analysis: ✅ DONE
- Utility creation: 1-2 hours
- Core refactoring: 2-3 hours
- Service refactoring: 2-3 hours
- Testing: 1-2 hours
- **Total**: 6-10 hours

## Risk Assessment
- **Low Risk**: Utilities are isolated
- **Medium Risk**: Refactoring many files
- **Mitigation**: Incremental changes, comprehensive testing

## Next Phase (Phase 10)
- Configuration Consolidation (10-15% reduction)
- Unified config system
- Dynamic configuration loading

---

**Status**: PLANNING
**Priority**: HIGH
**Complexity**: MEDIUM
