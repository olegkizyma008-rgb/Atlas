/**
 * @fileoverview MCP Stage Processors - Export Module
 * Centralizes exports for all MCP workflow stage processors
 * 
 * @version 5.0.0 - MCP-only
 * @date 2025-10-16
 */

import { ModeSelectionProcessor } from './mode-selection-processor.js';
import { AtlasContextEnrichmentProcessor } from './atlas-context-enrichment-processor.js';
import { AtlasTodoPlanningProcessor } from './atlas-todo-planning-processor.js';
import { ServerSelectionProcessor } from './server-selection-processor.js';
import { TetyanaPlanToolsProcessor } from './tetyana-plan-tools-processor.js';
import { TetyanaExecuteToolsProcessor } from './tetyana-execute-tools-processor.js';
import { GrishaVerificationEligibilityProcessor } from './grisha-verification-eligibility-processor.js';
import { GrishaVerifyItemProcessor } from './grisha-verify-item-processor/index.js';
import { AtlasReplanTodoProcessor } from './atlas-replan-todo-processor.js';
import { McpFinalSummaryProcessor } from './mcp-final-summary-processor.js';

// Re-export individual classes
export {
    ModeSelectionProcessor,
    AtlasContextEnrichmentProcessor,
    AtlasTodoPlanningProcessor,
    ServerSelectionProcessor,
    TetyanaPlanToolsProcessor,
    TetyanaExecuteToolsProcessor,
    GrishaVerificationEligibilityProcessor,
    GrishaVerifyItemProcessor,
    AtlasReplanTodoProcessor,
    McpFinalSummaryProcessor
};

/**
 * MCP Processors collection
 * 
 * Maps stage names to processor classes for easy instantiation
 */
export const MCP_PROCESSORS = {
    // Stage 0-MCP - Mode Selection (NEW 16.10.2025)
    MODE_SELECTION: ModeSelectionProcessor,

    // Stage 0.5-MCP - Context Enrichment (NEW 30.10.2025)
    ATLAS_CONTEXT_ENRICHMENT: AtlasContextEnrichmentProcessor,

    // Stage 1-MCP - Atlas TODO Planning
    ATLAS_TODO_PLANNING: AtlasTodoPlanningProcessor,

    // Stage 2.0-MCP - Server Selection
    SERVER_SELECTION: ServerSelectionProcessor,

    // Stage 2.1-MCP - Tetyana Plan Tools
    TETYANA_PLAN_TOOLS: TetyanaPlanToolsProcessor,

    // Stage 2.2-MCP - Tetyana Execute Tools
    TETYANA_EXECUTE_TOOLS: TetyanaExecuteToolsProcessor,

    // Stage 2.3-MCP - Grisha Verify Item
    GRISHA_VERIFY_ITEM: GrishaVerifyItemProcessor,

    // Stage 3.6-MCP - Atlas Replan TODO (NEW 18.10.2025)
    ATLAS_REPLAN_TODO: AtlasReplanTodoProcessor,

    // Stage 8-MCP - MCP Final Summary
    MCP_FINAL_SUMMARY: McpFinalSummaryProcessor
};

export default MCP_PROCESSORS;
