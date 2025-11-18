# Phase 1.3 – Integration Plan (Replace executeWorkflow with Stage Functions)

**Status**: 🚀 READY TO START  
**Date**: 2025-11-18  
**Objective**: Replace inline Stage 0–8 logic in `executeWorkflow` with calls to extracted stage functions

---

## Overview

Phase 1.2 successfully extracted all 9 stage functions with real logic (~590 lines):
- ✅ `runModeSelection()` – Stage 0-MCP
- ✅ `runContextEnrichment()` – Stage 0.5-MCP
- ✅ `runTodoPlanning()` – Stage 1-MCP
- ✅ `runServerSelection()` – Stage 2.0-MCP
- ✅ `runToolPlanning()` – Stage 2.1-MCP
- ✅ `runExecution()` – Stage 2.2-MCP
- ✅ `runVerification()` – Stage 2.3-MCP
- ✅ `runReplan()` – Stage 3-MCP
- ✅ `runFinalSummary()` – Stage 8-MCP

**Phase 1.3 Goal**: Replace the original inline code in `executeWorkflow` with calls to these functions, maintaining **100% behavior compatibility**.

---

## Integration Strategy

### Step 1: Create workflowContext object
**Location**: `executeWorkflow()` start  
**Action**: Build unified context object containing all dependencies

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
  todo: null,  // Will be populated after Stage 1
  workflowStart: Date.now()
};
```

### Step 2: Create processors object
**Location**: After DI container resolution  
**Action**: Gather all stage processors

```javascript
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

### Step 3: Replace Stage 0-MCP (Mode Selection)
**Current**: Lines ~587–726 in executeWorkflow  
**Replace with**: `await runModeSelection(workflowContext, processors)`  
**Validation**: Ensure mode result is returned correctly

### Step 4: Replace Stage 0.5-MCP (Context Enrichment)
**Current**: Lines ~1740–1768 in executeWorkflow  
**Replace with**: `const enrichmentResult = await runContextEnrichment(workflowContext, processors)`  
**Validation**: Ensure enrichedMessage is passed to Stage 1

### Step 5: Replace Stage 1-MCP (TODO Planning)
**Current**: Lines ~1770–1826 in executeWorkflow  
**Replace with**: `const todoResult = await runTodoPlanning(workflowContext, processors, enrichedMessage, enrichmentMetadata)`  
**Validation**: Ensure todo object is properly structured

### Step 6: Replace Stage 2.0-MCP (Server Selection) – IN ITEM LOOP
**Current**: Lines ~2160–2216 in executeWorkflow (inside item loop)  
**Replace with**: `const serverSelection = await runServerSelection(workflowContext, processors, item, suggestedServers)`  
**Validation**: Ensure selected servers are passed to Stage 2.1

### Step 7: Replace Stage 2.1-MCP (Tool Planning) – IN ITEM LOOP
**Current**: Lines ~2218–2256 in executeWorkflow (inside item loop)  
**Replace with**: `const planResult = await runToolPlanning(workflowContext, processors, item, serverSelection)`  
**Validation**: Ensure plan is passed to Stage 2.2

### Step 8: Replace Stage 2.2-MCP (Execution) – IN ITEM LOOP
**Current**: Lines ~2258–2292 in executeWorkflow (inside item loop)  
**Replace with**: `const execResult = await runExecution(workflowContext, processors, item, planResult.plan)`  
**Validation**: Ensure execution result is passed to Stage 2.3

### Step 9: Replace Stage 2.3-MCP (Verification) – IN ITEM LOOP
**Current**: Lines ~2309–2345 in executeWorkflow (inside item loop)  
**Replace with**: `const verifyResult = await runVerification(workflowContext, processors, item, execResult)`  
**Validation**: Ensure verification result triggers success or replan

### Step 10: Replace Stage 3-MCP (Replan) – IN ITEM LOOP
**Current**: Lines ~2402–2624 in executeWorkflow (inside item loop)  
**Replace with**: `const replanResult = await runReplan(workflowContext, processors, item, execResult, verifyResult, planResult)`  
**Validation**: Ensure replanned items are inserted correctly

### Step 11: Replace Stage 8-MCP (Final Summary)
**Current**: Lines ~2693–2792 in executeWorkflow  
**Replace with**: `const summaryResult = await runFinalSummary(workflowContext, processors, todo)`  
**Validation**: Ensure final summary is returned

---

## Implementation Checklist

- [ ] **P1.7a**: Create workflowContext & processors objects
- [ ] **P1.7b**: Replace Stage 0-MCP (Mode Selection)
- [ ] **P1.7c**: Replace Stage 0.5-MCP (Context Enrichment)
- [ ] **P1.7d**: Replace Stage 1-MCP (TODO Planning)
- [ ] **P1.7e**: Replace Stage 2.0-MCP (Server Selection) in item loop
- [ ] **P1.7f**: Replace Stage 2.1-MCP (Tool Planning) in item loop
- [ ] **P1.7g**: Replace Stage 2.2-MCP (Execution) in item loop
- [ ] **P1.7h**: Replace Stage 2.3-MCP (Verification) in item loop
- [ ] **P1.7i**: Replace Stage 3-MCP (Replan) in item loop
- [ ] **P1.7j**: Replace Stage 8-MCP (Final Summary)

---

## Testing Strategy (Phase 1.8)

### Regression Testing
1. **Run HackLab scenario** with same user input
2. **Compare outputs** (should be identical)
3. **Check logs** for any errors or warnings
4. **Verify SSE messages** are sent correctly
5. **Verify WebSocket messages** are sent correctly

### Validation Points
- ✅ Mode selection works (chat/task/dev)
- ✅ Context enrichment works
- ✅ TODO planning creates items
- ✅ Server selection picks correct servers
- ✅ Tool planning creates valid plans
- ✅ Execution runs tools
- ✅ Verification checks results
- ✅ Replan handles failures
- ✅ Final summary is generated

---

## Rollback Plan

If issues arise during integration:
1. Keep original `executeWorkflow` code in comments
2. Can quickly revert to original implementation
3. Stage functions remain available for Phase 2+

---

## Notes

- **No behavior changes**: All logic is extracted as-is
- **Backward compatible**: Original code patterns preserved
- **Modular design**: Each stage is now independently testable
- **Ready for Phase 2**: Once integrated, can add state machine layer
