# 🚀 Quick Start – Enhanced Codemap System

## What's New (v2.0)

✅ **Never sleeps** – Continuous analysis cycles  
✅ **5-layer deepening** – From files → functions → dependencies → cycles → quality  
✅ **Auto-updating reports** – JSON files updated every cycle  
✅ **MCP integration** – Real-time access via Cascade  
✅ **Error fixes** – Fixed duplication, memory sync, freshness issues  

## Start in 30 Seconds

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
bash start_enhanced_system.sh
```

That's it! The system will:
1. ✅ Create necessary directories
2. ✅ Start the analyzer (background)
3. ✅ Start the MCP server (background)
4. ✅ Begin continuous analysis cycles

## Monitor Progress

```bash
# Watch analyzer in real-time
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/enhanced_analyzer.log

# Check current reports
ls -lh /Users/dev/Documents/GitHub/atlas4/reports/

# View latest analysis state
cat /Users/dev/Documents/GitHub/atlas4/reports/enhanced_analysis_state.json | jq .
```

## Access Results

### In Cascade (via MCP)

```
@cascade read codemap://layer1/dead-files
@cascade read codemap://layer2/dead-functions
@cascade read codemap://layer3/dependency-graph
@cascade read codemap://layer4/cycles-isolation
@cascade read codemap://layer5/quality-duplications
@cascade get_dead_code_summary()
@cascade get_analysis_status()
```

### Direct JSON

```bash
# Dead files
jq . /Users/dev/Documents/GitHub/atlas4/reports/layer1_dead_files.json

# Dead functions
jq . /Users/dev/Documents/GitHub/atlas4/reports/layer2_dead_functions.json

# Dependency graph
jq . /Users/dev/Documents/GitHub/atlas4/reports/layer3_dependency_graph.json

# Cycles & isolation
jq . /Users/dev/Documents/GitHub/atlas4/reports/layer4_cycles_isolation.json

# Quality metrics
jq . /Users/dev/Documents/GitHub/atlas4/reports/layer5_quality_duplications.json
```

## What Each Layer Does

| Layer | Purpose                                    | Output                             |
| ----- | ------------------------------------------ | ---------------------------------- |
| **1** | Find dead files (no imports, not imported) | `layer1_dead_files.json`           |
| **2** | Find dead functions in each file           | `layer2_dead_functions.json`       |
| **3** | Build dependency graph & relationships     | `layer3_dependency_graph.json`     |
| **4** | Detect cycles & isolated modules           | `layer4_cycles_isolation.json`     |
| **5** | Analyze quality & find duplications        | `layer5_quality_duplications.json` |

## Stop the System

```bash
# Find process IDs
ps aux | grep enhanced

# Kill both processes
kill <ANALYZER_PID> <SERVER_PID>

# Or use the script output
kill 12345 12346  # Replace with actual PIDs from start output
```

## Troubleshooting

### "Permission denied" on start_enhanced_system.sh

```bash
chmod +x /Users/dev/Documents/GitHub/atlas4/codemap-system/start_enhanced_system.sh
bash start_enhanced_system.sh
```

### Reports not updating

```bash
# Check if analyzer is running
ps aux | grep mcp_enhanced_analyzer

# Check logs for errors
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/enhanced_analyzer.log

# Manually run one cycle
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 mcp_enhanced_analyzer.py
```

### MCP Server not responding

```bash
# Check if server is running
ps aux | grep mcp_enhanced_server

# Restart it
pkill -f mcp_enhanced_server
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 mcp_enhanced_server.py &
```

## Next Steps

1. ✅ Start the system
2. ✅ Wait for first cycle to complete (~30-60 seconds)
3. ✅ Review `layer1_dead_files.json` for candidates to archive
4. ✅ Check `layer2_dead_functions.json` for functions to remove
5. ✅ Use `layer3_dependency_graph.json` to understand architecture
6. ✅ Review `layer4_cycles_isolation.json` for architectural issues
7. ✅ Plan refactoring based on findings

## Full Documentation

See `ENHANCED_SYSTEM.md` for complete documentation.

---

**Status**: Ready to use  
**Version**: 2.0 (Enhanced Multi-Layer)  
**Last Updated**: 2025-11-19
