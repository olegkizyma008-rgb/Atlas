# HackLab Test Instructions – Phase 1.8 Regression Testing

**Date**: 2025-11-18  
**Objective**: Verify Phase 1.3 integration with HackLab scenario

---

## Overview

The HackLab scenario is a comprehensive test that exercises all major workflow stages:
- Mode selection (TASK mode)
- Context enrichment
- TODO planning
- Server selection
- Tool planning
- Execution
- Verification
- Final summary

---

## Test Scenario

### Input
```
"Open Google, search for 'atlas refactoring', take a screenshot, save it to desktop"
```

### Expected Behavior
1. **Mode Selection**: Should select TASK mode
2. **Context Enrichment**: Should enrich message with context
3. **TODO Planning**: Should create 4 TODO items:
   - Open Google
   - Search for 'atlas refactoring'
   - Take a screenshot
   - Save to desktop
4. **Server Selection**: Should select appropriate servers for each item
5. **Tool Planning**: Should plan tools for each item
6. **Execution**: Should execute tools for each item
7. **Verification**: Should verify each item completed successfully
8. **Final Summary**: Should show 100% success rate

---

## How to Run

### Option 1: Direct Test (Recommended)
```bash
# Navigate to project root
cd /Users/dev/Documents/GitHub/atlas4

# Run HackLab scenario
npm test -- --scenario hacklab

# Or with verbose output
npm test -- --scenario hacklab --verbose
```

### Option 2: Manual Test
```bash
# Start the application
npm start

# In browser/client:
# 1. Navigate to chat interface
# 2. Send the test input
# 3. Monitor the workflow execution
# 4. Check logs for errors
```

### Option 3: Debug Mode
```bash
# Run with debug logging
DEBUG=atlas:* npm test -- --scenario hacklab

# Or with detailed logging
npm test -- --scenario hacklab --debug
```

---

## What to Verify

### 1. Workflow Execution
- [ ] All stages execute in correct order
- [ ] No errors or warnings in logs
- [ ] All items complete successfully
- [ ] Final summary shows 100% success

### 2. Output Comparison
- [ ] Compare with original (pre-refactoring) output
- [ ] Outputs should be identical
- [ ] No behavior changes
- [ ] Same completion metrics

### 3. Logs
- [ ] Check for any ERROR logs
- [ ] Check for any WARN logs
- [ ] Verify stage transitions are logged
- [ ] Verify item processing is logged

### 4. Performance
- [ ] Workflow completes in reasonable time
- [ ] No unexpected delays
- [ ] No memory leaks
- [ ] CPU usage is normal

### 5. Messages
- [ ] SSE messages are sent correctly
- [ ] WebSocket messages are sent correctly
- [ ] TTS messages are sent correctly
- [ ] All message formats are correct

---

## Expected Output

### Console Output
```
[INFO] Starting workflow execution
[INFO] Mode selected: task
[INFO] Context enriched
[INFO] TODO planning complete: 4 items created
[INFO] Processing item 1/4: Open Google
[INFO] Stage 2.0-MCP: Server selection
[INFO] Stage 2.1-MCP: Tool planning
[INFO] Stage 2.2-MCP: Execution
[INFO] Stage 2.3-MCP: Verification
[INFO] Item 1 completed successfully
[INFO] Processing item 2/4: Search for 'atlas refactoring'
...
[INFO] All items completed successfully
[INFO] Final summary: 4/4 items completed (100% success)
[INFO] Workflow execution complete
```

### Metrics
```
Total items: 4
Completed: 4
Failed: 0
Success rate: 100%
Total time: ~30-60 seconds
```

---

## Troubleshooting

### If workflow fails:

1. **Check logs for errors**
   ```bash
   # View error logs
   tail -f logs/error.log
   ```

2. **Check if syntax is valid**
   ```bash
   node -c orchestrator/workflow/executor-v3.js
   ```

3. **Check if dependencies are available**
   ```bash
   npm list
   ```

4. **Run with debug mode**
   ```bash
   DEBUG=atlas:* npm test -- --scenario hacklab --debug
   ```

5. **Compare with original**
   - If behavior changed, check the refactored code
   - Verify all stage functions are called correctly
   - Check error handling

---

## Comparison with Original

### Before Refactoring (Original)
- Inline code in executeWorkflow
- 720+ lines of code
- Manual state management
- Scattered error handling

### After Refactoring (Phase 1.3)
- Modular stage functions
- 9 independent functions
- Unified error handling
- Same behavior (100% compatibility)

**Expected Result**: Identical output and behavior

---

## Success Criteria

✅ Workflow completes successfully  
✅ All 4 items complete  
✅ 100% success rate  
✅ No errors or warnings  
✅ Output identical to original  
✅ Performance acceptable  
✅ All messages sent correctly  

---

## Next Steps

1. **Run the test**
   ```bash
   npm test -- --scenario hacklab
   ```

2. **Monitor execution**
   - Watch console output
   - Check logs for errors
   - Verify all stages execute

3. **Compare results**
   - Compare with original output
   - Verify metrics match
   - Check for any differences

4. **Document results**
   - Update `PHASE1_8_TEST_RESULTS_2025-11-18.md`
   - Note any issues found
   - Record metrics

5. **Sign off**
   - If all tests pass: Mark Phase 1.8 as complete
   - If issues found: Debug and fix
   - Update SUPER_EXECUTOR_REFACTORING_PLAN

---

**Status**: Ready to run HackLab test

**Command to run**: `npm test -- --scenario hacklab`
