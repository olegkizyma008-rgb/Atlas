---
description: Automatically sync codemap with Cascade on startup
auto_execution_mode: 3
---

# Sync CodeMap on Startup

This workflow ensures that the CodeMap is automatically synchronized with Cascade when you start working on the project.

## Setup Steps

1. **MCP Server Configuration**
   - The MCP server is configured in `.windsurf/workspace.code-workspace`
   - It runs `codemap-system/mcp_codemap_server.py` automatically

2. **Initial CodeMap Generation**
   - Run the following command to generate the initial codemap:
   ```bash
   cd /Users/dev/Documents/GitHub/atlas4/codemap-system
   python3 codemap_analyzer.py
   ```

3. **Automatic Updates**
   - The codemap will be updated automatically when you run `/update-codemap` command
   - Or use the pre-task hook to inject context before each task:
   ```bash
   python3 cascade_pre_task_hook.py --mode context
   ```

4. **Verify Setup**
   - Check that `codemap-system/reports/codemap_analysis.json` exists
   - This file contains the latest analysis data

## How It Works

- When Cascade starts, it loads the MCP codemap server
- The server provides code analysis context automatically
- Before each task, the `cascade_pre_task_hook.py` can inject CodeMap context into your prompts
- This ensures Cascade has up-to-date information about code quality, dead code, and dependencies

## Manual Sync

To manually update the codemap at any time:
```bash
/update-codemap
```

This will regenerate the analysis and update all reports.