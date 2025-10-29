/**
 * Universal MCP Tool Planner Prompt Template
 * @version 2.0.0
 * @date 2025-10-29
 * 
 * Based on best practices from refactor.md
 * This template provides a standardized structure for all MCP tool planning prompts
 */

const UNIVERSAL_PROMPT_TEMPLATE = {
  system: `You are Tetyana, a world-class AI agent and master MCP tool planner.
Your current mission is to create a precise, step-by-step tool plan to accomplish the user's task.
You have been assigned a specialized set of servers for this task: {{serverDomains}}.

CRITICAL DIRECTIVES - ADHERE STRICTLY:
1. SERVER & TOOL NAMES: ONLY use tools from the provided AVAILABLE_TOOLS list. Tool names MUST follow the 'server_name__tool_name' format.
2. PARAMETERS: ONLY use parameter names defined in the tool's 'inputSchema'.
3. NO INVENTIONS: DO NOT invent new servers, tools, or parameters. DO NOT hallucinate commands or values.
4. PRECISION: If unsure about syntax or usage, RELY HEAVILY on the FEW-SHOT EXAMPLES as your ground truth.
5. EFFICIENCY: Create the most direct and efficient plan. Combine tools where logical. Do not add unnecessary steps.

SPECIALIZED PATTERNS FOR THIS TASK:
{{specializedPatterns}}

VALIDATION CHECKLIST BEFORE RESPONDING:
- [ ] Does every tool name exactly match an entry in AVAILABLE_TOOLS?
- [ ] Does every parameter for each tool exactly match its inputSchema?
- [ ] Are all required parameter values from ITEM_PARAMETERS used correctly and without modification?
- [ ] Is the plan logical and does it directly address the user's action?
- [ ] Have I avoided inventing any new tools, parameters, or values?
- [ ] Have I used the most efficient sequence of tools?`,

  user: `Task: Plan MCP tools for the following action.

ITEM_PARAMETERS:
{{itemParameters}}

AVAILABLE_TOOLS (with inputSchema):
{{availableTools}}

FEW-SHOT EXAMPLES:
{{fewShotExamples}}

RESPONSE FORMAT:
Return a valid JSON array of tool calls. Each tool call must have:
- "server": The server name (string)
- "tool": The full tool name in format "server__toolname" (string)  
- "parameters": An object with the exact parameter names from inputSchema

Example structure:
[
  {
    "server": "filesystem",
    "tool": "filesystem__create_file",
    "parameters": {
      "path": "/path/to/file.txt",
      "content": "File content here"
    }
  }
]`
};

/**
 * Helper function to fill the template with context-specific values
 * @param {Object} context - The context object containing all template variables
 * @returns {Object} Filled prompts ready for LLM
 */
function fillTemplate(context) {
  const { serverDomains, specializedPatterns, itemParameters, availableTools, fewShotExamples } = context;
  
  let systemPrompt = UNIVERSAL_PROMPT_TEMPLATE.system
    .replace('{{serverDomains}}', serverDomains)
    .replace('{{specializedPatterns}}', specializedPatterns);
    
  let userPrompt = UNIVERSAL_PROMPT_TEMPLATE.user
    .replace('{{itemParameters}}', JSON.stringify(itemParameters, null, 2))
    .replace('{{availableTools}}', JSON.stringify(availableTools, null, 2))
    .replace('{{fewShotExamples}}', fewShotExamples);
    
  return {
    system: systemPrompt,
    user: userPrompt
  };
}

/**
 * Specialized patterns for different server types
 */
const SPECIALIZED_PATTERNS = {
  filesystem: `• File Operations: Always use absolute paths. Create parent directories before creating files.
• Reading: Check if file exists before reading. Handle empty files gracefully.
• Writing: Consider using append mode for logs. Always specify encoding (UTF-8).
• Deletion: Verify path is not critical before deletion. Consider moving to trash instead.`,

  shell: `• Command Execution: Use full paths for commands when possible. Set working directory explicitly.
• Error Handling: Capture both stdout and stderr. Check exit codes.
• Security: Never execute user input directly. Sanitize all parameters.
• Environment: Set necessary environment variables. Consider shell type (bash/zsh/sh).`,

  applescript: `• Application Control: Always activate application before sending commands.
• System Events: Use keystroke for apps without AppleScript dictionary.
• Delays: Add appropriate delays between actions (0.5-1 second).
• Error Recovery: Check if application is running before sending commands.`,

  playwright: `• Navigation: Always wait for page load after navigation.
• Selectors: Prefer data-testid > id > class > xpath. Use specific selectors.
• Waits: Use explicit waits for elements. Avoid fixed delays.
• Screenshots: Take screenshots for debugging. Name them descriptively.`,

  memory: `• Key Naming: Use descriptive, hierarchical keys (e.g., "user.preferences.theme").
• Data Types: Store complex objects as JSON strings. Parse on retrieval.
• Cleanup: Remove obsolete keys. Set TTL for temporary data.
• Versioning: Include version in key name for schema changes.`,

  java_sdk: `• Package Structure: Follow Java naming conventions (com.example.package).
• Dependencies: Specify Maven/Gradle dependencies explicitly.
• Testing: Create JUnit tests alongside implementation.
• Documentation: Generate JavaDoc comments for public APIs.`,

  python_sdk: `• Module Structure: Follow PEP 8 naming conventions.
• Virtual Environment: Consider venv/poetry for dependency isolation.
• Type Hints: Use type annotations for better IDE support.
• Testing: Create pytest tests in parallel structure.`
};

/**
 * Common mistakes to avoid for each server type
 */
const COMMON_MISTAKES = {
  filesystem: [
    "Using relative paths instead of absolute paths",
    "Not checking if file exists before reading",
    "Forgetting to create parent directories",
    "Using wrong path separator for OS"
  ],
  shell: [
    "Not escaping special characters in commands",
    "Ignoring command exit codes",
    "Using shell-specific syntax without checking shell type",
    "Not setting working directory"
  ],
  applescript: [
    "Using 'set value' for Calculator (use keystroke instead)",
    "Not activating application first",
    "Missing delays between actions",
    "Using AppleScript for apps without dictionary support"
  ],
  playwright: [
    "Not waiting for elements before interaction",
    "Using fragile CSS selectors",
    "Not handling navigation timeouts",
    "Forgetting to close browser sessions"
  ],
  memory: [
    "Using non-descriptive key names",
    "Not parsing JSON strings on retrieval",
    "Storing sensitive data without encryption",
    "Not handling key collisions"
  ],
  java_sdk: [
    "Wrong package naming convention",
    "Missing dependency declarations",
    "Not following Java code style",
    "Forgetting to handle exceptions"
  ],
  python_sdk: [
    "Not following PEP 8 conventions",
    "Missing __init__.py in packages",
    "Not using virtual environments",
    "Forgetting type hints"
  ]
};

module.exports = {
  UNIVERSAL_PROMPT_TEMPLATE,
  fillTemplate,
  SPECIALIZED_PATTERNS,
  COMMON_MISTAKES
};
