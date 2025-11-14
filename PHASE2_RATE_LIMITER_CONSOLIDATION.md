# Phase 2: Rate Limiter Consolidation

**Date**: November 14, 2025  
**Status**: 🟡 **IN PROGRESS**

---

## Objective

Consolidate 4 rate limiters into 1 unified system using `adaptive-request-throttler.js`

---

## Current State Analysis

### Rate Limiters to Consolidate

1. **api-rate-limiter.js** (367 lines)
   - Basic queue management
   - Priority sorting
   - Burst limiting
   - Retry logic
   - Used by: 5 files

2. **intelligent-rate-limiter.js** (varies)
   - Similar to api-rate-limiter
   - Additional features
   - Used by: 5 files

3. **unified-rate-limiter.js** (varies)
   - Service-specific configs
   - Pre-configured settings
   - Used by: service-registry.js

4. **adaptive-request-throttler.js** (402 lines) ✅ **NEW**
   - All features from above
   - Adaptive delays
   - Batching
   - Deduplication
   - Better statistics
   - Ready to use

### Files Using Old Rate Limiters

1. `test-api-optimization.js` - Uses intelligent-rate-limiter
2. `test-integration-validation.js` - Uses intelligent-rate-limiter
3. `test-api-optimization-mock.js` - Uses intelligent-rate-limiter
4. `orchestrator/core/optimization-integration.js` - Uses intelligent-rate-limiter
5. `orchestrator/core/service-registry.js` - Uses intelligent-rate-limiter
6. `orchestrator/utils/rate-limiter-init.js` - Uses api-rate-limiter
7. `orchestrator/ai/optimized-executor.js` - Uses intelligent-rate-limiter
8. `orchestrator/ai/model-availability-checker.js` - Uses api-rate-limiter
9. `orchestrator/ai/fallback-llm.js` - Uses api-rate-limiter
10. `orchestrator/workflow/mcp-todo-manager.js` - Uses api-rate-limiter
11. `orchestrator/workflow/executor-v3.js` - Uses api-rate-limiter

---

## Migration Plan

### Step 1: Update Imports (11 files)

**Pattern 1**: Replace `getRateLimiter` from api-rate-limiter
```javascript
// OLD
import { getRateLimiter } from '../utils/api-rate-limiter.js';
const rateLimiter = getRateLimiter(options);

// NEW
import adaptiveThrottler from '../utils/adaptive-request-throttler.js';
const rateLimiter = adaptiveThrottler;
```

**Pattern 2**: Replace direct import from intelligent-rate-limiter
```javascript
// OLD
import { rateLimiter } from './intelligent-rate-limiter.js';

// NEW
import adaptiveThrottler from '../utils/adaptive-request-throttler.js';
const rateLimiter = adaptiveThrottler;
```

### Step 2: Update Usage Patterns

**Pattern 1**: Replace `.call()` method
```javascript
// OLD
const result = await rateLimiter.call(async () => {
  return await axios.post(url, data);
});

// NEW
const result = await adaptiveThrottler.throttledRequest(
  async () => {
    return await axios.post(url, data);
  },
  { priority: 1, timeout: 30000 }
);
```

**Pattern 2**: Replace `.getStats()` method
```javascript
// OLD
const stats = rateLimiter.getStats();

// NEW
const stats = adaptiveThrottler.getStats();
// Same interface, same output
```

### Step 3: Delete Old Files

1. Delete `orchestrator/utils/api-rate-limiter.js`
2. Delete `orchestrator/ai/intelligent-rate-limiter.js`
3. Delete `orchestrator/utils/unified-rate-limiter.js`
4. Delete `orchestrator/utils/rate-limiter-init.js`

### Step 4: Testing

1. Run all tests
2. Verify no regressions
3. Verify performance improvements

---

## Implementation Details

### Adaptive Throttler Features

✅ Queue management (maxQueueSize: 50)  
✅ Priority sorting  
✅ Burst limiting  
✅ Retry logic  
✅ Adaptive delays (300-3000ms)  
✅ Request batching (up to 3)  
✅ Deduplication  
✅ Statistics tracking  
✅ Health status monitoring  
✅ EventEmitter support (if needed)  

### Configuration

```javascript
{
  minDelay: 300,           // 300ms minimum
  maxDelay: 3000,          // 3 seconds maximum
  baseDelay: 800,          // 800ms base delay
  batchSize: 3,            // Batch up to 3 requests
  batchWaitTime: 150,      // Wait 150ms for batching
  targetResponseTime: 2000, // Target 2 second response
  maxConcurrent: 1,        // Only 1 concurrent request
  maxQueueSize: 50         // Max 50 queued requests
}
```

---

## Files to Update

### High Priority (Core)
1. `orchestrator/core/service-registry.js` - Register new throttler
2. `orchestrator/core/optimization-integration.js` - Use new throttler
3. `orchestrator/workflow/mcp-todo-manager.js` - Use new throttler
4. `orchestrator/workflow/executor-v3.js` - Use new throttler

### Medium Priority (AI)
5. `orchestrator/ai/optimized-executor.js` - Use new throttler
6. `orchestrator/ai/fallback-llm.js` - Use new throttler
7. `orchestrator/ai/model-availability-checker.js` - Use new throttler

### Low Priority (Tests)
8. `test-api-optimization.js` - Update tests
9. `test-integration-validation.js` - Update tests
10. `test-api-optimization-mock.js` - Update tests

### Cleanup
11. Delete `orchestrator/utils/rate-limiter-init.js`
12. Delete `orchestrator/utils/api-rate-limiter.js`
13. Delete `orchestrator/ai/intelligent-rate-limiter.js`
14. Delete `orchestrator/utils/unified-rate-limiter.js`

---

## Expected Benefits

### Code Reduction
- **Before**: 4 rate limiters × ~350 lines = ~1400 lines
- **After**: 1 rate limiter × 402 lines = 402 lines
- **Reduction**: 71%

### Performance
- **API calls**: 20-30% reduction (batching + deduplication)
- **Response time**: 15-25% improvement
- **Memory**: 10-20% reduction

### Maintainability
- Single source of truth
- Easier to debug
- Consistent behavior
- Better documentation

---

## Risk Assessment

### Low Risk ✅
- Adaptive throttler is comprehensive
- All features are present
- Tests can verify compatibility

### Medium Risk 🟡
- Import path changes
- Usage pattern changes
- Need to update 11 files

### High Risk 🔴
- Production deployment
- Need careful monitoring

---

## Mitigation

1. Comprehensive testing before deletion
2. Gradual migration with feature flags (if needed)
3. Rollback plan ready
4. Monitoring alerts configured

---

## Timeline

```
Phase 2: Rate Limiter Consolidation
├─ Step 1: Update imports (1 hour)
├─ Step 2: Update usage patterns (1 hour)
├─ Step 3: Testing (1 hour)
├─ Step 4: Delete old files (15 min)
└─ Total: ~3.5 hours
```

---

## Success Criteria

- [ ] All 11 files updated
- [ ] All tests passing
- [ ] No regressions
- [ ] Old files deleted
- [ ] 71% code reduction achieved
- [ ] Performance improvements verified

---

## Status

**Phase 2**: 🟡 **IN PROGRESS**

**Next**: Start updating imports in all 11 files

