/**
 * @fileoverview MCP Extension Manager - Goose-inspired tool management
 * Implements precise tool selection and execution based on Goose algorithm
 * 
 * Key features from Goose:
 * - Centralized extension/tool management
 * - Tool prefixing (server__tool format)
 * - Detailed tool schemas with input_schema
 * - Tool validation and categorization
 * - Support for multiple MCP server types
 * 
 * @version 5.0.0
 * @date 2025-10-20
 */

import logger from '../utils/logger.js';

/**
 * Extension (MCP Server) wrapper
 * Similar to Goose's Extension struct
 */
class Extension {
    constructor(name, server, config) {
        this.name = name;
        this.server = server;
        this.config = config;
        this.tools = [];
        this.serverInfo = null;
        this.ready = false;
    }

    /**
     * Check if extension supports resources
     */
    supportsResources() {
        return this.serverInfo?.capabilities?.resources !== undefined;
    }

    /**
     * Get extension instructions
     */
    getInstructions() {
        return this.serverInfo?.instructions || null;
    }

    /**
     * Get prefixed tools (server__tool format)
     */
    getPrefixedTools() {
        return this.tools.map(tool => ({
            ...tool,
            name: `${this.name}__${tool.name}`,
            server: this.name,
            originalName: tool.name
        }));
    }
}

/**
 * MCP Extension Manager
 * Inspired by Goose's ExtensionManager
 * 
 * Manages all MCP servers and provides:
 * - Tool discovery and listing (filesystem, playwright, shell, applescript, memory)
 * - Tool validation
 * - Tool categorization (readonly, regular, dangerous)
 * - Precise tool selection for LLM
 */
export class MCPExtensionManager {
    constructor(mcpManager) {
        this.mcpManager = mcpManager;
        this.extensions = new Map(); // name -> Extension
        this.initialized = false;
    }

    /**
     * Initialize all extensions from MCP Manager
     * Similar to Goose's extension loading
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        logger.system('mcp-extension-manager', '🔧 Initializing MCP Extension Manager...');

        try {
            // Get all servers from MCPManager.servers Map
            const servers = this.mcpManager.servers;
            
            for (const [name, server] of servers.entries()) {
                const extension = new Extension(name, server, {
                    type: 'stdio',
                    command: server.config?.command,
                    args: server.config?.args
                });

                // Get tools from server
                extension.tools = server.getTools();
                extension.serverInfo = {
                    capabilities: {
                        tools: { listChanged: true }
                    }
                };
                extension.ready = server.ready;

                this.extensions.set(name, extension);
                
                logger.system('mcp-extension-manager', 
                    `✅ Loaded extension: ${name} (${extension.tools.length} tools)`);
            }

            this.initialized = true;
            logger.system('mcp-extension-manager', 
                `🎯 Extension Manager ready: ${this.extensions.size} extensions (${Array.from(this.extensions.keys()).join(', ')}), ${this.getTotalToolCount()} tools`);

        } catch (error) {
            logger.error('mcp-extension-manager', `Failed to initialize: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all available tools with prefixes
     * Similar to Goose's list_tools()
     * 
     * @param {string|null} extensionName - Filter by extension name
     * @returns {Array} Array of tool definitions
     */
    listTools(extensionName = null) {
        const tools = [];

        for (const [name, extension] of this.extensions) {
            if (extensionName && name !== extensionName) {
                continue;
            }

            if (!extension.ready) {
                continue;
            }

            tools.push(...extension.getPrefixedTools());
        }

        return tools;
    }

    /**
     * Get tools from specific servers
     * Used for filtered tool selection
     * 
     * @param {Array<string>} serverNames - Server names to include
     * @returns {Array} Filtered tools
     */
    getToolsFromServers(serverNames) {
        const tools = [];

        for (const serverName of serverNames) {
            const extension = this.extensions.get(serverName);
            if (extension && extension.ready) {
                tools.push(...extension.getPrefixedTools());
            }
        }

        return tools;
    }

    /**
     * Prepare tools and prompt for LLM
     * Core method inspired by Goose's prepare_tools_and_prompt()
     * 
     * @param {Object} options - Preparation options
     * @param {Array<string>} options.selectedServers - Pre-selected servers
     * @param {boolean} options.includeSchema - Include full input_schema
     * @param {string} options.mode - Execution mode (task/chat)
     * @returns {Object} { tools, toolsSummary, systemPromptAddition }
     */
    prepareToolsAndPrompt(options = {}) {
        const {
            selectedServers = null,
            includeSchema = true,
            mode = 'task'
        } = options;

        let tools;
        
        // STEP 1: Get tools (filtered or all)
        if (selectedServers && selectedServers.length > 0) {
            tools = this.getToolsFromServers(selectedServers);
            logger.debug('mcp-extension-manager', 
                `🎯 Using ${tools.length} tools from selected servers: ${selectedServers.join(', ')}`);
        } else {
            tools = this.listTools();
            logger.debug('mcp-extension-manager', 
                `📋 Using all ${tools.length} available tools`);
        }

        // STEP 2: Format tools for LLM
        const formattedTools = tools.map(tool => this._formatToolForLLM(tool, includeSchema));

        // STEP 3: Generate tools summary
        const toolsSummary = this._generateToolsSummary(tools);

        // STEP 4: Generate system prompt addition
        const systemPromptAddition = this._generateSystemPromptAddition(tools, mode);

        return {
            tools: formattedTools,
            toolsSummary,
            systemPromptAddition,
            metadata: {
                totalTools: tools.length,
                servers: [...new Set(tools.map(t => t.server))],
                filtered: selectedServers !== null
            }
        };
    }

    /**
     * Format tool for LLM consumption
     * Follows MCP tool definition format
     * 
     * @private
     */
    _formatToolForLLM(tool, includeSchema) {
        const formatted = {
            name: tool.name, // Already prefixed (server__tool)
            description: tool.description || 'No description available'
        };

        if (includeSchema && tool.inputSchema) {
            formatted.input_schema = tool.inputSchema;
        } else if (includeSchema) {
            // Generate basic schema if not provided
            formatted.input_schema = {
                type: 'object',
                properties: {},
                required: []
            };
        }

        return formatted;
    }

    /**
     * Generate tools summary for prompt substitution
     * Similar to Goose's get_extensions_info()
     * 
     * @private
     */
    _generateToolsSummary(tools) {
        const lines = [];
        const byServer = new Map();

        // Group tools by server
        for (const tool of tools) {
            if (!byServer.has(tool.server)) {
                byServer.set(tool.server, []);
            }
            byServer.get(tool.server).push(tool);
        }

        // Format summary
        for (const [server, serverTools] of byServer) {
            lines.push(`\n**${server}** (${serverTools.length} tools):`);
            
            for (const tool of serverTools) {
                const params = this._extractParameterNames(tool);
                const paramsStr = params.length > 0 ? `(${params.join(', ')})` : '()';
                lines.push(`  - ${tool.name}${paramsStr}: ${tool.description || 'No description'}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Extract parameter names from tool schema
     * 
     * @private
     */
    _extractParameterNames(tool) {
        if (!tool.inputSchema || !tool.inputSchema.properties) {
            return [];
        }

        return Object.keys(tool.inputSchema.properties);
    }

    /**
     * Generate system prompt addition
     * 
     * @private
     */
    _generateSystemPromptAddition(tools, mode) {
        const serverNames = [...new Set(tools.map(t => t.server))];
        
        const lines = [
            '\n## Available MCP Tools',
            '',
            `You have access to ${tools.length} tools from ${serverNames.length} MCP servers:`,
            serverNames.map(s => `- ${s}`).join('\n'),
            '',
            'Use tools by calling them with the format: server__tool_name',
            'Always check tool descriptions and parameters before calling.',
        ];

        if (mode === 'chat') {
            lines.push('');
            lines.push('Note: In chat mode, describe what tools would do instead of calling them.');
        }

        return lines.join('\n');
    }

    /**
     * Validate tool calls against available tools
     * Critical for preventing invalid tool calls
     * 
     * @param {Array} toolCalls - Array of tool call objects
     * @returns {Object} Validation result
     */
    validateToolCalls(toolCalls) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        const invalidTools = [];

        const availableToolNames = new Set(this.listTools().map(t => t.name));

        for (const call of toolCalls) {
            // FIXED 2025-10-22: Don't add prefix if tool already has it
            // LLM returns: {"server": "applescript", "tool": "applescript__applescript_execute"}
            // We need to check if tool already starts with server__
            let toolName;
            if (call.tool.startsWith(`${call.server}__`)) {
                // Tool already has prefix, use as-is
                toolName = call.tool;
            } else {
                // Tool doesn't have prefix, add it
                toolName = `${call.server}__${call.tool}`;
            }

            // Check if tool exists
            if (!availableToolNames.has(toolName)) {
                errors.push(`Tool not found: ${toolName}`);
                invalidTools.push(toolName);

                // Try to suggest alternatives
                const similar = this._findSimilarTools(toolName);
                if (similar.length > 0) {
                    suggestions.push(`Did you mean: ${similar.join(', ')}?`);
                }
            }

            // Check if server exists
            if (!this.extensions.has(call.server)) {
                errors.push(`Server not found: ${call.server}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            suggestions,
            invalidTools
        };
    }

    /**
     * Find similar tool names (for suggestions)
     * 
     * @private
     */
    _findSimilarTools(toolName) {
        const available = this.listTools();
        const similar = [];

        const targetLower = toolName.toLowerCase();
        
        for (const tool of available) {
            const toolLower = tool.name.toLowerCase();
            
            // Check if names are similar (simple string matching)
            if (toolLower.includes(targetLower) || targetLower.includes(toolLower)) {
                similar.push(tool.name);
            }
        }

        return similar.slice(0, 3); // Return top 3
    }

    /**
     * Dispatch tool call to appropriate MCP server
     * Similar to Goose's dispatch_tool_call()
     * 
     * @param {Object} toolCall - Tool call object
     * @param {string} toolCall.server - Server name
     * @param {string} toolCall.tool - Tool name
     * @param {Object} toolCall.parameters - Tool parameters
     * @returns {Promise<Object>} Tool execution result
     */
    async dispatchToolCall(toolCall) {
        const { server, tool, parameters } = toolCall;

        // FIXED 2025-10-22: Remove server prefix from tool name if present
        // tool may come as "applescript__applescript_execute" but extension.tools has "applescript_execute"
        let actualToolName = tool;
        if (tool.startsWith(`${server}__`)) {
            actualToolName = tool.substring(`${server}__`.length);
        }

        logger.debug('mcp-extension-manager', 
            `🔧 Dispatching: ${server}__${actualToolName}`);

        // STEP 1: Validate server exists
        const extension = this.extensions.get(server);
        if (!extension) {
            throw new Error(`Server not found: ${server}`);
        }

        if (!extension.ready) {
            throw new Error(`Server not ready: ${server}`);
        }

        // STEP 2: Validate tool exists (use actualToolName without prefix)
        const toolExists = extension.tools.some(t => t.name === actualToolName);
        if (!toolExists) {
            throw new Error(`Tool not found: ${server}__${actualToolName}`);
        }

        // STEP 3: Execute tool through MCP server (use actualToolName without prefix)
        try {
            const result = await extension.server.call(actualToolName, parameters);
            
            logger.debug('mcp-extension-manager', 
                `✅ Tool executed: ${server}__${actualToolName}`);

            return {
                success: true,
                result: result,
                server: server,
                tool: actualToolName
            };

        } catch (error) {
            logger.error('mcp-extension-manager', 
                `❌ Tool execution failed: ${server}__${actualToolName} - ${error.message}`);

            return {
                success: false,
                error: error.message,
                server: server,
                tool: tool
            };
        }
    }

    /**
     * Execute multiple tool calls sequentially
     * 
     * @param {Array} toolCalls - Array of tool calls
     * @returns {Promise<Object>} Execution results
     */
    async executeToolCalls(toolCalls) {
        const results = [];
        let successfulCalls = 0;
        let failedCalls = 0;

        for (const call of toolCalls) {
            try {
                const result = await this.dispatchToolCall(call);
                results.push(result);

                if (result.success) {
                    successfulCalls++;
                } else {
                    failedCalls++;
                }

            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    server: call.server,
                    tool: call.tool
                });
                failedCalls++;
            }
        }

        return {
            all_successful: failedCalls === 0,
            successful_calls: successfulCalls,
            failed_calls: failedCalls,
            results: results
        };
    }

    /**
     * Get total tool count across all extensions
     */
    getTotalToolCount() {
        let count = 0;
        for (const extension of this.extensions.values()) {
            count += extension.tools.length;
        }
        return count;
    }

    /**
     * Get extension by name
     */
    getExtension(name) {
        return this.extensions.get(name);
    }

    /**
     * Get all extension names
     */
    getExtensionNames() {
        return Array.from(this.extensions.keys());
    }

    /**
     * Check if extension exists and is ready
     */
    isExtensionReady(name) {
        const extension = this.extensions.get(name);
        return extension && extension.ready;
    }
}

export default MCPExtensionManager;
