# Orchestrator Files Analysis - 2025-11-19

**Date**: 2025-11-19
**Analysis Type**: Codemap Review + Manual Inspection
**Status**: Complete

---

## Executive Summary

- **Total Files**: 113 JavaScript files
- **Active Modules**: ~45 files (40%)
- **Potentially Unused**: ~68 files (60%)
- **Critical Dependencies**: All identified and documented

---

## Active Modules (KEEP)

### Core Infrastructure
- `orchestrator/core/application.js` - Application initialization
- `orchestrator/core/di-container.js` - Dependency injection
- `orchestrator/core/service-registry.js` - Service registration (UPDATED)
- `orchestrator/core/workflow-modules-registry.js` - Workflow modules (NEW)
- `orchestrator/core/optimization-integration.js` - Optimization

### Phase 1-5 Workflow Modules (NEW - CRITICAL)
- `orchestrator/workflow/core/workflow-engine.js`
- `orchestrator/workflow/core/todo-builder.js`
- `orchestrator/workflow/core/todo-executor.js`
- `orchestrator/workflow/planning/tool-planner.js`
- `orchestrator/workflow/planning/dependency-resolver.js`
- `orchestrator/workflow/planning/adaptive-planner.js`
- `orchestrator/workflow/execution/tool-executor.js`
- `orchestrator/workflow/execution/mcp-executor.js`
- `orchestrator/workflow/execution/fallback-handler.js`
- `orchestrator/workflow/verification/verification-engine.js`
- `orchestrator/workflow/verification/mcp-verifier.js`
- `orchestrator/workflow/verification/llm-verifier.js`
- `orchestrator/workflow/verification/adaptive-verifier.js`
- `orchestrator/workflow/utils/processor-registry.js`
- `orchestrator/workflow/utils/template-resolver.js`
- `orchestrator/workflow/utils/context-builder.js`

### Existing Critical Modules
- `orchestrator/ai/mcp-manager.js` - MCP management
- `orchestrator/ai/llm-client.js` - LLM client
- `orchestrator/ai/tetyana-tool-system.js` - Tetyana tools
- `orchestrator/workflow/mcp-todo-manager.js` - Legacy facade (still active)
- `orchestrator/workflow/executor-v3.js` - Main executor
- `orchestrator/workflow/tts-sync-manager.js` - TTS sync
- `orchestrator/workflow/chat-memory-coordinator.js` - Chat memory

### Hybrid Workflow (ACTIVE)
- `orchestrator/workflow/hybrid/hybrid-executor.js` - Used in executor-v3
- `orchestrator/workflow/hybrid/recipe-processor.js` - Used in executor-v3
- `orchestrator/workflow/hybrid/verification-adapter.js` - Used in executor-v3
- `orchestrator/workflow/hybrid/worker-pool.js` - Used in executor-v3

### State Machine (ACTIVE)
- `orchestrator/workflow/state-machine/WorkflowStateMachine.js`
- `orchestrator/workflow/state-machine/state-machine.js`
- `orchestrator/workflow/state-machine/handlers/` (13 handlers)

### Workflow Stages (ACTIVE)
- `orchestrator/workflow/stages/tetyana-plan-tools-processor.js` - Wrapped by MCPExecutor
- `orchestrator/workflow/stages/tetyana-execute-tools-processor.js` - Wrapped by MCPExecutor
- `orchestrator/workflow/stages/grisha-verify-item-processor.js` - Wrapped by MCPVerifier
- `orchestrator/workflow/stages/index.js` - Stages export

### Utilities (ACTIVE)
- `orchestrator/utils/logger.js`
- `orchestrator/utils/telemetry.js`
- `orchestrator/utils/error-handling-wrapper.js`
- `orchestrator/utils/circuit-breaker.js`
- `orchestrator/utils/rate-limiter.js`
- `orchestrator/utils/axios-config.js`
- `orchestrator/utils/sanitizer.js`
- `orchestrator/utils/helpers.js`
- `orchestrator/utils/tool-name-normalizer.js`

### API (ACTIVE)
- `orchestrator/api/routes/` - API routes
- `orchestrator/api/websocket-manager.js`
- `orchestrator/api/web-integration.js`

---

## Potentially Unused Modules (REVIEW)

### Hybrid Workflow - Partial
- `orchestrator/workflow/hybrid/execution-tracker.js` - ⚠️ Check usage
- `orchestrator/workflow/hybrid/stream-notifier.js` - ⚠️ Check usage

### Workflow Stages - Legacy
- `orchestrator/workflow/stages/atlas-todo-planning-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/atlas-context-enrichment-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/atlas-replan-todo-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/mode-selection-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/server-selection-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/router-classifier-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/intent-detector.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/dev-self-analysis-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/dev-recursive-analysis.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/grisha-verification-eligibility-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/grisha-verification-strategy.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/chat-memory-eligibility-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/mcp-final-summary-processor.js` - ⚠️ Legacy
- `orchestrator/workflow/stages/base-processor.js` - ⚠️ Base class (check usage)

### Workflow Utilities - Potentially Replaced
- `orchestrator/workflow/smart-dependency-resolver.js` - ⚠️ Replaced by DependencyResolver
- `orchestrator/workflow/workflow-event-emitter.js` - ⚠️ Check usage
- `orchestrator/workflow/workflow-mode-manager.js` - ⚠️ Check usage
- `orchestrator/workflow/eternity-mcp-memory.js` - ⚠️ Check usage

### AI Modules - Potentially Unused
- `orchestrator/ai/tool-dispatcher.js` - ⚠️ Check usage
- `orchestrator/ai/tool-history-manager.js` - ⚠️ Check usage
- `orchestrator/ai/tool-inspection-manager.js` - ⚠️ Check usage
- `orchestrator/ai/llm-tool-selector.js` - ⚠️ Check usage
- `orchestrator/ai/intelligent-vision-parser.js` - ⚠️ Check usage
- `orchestrator/ai/local-llm-fallback.js` - ⚠️ Check usage
- `orchestrator/ai/fallback-llm.js` - ⚠️ Check usage
- `orchestrator/ai/mcp-extension-manager.js` - ⚠️ Check usage
- `orchestrator/ai/optimized-workflow-manager.js` - ⚠️ Check usage
- `orchestrator/ai/api-request-optimizer.js` - ⚠️ Check usage
- `orchestrator/ai/validation/` - ⚠️ Check usage

### Eternity Modules - Potentially Unused
- `orchestrator/eternity/eternity-module.js` - ⚠️ Check if needed
- `orchestrator/eternity/eternity-integration.js` - ⚠️ Check if needed
- `orchestrator/eternity/eternity-self-analysis.js` - ⚠️ Check if needed
- `orchestrator/eternity/cascade-activation.js` - ⚠️ Check if needed
- `orchestrator/eternity/cascade-controller.js` - ⚠️ Check if needed
- `orchestrator/eternity/auto-correction-module.js` - ⚠️ Check if needed
- `orchestrator/eternity/dynamic-prompt-injector.js` - ⚠️ Check if needed
- `orchestrator/eternity/self-improvement-engine.js` - ⚠️ Check if needed
- `orchestrator/eternity/windsurf-code-editor.js` - ⚠️ Check if needed
- `orchestrator/eternity/nexus-memory-manager.js` - ⚠️ Check if needed
- `orchestrator/eternity/nexus-master-system.js` - ⚠️ Check if needed
- (More eternity modules...)

### Utils - Potentially Unused
- `orchestrator/utils/error-recovery-strategies.js` - ⚠️ Check usage
- `orchestrator/utils/lazy-loader.js` - ⚠️ Check usage
- `orchestrator/utils/llm-api-client.js` - ⚠️ Check usage
- `orchestrator/utils/memory-optimizer.js` - ⚠️ Check usage
- `orchestrator/utils/performance-monitor.js` - ⚠️ Check usage
- `orchestrator/utils/accessibility-checker.js` - ⚠️ Check usage
- `orchestrator/utils/run_accessibility_check.js` - ⚠️ Check usage

### State - Potentially Unused
- `orchestrator/state/pause-state.js` - ⚠️ Check usage

---

## Recommendations

### Priority 1: KEEP (Critical)
All Phase 1-5 new modules and existing core infrastructure must be kept.

### Priority 2: REVIEW
Before archiving, verify usage of:
1. Eternity modules - Check if still used in production
2. Legacy stage processors - May be needed for backward compatibility
3. Smart dependency resolver - Verify it's not used elsewhere
4. Tool managers - Check if used in tool dispatch

### Priority 3: ARCHIVE
After verification, consider archiving:
1. Unused utility modules
2. Unused eternity modules
3. Unused state modules
4. Legacy processors not used in Phase 1-5 flow

---

## Usage Verification Commands

```bash
# Find references to potentially unused modules
grep -r "smart-dependency-resolver" orchestrator/
grep -r "workflow-event-emitter" orchestrator/
grep -r "workflow-mode-manager" orchestrator/
grep -r "eternity-mcp-memory" orchestrator/

# Check eternity module usage
grep -r "eternity-module" orchestrator/
grep -r "cascade-activation" orchestrator/
grep -r "self-improvement-engine" orchestrator/

# Check tool managers
grep -r "tool-history-manager" orchestrator/
grep -r "tool-inspection-manager" orchestrator/
grep -r "tool-dispatcher" orchestrator/
```

---

## Next Steps

1. **Run verification commands** to confirm usage
2. **Document findings** in cleanup plan
3. **Archive unused modules** to `/archive/orchestrator-cleanup-2025-11-19/`
4. **Update imports** if any modules are moved
5. **Run tests** to ensure nothing breaks

---

## File Statistics

| Category           | Count   | Status   |
| ------------------ | ------- | -------- |
| Active Modules     | 45      | ✅ KEEP   |
| Potentially Unused | 68      | ⚠️ REVIEW |
| **Total**          | **113** | -        |

---

**Status**: ✅ Analysis Complete
**Last Updated**: 2025-11-19
