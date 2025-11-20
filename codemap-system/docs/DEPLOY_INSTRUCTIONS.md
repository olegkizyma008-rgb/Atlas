# 🚀 Deploy Advanced Codemap System

## Quick Start

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
bash deploy.sh
```

That's it! The system will automatically:

1. ✅ Detect Advanced Codemap System v2.0
2. ✅ Start Enhanced Analyzer (5-layer continuous analysis)
3. ✅ Start MCP Server (13 powerful tools)
4. ✅ Begin automatic analysis cycles
5. ✅ Provide real-time access for Windsurf Cascade

---

## What Happens

### Immediately
- System checks for Advanced files
- Starts Enhanced Analyzer (background)
- Starts MCP Server (background)
- Begins first analysis cycle

### After 30-60 seconds
- First cycle completes
- All 5 layers analyzed
- Reports generated in `/reports/`
- Tools ready in Cascade

### Continuously
- Analyzer runs every 2 minutes
- All 5 layers processed sequentially
- Reports auto-update
- Windsurf has real-time access

---

## System Components

### Enhanced Analyzer (mcp_enhanced_analyzer.py)
- **5-layer continuous analysis**
- **Never sleeps** – runs every 2 minutes
- **Automatic** – no manual intervention needed
- **Layered** – processes sequentially:
  - Layer 1: Dead files detection
  - Layer 2: Dead functions detection
  - Layer 3: Dependency graph building
  - Layer 4: Cycles & isolation detection
  - Layer 5: Quality & duplication analysis

### MCP Server (mcp_enhanced_server.py + mcp_advanced_tools.py)
- **6 basic tools** for layer analysis
- **7 advanced tools** for deep analysis
- **Real-time access** from Windsurf Cascade
- **13 total tools** for complete code analysis

---

## Use in Windsurf Cascade

### Classify All Files
```
@cascade classify_files(directory: "orchestrator")
```
**Output**: Files categorized as active, archival candidates, needs cleanup, critical

### Deep File Analysis
```
@cascade analyze_file_deeply(file_path: "orchestrator/app.js")
```
**Output**: Dead functions, dependencies, quality score, recommendations

### Impact Analysis
```
@cascade analyze_impact(file_path: "orchestrator/core/di-container.js")
```
**Output**: Risk level, affected files, cascade depth, modification recommendation

### Refactoring Plan
```
@cascade generate_refactoring_plan(priority: "high")
```
**Output**: 3-phase plan with effort/risk estimates

### Find Duplicates
```
@cascade find_duplicates_in_directory(directory: "orchestrator/workflow")
```
**Output**: Duplicate files/functions with similarity percentage

### Compare Functions
```
@cascade compare_functions(
  file1: "orchestrator/utils/logger.js",
  func1: "replacer",
  file2: "orchestrator/utils/helpers.js",
  func2: "logMessage"
)
```
**Output**: Which function is better and why

### Visualize Dependencies
```
@cascade visualize_dependencies(file_path: "orchestrator/app.js", depth: 2)
```
**Output**: Dependency tree in Cytoscape format

---

## Monitoring

### Watch Analyzer Logs
```bash
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/analyzer.log
```

### Check Reports
```bash
ls -lh /Users/dev/Documents/GitHub/atlas4/reports/
```

### View Latest Analysis
```bash
cat /Users/dev/Documents/GitHub/atlas4/reports/enhanced_analysis_state.json | jq .
```

### Check System Status
```bash
ps aux | grep enhanced
```

---

## Stop System

```bash
# Ctrl+C in the terminal where deploy.sh is running

# Or manually:
pkill -f mcp_enhanced_analyzer
pkill -f mcp_enhanced_server
```

---

## Troubleshooting

### "Permission denied" on deploy.sh
```bash
chmod +x /Users/dev/Documents/GitHub/atlas4/codemap-system/deploy.sh
bash /Users/dev/Documents/GitHub/atlas4/codemap-system/deploy.sh
```

### Reports not updating
```bash
# Check if analyzer is running
ps aux | grep mcp_enhanced_analyzer

# Check logs
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/analyzer.log
```

### MCP tools not responding
```bash
# Check if server is running
ps aux | grep mcp_enhanced_server

# Check logs
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/server.log
```

---

## System Info

- **Version**: 2.0 (Advanced MCP Tools)
- **Tools**: 13 (6 basic + 7 advanced)
- **Analysis Layers**: 5
- **Cycle Interval**: 2 minutes
- **Status**: Production Ready
- **Mode**: Automatic, continuous, layered

---

## Files

### Core System
- `deploy.sh` – Main deploy script (auto-detects Advanced system)
- `deploy_advanced.sh` – Advanced system deploy
- `mcp_enhanced_analyzer.py` – 5-layer analyzer
- `mcp_enhanced_server.py` – MCP server
- `mcp_advanced_tools.py` – 7 advanced tools

### Documentation
- `DEPLOY_INSTRUCTIONS.md` – This file
- `README_ADVANCED.md` – Complete guide
- `ADVANCED_TOOLS_GUIDE.md` – Tool reference
- `TOOLS_SUMMARY.md` – Quick reference

### Auto-Generated
- `/reports/layer1_dead_files.json`
- `/reports/layer2_dead_functions.json`
- `/reports/layer3_dependency_graph.json`
- `/reports/layer4_cycles_isolation.json`
- `/reports/layer5_quality_duplications.json`
- `/reports/enhanced_analysis_state.json`

---

## Next Steps

1. ✅ Run `bash deploy.sh`
2. ✅ Wait for first cycle (~30-60 seconds)
3. ✅ Use tools in Windsurf Cascade
4. ✅ Review analysis results
5. ✅ Plan refactoring based on findings

---

**Ready to deploy!** 🚀
