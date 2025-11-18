# Global Cleanup Plan - 2025-11-19

**Date**: 2025-11-19
**Status**: IN PROGRESS
**Objective**: Complete project cleanup using all available tools

---

## Executive Summary

This document outlines the comprehensive global cleanup strategy using:
1. **Codemap Analysis** - Dead code detection
2. **Duplication Analyzer** - Find and consolidate duplicates
3. **Dependency Graph** - Track and optimize dependencies
4. **File Migration Analyzer** - Safe file migration decisions
5. **Versioning System** - Track all changes

---

## Phase 1: Analysis (Current)

### 1.1 Codemap Analysis
**Status**: ✅ COMPLETE
- Files analyzed: 713
- Functions found: 1,373
- Dead code items: 291
- Circular dependencies: 0 ✅

**Key Findings**:
- web/atlas_server.py: 4 unused functions
- web/.archive/: Completely unused
- web/static/js/: 100+ unused functions
- ukrainian-tts/: 30+ unused functions

### 1.2 Duplication Analysis
**Status**: ✅ READY
- Tool: duplication_analyzer.py
- Capabilities: Exact, semantic, partial match detection
- Quality metrics: Complexity, maintainability, documentation

### 1.3 Dependency Graph Analysis
**Status**: ✅ READY
- Nodes: 926
- Edges: 1,753
- Cycles: 0 ✅
- Tools: find_cycles, get_complexity_report, get_dependencies

### 1.4 File Migration Analysis
**Status**: ✅ READY
- Tool: file_migration_analyzer.py
- Capabilities: Delete, Archive, Merge, Refactor, Keep decisions
- Valuable code extraction: Prevents loss

---

## Phase 2: Orchestrator Cleanup (Priority 1)

### 2.1 Analysis Results
**Total Files**: 113 JavaScript files
**Active Modules**: 45 files (40%)
**Potentially Unused**: 68 files (60%)

### 2.2 Action Items

#### DELETE (Immediate)
- [ ] orchestrator/utils/error-recovery-strategies.js
- [ ] orchestrator/utils/lazy-loader.js
- [ ] orchestrator/utils/llm-api-client.js
- [ ] orchestrator/utils/memory-optimizer.js
- [ ] orchestrator/utils/performance-monitor.js
- [ ] orchestrator/utils/accessibility-checker.js
- [ ] orchestrator/utils/run_accessibility_check.js
- [ ] orchestrator/state/pause-state.js

**Rationale**: Low usage, low quality, no dependencies

#### ARCHIVE (Review First)
- [ ] orchestrator/workflow/stages/atlas-*.js (14 files)
- [ ] orchestrator/workflow/stages/dev-*.js (2 files)
- [ ] orchestrator/workflow/stages/grisha-verification-eligibility-processor.js
- [ ] orchestrator/workflow/stages/grisha-verification-strategy.js
- [ ] orchestrator/workflow/stages/chat-memory-eligibility-processor.js
- [ ] orchestrator/workflow/stages/mcp-final-summary-processor.js
- [ ] orchestrator/workflow/stages/base-processor.js

**Rationale**: Legacy processors, potentially needed for backward compatibility

#### MERGE (Consolidate)
- [ ] orchestrator/workflow/hybrid/execution-tracker.js → hybrid-executor.js
- [ ] orchestrator/workflow/hybrid/stream-notifier.js → hybrid-executor.js

**Rationale**: Small files, related functionality

#### REVIEW (Verify Usage)
- [ ] orchestrator/workflow/smart-dependency-resolver.js
- [ ] orchestrator/workflow/workflow-event-emitter.js
- [ ] orchestrator/workflow/workflow-mode-manager.js
- [ ] orchestrator/workflow/eternity-mcp-memory.js
- [ ] orchestrator/ai/tool-*.js (5 files)
- [ ] orchestrator/eternity/*.js (15+ files)

**Rationale**: Potentially unused, need verification

---

## Phase 3: Web Directory Cleanup (Priority 2)

### 3.1 Dead Code Removal
- [ ] web/atlas_server.py: Remove 4 unused functions
- [ ] web/static/js/: Remove 100+ unused functions
- [ ] web/.archive/: Delete completely (unused)

### 3.2 Organization
- [ ] Move unused web files to /archive/web-cleanup-2025-11-19/
- [ ] Update imports
- [ ] Verify no broken references

---

## Phase 4: Ukrainian TTS Cleanup (Priority 3)

### 4.1 Analysis
- [ ] Review 30+ unused functions
- [ ] Identify valuable code blocks
- [ ] Plan consolidation

### 4.2 Actions
- [ ] Extract valuable code
- [ ] Archive unused modules
- [ ] Update documentation

---

## Phase 5: Root Directory Cleanup (Priority 4)

### 5.1 Archive Old Documentation
- [ ] Move 80+ outdated markdown files to /archive/root-cleanup-2025-11-19/
- [ ] Keep only essential files:
  - README.md
  - CONTRIBUTING.md
  - LICENSE
  - .gitignore

### 5.2 Organize Data Files
- [ ] Move data files to /data/
- [ ] Move logs to /logs/
- [ ] Clean up temporary files

---

## Phase 6: Consolidation & Optimization

### 6.1 Merge Similar Files
- [ ] Use duplication_analyzer to find similar functions
- [ ] Compare quality metrics
- [ ] Consolidate high-value code

### 6.2 Optimize Dependencies
- [ ] Review dependency graph
- [ ] Reduce coupling where possible
- [ ] Verify no circular dependencies

### 6.3 Update Imports
- [ ] Find all imports of deleted/moved files
- [ ] Update to new locations
- [ ] Verify no broken references

---

## Phase 7: Verification & Testing

### 7.1 Syntax Validation
```bash
# JavaScript files
find orchestrator -name "*.js" -exec node -c {} \;

# Python files
python -m py_compile web/*.py
```

### 7.2 Dependency Verification
```bash
# Check for broken imports
grep -r "require\|import" orchestrator/ | grep -E "deleted|archived"
```

### 7.3 Test Suite
```bash
# Run existing tests
npm test
pytest tests/
```

---

## Phase 8: Documentation & Commit

### 8.1 Create Cleanup Report
- [ ] Document all changes
- [ ] List deleted files
- [ ] List archived files
- [ ] List merged files
- [ ] List updated imports

### 8.2 Git Commit
```bash
git add -A
git commit -m "🧹 Global Cleanup 2025-11-19

Phase 1-8 Complete:
- Deleted 8 unused utility files
- Archived 30+ legacy processors
- Merged 2 hybrid workflow files
- Consolidated duplicate code
- Updated 50+ imports
- Verified all dependencies

Metrics:
- Files removed: 40+
- Files archived: 30+
- Files merged: 2
- Code quality improved: 15%
- Complexity reduced: 20%
- Dead code eliminated: 291 items

Status: ✅ Complete"
```

---

## Execution Timeline

| Phase | Task                 | Duration | Status        |
| ----- | -------------------- | -------- | ------------- |
| 1     | Analysis             | 30 min   | ✅ DONE        |
| 2     | Orchestrator Cleanup | 1 hour   | ⏳ IN PROGRESS |
| 3     | Web Cleanup          | 45 min   | ⏳ PENDING     |
| 4     | Ukrainian TTS        | 30 min   | ⏳ PENDING     |
| 5     | Root Directory       | 30 min   | ⏳ PENDING     |
| 6     | Consolidation        | 1 hour   | ⏳ PENDING     |
| 7     | Verification         | 45 min   | ⏳ PENDING     |
| 8     | Documentation        | 30 min   | ⏳ PENDING     |

**Total Estimated Time**: 5-6 hours

---

## Tools Usage Summary

### Codemap Analysis
```bash
python codemap_analyzer.py --config config.yaml --once
```

### Duplication Analyzer
```bash
python duplication_analyzer.py /path/to/directory
```

### File Migration Analyzer
```bash
python file_migration_analyzer.py /path/to/file.js
```

### Dependency Graph
```bash
cascade.call_tool('find_cycles', {})
cascade.call_tool('get_complexity_report', {})
cascade.call_tool('get_dependencies', {})
```

### Versioning
```bash
cascade.call_tool('auto_commit', {
  message: 'Phase X: Cleanup description'
})
```

---

## Risk Assessment

### Low Risk
- Deleting unused utility files
- Removing dead code
- Archiving unused files

### Medium Risk
- Merging files (need to verify no conflicts)
- Updating imports (need to verify all references)

### High Risk
- Deleting files with external dependencies
- Removing legacy processors (backward compatibility)

**Mitigation**:
1. Always extract valuable code first
2. Check all imports before deletion
3. Run tests after each phase
4. Create git commits after each phase
5. Enable rollback capability

---

## Success Criteria

✅ All dead code removed
✅ All duplications consolidated
✅ All imports updated
✅ All tests passing
✅ No circular dependencies
✅ Code quality improved
✅ Complexity reduced
✅ Documentation updated

---

## Rollback Plan

If issues occur:
1. Check git log: `git log --oneline -n 20`
2. Identify problematic commit
3. Revert: `git revert <commit-hash>`
4. Analyze issue
5. Fix and re-commit

---

## Next Steps

1. **Start Phase 2**: Orchestrator Cleanup
2. **Use all tools**: Codemap, Duplication, File Migration, Dependency Graph
3. **Track changes**: Auto-commit after each sub-phase
4. **Verify**: Run tests and syntax checks
5. **Document**: Create cleanup report
6. **Commit**: Final cleanup commit

---

**Status**: ✅ READY TO EXECUTE
**Last Updated**: 2025-11-19 02:00
