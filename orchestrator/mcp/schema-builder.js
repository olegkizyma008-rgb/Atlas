/**
 * MCP Schema Builder
 * Implements Schema-First approach from refactor.md
 * Generates formal JSON Schema for MCP tools
 * 
 * @version 1.0.0
 * @date 2025-10-29
 */

class MCPSchemaBuilder {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Build complete schema for all available tools
   * @param {Array} tools - Array of MCP tools
   * @returns {Array} Array of tool schemas in OpenAI format
   */
  buildToolSchemas(tools) {
    if (!tools || !Array.isArray(tools)) {
      return [];
    }

    return tools.map(tool => this.buildToolSchema(tool));
  }

  /**
   * Build schema for a single tool
   * Following refactor.md section 2 requirements
   * @param {Object} tool - MCP tool object
   * @returns {Object} Tool schema in OpenAI function calling format
   */
  buildToolSchema(tool) {
    // Generate full tool name with server prefix
    const fullToolName = this._generateToolName(tool);
    
    // Build detailed description
    const description = this._buildDescription(tool);
    
    // Convert inputSchema to JSON Schema format
    const parameters = this._convertToJSONSchema(tool.inputSchema || {});

    return {
      type: "function",
      function: {
        name: fullToolName,
        description: description,
        parameters: parameters
      }
    };
  }

  /**
   * Generate proper tool name with server prefix
   */
  _generateToolName(tool) {
    // Handle different naming formats from MCP servers
    if (tool.name && tool.name.includes('__')) {
      return tool.name;
    }
    
    if (tool.server && tool.name) {
      // If tool name already has server prefix with single underscore
      if (tool.name.startsWith(`${tool.server}_`)) {
        return tool.name.replace(`${tool.server}_`, `${tool.server}__`);
      }
      // Add server prefix with double underscore
      return `${tool.server}__${tool.name}`;
    }
    
    return tool.name || 'unknown_tool';
  }

  /**
   * Build detailed description following refactor.md best practices
   */
  _buildDescription(tool) {
    let description = tool.description || '';
    
    // Add business logic context
    if (tool.server) {
      const serverContext = this._getServerContext(tool.server);
      if (serverContext) {
        description = `${serverContext} ${description}`;
      }
    }

    // Add usage hints
    if (tool.examples && tool.examples.length > 0) {
      description += ` Example usage: ${tool.examples[0]}`;
    }

    // Add warnings if applicable
    if (tool.warnings) {
      description += ` Warning: ${tool.warnings}`;
    }

    return description || `Execute ${tool.name} operation`;
  }

  /**
   * Get server-specific context for better descriptions
   */
  _getServerContext(server) {
    const contexts = {
      filesystem: 'File system operation.',
      shell: 'Execute shell command.',
      applescript: 'Control macOS application.',
      playwright: 'Web browser automation.',
      memory: 'Store/retrieve context.',
      java_sdk: 'Java development operation.',
      python_sdk: 'Python development operation.'
    };
    
    return contexts[server] || '';
  }

  /**
   * Convert MCP inputSchema to JSON Schema format
   * Following refactor.md section 3.2 - use enums where applicable
   */
  _convertToJSONSchema(inputSchema) {
    if (!inputSchema || typeof inputSchema !== 'object') {
      return {
        type: "object",
        properties: {},
        required: []
      };
    }

    const schema = {
      type: "object",
      properties: {},
      required: inputSchema.required || []
    };

    // Convert properties
    if (inputSchema.properties) {
      for (const [key, value] of Object.entries(inputSchema.properties)) {
        schema.properties[key] = this._convertProperty(value);
      }
    }

    // Add additionalProperties: false for strict validation
    schema.additionalProperties = false;

    return schema;
  }

  /**
   * Convert individual property to JSON Schema format
   */
  _convertProperty(property) {
    if (!property) return { type: "string" };

    const converted = {
      type: this._normalizeType(property.type),
      description: property.description || ''
    };

    // Add enum if specified (refactor.md requirement)
    if (property.enum && Array.isArray(property.enum)) {
      converted.enum = property.enum;
    }

    // Add format if specified
    if (property.format) {
      converted.format = property.format;
    }

    // Add default value if specified
    if (property.default !== undefined) {
      converted.default = property.default;
    }

    // Handle nested objects
    if (converted.type === 'object' && property.properties) {
      converted.properties = {};
      for (const [key, value] of Object.entries(property.properties)) {
        converted.properties[key] = this._convertProperty(value);
      }
      if (property.required) {
        converted.required = property.required;
      }
    }

    // Handle arrays
    if (converted.type === 'array' && property.items) {
      converted.items = this._convertProperty(property.items);
    }

    return converted;
  }

  /**
   * Normalize type names to JSON Schema standard
   */
  _normalizeType(type) {
    if (!type) return 'string';
    
    const typeMap = {
      'STRING': 'string',
      'NUMBER': 'number',
      'INTEGER': 'integer',
      'BOOLEAN': 'boolean',
      'OBJECT': 'object',
      'ARRAY': 'array',
      'NULL': 'null'
    };
    
    return typeMap[type.toUpperCase()] || type.toLowerCase();
  }

  /**
   * Generate schema with examples (few-shot)
   * Following refactor.md section 3.3
   */
  generateSchemaWithExamples(tool, examples) {
    const schema = this.buildToolSchema(tool);
    
    if (examples && examples.length > 0) {
      schema.function.examples = examples.map(ex => ({
        input: ex.input,
        parameters: ex.parameters,
        expected_output: ex.output
      }));
    }
    
    return schema;
  }

  /**
   * Validate tool call against schema
   * For use in validation pipeline
   */
  validateAgainstSchema(toolCall, schema) {
    const errors = [];
    
    // Check tool name
    if (toolCall.tool !== schema.function.name) {
      errors.push({
        type: 'INVALID_TOOL_NAME',
        expected: schema.function.name,
        received: toolCall.tool
      });
    }
    
    // Check required parameters
    const required = schema.function.parameters.required || [];
    const provided = Object.keys(toolCall.parameters || {});
    
    for (const param of required) {
      if (!provided.includes(param)) {
        errors.push({
          type: 'MISSING_PARAMETER',
          parameter: param
        });
      }
    }
    
    // Check for unknown parameters
    const allowedParams = Object.keys(schema.function.parameters.properties || {});
    for (const param of provided) {
      if (!allowedParams.includes(param)) {
        errors.push({
          type: 'UNKNOWN_PARAMETER',
          parameter: param
        });
      }
    }
    
    // Check enum values
    for (const [param, value] of Object.entries(toolCall.parameters || {})) {
      const paramSchema = schema.function.parameters.properties[param];
      if (paramSchema && paramSchema.enum) {
        if (!paramSchema.enum.includes(value)) {
          errors.push({
            type: 'INVALID_ENUM_VALUE',
            parameter: param,
            expected: paramSchema.enum,
            received: value
          });
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default MCPSchemaBuilder;
