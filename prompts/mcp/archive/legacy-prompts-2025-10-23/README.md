# LEGACY PROMPT - ARCHIVED 2025-10-23

This file has been archived because it's replaced by the new MCP workflow architecture.

## Old approach (deprecated):
Grisha used this prompt to directly call MCP tools for verification.

## New approach (active):
1. grisha_verification_eligibility.js - decides HOW to verify
2. For MCP verification - uses full workflow:
   - Stage 2.0: Server Selection
   - Stage 2.1: Tetyana Plan Tools (specialized prompts)
   - Stage 2.2: Tetyana Execute Tools
   - Grisha analyzes execResult.execution.results

3. For visual verification - uses grisha_visual_verify_item.js

See Memory[aacad733] for details on the refactoring.
