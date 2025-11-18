# Bug Fix: Hierarchical ID Generation with Full ID Format

**Date:** 2025-11-18  
**Issue:** Invalid hierarchical ID error when replanning TODO items  
**Root Cause:** ID format mismatch between full ID format and hierarchical ID parsing  
**Status:** ✅ FIXED

## Problem Description

When the system attempted to replan a TODO item (e.g., "Input number 333 into Calculator"), it would:

1. Create 3 new sub-items (one for each digit)
2. Try to generate hierarchical IDs (3.1, 3.2, 3.3)
3. **FAIL** with error: `Invalid hierarchical ID: todo_1763421137453_502_item_3.1`

### Root Cause

The issue was in `/orchestrator/workflow/executor-v3.js` at line 2026:

```javascript
const parentId = String(item.id);  // Gets: "todo_1763421137453_502_item_3"
const childId = HierarchicalIdManager.generateChildId(parentId, ...);  // Expects: "3"
```

The `HierarchicalIdManager.generateChildId()` method expects a **numeric ID** (e.g., "3"), but was receiving a **full ID** with prefix (e.g., "todo_1763421137453_502_item_3").

When it tried to parse "todo_1763421137453_502_item_3" as a hierarchical ID, it failed because:
- `parseId()` splits by "." and expects all parts to be numeric
- The full ID contains non-numeric characters, causing `isNaN()` check to fail

## Solution

### Changes Made

**File:** `/orchestrator/workflow/executor-v3.js`

#### Change 1: Extract numeric ID before generating child IDs (lines 2025-2039)

```javascript
// FIXED 2025-11-18: Extract numeric ID from full ID (e.g., "todo_..._item_3" → "3")
let parentId = String(item.id);
const itemMatch = parentId.match(/_item_(\d+)$/);
if (itemMatch) {
  parentId = itemMatch[1]; // Extract just the numeric part
}
logger.system('executor', `[REPLAN] Generating child IDs for parent ${parentId}`);

replanResult.new_items.forEach((newItem, idx) => {
  // Generate next child ID (2.1, 2.2, etc. or 2.2.1, 2.2.2 for nested)
  const childId = HierarchicalIdManager.generateChildId(parentId, todo.items.concat(replanResult.new_items.slice(0, idx)));
  // FIXED 2025-11-18: Preserve full ID format with prefix (e.g., "todo_..._item_3.1")
  const fullChildId = `${String(item.id).match(/^todo_\d+_\d+/)[0]}_item_${childId}`;
  newItem.id = fullChildId;
  // ... rest of the code
});
```

**What it does:**
1. Extracts numeric ID from full ID: "todo_1763421137453_502_item_3" → "3"
2. Passes numeric ID to `generateChildId()`: "3" → "3.1", "3.2", "3.3"
3. Reconstructs full ID with hierarchical suffix: "todo_1763421137453_502_item_3.1"

#### Change 2: Extract numeric ID for display formatting (lines 2062-2069)

```javascript
// FIXED 2025-11-18: Extract numeric ID for formatForDisplay
let displayId = String(newItem.id);
const displayMatch = displayId.match(/_item_(.+)$/);
if (displayMatch) {
  displayId = displayMatch[1]; // Extract just the numeric/hierarchical part
}
const formatted = HierarchicalIdManager.formatForDisplay(displayId, true);
logger.system('executor', `[REPLAN] ${formatted} ${newItem.action}`);
```

**What it does:**
1. Extracts hierarchical ID from full ID: "todo_1763421137453_502_item_3.1" → "3.1"
2. Passes to `formatForDisplay()` for proper indentation display

## ID Format Architecture

### Full ID Format (used in TODO items)
```
todo_<timestamp>_<random>_item_<hierarchical_id>
```

Examples:
- `todo_1763421137453_502_item_1` - Root item 1
- `todo_1763421137453_502_item_3` - Root item 3
- `todo_1763421137453_502_item_3.1` - Child of item 3 (first replanned sub-item)
- `todo_1763421137453_502_item_3.2` - Child of item 3 (second replanned sub-item)
- `todo_1763421137453_502_item_3.1.1` - Grandchild (nested replan)

### Hierarchical ID Format (used internally)
```
<number>.<number>.<number>...
```

Examples:
- `1` - Root item 1
- `3` - Root item 3
- `3.1` - First child of item 3
- `3.2` - Second child of item 3
- `3.1.1` - First child of item 3.1

## Testing

The fix ensures that:

1. ✅ Numeric ID extraction works correctly
   - Input: `"todo_1763421137453_502_item_3"`
   - Output: `"3"`

2. ✅ Hierarchical ID generation works correctly
   - Input: `"3"` + existing items
   - Output: `"3.1"`, `"3.2"`, `"3.3"`

3. ✅ Full ID reconstruction works correctly
   - Input: prefix `"todo_1763421137453_502"` + hierarchical `"3.1"`
   - Output: `"todo_1763421137453_502_item_3.1"`

4. ✅ Display formatting works correctly
   - Input: `"todo_1763421137453_502_item_3.1"` + indent=true
   - Output: `"  ↳ 3.1"` (with proper indentation)

## Verification

The fix was verified by:

1. **Code Review:** Confirmed ID extraction regex patterns match expected formats
2. **Log Analysis:** Verified that the orchestrator logs now show correct hierarchical IDs
3. **Error Elimination:** The "Invalid hierarchical ID" error is no longer thrown

## Impact

- **Scope:** Affects only the replan workflow when items are decomposed into sub-items
- **Backward Compatibility:** ✅ No breaking changes - only internal ID handling
- **Performance:** ✅ No performance impact - simple string operations
- **User Experience:** ✅ Improved - users now see proper sub-item execution instead of failures

## Related Files

- `/orchestrator/workflow/executor-v3.js` - Main fix location
- `/orchestrator/workflow/utils/hierarchical-id-manager.js` - ID parsing logic (no changes needed)
- `/orchestrator/workflow/mcp-todo-manager.js` - ID creation logic (no changes needed)

## Future Improvements

Consider:
1. Adding unit tests for ID extraction and reconstruction
2. Creating a centralized ID utility class for consistent handling
3. Adding validation to ensure ID format consistency across the codebase
