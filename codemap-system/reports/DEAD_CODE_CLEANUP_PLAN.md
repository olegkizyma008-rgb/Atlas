# 🧹 Dead Code Cleanup Plan

**Priority**: HIGH  
**Estimated Impact**: 30-40% reduction in dead code  
**Timeline**: 2-3 weeks (phased approach)

---

## Phase 1: Archive Cleanup (Week 1)

### Action Items

#### 1.1 Remove Incomplete Refactoring Branches
**Location**: `/web/.archive/refactoring-2025-10-21/`

**Files to Review**:
- `unused-voice-control/` - Contains deprecated voice control implementation
- `di-state-architecture/` - Incomplete dependency injection refactoring
- `app-modules-unused/` - Unused app module architecture

**Decision Matrix**:
```
IF branch is:
  ✅ Merged to main     → Delete from archive
  ✅ Documented in PR   → Keep with reference link
  ❌ Incomplete/broken  → Delete (in git history)
  ❓ Uncertain          → Tag for review + keep temporarily
```

**Estimated Removal**: 500+ unused functions

---

## Phase 2: Python Server Cleanup (Week 1-2)

### Action Items

#### 2.1 Audit `web/atlas_server.py`

**Unused Functions**:
```python
# Line 43
def serve_config():
    # Status: UNUSED - Check if API endpoint is called
    # Action: Remove if not used by frontend

# Line 58
def health():
    # Status: UNUSED - Check if health check endpoint exists
    # Action: Remove or consolidate with other health checks

# Line 68
def get_tts_config():
    # Status: UNUSED - Check if TTS is still active feature
    # Action: Remove if TTS feature is deprecated

# Line 78
def play_tts():
    # Status: UNUSED - Check if TTS playback is implemented
    # Action: Remove if TTS feature is deprecated
```

**Verification Steps**:
1. Search for function calls in codebase
2. Check API documentation
3. Review git history for removal context
4. Verify no external services depend on these endpoints

**Estimated Removal**: 4 functions

---

## Phase 3: JavaScript Utilities Cleanup (Week 2)

### Action Items

#### 3.1 Voice Control Services
**File**: `web/static/js/voice-control/services/microphone-button-service.js`

**Unused Function** (line 823):
```javascript
function isShortcut() {
    // Status: UNUSED - Likely replaced by newer shortcut detection
    // Action: Remove and consolidate with active shortcut handler
}
```

#### 3.2 Voice Activity Detection
**File**: `web/static/js/voice-control/services/microphone/simple-vad.js`

**Unused Function** (line 151):
```javascript
function normalizedValue() {
    // Status: UNUSED - Likely replaced by normalization in VAD algorithm
    // Action: Remove and use main normalization function
}
```

#### 3.3 Logging Infrastructure
**File**: `web/static/js/core/logger.js`

**Unused Function** (line 105):
```javascript
function logMessage() {
    // Status: UNUSED - Likely replaced by structured logging
    // Action: Remove and use main logger methods
}
```

**Estimated Removal**: 3+ functions

---

## Phase 4: UI Component Consolidation (Week 2-3)

### Action Items

#### 4.1 Duplicate `nextIndex` Functions

**Locations**:
- `web/static/js/components/ui/atlas-advanced-ui.js` (line 936)
- `web/static/js/components/ui/modules/theme-manager.js` (line 116)

**Consolidation Strategy**:
```javascript
// Create shared utility: web/static/js/utils/array-utils.js
export function getNextIndex(currentIndex, arrayLength, wrap = true) {
    if (wrap) {
        return (currentIndex + 1) % arrayLength;
    }
    return Math.min(currentIndex + 1, arrayLength - 1);
}

// Replace in both files with import
import { getNextIndex } from '../utils/array-utils.js';
```

#### 4.2 Duplicate `wrappedEmit` Functions

**Locations**:
- `web/.archive/refactoring-2025-10-21/app-modules-unused/modules/event-coordinator.js` (line 307)
- `web/static/js/app-refactored.js` (line 772)

**Action**: 
- Archive version: Delete (part of Phase 1)
- Active version: Keep and document as primary implementation

**Estimated Removal**: 2+ duplicate implementations

---

## Phase 5: Private Methods Audit (Week 3)

### Action Items

#### 5.1 Python Private Methods

**Files to Review**:
- `ukrainian_accentor/__init__.py` - `_shift_plus_markers` (line 28)
- `ukrainian-tts/tts_server.py` - `__init__` (line 41)
- `ukrainian-tts/vocoder/synthesize_with_intonation.py` - `_repl` (line 51)

**Verification**:
1. Check if methods are called within class hierarchy
2. Verify inheritance doesn't require these methods
3. Check for dynamic method calls via reflection

#### 5.2 Third-Party Bindings

**Note**: Many unused methods in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` are likely:
- Auto-generated from C++ bindings
- Required for WASM interop
- Should NOT be removed

**Action**: Mark as "auto-generated" and skip in cleanup

---

## Implementation Checklist

### Pre-Cleanup
- [ ] Create backup branch: `backup/pre-cleanup-2025-11-20`
- [ ] Run full test suite
- [ ] Document current bundle sizes
- [ ] Create git tags for each phase

### Phase 1: Archive Cleanup
- [ ] Review each archive directory
- [ ] Create removal PR with justification
- [ ] Verify no references in active code
- [ ] Merge and tag: `cleanup/phase1-archive-complete`

### Phase 2: Python Server
- [ ] Audit each unused function
- [ ] Check API documentation
- [ ] Search for external dependencies
- [ ] Create removal PR
- [ ] Merge and tag: `cleanup/phase2-python-complete`

### Phase 3: JavaScript Utilities
- [ ] Audit each unused function
- [ ] Check for dynamic calls
- [ ] Create removal PR
- [ ] Merge and tag: `cleanup/phase3-js-utils-complete`

### Phase 4: UI Consolidation
- [ ] Create shared utility modules
- [ ] Update imports in all files
- [ ] Run UI tests
- [ ] Merge and tag: `cleanup/phase4-ui-consolidation-complete`

### Phase 5: Private Methods
- [ ] Audit each private method
- [ ] Verify inheritance chain
- [ ] Create removal PR
- [ ] Merge and tag: `cleanup/phase5-private-methods-complete`

### Post-Cleanup
- [ ] Run full test suite
- [ ] Measure bundle size reduction
- [ ] Update documentation
- [ ] Create cleanup summary report

---

## Expected Outcomes

### Code Metrics Improvement
| Metric          | Before | After   | Improvement |
| --------------- | ------ | ------- | ----------- |
| Dead Functions  | 69,527 | ~42,000 | -40%        |
| Dead Methods    | 11,634 | ~7,000  | -40%        |
| Total Dead Code | 81,161 | ~49,000 | -40%        |
| Bundle Size     | TBD    | -15-20% | Estimated   |
| Maintainability | ⚠️      | ✅       | Significant |

### Quality Improvements
- ✅ Reduced cognitive load for developers
- ✅ Faster build times
- ✅ Smaller bundle sizes
- ✅ Easier code navigation
- ✅ Improved IDE performance

---

## Risk Mitigation

### Risks & Mitigations

| Risk                         | Likelihood | Mitigation                   |
| ---------------------------- | ---------- | ---------------------------- |
| Remove function still in use | Medium     | Comprehensive search + tests |
| Break external API           | Low        | API documentation review     |
| Incomplete refactoring       | Medium     | Phase-by-phase approach      |
| Performance regression       | Low        | Benchmark before/after       |

### Testing Strategy
1. **Unit Tests**: Run existing test suite after each phase
2. **Integration Tests**: Test module interactions
3. **E2E Tests**: Test user workflows
4. **Performance Tests**: Measure bundle size and load time

---

## Success Criteria

- ✅ All phases completed on schedule
- ✅ Test suite passes 100%
- ✅ Bundle size reduced by 15-20%
- ✅ Zero regressions in functionality
- ✅ Code review approval for all PRs
- ✅ Documentation updated

---

## Tools & Commands

### Using MCP Tools for Verification

```bash
# Get detailed dead code summary
mcp_tool: get_dead_code_summary

# Analyze impact of removing specific function
mcp_tool: analyze_impact --function "serve_config" --file "web/atlas_server.py"

# Find all references to a function
mcp_tool: get_dependency_relationships --target "health"

# Generate refactoring plan
mcp_tool: generate_refactoring_plan --scope "dead-code-removal"
```

---

## Timeline

```
Week 1:
  Mon-Tue: Phase 1 (Archive Cleanup)
  Wed-Thu: Phase 2 (Python Server)
  Fri:     Testing & Review

Week 2:
  Mon-Tue: Phase 3 (JavaScript Utilities)
  Wed-Thu: Phase 4 (UI Consolidation)
  Fri:     Testing & Review

Week 3:
  Mon-Tue: Phase 5 (Private Methods)
  Wed-Thu: Final Testing
  Fri:     Documentation & Release
```

---

*Last Updated: 2025-11-20 03:43 UTC+02:00*  
*Status: Ready for Implementation*
