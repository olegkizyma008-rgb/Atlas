# Phase 2.4.2 Mode Routing Implementation Guide

**Date**: 2025-11-18  
**Status**: READY FOR IMPLEMENTATION  
**Objective**: Replace CHAT/DEV/TASK mode logic with state transitions

---

## 📋 Implementation Overview

### Current State
- Mode selection returns mode, confidence, mood
- CHAT mode: Lines 1577–2022 (445 lines)
- DEV mode: Lines 1070–1570 (500 lines)
- TASK mode: Lines 2025–2786 (761 lines)

### Target State
- Mode selection transitions to MODE_SELECTION state
- CHAT mode transitions to CHAT state
- DEV mode transitions to DEV state
- TASK mode transitions to TASK state
- Each mode has dedicated handler

---

## 🔄 Implementation Steps

### Step 1: Replace CHAT Mode Logic

**Location**: After mode selection (around line 1577)

**Current Code**:
```javascript
if (mode === 'chat') {
  logger.workflow('stage', 'atlas', 'Chat mode detected - Atlas will respond directly', {
    sessionId: session.id
  });
  
  try {
    // 400+ lines of CHAT logic
    // ...
    return {
      success: true,
      mode: 'chat',
      response: atlasResponse
    };
  } catch (chatError) {
    // error handling
    throw chatError;
  }
}
```

**New Code**:
```javascript
if (mode === 'chat') {
  logger.workflow('stage', 'atlas', 'Chat mode detected - transitioning to CHAT state');
  
  try {
    // Transition to CHAT state
    await stateMachine.transition(WorkflowStateMachine.States.CHAT);
    
    // Execute CHAT handler
    const chatResult = await stateMachine.executeHandler({});
    
    // Return result
    return chatResult;
  } catch (chatError) {
    logger.error('executor', `CHAT mode failed: ${chatError.message}`, {
      sessionId: session.id,
      stack: chatError.stack
    });
    throw chatError;
  }
}
```

**Effort**: 30–45 minutes
- Remove 400+ lines of CHAT logic
- Add 15 lines of state transition code
- Keep original CHAT logic in ChatHandler for now

---

### Step 2: Replace DEV Mode Logic

**Location**: Before CHAT mode check (around line 1070)

**Current Code**:
```javascript
if (mode === 'dev') {
  logger.workflow('stage', 'system', '⚠️ DEV mode activated');
  
  try {
    // 500+ lines of DEV logic
    // ...
  } catch (error) {
    // error handling
  }
}
```

**New Code**:
```javascript
if (mode === 'dev') {
  logger.workflow('stage', 'system', 'DEV mode detected - transitioning to DEV state');
  
  try {
    // Transition to DEV state
    await stateMachine.transition(WorkflowStateMachine.States.DEV);
    
    // Execute DEV handler
    const devResult = await stateMachine.executeHandler({});
    
    // Return result
    return devResult;
  } catch (devError) {
    logger.error('executor', `DEV mode failed: ${devError.message}`, {
      sessionId: session.id,
      stack: devError.stack
    });
    throw devError;
  }
}
```

**Effort**: 30–45 minutes
- Remove 500+ lines of DEV logic
- Add 15 lines of state transition code
- Keep original DEV logic in DevHandler for now

---

### Step 3: Replace TASK Mode Logic

**Location**: After DEV/CHAT mode checks (around line 2025)

**Current Code**:
```javascript
// ===============================================
// Stage 0.5-MCP: Context Enrichment
// ===============================================
const enrichmentResult = await runContextEnrichment(workflowContext, processors);
// ... 760+ lines of TASK logic
```

**New Code**:
```javascript
// TASK mode processing via state machine
logger.workflow('stage', 'system', 'TASK mode detected - transitioning to TASK state');

try {
  // Transition to TASK state
  await stateMachine.transition(WorkflowStateMachine.States.TASK);
  
  // Execute TASK handler (which will coordinate nested states)
  const taskResult = await stateMachine.executeHandler({});
  
  // Return result
  return taskResult;
} catch (taskError) {
  logger.error('executor', `TASK mode failed: ${taskError.message}`, {
    sessionId: session.id,
    stack: taskError.stack
  });
  throw taskError;
}
```

**Effort**: 1–2 hours
- Remove 760+ lines of TASK logic
- Add 15 lines of state transition code
- Implement nested state transitions in TaskHandler

---

## 🎯 Implementation Strategy

### Phase 1: Quick Replacement (1–2 hours)
1. Replace CHAT mode with state transition
2. Replace DEV mode with state transition
3. Replace TASK mode with state transition
4. Keep original logic in handlers (useLegacyLogic flag)
5. Test all three modes

### Phase 2: Full Integration (2–3 hours)
1. Move CHAT logic to ChatHandler
2. Move DEV logic to DevHandler
3. Move TASK logic to TaskHandler
4. Remove useLegacyLogic flag
5. Test all three modes

### Phase 3: Optimization (1–2 hours)
1. Add error handling
2. Add logging
3. Add monitoring
4. Test edge cases

---

## ⚠️ Important Considerations

### 1. Early Returns
- CHAT mode returns early (line 1997)
- DEV mode may return early (password required)
- Must preserve early return behavior

### 2. Mode Transitions
- DEV mode can transition to TASK mode
- Must handle DEV→TASK transition correctly

### 3. Error Handling
- CHAT mode has try-catch (line 1586)
- DEV mode has try-catch (line 1040)
- TASK mode has multiple try-catch blocks
- Must preserve all error handling

### 4. Context Sharing
- CHAT mode uses session.chatThread
- DEV mode uses session.lastDevAnalysis
- TASK mode uses workflowContext.todo
- Must ensure context flows correctly

---

## 📊 Code Reduction

| Mode      | Current Lines | New Lines | Reduction        |
| --------- | ------------- | --------- | ---------------- |
| CHAT      | 445           | 15        | 430 (96.6%)      |
| DEV       | 500           | 15        | 485 (97%)        |
| TASK      | 761           | 15        | 746 (98%)        |
| **Total** | **1706**      | **45**    | **1661 (97.4%)** |

---

## 🧪 Testing Strategy

### Test CHAT Mode
1. Send simple message
2. Verify response received
3. Check logs for state transitions
4. Verify no behavior changes

### Test DEV Mode
1. Trigger self-analysis
2. Verify analysis received
3. Check password handling
4. Verify no behavior changes

### Test TASK Mode
1. Send task request
2. Verify TODO created
3. Verify items processed
4. Verify no behavior changes

---

## 📝 Checklist

### Before Implementation
- [ ] Read this guide carefully
- [ ] Understand state transition flow
- [ ] Understand error handling strategy
- [ ] Understand context sharing strategy

### During Implementation
- [ ] Replace CHAT mode logic
- [ ] Replace DEV mode logic
- [ ] Replace TASK mode logic
- [ ] Verify syntax after each step
- [ ] Test each mode independently

### After Implementation
- [ ] Run full syntax check
- [ ] Test all three modes
- [ ] Verify error handling
- [ ] Check logs for state transitions
- [ ] Update documentation

---

## 🚀 Next Steps

1. **Session 11**: Implement mode routing (1–2 hours)
   - Replace CHAT/DEV/TASK logic with state transitions
   - Test all three modes
   - Verify syntax

2. **Session 12**: Implement TODO processing (2–3 hours)
   - Replace context enrichment with state transition
   - Replace TODO planning with state transition
   - Replace item loop with state transitions

3. **Session 13**: Finalization (1–2 hours)
   - Replace final summary with state transition
   - Add error handling
   - Full integration test

---

## 💡 Tips for Implementation

1. **Work incrementally**: Replace one mode at a time
2. **Test frequently**: Verify syntax after each change
3. **Keep backups**: Save original code before replacing
4. **Use logging**: Add detailed logging for debugging
5. **Document changes**: Update comments as you go

---

## 📚 Reference Files

- `/orchestrator/workflow/executor-v3.js` – Main executor file
- `/orchestrator/workflow/state-machine/handlers/ChatHandler.js` – CHAT handler
- `/orchestrator/workflow/state-machine/handlers/DevHandler.js` – DEV handler
- `/orchestrator/workflow/state-machine/handlers/TaskHandler.js` – TASK handler
- `/orchestrator/workflow/state-machine/WorkflowStateMachine.js` – State machine

---

**Status**: Ready for implementation in next session  
**Estimated Time**: 3–4 hours total  
**Difficulty**: Medium (large code replacement, careful testing needed)

**Recommendation**: Follow this guide step-by-step for safe and reliable implementation.
