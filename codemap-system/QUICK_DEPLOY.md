# ⚡ Quick Deploy Guide

## 30-Second Setup

```bash
# 1. Copy to your project
cp -r /Users/dev/Documents/GitHub/codemap /path/to/your/project/codemap-system

# 2. Deploy
cd /path/to/your/project/codemap-system
./deploy.sh

# 3. Done! 🎉
```

That's it! The system will:
- ✅ Analyze your project
- ✅ Generate reports
- ✅ Start MCP server
- ✅ Begin continuous monitoring

## What Happens Next

### In Terminal
```
🚀 CODEMAP ANALYZER - РОЗГОРТАННЯ
📋 КРОК 1: ПЕРЕВІРКИ
✅ Python3: 3.11.0
✅ pip3: 23.0
✅ All required files present
✅ Workflows ready (4 files)

📦 КРОК 2: ВСТАНОВЛЕННЯ
✅ Dependencies installed
✅ All dependencies available

⚙️ КРОК 3: НАЛАШТУВАННЯ
✅ Reports directory ready
✅ Workflows updated to version 1.0.0
✅ Windsurf configured
✅ Pre-commit hook installed

🔍 КРОК 4: ПЕРШИЙ АНАЛІЗ
🔍 Starting project analysis...
📁 Found 156 files to analyze
✅ First analysis complete

🤖 КРОК 5: MCP СЕРВЕР
✅ MCP server started (PID: 12345)

🎉 РОЗГОРТАННЯ ЗАВЕРШЕНО!
🔄 Watching for changes...
```

### In Windsurf

Open your project in Windsurf:
```bash
code /path/to/your/project
```

Cascade will automatically:
1. Load CodeMap context
2. Show code quality issues
3. Suggest refactoring
4. Provide complexity metrics

## What You Get

### 📊 Reports (in `reports/` directory)

- **CODEMAP_SUMMARY.md** - Human-readable summary
- **codemap_analysis.json** - Complete data (for tools)
- **codemap_analysis.html** - Visual report

### 🤖 MCP Server

Provides real-time access to:
- Dead code detection
- Circular dependencies
- Complexity metrics
- File dependencies
- Refactoring suggestions

### 🪟 Windsurf Workflows

Use in Cascade:
```
/update-codemap       - Refresh analysis
/analyze-dead-code    - Find unused code
/detect-cycles        - Find circular deps
/refactor-with-context - Full refactoring
```

## Common Commands

### Update Analysis
```bash
python3 codemap_analyzer.py --once
```

### Watch Mode (Continuous)
```bash
python3 codemap_analyzer.py --watch
```

### Test MCP Server (HTTP)
```bash
python3 mcp_codemap_server.py --project . --mode http --port 8000
# Then visit http://localhost:8000/resources
```

### Get Pre-Task Context
```bash
python3 cascade_pre_task_hook.py --project . --mode context
```

## Configuration

Edit `config.yaml` to customize:

```yaml
analysis:
  include_paths: ["src", "lib", "app"]      # Paths to analyze
  exclude_paths: ["node_modules", "dist"]   # Paths to skip
  file_extensions: [".py", ".js", ".ts"]    # File types

output:
  watch_interval: 5                          # Seconds between analysis
  formats: ["json", "html", "markdown"]      # Report formats
```

## Troubleshooting

### Python not found
```bash
# Install Python 3.8+
brew install python3

# Or download from python.org
```

### Permission denied
```bash
chmod +x deploy.sh
```

### Port already in use
```bash
# Change port in mcp_config.json
# Or kill existing process
pkill -f mcp_codemap_server
```

### Reports not updating
```bash
# Check watch mode is running
ps aux | grep codemap_analyzer

# Restart if needed
pkill -f codemap_analyzer
./deploy.sh
```

## Next Steps

1. ✅ Run `./deploy.sh`
2. ✅ Wait for first analysis (1-2 minutes)
3. ✅ Open project in Windsurf
4. ✅ Start coding - Cascade will provide context!
5. ✅ Use `/update-codemap` to refresh

## Files Created

```
your-project/
├── codemap-system/
│   ├── deploy.sh                    # Main deployment script
│   ├── codemap_analyzer.py          # Analysis engine
│   ├── mcp_codemap_server.py        # MCP server
│   ├── cascade_pre_task_hook.py     # Pre-task context
│   ├── config.yaml                  # Configuration
│   ├── requirements.txt             # Python dependencies
│   ├── .windsurf/
│   │   ├── settings.json            # Windsurf settings
│   │   ├── mcp_config.json          # MCP configuration
│   │   └── workflows/               # Windsurf workflows
│   └── reports/                     # Generated reports
│       ├── CODEMAP_SUMMARY.md
│       ├── codemap_analysis.json
│       └── codemap_analysis.html
```

## Performance

- **First analysis**: 1-2 minutes (depending on project size)
- **Subsequent analysis**: 10-30 seconds
- **MCP tool calls**: <500ms
- **Memory usage**: 50-100MB

## Support

For detailed information, see:
- `MCP_INTEGRATION_GUIDE.md` - Full MCP documentation
- `TESTING_ON_ATLAS4.md` - Testing procedures
- `config.yaml` - Configuration options

---

**Ready to deploy?** Run `./deploy.sh` now! 🚀
