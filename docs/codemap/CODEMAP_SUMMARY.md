# 📊 Code Analysis Report
Generated: 2025-11-19T00:40:42.092032

## Project Overview
- **Project**: My Project
- **Files Analyzed**: 693
- **Total Functions**: 1369
- **Total Imports**: 1720

## Dependency Graph
- **Nodes**: 887
- **Edges**: 1720
- **Circular Dependencies**: 0

## Complexity Metrics
- **Avg Imports/File**: 3.68
- **Avg Functions/File**: 4.44
- **Max Dependency Depth**: 0

## 🔴 Dead Code Detected

### Unused Functions (17181)
- `serve_config` in `web/atlas_server.py` (line 43)
- `health` in `web/atlas_server.py` (line 58)
- `get_tts_config` in `web/atlas_server.py` (line 68)
- `play_tts` in `web/atlas_server.py` (line 78)
- `wrappedHandler` in `web/.archive/refactoring-2025-10-21/unused-voice-control/event-bus.js` (line 76)
- `melStep` in `web/.archive/refactoring-2025-10-21/unused-voice-control/core/adaptive-vad.js` (line 207)
- `jitterValue` in `web/.archive/refactoring-2025-10-21/unused-voice-control/core/circuit-breaker-system.js` (line 557)
- `loggingMiddleware` in `web/.archive/refactoring-2025-10-21/di-state-architecture/state-store.js` (line 335)
- `devToolsMiddleware` in `web/.archive/refactoring-2025-10-21/di-state-architecture/state-store.js` (line 351)
- `wrappedEmit` in `web/.archive/refactoring-2025-10-21/app-modules-unused/modules/event-coordinator.js` (line 307)
- `wrappedEmit` in `web/static/js/app-refactored.js` (line 772)
- `isShortcut` in `web/static/js/voice-control/services/microphone-button-service.js` (line 823)
- `normalizedValue` in `web/static/js/voice-control/services/microphone/simple-vad.js` (line 151)
- `logMessage` in `web/static/js/core/logger.js` (line 105)
- `later` in `web/static/js/components/index.js` (line 158)
- `nextIndex` in `web/static/js/components/ui/atlas-advanced-ui.js` (line 936)
- `nextIndex` in `web/static/js/components/ui/modules/theme-manager.js` (line 116)
- `checkLook` in `web/static/js/components/model3d/atlas-living-behavior-enhanced.js` (line 60)
- `checkIdle` in `web/static/js/components/model3d/atlas-living-behavior-enhanced.js` (line 204)
- `centerX` in `web/static/js/components/model3d/atlas-glb-living-system.js` (line 297)
- ... and 17161 more

### Unused Private Methods (2898)
- `_shift_plus_markers` in `ukrainian_accentor/__init__.py` (line 28)
- `__init__` in `ukrainian-tts/tts_server.py` (line 41)
- `_repl` in `ukrainian-tts/vocoder/synthesize_with_intonation.py` (line 51)
- `__init__` in `ukrainian-tts/ukrainian_tts/tts.py` (line 56)
- `__init__` in `archive/legacy-config-2025-10-20/recovery_bridge.py` (line 30)
- `__init__` in `third_party/whisper.cpp.upstream/models/convert-whisper-to-coreml.py` (line 206)
- `__init__` in `third_party/whisper.cpp.upstream/examples/server.py` (line 16)
- `__call__` in `third_party/whisper.cpp.upstream/scripts/bench.py` (line 12)
- `___cxa_throw` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_bigint` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_bool` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_emval` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_float` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_function` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_integer` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_memory_view` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_std_string` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_std_wstring` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__embind_register_void` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- `__emscripten_get_now_is_monotonic` in `third_party/whisper.cpp.upstream/bindings/javascript/whisper.js` (line 8)
- ... and 2878 more

## 🔄 Circular Dependencies (0)

---
*This report is automatically updated by Codemap Analyzer*
