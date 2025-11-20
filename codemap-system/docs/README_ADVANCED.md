# 🚀 Enhanced Codemap System v2.0 – Advanced MCP Tools

## What's New

✅ **13 Powerful MCP Tools** – From basic analysis to deep refactoring planning  
✅ **7 Advanced Tools** – Deep file analysis, comparison, impact analysis, classification, visualization  
✅ **Continuous Analysis** – 5-layer system that never sleeps  
✅ **Real-time Access** – Via MCP resources and tools in Cascade  
✅ **Auto-Generated Reports** – JSON, HTML, Markdown formats  

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         mcp_enhanced_analyzer.py                            │
│  (Continuous 5-Layer Analysis - Every 2 Minutes)           │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Dead Files Detection                               │
│ Layer 2: Dead Functions Detection                           │
│ Layer 3: Dependency Graph & Relationships                  │
│ Layer 4: Circular Dependencies & Isolation                 │
│ Layer 5: Quality Metrics & Duplications                    │
└────────────────┬────────────────────────────────────────────┘
                 │ (writes reports every cycle)
                 ▼
         /reports/*.json
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│         mcp_enhanced_server.py                              │
│  (MCP Server - Real-time Access)                           │
├─────────────────────────────────────────────────────────────┤
│ 6 Basic Tools:                                              │
│  - get_layer_analysis()                                     │
│  - get_dead_code_summary()                                  │
│  - get_dependency_relationships()                           │
│  - get_circular_dependencies()                              │
│  - get_quality_report()                                     │
│  - get_analysis_status()                                    │
│                                                             │
│ 7 Advanced Tools (mcp_advanced_tools.py):                   │
│  - analyze_file_deeply()                                    │
│  - compare_functions()                                      │
│  - find_duplicates_in_directory()                           │
│  - analyze_impact()                                         │
│  - classify_files()                                         │
│  - generate_refactoring_plan()                              │
│  - visualize_dependencies()                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Start the System

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
bash start_enhanced_system.sh
```

### 2. Monitor Progress

```bash
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/enhanced_analyzer.log
```

### 3. Use Tools in Cascade

```
@cascade analyze_file_deeply(file_path: "orchestrator/app.js")
@cascade classify_files(directory: "orchestrator")
@cascade generate_refactoring_plan(priority: "high")
```

---

## The 13 Tools

### Basic Tools (6)

| Tool                                 | Purpose                    | Use Case                                       |
| ------------------------------------ | -------------------------- | ---------------------------------------------- |
| `get_layer_analysis(layer)`          | Get specific layer results | Understand dead files, functions, dependencies |
| `get_dead_code_summary()`            | Summary of all dead code   | Quick overview of cleanup needed               |
| `get_dependency_relationships(file)` | File dependencies          | Understand what a file imports/exports         |
| `get_circular_dependencies()`        | All cycles detected        | Find architectural issues                      |
| `get_quality_report(file?)`          | Quality metrics            | Assess code quality                            |
| `get_analysis_status()`              | Current cycle info         | Check if analysis is running                   |

### Advanced Tools (7)

| Tool                                  | Purpose               | Use Case                         |
| ------------------------------------- | --------------------- | -------------------------------- |
| `analyze_file_deeply(file)`           | Deep file analysis    | Understand all issues in a file  |
| `compare_functions(f1,fn1,f2,fn2)`    | Compare two functions | Decide which duplicate to keep   |
| `find_duplicates_in_directory(dir)`   | Find all duplicates   | Identify code to consolidate     |
| `analyze_impact(file)`                | Impact of changes     | Understand modification risk     |
| `classify_files(dir?)`                | Classify all files    | See what needs archival/cleanup  |
| `generate_refactoring_plan(priority)` | Structured plan       | Get phased refactoring approach  |
| `visualize_dependencies(file,depth)`  | Dependency tree       | Understand architecture visually |

---

## Usage Examples

### Example 1: Analyze a Specific File

```
@cascade analyze_file_deeply(file_path: "orchestrator/core/service-registry.js")
```

**Output**: Dead functions, dependencies, quality score, recommendations

---

### Example 2: Find All Dead Files

```
@cascade get_layer_analysis(layer: 1)
```

**Output**: List of files with no imports and no dependents

---

### Example 3: Compare Two Duplicate Functions

```
@cascade compare_functions(
  file1: "orchestrator/utils/logger.js",
  func1: "replacer",
  file2: "orchestrator/utils/helpers.js",
  func2: "logMessage"
)
```

**Output**: Which function is better and why

---

### Example 4: Check Impact Before Modifying

```
@cascade analyze_impact(file_path: "orchestrator/core/di-container.js")
```

**Output**: Risk level, affected files, modification recommendation

---

### Example 5: Get Classification of All Files

```
@cascade classify_files(directory: "orchestrator")
```

**Output**: 
- Candidates for archival
- Files needing cleanup
- Critical files (many dependents)

---

### Example 6: Generate Refactoring Plan

```
@cascade generate_refactoring_plan(priority: "high")
```

**Output**: 3-phase plan with effort/risk estimates

---

### Example 7: Visualize Dependencies

```
@cascade visualize_dependencies(file_path: "orchestrator/app.js", depth: 3)
```

**Output**: Cytoscape-format graph for visualization

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

## Files in This System

### Core Components
- `mcp_enhanced_analyzer.py` – 5-layer continuous analyzer
- `mcp_enhanced_server.py` – MCP server with basic tools
- `mcp_advanced_tools.py` – 7 advanced analysis tools
- `start_enhanced_system.sh` – Startup script

### Documentation
- `ENHANCED_SYSTEM.md` – Full system documentation
- `QUICK_START_ENHANCED.md` – 30-second quick start
- `ADVANCED_TOOLS_GUIDE.md` – Detailed tool guide
- `TOOLS_SUMMARY.md` – Quick reference
- `README_ADVANCED.md` – This file

### Reports (Auto-Generated)
- `layer1_dead_files.json` – Dead files
- `layer2_dead_functions.json` – Dead functions
- `layer3_dependency_graph.json` – Dependency graph
- `layer4_cycles_isolation.json` – Cycles & isolation
- `layer5_quality_duplications.json` – Quality & duplications
- `enhanced_analysis_state.json` – Consolidated state

---

## Workflow

### Step 1: Start System
```bash
bash start_enhanced_system.sh
```

### Step 2: Wait for First Cycle
~30-60 seconds for initial analysis

### Step 3: Review Classification
```
@cascade classify_files(directory: "orchestrator")
```

### Step 4: Analyze Critical Files
```
@cascade analyze_file_deeply(file_path: "orchestrator/core/...")
```

### Step 5: Check Impact
```
@cascade analyze_impact(file_path: "orchestrator/core/...")
```

### Step 6: Generate Plan
```
@cascade generate_refactoring_plan(priority: "high")
```

### Step 7: Execute Refactoring
Follow the phased plan from step 6

---

## Performance

- **Analysis Cycle**: ~30-60 seconds (depends on codebase size)
- **Memory Usage**: ~100-200MB
- **CPU Usage**: Low (mostly I/O bound)
- **Disk Usage**: ~10-50MB for reports

---

## Troubleshooting

### System Not Starting
```bash
ps aux | grep enhanced
cat /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/analyzer_startup.log
```

### Reports Not Updating
```bash
ps aux | grep mcp_enhanced_analyzer
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/enhanced_analyzer.log
```

### MCP Server Not Responding
```bash
ps aux | grep mcp_enhanced_server
pkill -f mcp_enhanced_server
python3 /Users/dev/Documents/GitHub/atlas4/codemap-system/mcp_enhanced_server.py &
```

---

## Next Steps

1. ✅ Start the system
2. ✅ Review first analysis cycle
3. ✅ Classify files using `classify_files()`
4. ✅ Analyze critical files using `analyze_file_deeply()`
5. ✅ Check impact before changes using `analyze_impact()`
6. ✅ Generate refactoring plan using `generate_refactoring_plan()`
7. ✅ Execute refactoring phase by phase

---

**Status**: Production Ready  
**Version**: 2.0 (Advanced MCP Tools)  
**Last Updated**: 2025-11-19  
**Tools**: 13 (6 basic + 7 advanced)
