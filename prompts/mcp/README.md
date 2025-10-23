# MCP Dynamic TODO Workflow Prompts

**Version:** 5.0.0  
**Date:** 2025-10-23  
**Status:** ENGLISH TRANSLATION COMPLETE ✅

## 🌐 ENGLISH TRANSLATION (2025-10-23)

**Major Update:** All MCP prompts have been translated to English for better LLM performance while preserving Ukrainian responses for user-facing content.

### Translation Strategy:
- **System instructions:** English (clearer for LLM comprehension)
- **User-facing output:** Ukrainian (reasoning, tts_phrase, success_criteria, etc.)
- **Metadata:** `language: 'english_prompts_ukrainian_responses'`

### Benefits:
- ✅ Better LLM understanding of complex technical instructions
- ✅ Reduced ambiguity in prompt requirements
- ✅ Maintained Ukrainian user experience
- ✅ Consistent formatting across all 17 prompt files
- ✅ Improved JSON schema compliance

---

## Active Prompts (Used by System)

### Stage 0-MCP: Mode Selection
**File:** `stage0_mode_selection.js`  
**Agent:** System  
**Purpose:** Determine chat vs task mode  
**Version:** 6.0.0  
**Language:** English prompts, Ukrainian reasoning

### Stage 0-MCP: Atlas Chat
**File:** `atlas_chat.js`  
**Agent:** Atlas  
**Purpose:** Direct conversational responses without task execution  
**Version:** 6.0.0  
**Language:** English prompts, Ukrainian responses

### Stage 1-MCP: Atlas Creates TODO
**File:** `atlas_todo_planning_optimized.js`  
**Agent:** Atlas  
**Purpose:** Analyze user request and create structured TODO list  
**Modes:** Standard (1-3 items) | Extended (4-10 items)  
**Version:** 5.0.0  
**Optimization:** Uses `{{AVAILABLE_TOOLS}}` placeholder (278 → 120 LOC)  
**Language:** English prompts, Ukrainian responses

### Stage 2.0-MCP: Server Selection
**File:** `stage2_0_server_selection.js`  
**Agent:** Tetyana  
**Purpose:** Select 1-2 most relevant MCP servers from 5 available  
**Version:** 6.0.0  
**Language:** English prompts

### Stage 2.1-MCP: Tetyana Plans Tools (Specialized)
**Files:**  
- `tetyana_plan_tools_playwright.js` - Web automation  
- `tetyana_plan_tools_filesystem.js` - File operations  
- `tetyana_plan_tools_applescript.js` - macOS GUI automation  
- `tetyana_plan_tools_shell.js` - Command-line operations  
- `tetyana_plan_tools_memory.js` - Knowledge storage  
**Agent:** Tetyana  
**Purpose:** Create specialized tool execution plans per MCP server  
**Version:** 2.0.0  
**Language:** English prompts, Ukrainian responses  
**Critical:** All use double underscore format (server__tool)

### Stage 2.1.5-MCP: Tetyana Screenshot and Adjust
**File:** `tetyana_screenshot_and_adjust.js`  
**Agent:** Tetyana  
**Purpose:** Capture screenshot and optionally adjust plan  
**Version:** 5.0.0  
**Language:** English prompts, Ukrainian responses

### Stage 2.3-routing: Grisha Verification Eligibility
**File:** `grisha_verification_eligibility.js`  
**Agent:** Grisha  
**Purpose:** Determine verification method (visual vs data-driven)  
**Version:** 2.0.0  
**Language:** English prompts, Ukrainian responses

### Stage 2.3-MCP: Grisha Visual Verification
**File:** `grisha_visual_verify_item.js`  
**Agent:** Grisha  
**Purpose:** AI vision-based verification using screenshots  
**Version:** 6.0.0  
**Language:** English prompts, Ukrainian responses  
**Method:** GPT-4 Vision analysis

### Stage 3.5-MCP: Atlas Replan TODO
**File:** `atlas_replan_todo.js`  
**Agent:** Atlas  
**Purpose:** Deep failure analysis and dynamic TODO replanning  
**Version:** 2.0.0  
**Language:** English prompts, Ukrainian responses  
**Input:** Tetyana execution data + Grisha verification feedback

### Stage 8-MCP: Final Summary
**File:** `mcp_final_summary.js`  
**Agent:** Atlas  
**Purpose:** Generate comprehensive execution summary  
**Version:** 5.0.0  
**Language:** English prompts, Ukrainian summary  
**Output:** Human-readable summary with metrics

### Validation: LLM Tool Validator
**File:** `llm_tool_validator.js`  
**Agent:** System  
**Purpose:** Validate tool calls for safety and correctness  
**Version:** 2.0.0  
**Language:** English prompts

### Utilities: Visual Capture Mode Selector
**File:** `visual_capture_mode_selector.js`  
**Agent:** Shared  
**Purpose:** Select optimal screenshot mode for VisualCaptureService  
**Version:** 2.0.0  
**Language:** English prompts

## File Structure

```
prompts/mcp/
├── index.js                                  # Exports all prompts
├── README.md                                 # This file
│
├── Stage 0: Mode Selection & Chat
│   ├── stage0_mode_selection.js              # ✅ v6.0.0 (English)
│   └── atlas_chat.js                         # ✅ v6.0.0 (English/Ukrainian)
│
├── Stage 1: TODO Planning
│   └── atlas_todo_planning_optimized.js      # ✅ v5.0.0 (English/Ukrainian)
│
├── Stage 2.0: Server Selection
│   └── stage2_0_server_selection.js          # ✅ v6.0.0 (English)
│
├── Stage 2.1: Tool Planning (Specialized)
│   ├── tetyana_plan_tools_playwright.js      # ✅ v2.0.0 (English/Ukrainian)
│   ├── tetyana_plan_tools_filesystem.js      # ✅ v2.0.0 (English/Ukrainian)
│   ├── tetyana_plan_tools_applescript.js     # ✅ v2.0.0 (English/Ukrainian)
│   ├── tetyana_plan_tools_shell.js           # ✅ v2.0.0 (English/Ukrainian)
│   └── tetyana_plan_tools_memory.js          # ✅ v2.0.0 (English/Ukrainian)
│
├── Stage 2.1.5: Screenshot & Adjust
│   └── tetyana_screenshot_and_adjust.js      # ✅ v5.0.0 (English/Ukrainian)
│
├── Stage 2.3: Verification
│   ├── grisha_verification_eligibility.js    # ✅ v2.0.0 (English/Ukrainian)
│   └── grisha_visual_verify_item.js          # ✅ v6.0.0 (English/Ukrainian)
│
├── Stage 3.5: Replanning
│   └── atlas_replan_todo.js                  # ✅ v2.0.0 (English/Ukrainian)
│
├── Stage 8: Summary
│   └── mcp_final_summary.js                  # ✅ v5.0.0 (English/Ukrainian)
│
└── Utilities
    ├── llm_tool_validator.js                 # ✅ v2.0.0 (English)
    └── visual_capture_mode_selector.js       # ✅ v2.0.0 (English)
```

## Optimization History

### Version 5.0.0 (2025-10-23): English Translation
- **All 17 prompts:** Translated to English instructions
- **User-facing strings:** Preserved in Ukrainian
- **Consistency:** Unified formatting and structure
- **Benefits:** Better LLM comprehension, reduced parsing errors

### Version 4.0.1 (2025-10-15): Token Reduction
- **atlas_todo_planning:** ~57% reduction (278 → 120 LOC)
- **tetyana_plan_tools:** ~52% reduction (313 → 150 LOC)
- **grisha_verify_item:** ~56% reduction (339 → 150 LOC)

### Dynamic Tools List
Instead of hardcoding 92 tools (~3000 tokens), optimized prompts use:
```javascript
{{AVAILABLE_TOOLS}}  // Replaced at runtime by MCPManager.getToolsSummary()
```

### Benefits:
- 🚀 Faster LLM responses (less tokens to process)
- 💰 Lower API costs (fewer input tokens)
- 🔄 Auto-updates when MCP servers change
- 🎯 More focused prompts (less noise)

## Recent Updates

### English Translation (2025-10-23)
**Problem:** Mixed Ukrainian/English in prompts caused LLM confusion  
**Solution:** Translated all system instructions to English  
**Result:** Clearer LLM comprehension, maintained Ukrainian UX

**Files updated (17 total):**
- ✅ All stage prompts (0, 1, 2.0, 2.1, 2.1.5, 2.3, 3.5, 8)
- ✅ All 5 specialized Tetyana prompts
- ✅ All Grisha verification prompts
- ✅ Atlas chat and planning prompts
- ✅ Utility prompts (validator, visual capture)

### Tool Name Format Fix (2025-10-22)
**Problem:** LLM generated inconsistent tool names  
**Solution:** Unified all examples to use `server__tool` format  
**Result:** 100% compliance with double underscore convention

**See memories for detailed fix history**

## Usage

Prompts are automatically loaded by the orchestrator via `index.js`:

```javascript
import { MCP_PROMPTS } from './prompts/mcp/index.js';

// Access prompts
const todoPrompt = MCP_PROMPTS.ATLAS_TODO_PLANNING;
const planPrompt = MCP_PROMPTS.TETYANA_PLAN_TOOLS;
const verifyPrompt = MCP_PROMPTS.GRISHA_VERIFY_ITEM;
```

## Modifying Prompts

1. Edit the optimized version (e.g., `tetyana_plan_tools_optimized.js`)
2. Restart orchestrator to reload prompts:
   ```bash
   ./restart_system.sh restart
   ```
3. Test changes with a simple command
4. Check logs for validation errors

## Available MCP Servers

The `{{AVAILABLE_TOOLS}}` placeholder is replaced with:

```
- **shell** (9 tools): get_platform_info, execute_command, get_whitelist...
- **memory** (9 tools): create_entities, create_relations, add_observations...
- **filesystem** (14 tools): read_file, write_file, list_directory...
- **playwright** (32 tools): playwright_navigate, playwright_click...
- **applescript** (1 tool): applescript_execute
- **git** (0 tools): (dynamically loaded)
```

## Testing

After modifying prompts, test with:

```bash
# Test calculator (AppleScript)
"Відкрий калькулятор і перемнож 333 на 2"

# Test file operations (filesystem)
"Створи файл test.txt на Desktop"

# Test web automation (playwright)
"Відкрий google.com та зроби screenshot"
```

Check logs:
```bash
tail -f logs/orchestrator.log | grep -E "(TODO|STAGE|validation)"
```

## Backup

Non-optimized versions are in `backup/` directory:
- `atlas_todo_planning.js` (11KB)
- `tetyana_plan_tools.js` (13KB)
- `grisha_verify_item.js` (15KB)

**These are NOT used by the system.** Kept for reference only.

## See Also

- `../../config/global-config.js` - MCP server configuration
- `../../orchestrator/ai/mcp-manager.js` - MCP Manager implementation
- `../../orchestrator/workflow/mcp-todo-manager.js` - TODO workflow manager
- `MCP_APPLESCRIPT_FIX_COMPLETE.md` - AppleScript fix documentation
