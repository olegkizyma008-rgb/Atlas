# Phase 1.8 – Regression Testing Plan

**Date**: 2025-11-18  
**Status**: 🚀 READY TO START  
**Objective**: Verify that Phase 1.3 integration maintains 100% behavior compatibility

---

## Overview

Phase 1.3 successfully replaced 720+ lines of inline code with function calls. Phase 1.8 ensures that the refactored code behaves identically to the original.

---

## Testing Strategy

### 1. Functional Testing

#### Mode Selection (Stage 0-MCP)
- [ ] Chat mode works correctly
- [ ] Task mode works correctly
- [ ] DEV mode works correctly
- [ ] DEV password authentication works
- [ ] DEV intervention execution works
- [ ] DEV→TASK transition works

#### Context Enrichment (Stage 0.5-MCP)
- [ ] Message enrichment works
- [ ] Metadata is extracted correctly
- [ ] Fallback to original message on error

#### TODO Planning (Stage 1-MCP)
- [ ] TODO items are created correctly
- [ ] DEV transition context is used
- [ ] Fallback to chat mode on error
- [ ] Item structure is valid

#### Server Selection (Stage 2.0-MCP)
- [ ] Servers are selected correctly
- [ ] Fallback prompts are assigned
- [ ] Router classifier suggestions are used
- [ ] Selection is persisted on item

#### Tool Planning (Stage 2.1-MCP)
- [ ] Tools are planned correctly
- [ ] Error handling works
- [ ] SSE notifications are sent

#### Execution (Stage 2.2-MCP)
- [ ] Tools are executed
- [ ] TTS announcements work
- [ ] Execution results are returned
- [ ] SSE updates are sent

#### Verification (Stage 2.3-MCP)
- [ ] Verification checks work
- [ ] Adaptive delays work
- [ ] TTS success messages work
- [ ] SSE updates are sent

#### Replan (Stage 3-MCP)
- [ ] Replan logic works
- [ ] New items are inserted
- [ ] Hierarchical IDs are generated
- [ ] Skip strategy works
- [ ] Retry strategy works

#### Final Summary (Stage 8-MCP)
- [ ] Summary is generated
- [ ] Metrics are calculated
- [ ] Final message is sent
- [ ] Session history is updated
- [ ] Memory cleanup works

### 2. Integration Testing

#### HackLab Scenario
- [ ] Run HackLab scenario
- [ ] Compare outputs with original
- [ ] Verify all items complete successfully
- [ ] Check completion metrics

#### Error Handling
- [ ] Server selection error → fallback works
- [ ] Tool planning error → retry works
- [ ] Execution error → replan works
- [ ] Verification error → replan works

#### Message Broadcasting
- [ ] SSE messages are sent correctly
- [ ] WebSocket messages are sent correctly
- [ ] TTS messages are sent correctly
- [ ] All message formats are correct

### 3. Logging Verification

#### Log Levels
- [ ] INFO logs appear correctly
- [ ] WARN logs appear correctly
- [ ] ERROR logs appear correctly
- [ ] DEBUG logs appear correctly

#### Log Content
- [ ] Stage transitions are logged
- [ ] Item processing is logged
- [ ] Errors are logged with context
- [ ] Metrics are logged

#### Log Format
- [ ] Timestamps are correct
- [ ] Session IDs are included
- [ ] Item IDs are included
- [ ] Agent names are correct

### 4. Performance Testing

#### Execution Time
- [ ] Overall workflow time is acceptable
- [ ] No unexpected delays
- [ ] Retry backoff works correctly

#### Memory Usage
- [ ] Session history cleanup works
- [ ] No memory leaks
- [ ] Context objects are garbage collected

#### API Calls
- [ ] Number of LLM calls is unchanged
- [ ] Number of API calls is unchanged
- [ ] No duplicate calls

---

## Test Scenarios

### Scenario 1: Simple Task (Chat Mode)
**Input**: "Hello, how are you?"  
**Expected**: Chat response from Atlas  
**Verify**:
- [ ] Mode selection returns 'chat'
- [ ] No TODO items created
- [ ] Response is sent correctly

### Scenario 2: Task Mode with Single Item
**Input**: "Open Google and search for 'atlas'"  
**Expected**: Single TODO item created and executed  
**Verify**:
- [ ] Mode selection returns 'task'
- [ ] One TODO item created
- [ ] Item executes successfully
- [ ] Verification passes
- [ ] Final summary shows 100% success

### Scenario 3: Task Mode with Multiple Items
**Input**: "Open Google, search for 'atlas', take a screenshot"  
**Expected**: Multiple TODO items created and executed  
**Verify**:
- [ ] Mode selection returns 'task'
- [ ] Multiple TODO items created
- [ ] All items execute successfully
- [ ] All verifications pass
- [ ] Final summary shows 100% success

### Scenario 4: Task with Replan
**Input**: Task that requires replanning  
**Expected**: Item fails verification, replan occurs, new items created  
**Verify**:
- [ ] Verification fails
- [ ] Replan is triggered
- [ ] New items are created
- [ ] New items execute successfully

### Scenario 5: DEV Mode
**Input**: "Проаналізуй себе" (Analyze yourself)  
**Expected**: DEV analysis and intervention  
**Verify**:
- [ ] Mode selection returns 'dev'
- [ ] Analysis is performed
- [ ] Password prompt appears
- [ ] Intervention executes with password

---

## Regression Test Checklist

### Before Testing
- [ ] Backup current database
- [ ] Clear logs
- [ ] Ensure all dependencies are available
- [ ] Verify test environment is clean

### During Testing
- [ ] Run each scenario
- [ ] Monitor logs in real-time
- [ ] Check for errors or warnings
- [ ] Verify all outputs

### After Testing
- [ ] Compare outputs with original
- [ ] Analyze logs for issues
- [ ] Generate test report
- [ ] Document any differences

---

## Success Criteria

✅ All functional tests pass  
✅ All integration tests pass  
✅ All logging is correct  
✅ Performance is acceptable  
✅ No behavior changes  
✅ No memory leaks  
✅ All error handling works  
✅ All features work  

---

## Test Execution

### Command to Run Tests
```bash
# Run HackLab scenario
npm test -- --scenario hacklab

# Run all regression tests
npm test -- --regression

# Run specific scenario
npm test -- --scenario "simple-task"
```

### Expected Output
- All tests pass
- No errors or warnings
- Performance metrics acceptable
- Coverage report generated

---

## Issues Found & Resolution

If any issues are found during testing:

1. **Document the issue**
   - Describe the problem
   - Include logs and error messages
   - Note the scenario that triggered it

2. **Analyze the cause**
   - Check if it's a behavior change
   - Check if it's a new bug
   - Check if it's an environmental issue

3. **Fix the issue**
   - If behavior change: revert to original logic
   - If new bug: debug and fix
   - If environmental: adjust test setup

4. **Re-test**
   - Run the failing scenario again
   - Verify the fix works
   - Run full regression suite

---

## Sign-Off

Phase 1.8 is complete when:
- [ ] All test scenarios pass
- [ ] All functional tests pass
- [ ] All integration tests pass
- [ ] No behavior changes detected
- [ ] No new bugs introduced
- [ ] Performance is acceptable
- [ ] Test report is generated

---

**Status**: Ready to start Phase 1.8 testing  
**Next**: Execute test scenarios and verify results
