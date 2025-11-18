# Phase 1.3 Implementation Checklist

**Phase**: 1.3 – Integration into executeWorkflow  
**Status**: 🚀 Ready to start  
**Estimated time**: 3–5 hours  
**Date created**: 2025-11-18

---

## Pre-Implementation Checklist

- [ ] Read `NEXT_SESSION_INSTRUCTIONS_2025-11-18.md`
- [ ] Read `PHASE1_3_INTEGRATION_PLAN_2025-11-18.md`
- [ ] Review stage functions in `executor-v3.js` (lines 41–862)
- [ ] Understand `workflowContext` structure
- [ ] Understand `processors` structure
- [ ] Have rollback plan ready
- [ ] Backup current `executor-v3.js`

---

## Implementation Steps

### Step 1: Create Context & Processors Objects
**Location**: Start of `executeWorkflow()` after DI container resolution  
**Estimated time**: 15 minutes

- [ ] Create `workflowContext` object with all dependencies
- [ ] Create `processors` object with all stage processors
- [ ] Add `todo` and `workflowStart` to context
- [ ] Verify object structure matches function signatures

**Code template**:
```javascript
const workflowContext = {
  userMessage,
  session,
  res,
  container,
  logger,
  wsManager,
  ttsSyncManager,
  localizationService,
  todo: null,
  workflowStart: Date.now()
};

const processors = {
  modeProcessor,
  devProcessor,
  contextEnrichmentProcessor,
  todoProcessor,
  serverSelectionProcessor,
  planProcessor,
  executeProcessor,
  verifyProcessor,
  replanProcessor,
  summaryProcessor
};
```

### Step 2: Replace Stage 0-MCP (Mode Selection)
**Location**: Lines ~587–726 in executeWorkflow  
**Estimated time**: 20 minutes

- [ ] Locate current Stage 0-MCP code
- [ ] Comment out original code (keep as reference)
- [ ] Add function call: `const modeResult = await runModeSelection(workflowContext, processors);`
- [ ] Extract return values: `const mode = modeResult.mode;`
- [ ] Verify mode selection logic is preserved
- [ ] Test: Mode should be chat/task/dev

### Step 3: Replace Stage 0.5-MCP (Context Enrichment)
**Location**: Lines ~1740–1768 in executeWorkflow  
**Estimated time**: 15 minutes

- [ ] Locate current Stage 0.5-MCP code
- [ ] Comment out original code
- [ ] Add function call: `const enrichmentResult = await runContextEnrichment(workflowContext, processors);`
- [ ] Extract values: `enrichedMessage`, `enrichmentMetadata`
- [ ] Verify enrichment logic is preserved
- [ ] Test: Enriched message should be different from original

### Step 4: Replace Stage 1-MCP (TODO Planning)
**Location**: Lines ~1770–1826 in executeWorkflow  
**Estimated time**: 20 minutes

- [ ] Locate current Stage 1-MCP code
- [ ] Comment out original code
- [ ] Add function call: `const todoResult = await runTodoPlanning(workflowContext, processors, enrichedMessage, enrichmentMetadata);`
- [ ] Extract values: `todo`, `plan`
- [ ] Update context: `workflowContext.todo = todo;`
- [ ] Verify TODO structure is correct
- [ ] Test: TODO should have items array

### Step 5: Replace Stage 2.0-MCP (Server Selection) in Item Loop
**Location**: Lines ~2160–2216 in executeWorkflow (inside item loop)  
**Estimated time**: 20 minutes

- [ ] Locate current Stage 2.0-MCP code in item loop
- [ ] Comment out original code
- [ ] Add function call: `const serverSelection = await runServerSelection(workflowContext, processors, item, suggestedServers);`
- [ ] Extract values: `servers`, `prompts`
- [ ] Verify server selection is preserved
- [ ] Test: Servers should be selected correctly

### Step 6: Replace Stage 2.1-MCP (Tool Planning) in Item Loop
**Location**: Lines ~2218–2256 in executeWorkflow (inside item loop)  
**Estimated time**: 20 minutes

- [ ] Locate current Stage 2.1-MCP code in item loop
- [ ] Comment out original code
- [ ] Add function call: `const planResult = await runToolPlanning(workflowContext, processors, item, serverSelection);`
- [ ] Check for errors: `if (!planResult.success) { attempt++; continue; }`
- [ ] Verify tool planning is preserved
- [ ] Test: Plan should have tool_calls

### Step 7: Replace Stage 2.2-MCP (Execution) in Item Loop
**Location**: Lines ~2258–2292 in executeWorkflow (inside item loop)  
**Estimated time**: 20 minutes

- [ ] Locate current Stage 2.2-MCP code in item loop
- [ ] Comment out original code
- [ ] Add function call: `const execResult = await runExecution(workflowContext, processors, item, planResult.plan);`
- [ ] Extract values: `execution`, `success`
- [ ] Verify execution is preserved
- [ ] Test: Execution should have results

### Step 8: Replace Stage 2.3-MCP (Verification) in Item Loop
**Location**: Lines ~2309–2345 in executeWorkflow (inside item loop)  
**Estimated time**: 20 minutes

- [ ] Locate current Stage 2.3-MCP code in item loop
- [ ] Comment out original code
- [ ] Add function call: `const verifyResult = await runVerification(workflowContext, processors, item, execResult);`
- [ ] Check verification: `if (verifyResult.verified) { item.status = 'completed'; break; }`
- [ ] Verify verification is preserved
- [ ] Test: Verification should return verified boolean

### Step 9: Replace Stage 3-MCP (Replan) in Item Loop
**Location**: Lines ~2402–2624 in executeWorkflow (inside item loop)  
**Estimated time**: 30 minutes

- [ ] Locate current Stage 3-MCP code in item loop
- [ ] Comment out original code
- [ ] Add function call: `const replanResult = await runReplan(workflowContext, processors, item, execResult, verifyResult, planResult);`
- [ ] Handle replan strategies: replanned/skip/retry
- [ ] Insert new items if replanned
- [ ] Verify replan logic is preserved
- [ ] Test: Replan should handle failures correctly

### Step 10: Replace Stage 8-MCP (Final Summary)
**Location**: Lines ~2693–2792 in executeWorkflow  
**Estimated time**: 20 minutes

- [ ] Locate current Stage 8-MCP code
- [ ] Comment out original code
- [ ] Add function call: `const summaryResult = await runFinalSummary(workflowContext, processors, todo);`
- [ ] Return summary: `return summaryResult;`
- [ ] Verify final summary is preserved
- [ ] Test: Summary should be generated correctly

---

## Testing Checklist

### Pre-Testing
- [ ] All code changes committed
- [ ] Syntax validation: `node -c executor-v3.js` (should pass)
- [ ] No console errors on startup

### Functional Testing
- [ ] Mode selection works (chat/task/dev)
- [ ] Context enrichment works
- [ ] TODO planning creates items
- [ ] Server selection picks correct servers
- [ ] Tool planning creates valid plans
- [ ] Execution runs tools
- [ ] Verification checks results
- [ ] Replan handles failures
- [ ] Final summary is generated

### Integration Testing
- [ ] Run HackLab scenario
- [ ] Compare outputs with original
- [ ] Verify all logs appear
- [ ] Verify all TTS messages work
- [ ] Verify all SSE messages work
- [ ] Verify all WebSocket messages work

### Regression Testing
- [ ] Chat mode works
- [ ] Task mode works
- [ ] DEV mode works
- [ ] Error handling works
- [ ] Fallback logic works
- [ ] Session management works
- [ ] Memory cleanup works

---

## Validation Checklist

- [ ] All 9 stage functions called
- [ ] Zero behavior changes
- [ ] All outputs identical to original
- [ ] All logs appear correctly
- [ ] All TTS messages work
- [ ] All SSE/WebSocket messages work
- [ ] No console errors
- [ ] No memory leaks
- [ ] Performance unchanged

---

## Rollback Checklist

If issues arise:
- [ ] Revert changes to `executeWorkflow`
- [ ] Keep stage functions (still useful)
- [ ] Restore original code from comments
- [ ] Verify original behavior restored
- [ ] Document issue for next attempt

---

## Documentation Checklist

- [ ] Update `PHASE1_PROGRESS_2025-11-18.md` with completion status
- [ ] Update `SUPER_EXECUTOR_REFACTORING_PLAN_2025-11-18.md` with P1.7 status
- [ ] Create `PHASE1_3_COMPLETION_REPORT_2025-11-18.md`
- [ ] Update `INDEX_2025-11-18.md` with new status

---

## Post-Implementation Checklist

- [ ] All tests passed
- [ ] All validations passed
- [ ] Documentation updated
- [ ] Changes committed
- [ ] Rollback plan documented
- [ ] Ready for Phase 1.8 (Testing)

---

## Time Tracking

| Step                         | Estimated    | Actual | Status |
| ---------------------------- | ------------ | ------ | ------ |
| Pre-implementation           | 15 min       |        | ⏳      |
| Step 1: Context & Processors | 15 min       |        | ⏳      |
| Step 2: Stage 0-MCP          | 20 min       |        | ⏳      |
| Step 3: Stage 0.5-MCP        | 15 min       |        | ⏳      |
| Step 4: Stage 1-MCP          | 20 min       |        | ⏳      |
| Step 5: Stage 2.0-MCP        | 20 min       |        | ⏳      |
| Step 6: Stage 2.1-MCP        | 20 min       |        | ⏳      |
| Step 7: Stage 2.2-MCP        | 20 min       |        | ⏳      |
| Step 8: Stage 2.3-MCP        | 20 min       |        | ⏳      |
| Step 9: Stage 3-MCP          | 30 min       |        | ⏳      |
| Step 10: Stage 8-MCP         | 20 min       |        | ⏳      |
| Testing                      | 60 min       |        | ⏳      |
| Documentation                | 30 min       |        | ⏳      |
| **TOTAL**                    | **~5 hours** |        | ⏳      |

---

## Quick Reference

### File Locations
- **Main file**: `/orchestrator/workflow/executor-v3.js`
- **Stage functions**: Lines 41–862
- **executeWorkflow**: Lines 880+
- **Original code**: Keep in comments for reference

### Key Objects
- **workflowContext**: Contains all dependencies
- **processors**: Contains all stage processors
- **todo**: TODO object (populated after Stage 1)

### Important Functions
- `runModeSelection()` – Stage 0-MCP
- `runContextEnrichment()` – Stage 0.5-MCP
- `runTodoPlanning()` – Stage 1-MCP
- `runServerSelection()` – Stage 2.0-MCP
- `runToolPlanning()` – Stage 2.1-MCP
- `runExecution()` – Stage 2.2-MCP
- `runVerification()` – Stage 2.3-MCP
- `runReplan()` – Stage 3-MCP
- `runFinalSummary()` – Stage 8-MCP

---

## Success Criteria

✅ All 9 stage functions called  
✅ Zero behavior changes  
✅ All tests passed  
✅ All validations passed  
✅ Documentation updated  
✅ Ready for Phase 1.8  

---

**Status**: 🚀 Ready to start Phase 1.3  
**Next**: Phase 1.8 (Regression Testing)
