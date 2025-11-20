# 🔧 Advanced MCP Tools Guide

## Overview

**7 powerful tools** for deep code analysis, comparison, and refactoring planning.

## Tools

### 1. 🔍 `analyze_file_deeply`

**Deep analysis of a single file**

```
@cascade analyze_file_deeply(file_path: "orchestrator/core/service-registry.js")
```

**Returns:**
- Dead functions in file
- All imports/exports
- Dependencies (what it imports, what imports it)
- Quality metrics (LOC, complexity, comments)
- Health score (0-100)
- Recommendations for improvement

**Example Output:**
```json
{
  "file": "orchestrator/core/service-registry.js",
  "dead_functions": [
    {"name": "setupOptimizationIntegration", "complexity": 5, "loc": 20},
    {"name": "overallEfficiency", "complexity": 3, "loc": 10}
  ],
  "dead_functions_count": 2,
  "imports": ["logger", "di-container"],
  "imports_count": 2,
  "imported_by": ["app.js", "server.js"],
  "imported_by_count": 2,
  "health_score": 65,
  "recommendations": [
    "Remove 2 dead functions",
    "Add documentation/comments"
  ]
}
```

---

### 2. 🔄 `compare_functions`

**Compare two functions for quality and complexity**

```
@cascade compare_functions(
  file1: "orchestrator/utils/logger.js",
  func1: "replacer",
  file2: "orchestrator/utils/helpers.js",
  func2: "logMessage"
)
```

**Returns:**
- Complexity comparison
- Lines of code comparison
- Which function is better
- Reason for recommendation

**Example Output:**
```json
{
  "function1": {
    "file": "orchestrator/utils/logger.js",
    "name": "replacer",
    "complexity": 2,
    "lines": 5
  },
  "function2": {
    "file": "orchestrator/utils/helpers.js",
    "name": "logMessage",
    "complexity": 4,
    "lines": 8
  },
  "comparison": {
    "complexity_diff": 2,
    "lines_diff": 3,
    "better_candidate": "function1",
    "reason": "Function 1 has lower complexity (2 vs 4)"
  }
}
```

---

### 3. 🔎 `find_duplicates_in_directory`

**Find duplicate files and functions in a directory**

```
@cascade find_duplicates_in_directory(directory: "orchestrator/workflow")
```

**Returns:**
- List of duplicate files/functions
- Similarity percentage
- Type (exact or semantic)
- Count summary

**Example Output:**
```json
{
  "directory": "orchestrator/workflow",
  "duplicates_found": 3,
  "duplicates": [
    {
      "file1": "orchestrator/workflow/executor-v3.js",
      "file2": "orchestrator/workflow/executor-v2.js",
      "type": "exact_duplicate"
    }
  ],
  "summary": {
    "exact_duplicates": 1,
    "semantic_duplicates": 2
  }
}
```

---

### 4. 📊 `analyze_impact`

**Analyze impact of changes to a file**

```
@cascade analyze_impact(file_path: "orchestrator/core/di-container.js")
```

**Returns:**
- Direct dependencies (what it imports)
- Direct dependents (what imports it)
- Cascade depth (how deep the impact goes)
- Risk level (LOW, MEDIUM, HIGH, CRITICAL)
- Recommendation for modification

**Example Output:**
```json
{
  "file": "orchestrator/core/di-container.js",
  "direct_dependencies": 3,
  "direct_dependents": 12,
  "cascade_depth": 4,
  "total_affected": 15,
  "risk_level": "HIGH",
  "recommendation": "⚠️ MODIFY WITH CAUTION - High impact"
}
```

---

### 5. 📂 `classify_files`

**Classify all files in a directory**

```
@cascade classify_files(directory: "orchestrator")
```

**Returns:**
- **Active**: Files with no issues
- **Candidates for archival**: Dead files (no imports, not imported)
- **Needs cleanup**: Has dead code but used
- **Critical**: Many dependents

**Example Output:**
```json
{
  "directory": "orchestrator",
  "categories": {
    "candidates_for_archival": [
      {
        "file": "orchestrator/utils/old-helper.js",
        "reason": "No imports, not imported",
        "size": 2048
      }
    ],
    "needs_cleanup": [
      {
        "file": "orchestrator/workflow/executor-v3.js",
        "dead_functions": 5,
        "dependents": 2
      }
    ],
    "critical": [
      {
        "file": "orchestrator/core/service-registry.js",
        "dead_functions": 2,
        "dependents": 15
      }
    ]
  }
}
```

---

### 6. 📋 `generate_refactoring_plan`

**Generate refactoring plan with phases**

```
@cascade generate_refactoring_plan(priority: "high")
```

**Returns:**
- **Phase 1 (Quick wins)**: Remove dead files (LOW effort, LOW risk)
- **Phase 2 (Medium)**: Clean up dead functions (MEDIUM effort, MEDIUM risk)
- **Phase 3 (Complex)**: Break cycles, consolidate (HIGH effort, HIGH risk)

**Example Output:**
```json
{
  "priority": "high",
  "phases": {
    "phase_1_quick_wins": [
      {
        "action": "REMOVE",
        "file": "orchestrator/utils/old-helper.js",
        "reason": "Dead file (no imports, not imported)",
        "effort": "LOW",
        "risk": "LOW"
      }
    ],
    "phase_2_medium": [
      {
        "action": "CLEANUP",
        "file": "orchestrator/workflow/executor-v3.js",
        "dead_functions": 5,
        "effort": "MEDIUM",
        "risk": "MEDIUM"
      }
    ],
    "phase_3_complex": [
      {
        "action": "REFACTOR",
        "type": "BREAK_CYCLE",
        "effort": "HIGH",
        "risk": "HIGH"
      }
    ]
  }
}
```

---

### 7. 🎨 `visualize_dependencies`

**Generate dependency visualization data**

```
@cascade visualize_dependencies(
  file_path: "orchestrator/app.js",
  depth: 2
)
```

**Returns:**
- Nodes (files in dependency tree)
- Edges (import relationships)
- Format: Cytoscape (for visualization)
- Layout: breadthfirst

**Example Output:**
```json
{
  "file": "orchestrator/app.js",
  "depth": 2,
  "nodes": [
    {
      "id": "app_js",
      "label": "app.js",
      "file": "orchestrator/app.js",
      "depth": 0
    },
    {
      "id": "server_js",
      "label": "server.js",
      "file": "orchestrator/server.js",
      "depth": 1
    }
  ],
  "edges": [
    {
      "source": "app_js",
      "target": "server_js",
      "type": "imports"
    }
  ],
  "format": "cytoscape",
  "layout": "breadthfirst"
}
```

---

## Usage Examples

### Example 1: Analyze a File and Get Recommendations

```
@cascade analyze_file_deeply(file_path: "orchestrator/utils/logger.js")
```

**Use case**: Understand what's wrong with a file and get specific recommendations.

---

### Example 2: Compare Two Potentially Duplicate Functions

```
@cascade compare_functions(
  file1: "orchestrator/utils/logger.js",
  func1: "replacer",
  file2: "orchestrator/utils/helpers.js",
  func2: "logMessage"
)
```

**Use case**: Decide which version to keep when you find duplicates.

---

### Example 3: Find All Duplicates in a Directory

```
@cascade find_duplicates_in_directory(directory: "orchestrator/workflow")
```

**Use case**: Identify all duplicate code in a specific area.

---

### Example 4: Check Impact Before Modifying a File

```
@cascade analyze_impact(file_path: "orchestrator/core/di-container.js")
```

**Use case**: Understand how many files will be affected by changes.

---

### Example 5: Get Classification of All Files

```
@cascade classify_files(directory: "orchestrator")
```

**Use case**: See which files are candidates for archival, need cleanup, or are critical.

---

### Example 6: Generate Refactoring Plan

```
@cascade generate_refactoring_plan(priority: "high")
```

**Use case**: Get a structured plan for refactoring with phases and effort estimates.

---

### Example 7: Visualize Dependencies

```
@cascade visualize_dependencies(file_path: "orchestrator/app.js", depth: 3)
```

**Use case**: Understand the dependency tree of a file (can be rendered with Cytoscape.js).

---

## Health Score Interpretation

| Score  | Status               | Action                 |
| ------ | -------------------- | ---------------------- |
| 80-100 | ✅ Healthy            | No action needed       |
| 60-79  | 🟡 Needs attention    | Plan cleanup           |
| 40-59  | 🟠 Significant issues | Schedule refactoring   |
| 0-39   | 🔴 Critical           | Urgent action required |

---

## Risk Level Interpretation

| Level    | Dependents | Cascade Depth | Recommendation         |
| -------- | ---------- | ------------- | ---------------------- |
| LOW      | 0-2        | 0-1           | ✓ Safe to modify       |
| MEDIUM   | 3-5        | 2-3           | ✓ Can modify carefully |
| HIGH     | 6-10       | 4-5           | ⚠️ Modify with caution  |
| CRITICAL | >10        | >5            | ⛔ Do not modify        |

---

## Integration with Cascade

All tools are available in Cascade via MCP:

```
@cascade <tool_name>(<parameters>)
```

Example:
```
@cascade analyze_file_deeply(file_path: "orchestrator/core/service-registry.js")
```

---

## Tips & Best Practices

1. **Start with classification**: Use `classify_files()` to get overview
2. **Analyze critical files**: Use `analyze_impact()` before modifying
3. **Compare duplicates**: Use `compare_functions()` to decide which to keep
4. **Plan refactoring**: Use `generate_refactoring_plan()` for structured approach
5. **Visualize dependencies**: Use `visualize_dependencies()` to understand architecture

---

## Performance Notes

- **analyze_file_deeply**: ~100ms per file
- **compare_functions**: ~50ms per comparison
- **find_duplicates_in_directory**: ~500ms for large directories
- **analyze_impact**: ~200ms per file
- **classify_files**: ~1-2s for entire directory
- **generate_refactoring_plan**: ~500ms
- **visualize_dependencies**: ~300ms per file

---

**Status**: Ready to use  
**Version**: 1.0 (Advanced Tools)  
**Last Updated**: 2025-11-19
