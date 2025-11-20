# 🔧 MCP Tools Summary

## All Available Tools

### Basic Layer Tools (6 tools)

1. **get_layer_analysis(layer: 1-5)** – Get analysis from specific layer
2. **get_dead_code_summary()** – Summary of all dead code
3. **get_dependency_relationships(file_path)** – File dependencies
4. **get_circular_dependencies()** – All circular dependencies
5. **get_quality_report(file_path?)** – Code quality metrics
6. **get_analysis_status()** – Current analysis status

### Advanced Analysis Tools (7 tools)

1. **analyze_file_deeply(file_path)**
   - Dead functions in file
   - All imports/exports
   - Dependencies
   - Quality metrics
   - Health score (0-100)
   - Recommendations

2. **compare_functions(file1, func1, file2, func2)**
   - Complexity comparison
   - Lines of code comparison
   - Which is better
   - Reason for recommendation

3. **find_duplicates_in_directory(directory)**
   - Duplicate files/functions
   - Similarity percentage
   - Type (exact/semantic)
   - Count summary

4. **analyze_impact(file_path)**
   - Direct dependencies
   - Direct dependents
   - Cascade depth
   - Risk level (LOW/MEDIUM/HIGH/CRITICAL)
   - Modification recommendation

5. **classify_files(directory?)**
   - Active files
   - Candidates for archival
   - Needs cleanup
   - Critical files

6. **generate_refactoring_plan(priority)**
   - Phase 1: Quick wins
   - Phase 2: Medium effort
   - Phase 3: Complex changes
   - Effort/risk estimates

7. **visualize_dependencies(file_path, depth)**
   - Dependency tree nodes
   - Import edges
   - Cytoscape format
   - Breadthfirst layout

---

## Quick Reference

### For Understanding a File
```
@cascade analyze_file_deeply(file_path: "orchestrator/app.js")
```

### For Finding Duplicates
```
@cascade find_duplicates_in_directory(directory: "orchestrator/workflow")
```

### For Impact Analysis
```
@cascade analyze_impact(file_path: "orchestrator/core/di-container.js")
```

### For Classification
```
@cascade classify_files(directory: "orchestrator")
```

### For Refactoring Plan
```
@cascade generate_refactoring_plan(priority: "high")
```

### For Visualization
```
@cascade visualize_dependencies(file_path: "orchestrator/app.js", depth: 2)
```

---

**Total Tools**: 13 (6 basic + 7 advanced)  
**Status**: Ready to use  
**Version**: 2.0 (Advanced)
