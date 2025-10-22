/**
 * @fileoverview MCP Dynamic TODO Workflow Prompts Index
 * Exports all MCP-related prompts for workflow execution
 * 
 * OPTIMIZATION 15.10.2025: Using optimized prompts with {{AVAILABLE_TOOLS}}
 * - atlas_todo_planning_optimized.js (278 → 120 LOC)
 * - tetyana_plan_tools_optimized.js (313 → 150 LOC)
 * - grisha_verify_item_optimized.js (339 → 150 LOC)
 * 
 * REFACTORED 17.10.2025: Visual verification for Grisha
 * - grisha_visual_verify_item.js (NEW) - AI vision-based verification
 * - Removed MCP tool dependencies from Grisha
 * 
 * NEW 15.10.2025: Server Selection Stage for intelligent tool filtering
 * - stage2_0_server_selection.js (NEW) - Pre-selects 1-2 MCP servers before Tetyana
 * 
 * NEW 16.10.2025: Mode Selection Stage for chat vs task routing
 * - stage0_mode_selection.js (NEW) - Determines if request is chat or task
 * 
 * @version 5.0.0
 * @date 2025-10-17
 */

import modeSelection from './stage0_mode_selection.js';  // NEW 16.10.2025
import atlasChat from './atlas_chat.js';  // NEW 16.10.2025 - Chat mode prompt
import atlasTodoPlanning from './atlas_todo_planning_optimized.js';  // OPTIMIZED 15.10.2025
import serverSelection from './stage2_0_server_selection.js';  // NEW 15.10.2025
// REMOVED 20.10.2025: tetyana_plan_tools_optimized.js - No more GENERAL fallback, use specialized prompts only
import tetyanaPlanToolsPlaywright from './tetyana_plan_tools_playwright.js';  // NEW 18.10.2025 - Playwright specialized
import tetyanaPlanToolsFilesystem from './tetyana_plan_tools_filesystem.js';  // NEW 18.10.2025 - Filesystem specialized
import tetyanaPlanToolsApplescript from './tetyana_plan_tools_applescript.js';  // NEW 18.10.2025 - AppleScript specialized
import tetyanaPlanToolsShell from './tetyana_plan_tools_shell.js';  // NEW 18.10.2025 - Shell specialized
import tetyanaPlanToolsMemory from './tetyana_plan_tools_memory.js';  // NEW 18.10.2025 - Memory specialized
import tetyanaScreenshotAndAdjust from './tetyana_screenshot_and_adjust.js';  // NEW 16.10.2025
import visualCaptureModeSelector from './visual_capture_mode_selector.js';  // NEW 22.10.2025 - Screenshot mode selection
import grishaVerifyItem from './grisha_verify_item_optimized.js';  // OPTIMIZED 15.10.2025 (legacy MCP tools)
import grishaVisualVerifyItem from './grisha_visual_verify_item.js';  // NEW 17.10.2025 - Visual AI verification
import grishaVerificationEligibility from './grisha_verification_eligibility.js';  // NEW 22.10.2025 - Verification routing
// ARCHIVED 2025-10-22: atlas_adjust_todo.js moved to archive/legacy-processors-2025-10-22/
// import atlasAdjustTodo from './atlas_adjust_todo.js';
import atlasReplanTodo from './atlas_replan_todo.js';  // NEW 18.10.2025 - Deep replan with Tetyana + Grisha data
import mcpFinalSummary from './mcp_final_summary.js';
import llmToolValidator from './llm_tool_validator.js';  // NEW 21.10.2025 - LLM tool validation

export const MCP_PROMPTS = {
    // Stage 0-MCP: Mode Selection (NEW 16.10.2025)
    MODE_SELECTION: modeSelection,

    // Stage 0-MCP: Chat Mode (NEW 16.10.2025) - Atlas responds directly
    ATLAS_CHAT: atlasChat,

    // Stage 1-MCP: Atlas creates TODO
    ATLAS_TODO_PLANNING: atlasTodoPlanning,

    // Stage 2.0-MCP: Server Selection (NEW 15.10.2025) - Pre-select MCP servers
    SERVER_SELECTION: serverSelection,

    // Stage 2.1-MCP: Tetyana plans tools - REMOVED GENERAL fallback 20.10.2025
    // Use only specialized prompts below:
    
    // Stage 2.1-MCP: MCP-specific prompts (NEW 18.10.2025)
    TETYANA_PLAN_TOOLS_PLAYWRIGHT: tetyanaPlanToolsPlaywright,
    TETYANA_PLAN_TOOLS_FILESYSTEM: tetyanaPlanToolsFilesystem,
    TETYANA_PLAN_TOOLS_APPLESCRIPT: tetyanaPlanToolsApplescript,
    TETYANA_PLAN_TOOLS_SHELL: tetyanaPlanToolsShell,
    TETYANA_PLAN_TOOLS_MEMORY: tetyanaPlanToolsMemory,

    // Stage 2.1.5-MCP: Tetyana screenshot and adjust (NEW 16.10.2025)
    TETYANA_SCREENSHOT_AND_ADJUST: tetyanaScreenshotAndAdjust,
    VISUAL_CAPTURE_MODE_SELECTOR: visualCaptureModeSelector,

    // Stage 2.3-MCP: Grisha verifies item (VISUAL VERIFICATION - NEW 17.10.2025)
    GRISHA_VERIFY_ITEM: grishaVisualVerifyItem,  // CHANGED: Now uses visual AI verification
    
    // Stage 2.3-routing: Grisha verification eligibility (NEW 22.10.2025)
    GRISHA_VERIFICATION_ELIGIBILITY: grishaVerificationEligibility,
    
    // Legacy MCP tools verification (deprecated)
    GRISHA_VERIFY_ITEM_LEGACY: grishaVerifyItem,

    // Stage 3.6-MCP: Atlas deep replan (NEW 18.10.2025) - Analyze failure and rebuild TODO
    ATLAS_REPLAN_TODO: atlasReplanTodo,

    // Stage 8-MCP: Final summary
    MCP_FINAL_SUMMARY: mcpFinalSummary,

    // Tool Validation: LLM-based tool validation (NEW 21.10.2025)
    LLM_TOOL_VALIDATOR: llmToolValidator
};

export default MCP_PROMPTS;

// Individual exports for direct import
export {
    modeSelection,
    atlasChat,
    atlasTodoPlanning,
    serverSelection,
    // tetyanaPlanTools - REMOVED 20.10.2025
    tetyanaPlanToolsPlaywright,
    tetyanaPlanToolsFilesystem,
    tetyanaPlanToolsApplescript,
    tetyanaPlanToolsShell,
    tetyanaPlanToolsMemory,
    tetyanaScreenshotAndAdjust,
    visualCaptureModeSelector,  // NEW 22.10.2025
    grishaVerifyItem,
    grishaVisualVerifyItem,  // NEW 17.10.2025
    grishaVerificationEligibility,  // NEW 22.10.2025
    // atlasAdjustTodo - ARCHIVED 2025-10-22
    atlasReplanTodo,  // NEW 18.10.2025
    mcpFinalSummary,
    llmToolValidator  // NEW 21.10.2025
};
