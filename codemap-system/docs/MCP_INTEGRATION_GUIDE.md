# 🤖 MCP Integration Guide - Automatic Windsurf Cascade Sync

## Overview

The MCP (Model Context Protocol) Server provides **real-time automatic integration** between CodeMap and Windsurf Cascade. After deployment, the system:

1. **Automatically analyzes** your project continuously
2. **Syncs with Cascade** in real-time
3. **Provides context** before each coding task
4. **Detects issues** automatically (dead code, cycles, complexity)
5. **Suggests refactoring** based on analysis

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Project                             │
│  (copied from /Users/dev/Documents/GitHub/codemap)          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─ deploy.sh (entry point)
                   │
                   ├─ codemap_analyzer.py (continuous analysis)
                   │   └─ Generates reports/ (JSON, MD, HTML)
                   │
                   └─ mcp_codemap_server.py (MCP Server)
                       ├─ Resources (static data)
                       │   ├─ codemap://analysis/summary
                       │   ├─ codemap://analysis/dead-code
                       │   ├─ codemap://analysis/cycles
                       │   ├─ codemap://analysis/complexity
                       │   ├─ codemap://analysis/full
                       │   ├─ codemap://project/structure
                       │   └─ codemap://project/dependencies
                       │
                       └─ Tools (callable functions)
                           ├─ analyze_file
                           ├─ find_dead_code_in_file
                           ├─ get_file_dependencies
                           ├─ find_dependent_files
                           ├─ get_complexity_report
                           ├─ find_cycles
                           ├─ get_refactoring_suggestions
                           └─ get_analysis_status
```

## How It Works

### 1. Deployment Phase

```bash
./deploy.sh
```

Steps:
1. ✅ Checks Python, pip, files
2. ✅ Installs dependencies
3. ✅ Runs first analysis
4. ✅ Generates reports
5. ✅ **Starts MCP Server** (background)
6. ✅ Starts watch mode (continuous analysis)

### 2. Continuous Analysis

The `codemap_analyzer.py` runs in watch mode:
- Monitors file changes every 5 seconds
- Updates reports automatically
- Detects dead code, cycles, complexity

### 3. MCP Server (Automatic Sync)

The `mcp_codemap_server.py` provides:
- **Resources**: Static data that Cascade can read
- **Tools**: Functions that Cascade can call

Cascade automatically:
- Reads latest analysis before each task
- Calls tools to get specific information
- Provides context about code quality

## Usage in Windsurf

### Automatic Context (Pre-Task)

Before you start any coding task, Cascade automatically:
1. Reads `codemap://analysis/summary`
2. Checks for dead code
3. Detects circular dependencies
4. Loads complexity metrics

**Result**: Cascade knows about code quality issues before you ask!

### Manual Tools in Chat

You can also explicitly ask Cascade:

```
@cascade analyze the dependencies of src/main.py
@cascade find dead code in this project
@cascade suggest refactoring for circular dependencies
@cascade check complexity metrics
```

Cascade will call the appropriate MCP tools and provide analysis.

### Workflows

Use the built-in workflows:

```
Ctrl+L → /update-codemap
Ctrl+L → /analyze-dead-code
Ctrl+L → /detect-cycles
Ctrl+L → /refactor-with-context
```

## Available Resources

### `codemap://analysis/summary`
Latest analysis summary with:
- Files analyzed
- Total functions
- Total imports
- Dependency graph metrics
- Dead code count
- Cycles count
- Complexity metrics

### `codemap://analysis/dead-code`
Detected dead code:
- Unused functions
- Unused private methods
- Unused imports
- Counts for each category

### `codemap://analysis/cycles`
Circular dependencies:
- List of cycles
- Total count
- Severity level

### `codemap://analysis/complexity`
Code complexity metrics:
- Average imports per file
- Average functions per file
- Max dependency depth
- Dependency graph stats

### `codemap://analysis/full`
Complete analysis data including all metrics and issues

### `codemap://project/structure`
Project structure information:
- Root directory
- Main directories
- Reports location

### `codemap://project/dependencies`
Dependency graph:
- File imports
- Dependency edges
- Total edges

## Available Tools

### `analyze_file(file_path)`
Analyze a specific file for dependencies and functions

**Example**:
```
@cascade analyze_file("src/main.py")
```

### `find_dead_code_in_file(file_path)`
Find dead code in a specific file

**Example**:
```
@cascade find_dead_code_in_file("src/utils.js")
```

### `get_file_dependencies(file_path)`
Get all dependencies of a file

**Example**:
```
@cascade get_file_dependencies("src/api.ts")
```

### `find_dependent_files(file_path)`
Find all files that depend on this file

**Example**:
```
@cascade find_dependent_files("src/config.py")
```

### `get_complexity_report(file_path="")`
Get complexity report (project-wide or for specific file)

**Example**:
```
@cascade get_complexity_report()
@cascade get_complexity_report("src/main.py")
```

### `find_cycles()`
Find circular dependencies

**Example**:
```
@cascade find_cycles()
```

### `get_refactoring_suggestions(file_path="")`
Get refactoring suggestions based on analysis

**Example**:
```
@cascade get_refactoring_suggestions()
@cascade get_refactoring_suggestions("src/module.ts")
```

### `get_analysis_status()`
Get current analysis status and last update time

**Example**:
```
@cascade get_analysis_status()
```

## Configuration

### `.windsurf/mcp_config.json`

Controls MCP server behavior:
- Server command and arguments
- Resource refresh intervals
- Pre-task analysis settings

### `config.yaml`

Controls analysis behavior:
- Include/exclude paths
- File extensions
- Dead code rules
- Dependency rules
- Watch interval

## Troubleshooting

### MCP Server Not Starting

Check if server is running:
```bash
ps aux | grep mcp_codemap_server
```

Check logs:
```bash
tail -f logs/mcp_server.log
```

Restart:
```bash
./deploy.sh
```

### Reports Not Updating

Check watch mode:
```bash
ps aux | grep codemap_analyzer
```

Check file permissions:
```bash
ls -la reports/
```

### Cascade Not Seeing Context

1. Verify MCP server is running
2. Check `.windsurf/mcp_config.json` exists
3. Restart Windsurf
4. Check Cascade console for errors

## Performance

- **Analysis**: ~5 seconds per cycle (configurable)
- **MCP Server**: Minimal overhead (~10MB memory)
- **Context Loading**: <100ms per resource
- **Tool Calls**: <500ms average

## Advanced Usage

### Custom Analysis Rules

Edit `config.yaml`:
```yaml
analysis:
  include_paths: ["src", "lib"]
  exclude_paths: ["node_modules", "dist"]
  file_extensions: [".py", ".js", ".ts"]

dead_code_rules:
  unused_functions: true
  unused_variables: true
  unused_imports: true
```

### Extend MCP Server

Add custom tools in `mcp_codemap_server.py`:

```python
def get_tools(self):
    tools = super().get_tools()
    tools.append({
        "name": "my_custom_tool",
        "description": "My custom analysis",
        "inputSchema": {...}
    })
    return tools

def call_tool(self, name, arguments):
    if name == "my_custom_tool":
        return self._my_custom_tool(arguments)
    return super().call_tool(name, arguments)
```

## Integration with Your Workflow

### Before Starting a Task

Cascade automatically provides:
1. **Code Quality Context**: Dead code, cycles, complexity
2. **File Dependencies**: What depends on what
3. **Refactoring Suggestions**: Based on analysis
4. **Architecture Overview**: Project structure

### During Development

Cascade can:
1. **Analyze Changes**: Impact of your modifications
2. **Suggest Improvements**: Based on metrics
3. **Detect Issues**: New dead code or cycles
4. **Recommend Refactoring**: Before you commit

### After Refactoring

Cascade can:
1. **Verify Quality**: Check if issues are resolved
2. **Measure Impact**: How metrics changed
3. **Suggest Next Steps**: What to improve next

## Next Steps

1. ✅ Deploy: `./deploy.sh`
2. ✅ Wait for first analysis (1-2 minutes)
3. ✅ Open Windsurf and start coding
4. ✅ Cascade will automatically provide context
5. ✅ Use `/update-codemap` workflow to refresh

## Support

For issues or questions:
1. Check logs in `reports/` directory
2. Verify MCP server is running
3. Check `.windsurf/mcp_config.json` configuration
4. Review `config.yaml` analysis settings

---

**Status**: 🟢 Active | **Version**: 1.0.0 | **Last Updated**: 2025-11-18
