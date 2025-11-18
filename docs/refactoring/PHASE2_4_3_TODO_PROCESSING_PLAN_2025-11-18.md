# Phase 2.4.3 TODO Processing Implementation Plan

**Date**: 2025-11-18  
**Status**: READY FOR IMPLEMENTATION  
**Objective**: Replace TODO processing logic with nested state transitions

---

## 📋 Overview

Phase 2.4.3 involves replacing the remaining TODO processing logic (context enrichment, TODO planning, item loop, final summary) with nested state transitions in the state machine.

### Current State
- Mode routing (CHAT/DEV/TASK) is complete and uses state transitions
- TASK mode currently calls TaskHandler which returns placeholder result
- TODO processing logic is still in executor-v3.js (removed in Phase 2.4.2)
- Need to implement nested state transitions for TODO workflow

### Target State
- All TODO processing uses state machine transitions
- Context enrichment → TODO planning → Item loop → Final summary
- Each step is a separate state with dedicated handler
- State machine coordinates the entire workflow

---

## 🔄 State Transition Flow

```
TASK State
    ↓
CONTEXT_ENRICHMENT State
    ↓
TODO_PLANNING State
    ↓
ITEM_LOOP State (with nested iterations)
    ├─→ SERVER_SELECTION (for each item)
    ├─→ TOOL_PLANNING (for each item)
    ├─→ EXECUTION (for each item)
    ├─→ VERIFICATION (for each item)
    └─→ REPLAN (if needed)
    ↓
FINAL_SUMMARY State
    ↓
WORKFLOW_END State
```

---

## 📊 Implementation Steps

### Step 1: Update TaskHandler

**Current**: Returns placeholder result

**New**: Implement proper TASK mode coordination
- Initialize TODO context
- Transition to CONTEXT_ENRICHMENT state
- Wait for enrichment result
- Transition to TODO_PLANNING state
- Wait for TODO result
- Transition to ITEM_LOOP state
- Wait for item processing complete
- Transition to FINAL_SUMMARY state
- Return final result

**Estimated Time**: 1–2 hours

### Step 2: Implement ContextEnrichmentHandler

**Purpose**: Enrich user message with context

**Current Location**: `runContextEnrichment()` function

**New Location**: `ContextEnrichmentHandler.js`

**Responsibilities**:
- Load enrichment processor
- Execute enrichment
- Store enriched message in context
- Return enrichment result

**Estimated Time**: 30–45 minutes

### Step 3: Implement TodoPlanningHandler

**Purpose**: Create TODO plan from enriched message

**Current Location**: `runTodoPlanning()` function

**New Location**: `TodoPlanningHandler.js`

**Responsibilities**:
- Load TODO planning processor
- Execute TODO planning
- Create TODO structure with items
- Store TODO in context
- Return TODO result

**Estimated Time**: 30–45 minutes

### Step 4: Implement ItemLoopHandler

**Purpose**: Process TODO items sequentially

**Current Location**: `while (i < todo.items.length)` loop

**New Location**: `ItemLoopHandler.js`

**Responsibilities**:
- Iterate through TODO items
- For each item:
  - Check dependencies
  - Transition to SERVER_SELECTION
  - Transition to TOOL_PLANNING
  - Transition to EXECUTION
  - Transition to VERIFICATION
  - If failed: Transition to REPLAN
  - Handle item status (completed/failed/skipped)
- Return item processing results

**Estimated Time**: 2–3 hours (complex nested logic)

### Step 5: Implement FinalSummaryHandler

**Purpose**: Generate workflow summary

**Current Location**: `runFinalSummary()` function

**New Location**: `FinalSummaryHandler.js`

**Responsibilities**:
- Load summary processor
- Analyze TODO results
- Generate summary message
- Calculate metrics
- Return summary result

**Estimated Time**: 30–45 minutes

---

## 🎯 Key Considerations

### 1. Nested State Transitions
- ItemLoopHandler needs to manage nested states for each item
- Each item goes through: SERVER_SELECTION → TOOL_PLANNING → EXECUTION → VERIFICATION → (REPLAN if needed)
- Must handle dynamic item addition during replan

### 2. Context Management
- Context must flow through all states
- Each handler receives and updates context
- Final context contains complete workflow results

### 3. Error Handling
- Each state must handle errors gracefully
- Failed items must be tracked
- Replan logic must work with state transitions

### 4. Performance
- Item processing must be sequential (with rate limiting)
- No parallel execution of items (dependencies)
- Delays between items to prevent rate limiting

### 5. Backward Compatibility
- Original behavior must be preserved
- Error handling must match original
- Logging must be comprehensive

---

## 📝 Code Structure

### TaskHandler (Updated)
```javascript
async execute(context, data) {
  // 1. Transition to CONTEXT_ENRICHMENT
  await stateMachine.transition(States.CONTEXT_ENRICHMENT);
  const enrichmentResult = await stateMachine.executeHandler({});
  
  // 2. Transition to TODO_PLANNING
  await stateMachine.transition(States.TODO_PLANNING);
  const todoResult = await stateMachine.executeHandler({});
  
  // 3. Transition to ITEM_LOOP
  await stateMachine.transition(States.ITEM_LOOP);
  const itemLoopResult = await stateMachine.executeHandler({});
  
  // 4. Transition to FINAL_SUMMARY
  await stateMachine.transition(States.FINAL_SUMMARY);
  const summaryResult = await stateMachine.executeHandler({});
  
  return summaryResult;
}
```

### ItemLoopHandler (Complex)
```javascript
async execute(context, data) {
  const todo = context.todo;
  const results = [];
  
  for (let i = 0; i < todo.items.length; i++) {
    const item = todo.items[i];
    
    // Check dependencies
    if (!this._canProcessItem(item, todo)) {
      continue; // Skip blocked items
    }
    
    // Process item through nested states
    const itemResult = await this._processItem(item, context);
    results.push(itemResult);
  }
  
  return { success: true, results };
}

async _processItem(item, context) {
  // 1. SERVER_SELECTION
  await stateMachine.transition(States.SERVER_SELECTION);
  const serverResult = await stateMachine.executeHandler({ item });
  
  // 2. TOOL_PLANNING
  await stateMachine.transition(States.TOOL_PLANNING);
  const planResult = await stateMachine.executeHandler({ item, servers: serverResult });
  
  // 3. EXECUTION
  await stateMachine.transition(States.EXECUTION);
  const execResult = await stateMachine.executeHandler({ item, plan: planResult });
  
  // 4. VERIFICATION
  await stateMachine.transition(States.VERIFICATION);
  const verifyResult = await stateMachine.executeHandler({ item, execution: execResult });
  
  // 5. REPLAN if needed
  if (!verifyResult.verified) {
    await stateMachine.transition(States.REPLAN);
    const replanResult = await stateMachine.executeHandler({ item, execution: execResult });
    // Handle replan results (new items, skip, etc.)
  }
  
  return { item, status: item.status };
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test each handler independently
- Mock state machine transitions
- Verify correct context updates

### Integration Tests
- Test full TODO processing flow
- Test with sample TODO items
- Verify state transitions

### End-to-End Tests
- Test with real TASK mode request
- Verify complete workflow
- Check final summary

---

## ⏱️ Estimated Timeline

| Step      | Task                               | Time          |
| --------- | ---------------------------------- | ------------- |
| 1         | Update TaskHandler                 | 1–2 hours     |
| 2         | Implement ContextEnrichmentHandler | 30–45 min     |
| 3         | Implement TodoPlanningHandler      | 30–45 min     |
| 4         | Implement ItemLoopHandler          | 2–3 hours     |
| 5         | Implement FinalSummaryHandler      | 30–45 min     |
| 6         | Testing & debugging                | 1–2 hours     |
| **Total** |                                    | **6–9 hours** |

---

## 📋 Checklist

### Before Implementation
- [ ] Review current TODO processing logic
- [ ] Understand all state transitions
- [ ] Plan nested state handling
- [ ] Identify edge cases

### During Implementation
- [ ] Implement each handler
- [ ] Add comprehensive logging
- [ ] Handle all error cases
- [ ] Test each step

### After Implementation
- [ ] Run full integration tests
- [ ] Verify backward compatibility
- [ ] Check performance
- [ ] Update documentation

---

## 🚀 Next Steps

1. **Session 14**: Implement Phase 2.4.3 (6–9 hours estimated)
   - Update TaskHandler
   - Implement nested state handlers
   - Test TODO processing

2. **Session 15**: Phase 2.5 – Error Handling & Logging
   - Add comprehensive error handling
   - Add detailed logging
   - Add timeout handling

3. **Session 16**: Phase 2 Completion & Testing
   - Full integration testing
   - Regression testing
   - Documentation updates

---

**Status**: Ready for implementation  
**Complexity**: High (nested state transitions, complex logic)  
**Risk**: Medium (many edge cases to handle)  
**Recommendation**: Implement step-by-step with thorough testing

