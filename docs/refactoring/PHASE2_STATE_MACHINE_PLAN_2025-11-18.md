# Phase 2 – WorkflowStateMachine Integration Plan

**Date**: 2025-11-18  
**Status**: 📋 PLANNING  
**Objective**: Replace manual state management with formal state machine

---

## Overview

Phase 2 introduces `WorkflowStateMachine` to replace manual state tracking and conditional logic scattered throughout `executeWorkflow`. This provides:
- Formal state transitions
- Clear state diagram
- Reduced complexity
- Better error handling
- Improved testability

---

## Current State Management

### Manual States
```javascript
// Current approach (scattered throughout code)
if (mode === 'chat') { /* ... */ }
if (mode === 'task') { /* ... */ }
if (mode === 'dev') { /* ... */ }

// Item processing
while (i < todo.items.length) {
  let attempt = 1;
  while (attempt <= maxAttempts) {
    // Complex nested logic
  }
}

// Replan logic
if (replanResult.replanned) { /* ... */ }
else if (replanResult.strategy === 'skip_and_continue') { /* ... */ }
else { /* ... */ }
```

### Problems
- State transitions are implicit
- Error handling is scattered
- Difficult to trace execution flow
- Hard to add new states
- Difficult to test

---

## Proposed State Machine

### States

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW_START                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  MODE_SELECTION                             │
│  (Determine: chat, task, or dev mode)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐
    │  CHAT   │  │   TASK   │  │   DEV    │
    └────┬────┘  └────┬─────┘  └────┬─────┘
         │            │             │
         │            ▼             ▼
         │      ┌──────────────┐  ┌──────────┐
         │      │ CONTEXT_     │  │ DEV_     │
         │      │ ENRICHMENT   │  │ ANALYSIS │
         │      └──────┬───────┘  └────┬─────┘
         │             │               │
         │             ▼               │
         │      ┌──────────────┐       │
         │      │ TODO_        │       │
         │      │ PLANNING     │       │
         │      └──────┬───────┘       │
         │             │               │
         │             ▼               │
         │      ┌──────────────┐       │
         │      │ ITEM_LOOP    │       │
         │      │ (for each    │       │
         │      │  item)       │       │
         │      └──────┬───────┘       │
         │             │               │
         │             ▼               │
         │      ┌──────────────────┐   │
         │      │ SERVER_SELECTION │   │
         │      └──────┬───────────┘   │
         │             │               │
         │             ▼               │
         │      ┌──────────────────┐   │
         │      │ TOOL_PLANNING    │   │
         │      └──────┬───────────┘   │
         │             │               │
         │             ▼               │
         │      ┌──────────────────┐   │
         │      │ EXECUTION        │   │
         │      └──────┬───────────┘   │
         │             │               │
         │             ▼               │
         │      ┌──────────────────┐   │
         │      │ VERIFICATION     │   │
         │      └──────┬───────────┘   │
         │             │               │
         │      ┌──────┴──────┐        │
         │      │             │        │
         │      ▼             ▼        │
         │   ┌────────┐  ┌──────────┐  │
         │   │SUCCESS │  │ REPLAN   │  │
         │   └────┬───┘  └────┬─────┘  │
         │        │           │        │
         │        │      ┌────▼────┐   │
         │        │      │ NEXT_   │   │
         │        │      │ ITEM    │   │
         │        │      └────┬────┘   │
         │        │           │        │
         │        └───────┬───┘        │
         │                │            │
         │                ▼            │
         │         ┌──────────────┐    │
         │         │ FINAL_       │    │
         │         │ SUMMARY      │    │
         │         └──────┬───────┘    │
         │                │            │
         └────────────────┼────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │ WORKFLOW_END │
                  └──────────────┘
```

### State Transitions

| From               | To                 |           Condition |
| ------------------ | ------------------ | ------------------: |
| WORKFLOW_START     | MODE_SELECTION     |              Always |
| MODE_SELECTION     | CHAT               |     mode === 'chat' |
| MODE_SELECTION     | TASK               |     mode === 'task' |
| MODE_SELECTION     | DEV                |      mode === 'dev' |
| CHAT               | WORKFLOW_END       |       Response sent |
| DEV                | DEV_ANALYSIS       |  Analysis requested |
| DEV_ANALYSIS       | DEV                |   Analysis complete |
| DEV_ANALYSIS       | TASK               |  Transition to task |
| TASK               | CONTEXT_ENRICHMENT |              Always |
| CONTEXT_ENRICHMENT | TODO_PLANNING      |              Always |
| TODO_PLANNING      | ITEM_LOOP          |       Items created |
| ITEM_LOOP          | SERVER_SELECTION   |       For each item |
| SERVER_SELECTION   | TOOL_PLANNING      |    Servers selected |
| TOOL_PLANNING      | EXECUTION          |        Plan created |
| EXECUTION          | VERIFICATION       |  Execution complete |
| VERIFICATION       | SUCCESS            |       Item verified |
| VERIFICATION       | REPLAN             | Verification failed |
| REPLAN             | NEXT_ITEM          |     Replan complete |
| SUCCESS            | NEXT_ITEM          |              Always |
| NEXT_ITEM          | ITEM_LOOP          |          More items |
| NEXT_ITEM          | FINAL_SUMMARY      |      All items done |
| FINAL_SUMMARY      | WORKFLOW_END       |        Summary sent |

---

## Implementation Steps

### P2.1: Create WorkflowStateMachine Class
**Location**: `/orchestrator/workflow/state-machine/WorkflowStateMachine.js`  
**Features**:
- State definitions
- Transition rules
- Event handling
- Error handling
- Logging

### P2.2: Define State Handlers
**Location**: `/orchestrator/workflow/state-machine/handlers/`  
**Files**:
- `ModeSelectionHandler.js`
- `ContextEnrichmentHandler.js`
- `TodoPlanningHandler.js`
- `ItemLoopHandler.js`
- `ServerSelectionHandler.js`
- `ToolPlanningHandler.js`
- `ExecutionHandler.js`
- `VerificationHandler.js`
- `ReplanHandler.js`
- `FinalSummaryHandler.js`

### P2.3: Integrate State Machine into executeWorkflow
**Location**: `/orchestrator/workflow/executor-v3.js`  
**Changes**:
- Create state machine instance
- Replace conditional logic with state transitions
- Call appropriate handlers for each state
- Handle state machine events

### P2.4: Add Error Handling
**Features**:
- Invalid state transitions
- Handler errors
- Timeout handling
- Recovery strategies

### P2.5: Add Logging & Monitoring
**Features**:
- State transition logging
- Handler execution logging
- Performance metrics
- Debug information

---

## Benefits

### Code Quality
- ✅ Clearer execution flow
- ✅ Reduced complexity
- ✅ Better error handling
- ✅ Easier to maintain

### Testability
- ✅ Each state independently testable
- ✅ Mock state transitions
- ✅ Test error paths
- ✅ Verify state machine logic

### Extensibility
- ✅ Easy to add new states
- ✅ Easy to add new transitions
- ✅ Easy to add new handlers
- ✅ Easy to modify behavior

---

## Estimated Effort

| Task                              |  Estimated Time |
| --------------------------------- | --------------: |
| Create WorkflowStateMachine class |       2–3 hours |
| Define state handlers             |       3–4 hours |
| Integrate into executeWorkflow    |       2–3 hours |
| Add error handling                |       1–2 hours |
| Add logging & monitoring          |       1–2 hours |
| Testing & validation              |       2–3 hours |
| **TOTAL**                         | **11–17 hours** |

---

## Success Criteria

✅ State machine created  
✅ All states defined  
✅ All transitions defined  
✅ All handlers implemented  
✅ Integrated into executeWorkflow  
✅ Error handling works  
✅ Logging works  
✅ All tests pass  
✅ No behavior changes  
✅ Performance acceptable  

---

## Next Steps

1. **Phase 1.8**: Complete regression testing
2. **Phase 2.1**: Create WorkflowStateMachine class
3. **Phase 2.2**: Define state handlers
4. **Phase 2.3**: Integrate into executeWorkflow
5. **Phase 2.4**: Add error handling
6. **Phase 2.5**: Add logging & monitoring

---

**Status**: Planning complete | Ready for Phase 1.8 testing first
