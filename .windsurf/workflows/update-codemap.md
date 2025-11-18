---
description: Workflow to update codemap analysis and generate reports
---

# Update Codemap Analysis

This workflow updates the codemap analysis and generates comprehensive reports about code quality, dead code, and dependencies.

## Overview

The codemap system analyzes your project to provide:
- Code quality metrics
- Dead code detection
- Dependency analysis
- Circular dependency detection
- Complexity metrics

## Prerequisites

- Python 3.8+
- `codemap-system/` directory exists
- `codemap-system/config.yaml` configured

## Workflow Steps

### 1. Run Codemap Analysis
```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 codemap_analyzer.py --config config.yaml --once
```

This will:
- Analyze all configured directories
- Detect dead code
- Build dependency graph
- Calculate complexity metrics
- Generate reports

### 2. Copy Reports to Docs
```bash
# Copy to docs/codemap for archival
cp reports/CODEMAP_SUMMARY.md ../docs/codemap/
cp reports/codemap_analysis.json ../docs/codemap/
cp reports/codemap_analysis.html ../docs/codemap/
```

### 3. Review Results
```bash
# View summary
cat docs/codemap/CODEMAP_SUMMARY.md

# View detailed data (if needed)
# cat docs/codemap/codemap_analysis.json | jq '.'
```

## Output Files

### CODEMAP_SUMMARY.md
Quick overview with:
- Project statistics
- Dependency metrics
- Dead code summary
- Circular dependencies

**Location**: `codemap-system/reports/CODEMAP_SUMMARY.md`

### codemap_analysis.json
Detailed data with:
- All files analyzed
- All functions found
- All imports
- Dead code details
- Dependency graph

**Location**: `codemap-system/reports/codemap_analysis.json`

### codemap_analysis.html
Visual representation with:
- Dependency graph visualization
- Dead code highlighting
- Metrics charts

**Location**: `codemap-system/reports/codemap_analysis.html`

## Interpreting Results

### Dead Code Section
```
Unused Functions: 249
Unused Private Methods: 42
Unused Imports: Many
```

**Action**: Review and delete unused code

### Circular Dependencies
```
Circular Dependencies: 0 ✅
```

**Good**: No circular dependencies detected

### Complexity Metrics
```
Avg Imports/File: 3.68
Avg Functions/File: 4.44
Max Dependency Depth: 0
```

**Interpretation**:
- Low values = Good
- High values = May need refactoring

## Common Issues

### Issue: "No files analyzed"
**Solution**: Check `config.yaml` include_paths

### Issue: "MCP server not found"
**Solution**: Ensure MCP servers are running

### Issue: "Permission denied"
**Solution**: Check file permissions in project

## Tracking Progress

After each refactoring phase:
1. Run codemap analysis
2. Compare with previous results
3. Track dead code reduction
4. Verify no new circular dependencies

## Integration with Cascade

The codemap system integrates with Cascade through:
1. MCP server in `.windsurf/workspace.code-workspace`
2. Pre-task hook in `cascade_pre_task_hook.py`
3. Context injection before each task

## Advanced Usage

### Watch Mode (Continuous Analysis)
```bash
cd codemap-system
python3 codemap_analyzer.py --config config.yaml --watch
```

This continuously monitors for changes and updates reports.

### Custom Configuration
Edit `codemap-system/config.yaml` to:
- Add/remove directories to analyze
- Change file extensions
- Adjust complexity thresholds
- Modify dead code rules

## Next Steps

1. Review the generated reports
2. Identify dead code to remove
3. Plan refactoring phases
4. Execute improvements
5. Re-run analysis to verify

## References

- Analysis results: `/docs/codemap/`
- Configuration: `codemap-system/config.yaml`
- Analyzer: `codemap-system/codemap_analyzer.py`
- Organization plan: `/CODEMAP_ORGANIZATION_ANALYSIS.md`
- Workflow plan: `/WORKFLOW_REFACTORING_PLAN.md`
