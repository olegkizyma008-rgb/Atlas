# Next Session Instructions – Phase 1.3 Integration

**Previous Session**: Phase 1.2 – Populated all 9 stage functions ✅  
**Current Session**: Phase 1.3 – Integration into executeWorkflow  
**Date**: 2025-11-18

---

## What Was Completed in Phase 1.2

✅ All 9 stage functions populated with real logic (~590 lines)
✅ Functions are independently testable
✅ Error handling & fallback patterns preserved
✅ No behavior changes (100% backward compatible)
✅ File: `/orchestrator/workflow/executor-v3.js` (lines 41–862)

---

## Phase 1.3 Objective

Replace inline Stage 0–8 code in `executeWorkflow` with calls to the extracted stage functions.

**Key Principle**: Zero behavior changes – only code organization

---

## Implementation Plan

### Step 1: Understand Current Structure
- **File**: `/orchestrator/workflow/executor-v3.js`
- **Main function**: `executeWorkflow()` (starts at line 880)
- **Current stages**: All inline (0, 0.5, 1, 2.0, 2.1, 2.2, 2.3, 3, 8)
- **Item loop**: Lines ~1899–2691

### Step 2: Create Context & Processors Objects
**Location**: Start of `executeWorkflow()` after DI container resolution

```javascript
// Create unified context object
const workflowContext = {
  userMessage,
  session,
  res,
  container,
  logger,
  wsManager,
  ttsSyncManager,
  localizationService,
  todo: null,  // Will be populated after Stage 1
  workflowStart: Date.now()
};

// Gather all processors
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

### Step 3: Replace Stages (In Order)

#### Stage 0-MCP (Mode Selection)
**Current location**: Lines ~587–726  
**Replace with**:
```javascript
const modeResult = await runModeSelection(workflowContext, processors);
const mode = modeResult.mode;
// ... rest of logic
```

#### Stage 0.5-MCP (Context Enrichment)
**Current location**: Lines ~1740–1768  
**Replace with**:
```javascript
const enrichmentResult = await runContextEnrichment(workflowContext, processors);
const enrichedMessage = enrichmentResult.enrichedMessage;
const enrichmentMetadata = enrichmentResult.metadata;
```

#### Stage 1-MCP (TODO Planning)
**Current location**: Lines ~1770–1826  
**Replace with**:
```javascript
const todoResult = await runTodoPlanning(workflowContext, processors, enrichedMessage, enrichmentMetadata);
const todo = todoResult.todo;
workflowContext.todo = todo;  // Update context for downstream stages
```

#### Stages 2.0–3 (In Item Loop)
**Current location**: Lines ~2125–2624 (inside item loop)  
**Replace with**:
```javascript
// Stage 2.0: Server Selection
const serverSelection = await runServerSelection(workflowContext, processors, item, suggestedServers);

// Stage 2.1: Tool Planning
const planResult = await runToolPlanning(workflowContext, processors, item, serverSelection);
if (!planResult.success) {
  attempt++;
  continue;
}

// Stage 2.2: Execution
const execResult = await runExecution(workflowContext, processors, item, planResult.plan);

// Stage 2.3: Verification
const verifyResult = await runVerification(workflowContext, processors, item, execResult);

if (verifyResult.verified) {
  // Success
  item.status = 'completed';
  item.verification = verifyResult.verification;
  break;
}

// Stage 3: Replan
const replanResult = await runReplan(workflowContext, processors, item, execResult, verifyResult, planResult);
// ... handle replan logic
```

#### Stage 8-MCP (Final Summary)
**Current location**: Lines ~2693–2792  
**Replace with**:
```javascript
const summaryResult = await runFinalSummary(workflowContext, processors, todo);
return summaryResult;
```

---

## Testing Strategy

### Regression Testing
1. **Run HackLab scenario** with same user input
2. **Compare outputs** (should be identical to current behavior)
3. **Check logs** for any errors or warnings
4. **Verify SSE messages** are sent correctly
5. **Verify WebSocket messages** are sent correctly

### Validation Checklist
- [ ] Mode selection works (chat/task/dev)
- [ ] Context enrichment works
- [ ] TODO planning creates items
- [ ] Server selection picks correct servers
- [ ] Tool planning creates valid plans
- [ ] Execution runs tools
- [ ] Verification checks results
- [ ] Replan handles failures
- [ ] Final summary is generated
- [ ] All logs appear correctly
- [ ] All TTS messages work
- [ ] All SSE/WebSocket messages work

---

## Important Notes

### Keep Original Code
- Don't delete original code yet
- Keep it in comments for reference
- Can quickly revert if needed

### Error Handling
- All functions have error handling
- Fallback logic is built-in
- No throwing (graceful degradation)

### Testing Before Commit
- Run full HackLab scenario
- Check logs for errors
- Verify all outputs match current behavior
- Only commit after validation

---

## Files to Reference

| File                                       | Purpose                    |
| ------------------------------------------ | -------------------------- |
| `PHASE1_3_INTEGRATION_PLAN_2025-11-18.md`  | Detailed step-by-step plan |
| `PHASE1_2_COMPLETION_REPORT_2025-11-18.md` | What was completed         |
| `PHASE1_2_SUMMARY_2025-11-18.md`           | Quick reference            |
| `executor-v3.js` (lines 41–862)            | Stage functions            |
| `executor-v3.js` (lines 880+)              | Original executeWorkflow   |

---

## Estimated Effort

- **Integration**: 2–3 hours
- **Testing**: 1–2 hours
- **Total**: 3–5 hours

---

## Success Criteria

✅ All 9 stage functions called from executeWorkflow  
✅ Zero behavior changes (outputs identical)  
✅ All logs appear correctly  
✅ All TTS messages work  
✅ All SSE/WebSocket messages work  
✅ HackLab scenario passes  

---

## Rollback Plan

If issues arise:
1. Revert changes to `executeWorkflow`
2. Keep stage functions (they're still useful)
3. Can try again with different approach

---

## Next Steps After Phase 1.3

- **Phase 1.8**: Comprehensive regression testing
- **Phase 2**: Integrate WorkflowStateMachine
- **Phase 3**: Add OptimizedWorkflowManager
- **Phase 4**: Add HybridWorkflowExecutor
- **Phase 5**: Add feature flags
- **Phase 6**: Cleanup legacy code

---

## Questions?

Refer to:
- `PHASE1_3_INTEGRATION_PLAN_2025-11-18.md` for detailed steps
- `PHASE1_2_COMPLETION_REPORT_2025-11-18.md` for what was done
- Stage function JSDoc comments for function signatures
