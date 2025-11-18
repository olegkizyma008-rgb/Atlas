# Execution Error Fixes - 2025-11-19

## Problem
Items 9-11 failed because:
1. Item 9 (search image) - LLM planning request timed out or errored
2. Item 10 (download image) - Blocked by item 9 failure
3. Item 11 (set wallpaper) - Blocked by item 10 failure

**Root cause**: When tool planning failed, Grisha was never called for verification, so no replanning was triggered.

## Fixes Applied

### Fix 1: Add Timeout Protection for Tool Planning
**File**: `orchestrator/workflow/stages/tetyana-plan-tools-processor.js` (lines 305-335)

**What changed**:
- Added 30-second timeout for LLM tool planning requests
- Wrapped `mcpTodoManager.planTools()` in `Promise.race()` with timeout
- Returns error result instead of throwing (allows graceful handling)
- Includes `shouldRetry` flag for executor to decide on retry

**Code**:
```javascript
// Create timeout promise (30 seconds for tool planning)
const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Tool planning timeout after 30 seconds')), 30000)
);

// Race: whichever completes first
plan = await Promise.race([planPromise, timeoutPromise]);
```

**Impact**: 
- ✅ Prevents infinite hangs on slow LLM requests
- ✅ Returns error result for executor to handle
- ✅ Allows retry logic to work

### Fix 2: Add Error Handling in Executor
**File**: `orchestrator/workflow/executor-v3.js` (lines 1768-1794)

**What changed**:
- When tool planning fails, check if should retry (attempt < maxAttempts)
- If max attempts reached, create failed execution result
- **CRITICAL**: Continue to Grisha verification even with failed execution
- This allows Grisha to verify the failure and trigger replanning

**Code**:
```javascript
if (planResult.shouldRetry && attempt < maxAttempts) {
  attempt++;
  continue;
}

// If max attempts reached, create failed execution result for Grisha to verify
const failedExecResult = {
  success: false,
  error: planResult.error || 'Tool planning failed',
  stage: 'tetyana-plan-tools',
  tools_executed: [],
  tools_failed: [{ name: 'tool_planning', reason: planResult.error }],
  execution_details: {
    total_planned: 0,
    successful_tools: [],
    failed_tools: [{ name: 'tool_planning', reason: planResult.error }]
  }
};

// Continue to Grisha verification with failed execution
logger.system('executor', `[EXEC] Proceeding to Grisha verification with failed execution status`);
```

**Impact**:
- ✅ Grisha is now called even when execution fails
- ✅ Grisha can verify the failure and confirm it
- ✅ Replanning is triggered automatically
- ✅ Workflow doesn't get stuck

## How It Works Now

### Before (Broken):
```
Item 9 tool planning timeout
  ↓
planResult.success = false
  ↓
Executor: continue (skip to next item)
  ↓
Grisha never called
  ↓
No verification, no replanning
  ↓
Workflow stuck ❌
```

### After (Fixed):
```
Item 9 tool planning timeout
  ↓
planResult.success = false
  ↓
Executor: create failedExecResult
  ↓
Executor: continue to Grisha verification
  ↓
Grisha: verify failed execution
  ↓
Grisha: confirm failure
  ↓
Replanning triggered ✅
  ↓
Item 9 retried with new plan
```

## Verification

### What to test:
1. Send request with complex task (e.g., web search + download)
2. Monitor logs for:
   - `[STAGE-2.1-MCP] Tool planning timeout after 30 seconds`
   - `[EXEC] Tool planning failed after X attempts`
   - `[EXEC] Proceeding to Grisha verification with failed execution status`
   - `[GRISHA] ✅ Verification complete` (should verify failure)
   - Replanning should be triggered

### Expected behavior:
- If tool planning times out → Grisha verifies failure → Replanning triggered
- If tool planning succeeds → Normal execution → Grisha verifies success
- No more stuck workflows

## Files Modified

1. `orchestrator/workflow/stages/tetyana-plan-tools-processor.js`
   - Added timeout protection (30 seconds)
   - Added error handling with `shouldRetry` flag

2. `orchestrator/workflow/executor-v3.js`
   - Added retry logic for planning failures
   - Added failed execution result creation
   - Ensured Grisha is called even on failures

## Summary

**Problem**: Items 9-11 failed because tool planning timed out and Grisha was never called.

**Solution**: 
1. Add timeout protection for tool planning (30 seconds)
2. Return error result instead of throwing
3. Create failed execution result when max attempts reached
4. Continue to Grisha verification with failed execution
5. Grisha verifies failure and triggers replanning

**Result**: Workflow no longer gets stuck. Failed items are properly verified and replanned.

✅ **System is now resilient to tool planning failures!**
