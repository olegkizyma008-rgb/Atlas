/**
 * Test JSON sanitization fix for line continuation backslashes
 */

// Simulate the problematic JSON that LLM generates
const problematicJSON = `{
  "tool_calls": [
    {
      "server": "applescript",
      "tool": "applescript__execute",
      "parameters": {
        "code_snippet": "tell application \\"Calculator\\" to activate\\n\\
delay 0.5\\n\\
tell application \\"System Events\\"\\n\\
    tell process \\"Calculator\\"\\n\\
        keystroke \\"3\\"\\n\\
        keystroke \\"*\\"\\n\\
        keystroke \\"2\\"\\n\\
        keystroke return\\n\\
    end tell\\n\\
end tell"
      }
    }
  ],
  "reasoning": "Execute calculator operation"
}`;

console.log('Testing JSON sanitization fix...\n');
console.log('Original (problematic) JSON:');
console.log(problematicJSON.substring(0, 300) + '...\n');

// Apply the fix
let sanitized = problematicJSON;

// FIXED 2025-11-05: Remove line continuation backslashes
// Pattern: \n\ (escaped newline + continuation backslash + real newline)
sanitized = sanitized.replace(/\\n\\\n/g, '\\n');
sanitized = sanitized.replace(/\\r\\\n/g, '\\r');
sanitized = sanitized.replace(/\\t\\\n/g, '\\t');

// Also handle cases where there's just the backslash continuation without escaped newline
sanitized = sanitized.replace(/\\\n\s*/g, '');

console.log('After sanitization:');
console.log(sanitized.substring(0, 300) + '...\n');

try {
  const parsed = JSON.parse(sanitized);
  console.log('✅ SUCCESS: JSON parsed correctly!');
  console.log('\nParsed structure:');
  console.log('- Tool:', parsed.tool_calls[0].tool);
  console.log('- Server:', parsed.tool_calls[0].server);
  console.log('- Code snippet length:', parsed.tool_calls[0].parameters.code_snippet.length);
  console.log('- Reasoning:', parsed.reasoning);
} catch (error) {
  console.log('❌ FAILED:', error.message);
  process.exit(1);
}

console.log('\n✅ Test passed - JSON sanitization fix works correctly!');
