# 🚀 Run Advanced Codemap System

## One-Line Start

```bash
bash /Users/dev/Documents/GitHub/atlas4/START_ADVANCED_SYSTEM.sh
```

That's it! The system will:
1. ✅ Create necessary directories
2. ✅ Start the Enhanced Analyzer (5-layer continuous analysis)
3. ✅ Start the MCP Server (with 13 tools)
4. ✅ Begin automatic analysis cycles

---

## What Happens Next

### Immediately
- System starts background processes
- Analyzer begins first cycle
- Server becomes available

### After 30-60 seconds
- First analysis cycle completes
- Reports generated in `/reports/`
- Tools ready to use in Cascade

### Continuously
- Analyzer runs every 2 minutes
- Reports auto-update
- Tools always have fresh data

---

## Use in Cascade

### Quick Classification
```
@cascade classify_files(directory: "orchestrator")
```

### Deep File Analysis
```
@cascade analyze_file_deeply(file_path: "orchestrator/app.js")
```

### Impact Analysis
```
@cascade analyze_impact(file_path: "orchestrator/core/di-container.js")
```

### Refactoring Plan
```
@cascade generate_refactoring_plan(priority: "high")
```

### Find Duplicates
```
@cascade find_duplicates_in_directory(directory: "orchestrator/workflow")
```

### Compare Functions
```
@cascade compare_functions(
  file1: "orchestrator/utils/logger.js",
  func1: "replacer",
  file2: "orchestrator/utils/helpers.js",
  func2: "logMessage"
)
```

### Visualize Dependencies
```
@cascade visualize_dependencies(file_path: "orchestrator/app.js", depth: 2)
```

---

## Monitor Progress

### Watch Analyzer Logs
```bash
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/enhanced_analyzer.log
```

### Check Current Reports
```bash
ls -lh /Users/dev/Documents/GitHub/atlas4/reports/
```

### View Latest Analysis
```bash
cat /Users/dev/Documents/GitHub/atlas4/reports/enhanced_analysis_state.json | jq .
```

---

## Stop the System

```bash
# Find PIDs
ps aux | grep enhanced

# Kill both processes
kill <ANALYZER_PID> <SERVER_PID>
```

Or use the PIDs printed when you started the system.

---

## Troubleshooting

### "Permission denied" on START_ADVANCED_SYSTEM.sh
```bash
chmod +x /Users/dev/Documents/GitHub/atlas4/START_ADVANCED_SYSTEM.sh
bash /Users/dev/Documents/GitHub/atlas4/START_ADVANCED_SYSTEM.sh
```

### Reports not updating
```bash
# Check if analyzer is running
ps aux | grep mcp_enhanced_analyzer

# Check logs
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/enhanced_analyzer.log
```

### MCP tools not responding
```bash
# Check if server is running
ps aux | grep mcp_enhanced_server

# Restart server
pkill -f mcp_enhanced_server
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 mcp_enhanced_server.py &
```

---

## Documentation

- **README_ADVANCED.md** – Complete system overview
- **ADVANCED_TOOLS_GUIDE.md** – Detailed tool reference
- **TOOLS_SUMMARY.md** – Quick tool reference
- **QUICK_START_ENHANCED.md** – 30-second quick start
- **ADVANCED_SYSTEM_SUMMARY.md** – What was built

---

## System Info

**Total Tools**: 13 (6 basic + 7 advanced)  
**Analysis Layers**: 5  
**Cycle Interval**: 2 minutes  
**Status**: Production Ready  
**Version**: 2.0 (Advanced MCP Tools)

---

**Ready to go!** 🚀
