# Testing Guide - Bug Fixes (2025-11-18)

## Quick Verification

### Test 1: Verification Contradiction Detection
**What to test**: Verify that contradictory LLM reasons are rejected

**Steps**:
1. Run a verification task where LLM might say "X matches Y" but X != Y
2. Check logs for: `[VISUAL-GRISHA] ❌ FIXED 2025-11-18: LLM reason contains contradiction, rejecting`
3. Verify that `matches_criteria` is set to `false`

**Expected result**: ✅ Contradictory verifications are rejected

---

### Test 2: AppleScript Security
**What to test**: Verify that LLM no longer generates `do shell script` for Calculator operations

**Steps**:
1. Run a Calculator rounding task
2. Check the generated AppleScript code
3. Search for `do shell script` - should NOT be present
4. Verify only keystroke operations are used

**Expected result**: ✅ No `do shell script` in AppleScript, only safe keystroke operations

---

### Test 3: Router Classifier Robustness
**What to test**: Verify router classifier handles missing LLM client gracefully

**Steps**:
1. Check logs for router classification
2. Look for: `[ROUTER] Pre-filtered to: filesystem, shell` (keyword-only fallback)
3. Should NOT see: `Cannot read properties of null (reading 'generateResponse')`

**Expected result**: ✅ Router classifier works without LLM client, uses keyword-only classification

---

## Log Locations

- **Main logs**: `/Users/dev/Documents/GitHub/atlas4/logs/orchestrator.log`
- **Workflow logs**: `/Users/dev/Documents/GitHub/atlas4/logs/workflow.log`

## Key Log Markers

### Fix 1 - Verification
```
[VISUAL-GRISHA] 🔧 FIXED 2025-11-18: LLM reason mentions match/success, setting matches_criteria=true
[VISUAL-GRISHA] ❌ FIXED 2025-11-18: LLM reason contains contradiction, rejecting
[VISUAL-GRISHA] Number contradiction: observed="X" vs reason="Y"
```

### Fix 2 - AppleScript
```
BLOCKED by LLM Validator: The AppleScript code attempts to use a shell script
```
(Should NOT appear after fix is effective)

### Fix 3 - Router Classifier
```
LLM classification skipped: llmClient not available
[ROUTER] Pre-filtered to: filesystem, shell
```

---

## Regression Testing

### Ensure No Regressions
1. ✅ Verification still works for valid cases
2. ✅ AppleScript execution works for safe operations
3. ✅ Router classifier still classifies correctly when LLM is available
4. ✅ No performance degradation

---

## Deployment Checklist

- [ ] All three files modified successfully
- [ ] No syntax errors in modified files
- [ ] Logs show expected behavior
- [ ] No new errors in orchestrator.log
- [ ] Verification contradictions are detected
- [ ] AppleScript security blocks are prevented
- [ ] Router classifier works with/without LLM client

---

## Rollback Plan

If issues arise:

1. **Verification contradictions**: Revert grisha-verify-item-processor.js to previous version
2. **AppleScript security**: Revert tetyana_plan_tools_applescript.js to previous version
3. **Router classifier**: Revert service-registry.js and router-classifier-processor.js

All changes are isolated and can be reverted independently.
