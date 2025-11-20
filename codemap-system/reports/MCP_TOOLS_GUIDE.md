# 🛠️ MCP Tools Guide

**MCP Server Status**: ✅ Active (PID: 34860)  
**Available Tools**: 16  
**Available Resources**: 8

---

## 📚 Available Resources

### 1. **Dead Files Detection**
Identifies files that are not imported or used anywhere in the project.

**Use Case**: Find orphaned files that can be safely deleted.

### 2. **Dead Functions Detection**
Identifies functions that are defined but never called.

**Use Case**: Find unused functions for cleanup.

### 3. **Dependency Graph**
Visual representation of how files and modules depend on each other.

**Use Case**: Understand project architecture and dependencies.

### 4. **Cycles & Isolation**
Detects circular dependencies and isolated code sections.

**Use Case**: Identify architectural issues and refactoring opportunities.

### 5. **Quality & Duplications**
Analyzes code quality metrics and identifies duplicate code.

**Use Case**: Find code duplication for consolidation.

### 6. **Consolidated Analysis State**
Summary of all analysis layers combined.

**Use Case**: Get complete project overview.

### 7. **Dependency Graph (JSON)**
Machine-readable format of the dependency graph.

**Use Case**: Integrate with external tools and scripts.

### 8. **Dead Code Map**
Visual map of all dead code locations.

**Use Case**: Plan cleanup strategy.

---

## 🔧 Available Tools

### Core Analysis Tools

#### 1. **get_layer_analysis**
Analyze specific code layers (5-layer analysis system).

```
Layers:
  1. Dead files detection
  2. Dead functions detection
  3. Dependency graph building
  4. Cycles & isolation analysis
  5. Quality & duplicates analysis
```

**Usage**:
```
Tool: get_layer_analysis
Params: layer_number (1-5)
Returns: Detailed analysis for specified layer
```

---

#### 2. **get_dead_code_summary**
Get comprehensive summary of all dead code.

**Usage**:
```
Tool: get_dead_code_summary
Params: (optional) filter_type (functions|methods|files)
Returns: List of dead code items with locations
```

**Example Output**:
```json
{
  "dead_functions": 69527,
  "dead_methods": 11634,
  "dead_files": 0,
  "top_files_with_dead_code": [
    {
      "file": "web/atlas_server.py",
      "dead_items": 4
    }
  ]
}
```

---

#### 3. **get_dependency_relationships**
Trace dependencies between specific files/functions.

**Usage**:
```
Tool: get_dependency_relationships
Params: target (file or function name)
Returns: All files/functions that depend on target
```

**Example**:
```
Query: "health" function
Returns: All places where health() is called
```

---

#### 4. **get_circular_dependencies**
Identify circular dependency patterns.

**Usage**:
```
Tool: get_circular_dependencies
Params: (optional) scope (file|module|function)
Returns: List of circular dependency chains
```

**Current Status**: ✅ 0 circular dependencies detected

---

#### 5. **get_quality_report**
Comprehensive code quality metrics.

**Usage**:
```
Tool: get_quality_report
Params: (optional) file_path
Returns: Quality metrics and recommendations
```

**Metrics Included**:
- Complexity scores
- Duplication ratios
- Import patterns
- Function sizes
- Dead code ratios

---

#### 6. **get_analysis_status**
Check current analysis status and progress.

**Usage**:
```
Tool: get_analysis_status
Params: (none)
Returns: Analysis completion status and metadata
```

---

### Deep Analysis Tools

#### 7. **analyze_file_deeply**
Perform deep analysis on a specific file.

**Usage**:
```
Tool: analyze_file_deeply
Params: file_path (required)
Returns: Complete analysis including:
  - All functions defined
  - All imports used
  - All exports
  - Dead code in file
  - Complexity metrics
```

**Example**:
```
File: web/atlas_server.py
Returns: 4 unused functions, import analysis, etc.
```

---

#### 8. **compare_functions**
Compare two functions for similarity and duplication.

**Usage**:
```
Tool: compare_functions
Params: function1_path, function2_path
Returns: Similarity score and consolidation suggestions
```

**Example**:
```
Compare: nextIndex in atlas-advanced-ui.js vs theme-manager.js
Returns: 95% similar, consolidation recommended
```

---

#### 9. **find_duplicates_in_directory**
Find duplicate code patterns in a directory.

**Usage**:
```
Tool: find_duplicates_in_directory
Params: directory_path, (optional) min_similarity (0-100)
Returns: List of duplicate code blocks
```

**Example**:
```
Directory: web/static/js/components/
Min Similarity: 80%
Returns: Similar function implementations
```

---

### Impact & Planning Tools

#### 10. **analyze_impact**
Analyze impact of removing/changing code.

**Usage**:
```
Tool: analyze_impact
Params: target (file|function), action (remove|modify)
Returns: Impact analysis including:
  - Dependent code
  - Breaking changes
  - Risk assessment
  - Recommendations
```

**Example**:
```
Target: serve_config function
Action: remove
Returns: No dependencies, safe to remove
```

---

#### 11. **classify_files**
Classify files by type and purpose.

**Usage**:
```
Tool: classify_files
Params: (optional) directory_path
Returns: File classification with:
  - Type (utility, component, service, etc.)
  - Purpose
  - Dependencies
  - Dead code ratio
```

---

#### 12. **generate_refactoring_plan**
Generate automated refactoring suggestions.

**Usage**:
```
Tool: generate_refactoring_plan
Params: scope (dead-code|duplicates|consolidation)
Returns: Step-by-step refactoring plan
```

**Scopes**:
- `dead-code`: Remove unused code
- `duplicates`: Consolidate duplicate code
- `consolidation`: Merge similar modules
- `optimization`: Performance improvements

---

### Visualization Tools

#### 13. **visualize_dependencies**
Generate visual representation of dependencies.

**Usage**:
```
Tool: visualize_dependencies
Params: (optional) scope (file|module|directory)
Returns: ASCII or JSON visualization
```

**Example Output**:
```
web/atlas_server.py
├── imports: logger, config
├── exports: serve_config, health
├── used_by: [app.js]
└── dead_code: [serve_config, health]
```

---

#### 14. **get_quick_assessment**
Quick overview of code health.

**Usage**:
```
Tool: get_quick_assessment
Params: (optional) file_path
Returns: Quick health score and top issues
```

**Output**:
```
Health Score: 6/10
Top Issues:
  1. 69,527 dead functions
  2. 11,634 dead methods
  3. Archive bloat
```

---

### Advanced Tools

#### 15. **get_disqualification_report**
Identify code that should be removed or refactored.

**Usage**:
```
Tool: get_disqualification_report
Params: (optional) severity (low|medium|high)
Returns: Prioritized list of disqualifications
```

---

#### 16. **get_editor_quick_view**
Get quick view for editor integration.

**Usage**:
```
Tool: get_editor_quick_view
Params: file_path, line_number (optional)
Returns: Quick info for editor tooltip/hover
```

---

## 🚀 Quick Start Examples

### Example 1: Find Unused Functions in a File

```bash
# Step 1: Analyze the file deeply
Tool: analyze_file_deeply
Params: file_path = "web/atlas_server.py"

# Step 2: Review results
Returns: 4 unused functions
  - serve_config (line 43)
  - health (line 58)
  - get_tts_config (line 68)
  - play_tts (line 78)

# Step 3: Check impact before removing
Tool: analyze_impact
Params: target = "serve_config", action = "remove"
Returns: No dependencies, safe to remove
```

---

### Example 2: Find Duplicate Code

```bash
# Step 1: Find duplicates in directory
Tool: find_duplicates_in_directory
Params: directory_path = "web/static/js/components/ui"
        min_similarity = 80

# Step 2: Compare specific functions
Tool: compare_functions
Params: function1 = "web/static/js/components/ui/atlas-advanced-ui.js:nextIndex"
        function2 = "web/static/js/components/ui/modules/theme-manager.js:nextIndex"

# Step 3: Generate consolidation plan
Tool: generate_refactoring_plan
Params: scope = "consolidation"
```

---

### Example 3: Analyze Project Health

```bash
# Step 1: Get quick assessment
Tool: get_quick_assessment
Returns: Health score and top issues

# Step 2: Get detailed quality report
Tool: get_quality_report
Returns: Comprehensive metrics

# Step 3: Check for circular dependencies
Tool: get_circular_dependencies
Returns: 0 cycles (good!)

# Step 4: Get dead code summary
Tool: get_dead_code_summary
Returns: 81,161 dead code items
```

---

### Example 4: Plan Cleanup

```bash
# Step 1: Generate refactoring plan
Tool: generate_refactoring_plan
Params: scope = "dead-code"
Returns: Phased cleanup plan

# Step 2: Analyze impact of each phase
Tool: analyze_impact
Params: target = "web/.archive/", action = "remove"
Returns: Impact analysis

# Step 3: Visualize dependencies
Tool: visualize_dependencies
Params: scope = "web/.archive/"
Returns: Dependency visualization
```

---

## 📊 Analysis Workflow

### Recommended Analysis Sequence

```
1. Quick Assessment
   └─ get_quick_assessment()

2. Detailed Analysis
   ├─ get_dead_code_summary()
   ├─ get_quality_report()
   └─ get_circular_dependencies()

3. Deep Dive (if needed)
   ├─ analyze_file_deeply(file)
   ├─ find_duplicates_in_directory(dir)
   └─ get_dependency_relationships(target)

4. Planning
   ├─ generate_refactoring_plan(scope)
   └─ analyze_impact(target, action)

5. Visualization
   └─ visualize_dependencies(scope)
```

---

## 🔍 Common Queries

### Q1: How do I find all unused functions?
```
Tool: get_dead_code_summary
Filter: functions
```

### Q2: Is it safe to remove a function?
```
Tool: analyze_impact
Target: function_name
Action: remove
```

### Q3: What files depend on this file?
```
Tool: get_dependency_relationships
Target: file_path
```

### Q4: Are there circular dependencies?
```
Tool: get_circular_dependencies
```

### Q5: How much duplicate code exists?
```
Tool: get_quality_report
```

### Q6: What's the best refactoring strategy?
```
Tool: generate_refactoring_plan
Scope: dead-code (or duplicates, consolidation)
```

---

## 📝 Integration with Windsurf

The MCP server is configured to work with Windsurf. After reloading Windsurf:

1. Open the MCP panel in Windsurf
2. Select "codemap" server
3. Choose a tool from the list
4. Enter parameters
5. View results

---

## 🐛 Troubleshooting

### Issue: Tool returns no results
**Solution**: Check that parameters are correct and file paths are absolute.

### Issue: Analysis seems incomplete
**Solution**: Wait for analyzer to complete first cycle (30-60 seconds).

### Issue: MCP server not responding
**Solution**: Check logs at `/Users/dev/Documents/GitHub/atlas4/codemap-system/logs/mcp_windsurf_server.log`

---

## 📚 Additional Resources

- **Detailed Analysis**: `/codemap-system/reports/DETAILED_ANALYSIS.md`
- **Cleanup Plan**: `/codemap-system/reports/DEAD_CODE_CLEANUP_PLAN.md`
- **Analysis Data**: `/codemap-system/reports/codemap_analysis.json`
- **Server Logs**: `/codemap-system/logs/mcp_windsurf_server.log`

---

*Last Updated: 2025-11-20 03:43 UTC+02:00*
