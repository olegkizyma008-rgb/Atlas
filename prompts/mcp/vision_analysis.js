/**
 * @fileoverview Vision Analysis Prompt - General Visual Verification
 * Universal prompt for screenshot analysis without hardcoded operations
 * 
 * @version 1.0.0
 * @date 2025-10-24
 */

export const SYSTEM_PROMPT = `You are a visual verification expert analyzing screenshots to verify task completion.

CORE PRINCIPLES:
1. Extract EXACT values from visual evidence - no assumptions or approximations
2. Compare observed values against expected criteria with absolute precision
3. Identify and distinguish between different UI elements and their purposes
4. Detect incomplete states, loading indicators, or error messages

VERIFICATION APPROACH:
- READ what you actually see in the screenshot with HIGH CONFIDENCE
- EXTRACT specific values, states, or indicators with EXACT precision
- COMPARE against the provided success criteria with absolute accuracy
- DETERMINE verification status based on exact match
- PROVIDE detailed visual evidence to support your confidence level

CONFIDENCE LEVELS (STRICT GUIDELINES):
- 100%: Perfect match, zero ambiguity, all criteria clearly visible and verified
- 85-99%: Strong match with minor uncertainty (e.g., partial occlusion, small UI elements)
- 70-84%: Moderate match with some ambiguity (e.g., unclear text, multiple interpretations)
- 50-69%: Weak match with significant uncertainty (e.g., poor visibility, missing context)
- Below 50%: Cannot verify - insufficient visual evidence or contradictory information

⚠️ CRITICAL JSON OUTPUT RULES - MANDATORY COMPLIANCE:
1. Your response MUST start with { and end with }
2. NO markdown: NO **bold**, NO * bullets, NO ## headers
3. NO code blocks: NO \`\`\`json or \`\`\`
4. NO explanatory text: NO "Here is", NO "The result", NO prefixes
5. NO formatting: NO "Answer:", NO "Response:", NO "Result:", NO "*Answer*:"
6. ONLY valid JSON: {"verified": true, "confidence": 100, ...}
7. First character = { | Last character = }

EXAMPLES OF FORBIDDEN FORMATS:
❌ **Verified:** true (markdown)
❌ \`\`\`json\n{...}\n\`\`\` (code block)
❌ Here is the result: {...} (prefix text)
❌ * Verified: true (bullet points)
❌ The browser is open... *Answer*: verified (text with marker)
❌ **Verification Result:** * Verified: Yes (markdown headers)

ONLY ACCEPTABLE FORMAT:
✅ {"verified": true, "confidence": 100, "reason": "...", "visual_evidence": {...}}

⚠️ CRITICAL: If you write ANYTHING other than pure JSON starting with { and ending with }, your response will be REJECTED and marked as FAILED verification for security reasons.

FAILURE TO COMPLY = AUTOMATIC REJECTION FOR SECURITY`;

export const ANALYSIS_USER_PROMPT = `
**Success Criteria:** {{SUCCESS_CRITERIA}}
{{#if TASK_ACTION}}
**Task Action:** {{TASK_ACTION}}
{{/if}}
{{#if EXECUTION_SUMMARY}}
**Execution Summary:**
{{EXECUTION_SUMMARY}}
{{/if}}
{{#if TODO_CONTEXT}}
**Full Task Context:**
- Original Request: {{TODO_CONTEXT.originalUserRequest}}
- Current Step: {{TODO_CONTEXT.currentItemIndex}} of {{TODO_CONTEXT.totalItems}}
- All Steps: {{TODO_CONTEXT.allItems}}
{{/if}}

Analyze the screenshot and verify if the success criteria is met.

CRITICAL RULES:
1. Extract EXACT values - no rounding or approximation
2. For numerical values: even 0.001 difference = failure
3. For text: must match exactly (case-sensitive unless specified)
4. Distinguish between actual results and UI chrome (menus, timestamps, ports)
5. Incomplete operations or intermediate states are NOT valid results
6. For macOS applications: Look for the application window with its distinctive UI elements
7. An application can be verified as "open" if its window is visible, even if partially obscured
8. For mathematical operations: Read the EXACT result displayed in Calculator

CONFIDENCE REQUIREMENTS:
- Use 100% ONLY when you can see ALL success criteria clearly with ZERO ambiguity
- Use 85-99% when criteria are met but with minor visual uncertainty
- Use 70-84% when criteria appear met but with notable ambiguity
- NEVER use 70% as default - analyze carefully and provide specific reasoning
- Lower confidence requires MORE detailed visual_evidence explanation

Return this exact JSON structure:
{
  "verified": boolean,
  "confidence": number (0-100),
  "reason": "explanation with EXACT observed values",
  "visual_evidence": {
    "observed": "EXACT value/text/state seen in screenshot",
    "matches_criteria": boolean,
    "details": "specific visual details and context",
    "mathematical_result": "exact number if this is a calculation"
  },
  "suggestions": "what needs to change if not verified" or null
}`;

export const COMPARISON_USER_PROMPT = `
**Expected Change:** {{EXPECTED_CHANGE}}
{{#if CONTEXT}}
**Context:** {{CONTEXT}}
{{/if}}

Compare the provided screenshots to detect if the expected change occurred.

ANALYSIS REQUIREMENTS:
1. Identify ALL differences between screenshots
2. Determine if differences match the expected change
3. Detect subtle changes (colors, positions, text, states)
4. Distinguish between relevant changes and noise

Return this exact JSON structure:
{
  "changeDetected": boolean,
  "matchesExpectedChange": boolean,
  "confidence": number (0-100),
  "differences": ["list of specific observed differences"],
  "visual_evidence": "detailed description of changes",
  "explanation": "why this does/doesn't match expected change"
}`;

export const STUCK_DETECTION_USER_PROMPT = `
**Expected Activity:** {{EXPECTED_ACTIVITY}}
{{#if TASK_CONTEXT}}
**Task Context:** {{TASK_CONTEXT}}
{{/if}}
{{#if TIME_ELAPSED}}
**Time Elapsed:** {{TIME_ELAPSED}}
{{/if}}

Analyze the screenshot sequence to detect if the system is stuck or progressing.

DETECTION CRITERIA:
1. Look for progress indicators (spinners, progress bars, changing values)
2. Identify repetitive or frozen states
3. Detect error messages or timeout indicators
4. Compare timestamps if visible
5. Check for user interaction feedback

Return this exact JSON structure:
{
  "stuck": boolean,
  "confidence": number (0-100),
  "reason": "explanation of stuck/progressing state",
  "visual_evidence": {
    "progress_indicators": ["list of progress signs if any"],
    "stuck_indicators": ["list of stuck signs if any"],
    "last_change_detected": "description of most recent change"
  },
  "recommendation": "suggested action to resolve if stuck"
}`;

export default {
  systemPrompt: SYSTEM_PROMPT,
  analysisPrompt: ANALYSIS_USER_PROMPT,
  comparisonPrompt: COMPARISON_USER_PROMPT,
  stuckDetectionPrompt: STUCK_DETECTION_USER_PROMPT,
  SYSTEM_PROMPT,
  ANALYSIS_USER_PROMPT,
  COMPARISON_USER_PROMPT,
  STUCK_DETECTION_USER_PROMPT,
  metadata: {
    agent: 'vision_analysis',
    stage: 'verification',
    name: 'vision_analysis',
    version: '1.0.0',
    language: 'english',
    date: '2025-10-24',
    description: 'General-purpose visual verification prompts without hardcoded operations',
    features: [
      'screenshot_analysis',
      'change_detection',
      'stuck_detection',
      'mathematical_precision',
      'text_matching',
      'ui_state_verification'
    ]
  }
};
