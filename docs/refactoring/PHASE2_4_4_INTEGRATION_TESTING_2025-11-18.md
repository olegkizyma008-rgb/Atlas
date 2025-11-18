# Phase 2.4.4 Integration Testing Plan

**Date**: 2025-11-18  
**Status**: IN PROGRESS (25%)  
**Objective**: Verify all state transitions, context flow, and error handling

---

## 📋 Testing Checklist

### 1. State Transitions Verification

**Objective**: Ensure all state transitions work correctly

#### Mode Selection Flow
- [ ] MODE_SELECTION → CHAT (when mode === 'chat')
- [ ] MODE_SELECTION → DEV (when mode === 'dev')
- [ ] MODE_SELECTION → TASK (when mode === 'task')

#### TASK Mode Flow (Nested States)
- [ ] TASK → CONTEXT_ENRICHMENT
- [ ] CONTEXT_ENRICHMENT → TODO_PLANNING
- [ ] TODO_PLANNING → ITEM_LOOP
- [ ] ITEM_LOOP → FINAL_SUMMARY

#### Item Processing Flow (Within ITEM_LOOP)
- [ ] SERVER_SELECTION → TOOL_PLANNING
- [ ] TOOL_PLANNING → EXECUTION
- [ ] EXECUTION → VERIFICATION
- [ ] VERIFICATION → REPLAN (if needed)
- [ ] REPLAN → (skip or retry)

### 2. Context Flow Verification

**Objective**: Ensure context is properly passed and updated through states

#### Context Initialization
- [ ] userMessage set in context
- [ ] session set in context
- [ ] container set in context
- [ ] res set in context
- [ ] wsManager set in context
- [ ] ttsSyncManager set in context
- [ ] localizationService set in context
- [ ] workflowStart set in context

#### Context Updates Through States
- [ ] ContextEnrichmentHandler updates enrichedMessage
- [ ] TodoPlanningHandler updates todo
- [ ] ItemLoopHandler updates item statuses
- [ ] FinalSummaryHandler updates metrics

#### Context Preservation
- [ ] Context not lost between state transitions
- [ ] Context properly passed to handlers
- [ ] Context properly passed to processors

### 3. Error Handling Verification

**Objective**: Ensure errors are handled gracefully

#### Handler Errors
- [ ] ContextEnrichmentHandler error handling
- [ ] TodoPlanningHandler error handling
- [ ] ItemLoopHandler error handling
- [ ] FinalSummaryHandler error handling

#### Processor Errors
- [ ] contextEnrichmentProcessor error
- [ ] todoProcessor error
- [ ] summaryProcessor error

#### State Transition Errors
- [ ] Invalid state transition handling
- [ ] Missing handler handling
- [ ] Missing processor handling

### 4. Mode-Specific Flows

#### CHAT Mode
- [ ] MODE_SELECTION → CHAT
- [ ] ChatHandler executes
- [ ] Result returned

#### DEV Mode
- [ ] MODE_SELECTION → DEV
- [ ] DevHandler executes
- [ ] DEV→TASK transition (if applicable)
- [ ] Result returned

#### TASK Mode
- [ ] MODE_SELECTION → TASK
- [ ] TASK → CONTEXT_ENRICHMENT
- [ ] CONTEXT_ENRICHMENT → TODO_PLANNING
- [ ] TODO_PLANNING → ITEM_LOOP
- [ ] ITEM_LOOP → FINAL_SUMMARY
- [ ] Result returned

### 5. Item Processing Verification

#### Item Status Management
- [ ] Item marked as 'completed' on success
- [ ] Item marked as 'failed' on error
- [ ] Item marked as 'skipped' on skip decision
- [ ] Item marked as 'replanned' on replan

#### Dependency Handling
- [ ] Dependencies checked before processing
- [ ] Blocked items skipped
- [ ] Replanned items skipped
- [ ] New items inserted after replanning

#### Rate Limiting
- [ ] Delay between items enforced
- [ ] Rate limiting prevents API throttling

---

## 🧪 Test Scenarios

### Scenario 1: Simple CHAT Mode
```
Input: "Hello, how are you?"
Expected Flow: MODE_SELECTION → CHAT
Expected Output: Chat response
```

### Scenario 2: Simple DEV Mode
```
Input: "Analyze my system"
Expected Flow: MODE_SELECTION → DEV
Expected Output: Analysis result
```

### Scenario 3: Simple TASK Mode (Single Item)
```
Input: "Create a file"
Expected Flow: 
  MODE_SELECTION → TASK 
  → CONTEXT_ENRICHMENT 
  → TODO_PLANNING 
  → ITEM_LOOP 
  → FINAL_SUMMARY
Expected Output: Summary with 1 completed item
```

### Scenario 4: TASK Mode with Multiple Items
```
Input: "Create 3 files"
Expected Flow: Same as Scenario 3
Expected Output: Summary with 3 items (various statuses)
```

### Scenario 5: TASK Mode with Dependencies
```
Input: "Create file A, then create file B using A"
Expected Flow: Same as Scenario 3
Expected Output: Summary with 2 items, B depends on A
```

### Scenario 6: TASK Mode with Replan
```
Input: "Create file with invalid name"
Expected Flow: 
  ITEM_LOOP 
  → VERIFICATION (fails) 
  → REPLAN 
  → (new items or skip)
Expected Output: Summary with replanned/skipped item
```

---

## ✅ Verification Commands

### Syntax Validation
```bash
node -c orchestrator/workflow/executor-v3.js
node -c orchestrator/workflow/state-machine/index.js
node -c orchestrator/workflow/state-machine/handlers/index.js
```

### State Machine Verification
```bash
# Check if state machine initializes correctly
node -e "
const { WorkflowStateMachine } = require('./orchestrator/workflow/state-machine/index.js');
const sm = new WorkflowStateMachine({ logger: console, handlers: {} });
console.log('States:', Object.keys(sm.constructor.States).length);
console.log('Initial state:', sm.getCurrentState());
"
```

### Handler Factory Verification
```bash
# Check if all handlers are registered
node -e "
const { HandlerFactory } = require('./orchestrator/workflow/state-machine/handlers/index.js');
const factory = new HandlerFactory({ logger: console, processors: {} });
console.log('Handlers:', factory.getHandlerNames());
"
```

---

## 📊 Test Results Template

| Test Case         | Status | Notes   |
| ----------------- | ------ | ------- |
| State Transitions | ⏳      | Pending |
| Context Flow      | ⏳      | Pending |
| Error Handling    | ⏳      | Pending |
| CHAT Mode         | ⏳      | Pending |
| DEV Mode          | ⏳      | Pending |
| TASK Mode         | ⏳      | Pending |
| Item Processing   | ⏳      | Pending |
| Rate Limiting     | ⏳      | Pending |

---

## 🎯 Success Criteria

- ✅ All state transitions work correctly
- ✅ Context is properly maintained through all states
- ✅ Errors are handled gracefully
- ✅ All mode flows execute successfully
- ✅ Item processing handles all statuses
- ✅ Dependencies are properly managed
- ✅ Rate limiting prevents throttling
- ✅ No data loss or corruption

---

## 📝 Notes

- All handlers have been implemented and integrated
- Syntax validation has passed
- Ready for functional testing
- Integration testing will verify state machine behavior
- Error handling will be enhanced in Phase 2.5

---

**Status**: Ready for execution  
**Complexity**: Medium (comprehensive testing)  
**Risk**: Low (all code syntactically valid)  
**Recommendation**: Execute test scenarios and document results

