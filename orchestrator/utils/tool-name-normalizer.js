/**
 * Tool Name Normalizer - Централізована утиліта для уніфікації назв MCP інструментів
 * 
 * ПРОБЛЕМА: MCP сервери повертають tools з різними форматами назв:
 * - applescript_execute (single underscore)
 * - playwright_navigate (single underscore)
 * 
 * ВНУТРІШНІЙ ФОРМАТ ATLAS: server__tool (double underscore)
 * МCP SERVER ОЧІКУЄ: server_tool (single underscore)
 * 
 * @version 1.0.0
 * @date 2025-11-02
 */

/**
 * Normalize tool name to internal Atlas format (double underscore)
 * Used for: Schema generation, validation, internal references
 * 
 * @param {string} toolName - Tool name to normalize
 * @param {string} serverName - Server name (optional, if not in toolName)
 * @returns {string} Normalized tool name with double underscore
 * 
 * @example
 * normalizeToolName('applescript_execute', 'applescript')
 * // Returns: 'applescript__execute'
 * 
 * normalizeToolName('applescript__execute')
 * // Returns: 'applescript__execute'
 * 
 * normalizeToolName('applescript__applescript__execute')
 * // Returns: 'applescript__execute' (removes duplicate prefix)
 */
export function normalizeToolName(toolName, serverName = null) {
  if (!toolName || typeof toolName !== 'string') {
    return toolName;
  }

  // Already has double underscore - check for duplicates
  if (toolName.includes('__')) {
    // Remove duplicate server prefixes
    // applescript__applescript__execute → applescript__execute
    if (serverName) {
      const prefix = `${serverName}__`;
      let cleaned = toolName;
      
      // Remove all duplicate prefixes
      while (cleaned.startsWith(prefix + serverName)) {
        cleaned = prefix + cleaned.slice(prefix.length + serverName.length + 2);
      }
      
      return cleaned;
    }
    
    // No server provided, return as-is if format looks valid
    const parts = toolName.split('__');
    if (parts.length === 2) {
      return toolName;
    }
    
    // Multiple __ - take last two parts
    return parts.slice(-2).join('__');
  }

  // Has single underscore with server prefix
  if (serverName && toolName.startsWith(`${serverName}_`)) {
    // applescript_execute → applescript__execute
    return toolName.replace(`${serverName}_`, `${serverName}__`);
  }

  // No underscore or server prefix - add it
  if (serverName) {
    return `${serverName}__${toolName}`;
  }

  // Can't normalize without server name
  return toolName;
}

/**
 * Denormalize tool name to MCP server format (single underscore)
 * Used for: Actual MCP server calls
 * 
 * @param {string} toolName - Normalized tool name (with double __)
 * @returns {string} Denormalized tool name with single underscore
 * 
 * @example
 * denormalizeToolName('applescript__execute')
 * // Returns: 'applescript_execute'
 */
export function denormalizeToolName(toolName) {
  if (!toolName || typeof toolName !== 'string') {
    return toolName;
  }

  // Convert double underscore to single
  return toolName.replace(/__/g, '_');
}

/**
 * Extract server name from tool name
 * 
 * @param {string} toolName - Tool name (any format)
 * @returns {string|null} Server name or null
 * 
 * @example
 * extractServerName('applescript__execute')
 * // Returns: 'applescript'
 * 
 * extractServerName('applescript_execute')
 * // Returns: 'applescript'
 */
export function extractServerName(toolName) {
  if (!toolName || typeof toolName !== 'string') {
    return null;
  }

  // Try double underscore first
  if (toolName.includes('__')) {
    return toolName.split('__')[0];
  }

  // Try single underscore
  if (toolName.includes('_')) {
    return toolName.split('_')[0];
  }

  return null;
}

/**
 * Extract tool action name (without server prefix)
 * 
 * @param {string} toolName - Tool name (any format)
 * @returns {string|null} Tool action name or null
 * 
 * @example
 * extractToolAction('applescript__execute')
 * // Returns: 'execute'
 */
export function extractToolAction(toolName) {
  if (!toolName || typeof toolName !== 'string') {
    return null;
  }

  // Try double underscore first
  if (toolName.includes('__')) {
    const parts = toolName.split('__');
    return parts.slice(1).join('__'); // In case action has __
  }

  // Try single underscore
  if (toolName.includes('_')) {
    const parts = toolName.split('_');
    return parts.slice(1).join('_');
  }

  return toolName;
}

/**
 * Validate tool name format
 * 
 * @param {string} toolName - Tool name to validate
 * @param {string} expectedFormat - 'normalized' or 'denormalized'
 * @returns {Object} { valid: boolean, error: string|null }
 * 
 * @example
 * validateToolNameFormat('applescript__execute', 'normalized')
 * // Returns: { valid: true, error: null }
 * 
 * validateToolNameFormat('applescript_execute', 'normalized')
 * // Returns: { valid: false, error: 'Expected double underscore (__), found single (_)' }
 */
export function validateToolNameFormat(toolName, expectedFormat = 'normalized') {
  if (!toolName || typeof toolName !== 'string') {
    return { valid: false, error: 'Tool name must be a non-empty string' };
  }

  if (expectedFormat === 'normalized') {
    // Should have double underscore
    if (!toolName.includes('__')) {
      return { 
        valid: false, 
        error: 'Expected double underscore (__), found single (_) or none' 
      };
    }

    // Should have exactly one double underscore
    const parts = toolName.split('__');
    if (parts.length !== 2) {
      return { 
        valid: false, 
        error: `Expected format: server__tool, found ${parts.length} parts` 
      };
    }

    // Both parts should be non-empty
    if (!parts[0] || !parts[1]) {
      return { 
        valid: false, 
        error: 'Server name and tool action cannot be empty' 
      };
    }

    return { valid: true, error: null };
  }

  if (expectedFormat === 'denormalized') {
    // Should have single underscore (no double)
    if (toolName.includes('__')) {
      return { 
        valid: false, 
        error: 'Expected single underscore (_), found double (__)' 
      };
    }

    if (!toolName.includes('_')) {
      return { 
        valid: false, 
        error: 'Expected format: server_tool, no underscore found' 
      };
    }

    return { valid: true, error: null };
  }

  return { valid: false, error: `Unknown format: ${expectedFormat}` };
}

/**
 * Batch normalize tool names
 * 
 * @param {Array<Object>} tools - Array of tool objects with {name, server}
 * @returns {Array<Object>} Tools with normalized names
 */
export function batchNormalizeTools(tools) {
  if (!Array.isArray(tools)) {
    return tools;
  }

  return tools.map(tool => ({
    ...tool,
    name: normalizeToolName(tool.name, tool.server),
    originalName: tool.name // Preserve original for reference
  }));
}

/**
 * Create tool name mapping for quick lookup
 * 
 * @param {Array<Object>} tools - Array of tool objects
 * @returns {Map} Map of normalized name → original tool object
 */
export function createToolNameMap(tools) {
  const map = new Map();
  
  if (!Array.isArray(tools)) {
    return map;
  }

  for (const tool of tools) {
    const normalized = normalizeToolName(tool.name, tool.server);
    map.set(normalized, tool);
    
    // Also map denormalized version
    const denormalized = denormalizeToolName(normalized);
    if (denormalized !== normalized) {
      map.set(denormalized, tool);
    }
  }

  return map;
}

export default {
  normalizeToolName,
  denormalizeToolName,
  extractServerName,
  extractToolAction,
  validateToolNameFormat,
  batchNormalizeTools,
  createToolNameMap
};
