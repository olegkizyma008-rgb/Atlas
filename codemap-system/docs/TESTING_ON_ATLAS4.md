# 🧪 Testing CodeMap on atlas4 Project

## Quick Start

### Step 1: Copy CodeMap to atlas4

```bash
# From your codemap directory
cp -r /Users/dev/Documents/GitHub/codemap /Users/dev/Documents/GitHub/atlas4/codemap-system

# Or if you want to replace existing
rm -rf /Users/dev/Documents/GitHub/atlas4/codemap-system
cp -r /Users/dev/Documents/GitHub/codemap /Users/dev/Documents/GitHub/atlas4/codemap-system
```

### Step 2: Deploy

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
./deploy.sh
```

This will:
1. ✅ Check Python and dependencies
2. ✅ Install required packages
3. ✅ Run first analysis
4. ✅ Start MCP server
5. ✅ Start watch mode

### Step 3: Open atlas4 in Windsurf

```bash
code /Users/dev/Documents/GitHub/atlas4
```

### Step 4: Verify Integration

In Windsurf, open Cascade and ask:

```
@cascade get_analysis_status()
```

You should see:
```json
{
  "analysis_available": true,
  "last_update": "2025-11-18T21:30:00",
  "reports_directory": "/Users/dev/Documents/GitHub/atlas4/codemap-system/reports"
}
```

## Testing Scenarios

### Scenario 1: Automatic Context Loading

**What to test**: Cascade automatically loads CodeMap context before tasks

**Steps**:
1. Open Cascade
2. Start a new task: "Refactor the authentication module"
3. **Expected**: Cascade mentions code quality issues, dead code, etc.

**Verification**:
- [ ] Cascade mentions dead code count
- [ ] Cascade mentions circular dependencies
- [ ] Cascade mentions complexity metrics
- [ ] Context appears before user's task

### Scenario 2: Dead Code Detection

**What to test**: Finding and suggesting removal of unused code

**Steps**:
1. Ask Cascade: `@cascade find_dead_code_in_file("src/main.py")`
2. Review the results
3. Ask: `@cascade get_refactoring_suggestions("src/main.py")`

**Verification**:
- [ ] Dead code is correctly identified
- [ ] Suggestions are actionable
- [ ] Line numbers are accurate

### Scenario 3: Circular Dependencies

**What to test**: Detecting and suggesting fixes for circular dependencies

**Steps**:
1. Ask: `@cascade find_cycles()`
2. Review cycles
3. Ask: `@cascade get_refactoring_suggestions()`

**Verification**:
- [ ] Cycles are correctly identified
- [ ] Suggestions mention extracting common code
- [ ] Severity is marked as "high"

### Scenario 4: File Dependencies

**What to test**: Understanding file relationships

**Steps**:
1. Pick a file: `src/api.ts`
2. Ask: `@cascade get_file_dependencies("src/api.ts")`
3. Ask: `@cascade find_dependent_files("src/api.ts")`

**Verification**:
- [ ] Dependencies are listed
- [ ] Dependent files are found
- [ ] Relationships make sense

### Scenario 5: Complexity Analysis

**What to test**: Measuring code complexity

**Steps**:
1. Ask: `@cascade get_complexity_report()`
2. Ask: `@cascade get_complexity_report("src/main.py")`

**Verification**:
- [ ] Project-wide metrics are provided
- [ ] File-specific metrics are accurate
- [ ] Recommendations are based on metrics

### Scenario 6: Workflow Integration

**What to test**: Using Windsurf workflows

**Steps**:
1. Press `Ctrl+L`
2. Type `/update-codemap`
3. Wait for completion
4. Check reports: `reports/CODEMAP_SUMMARY.md`

**Verification**:
- [ ] Workflow completes successfully
- [ ] Reports are updated
- [ ] Summary shows latest data

### Scenario 7: Continuous Monitoring

**What to test**: Watch mode updates reports automatically

**Steps**:
1. Modify a file in atlas4
2. Wait 5-10 seconds
3. Check: `@cascade get_analysis_status()`
4. Verify `last_update` timestamp changed

**Verification**:
- [ ] Reports update automatically
- [ ] Timestamp changes after file modification
- [ ] New analysis includes changes

### Scenario 8: MCP Server Stability

**What to test**: Server runs continuously without crashing

**Steps**:
1. Check process: `ps aux | grep mcp_codemap_server`
2. Make multiple tool calls
3. Wait 30 minutes
4. Check process again

**Verification**:
- [ ] Server process is running
- [ ] No crashes after multiple calls
- [ ] Memory usage is stable

## Verification Checklist

### Pre-Deployment
- [ ] `deploy.sh` is executable: `chmod +x deploy.sh`
- [ ] `config.yaml` exists and is valid
- [ ] `requirements.txt` has all dependencies
- [ ] `.windsurf/workflows/` directory exists

### Post-Deployment
- [ ] `reports/` directory created
- [ ] `reports/codemap_analysis.json` exists
- [ ] `reports/CODEMAP_SUMMARY.md` exists
- [ ] `reports/codemap_analysis.html` exists
- [ ] `.mcp_server.pid` file created

### MCP Server
- [ ] Process running: `ps aux | grep mcp_codemap_server`
- [ ] No errors in logs
- [ ] Responds to tool calls
- [ ] Resources accessible

### Cascade Integration
- [ ] Can call MCP tools
- [ ] Context loads automatically
- [ ] Workflows execute
- [ ] Reports update

## Troubleshooting

### Issue: deploy.sh fails

**Solution**:
```bash
# Check Python
python3 --version

# Check pip
pip3 --version

# Install dependencies manually
pip3 install -r requirements.txt

# Run manually
python3 codemap_analyzer.py --once
```

### Issue: MCP server not starting

**Solution**:
```bash
# Check if already running
ps aux | grep mcp_codemap_server

# Kill old process
pkill -f mcp_codemap_server

# Restart deploy
./deploy.sh
```

### Issue: Reports not updating

**Solution**:
```bash
# Check watch mode
ps aux | grep "codemap_analyzer.*watch"

# Check file permissions
ls -la reports/

# Manually run analysis
python3 codemap_analyzer.py --once
```

### Issue: Cascade can't see context

**Solution**:
1. Verify MCP server is running
2. Check `.windsurf/mcp_config.json` exists
3. Restart Windsurf
4. Check Cascade console for errors

## Performance Metrics

### Expected Performance

| Operation | Time | Notes |
|-----------|------|-------|
| First analysis | 1-2 min | Depends on project size |
| Subsequent analysis | 10-30 sec | Incremental |
| MCP tool call | <500ms | Cached data |
| Context loading | <100ms | Pre-loaded |
| Watch cycle | 5 sec | Configurable |

### Resource Usage

| Resource | Expected | Notes |
|----------|----------|-------|
| Memory (analyzer) | 50-100MB | Depends on project |
| Memory (MCP server) | 10-20MB | Minimal overhead |
| CPU (idle) | <1% | Minimal |
| CPU (analysis) | 20-50% | During analysis |
| Disk (reports) | 1-5MB | JSON + HTML + MD |

## Next Steps After Testing

### If All Tests Pass ✅

1. Document any findings
2. Update configuration if needed
3. Create custom workflows for atlas4
4. Integrate into CI/CD pipeline

### If Issues Found ❌

1. Document the issue
2. Check logs: `reports/` directory
3. Review `config.yaml` settings
4. Adjust `codemap_analyzer.py` if needed
5. Re-test

## Advanced Testing

### Load Testing

```bash
# Run multiple analyses
for i in {1..10}; do
  python3 codemap_analyzer.py --once
done
```

### Stress Testing

```bash
# Modify files while analyzing
while true; do
  touch src/test.py
  sleep 1
done

# In another terminal
python3 codemap_analyzer.py --watch
```

### Integration Testing

```bash
# Test all tools
python3 mcp_codemap_server.py --project . --mode http &
# Then make HTTP requests to test endpoints
```

## Reporting Results

When testing is complete, create a report:

```markdown
# CodeMap Testing Report - atlas4

## Date: 2025-11-18
## Tester: [Your Name]

### Summary
- Total tests: 8
- Passed: 8
- Failed: 0
- Issues: 0

### Detailed Results
[Include results from each scenario]

### Performance
[Include performance metrics]

### Recommendations
[Any improvements or changes needed]
```

---

**Status**: Ready for Testing | **Version**: 1.0.0
