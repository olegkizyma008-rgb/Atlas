#!/usr/bin/env node

/**
 * WINDSURF MCP ADAPTER
 * Адаптер для інтеграції Windsurf API як MCP сервера
 * 
 * Створено: 2025-11-02
 * Автор: Nexus
 * 
 * ВАЖЛИВО: Windsurf має НАЙВИЩИЙ ПРІОРИТЕТ (100) серед всіх tools
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getWindsurfClient } from '../../config/windsurf-integration.js';

const server = new Server(
  {
    name: "windsurf-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Windsurf client
let windsurfClient = null;

const TOOLS = [
  {
    name: "windsurf_analyze_code",
    description: "Analyze code for improvements, bugs, and optimizations using Windsurf AI (Claude 4.5 Thinking)",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Code to analyze",
        },
        context: {
          type: "string",
          description: "Context or description of what the code should do",
        },
        language: {
          type: "string",
          description: "Programming language (optional)",
        },
      },
      required: ["code", "context"],
    },
  },
  {
    name: "windsurf_fix_error",
    description: "Fix compilation or runtime errors using Windsurf AI",
    inputSchema: {
      type: "object",
      properties: {
        error_message: {
          type: "string",
          description: "Error message or stack trace",
        },
        code: {
          type: "string",
          description: "Code that produced the error",
        },
        context: {
          type: "string",
          description: "Additional context about the error",
        },
      },
      required: ["error_message", "code"],
    },
  },
  {
    name: "windsurf_improve_code",
    description: "Get suggestions for code improvements using Windsurf AI",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Code to improve",
        },
        goals: {
          type: "array",
          items: { type: "string" },
          description: "Improvement goals (e.g., performance, readability, security)",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "windsurf_explain_code",
    description: "Get detailed explanation of code using Windsurf AI",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Code to explain",
        },
        detail_level: {
          type: "string",
          enum: ["brief", "detailed", "expert"],
          description: "Level of detail in explanation",
        },
      },
      required: ["code"],
    },
  },
];

const TOOL_HANDLERS = {
  async windsurf_analyze_code(args) {
    const { code, context, language } = args;
    
    const prompt = `Analyze this ${language || ''} code and provide improvements:

Context: ${context}

Code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide:
1. Issues found (bugs, performance problems, security vulnerabilities)
2. Suggested improvements
3. Code quality score (1-10)
4. Refactored version if needed`;

    const result = await windsurfClient.analyzeCode(code, prompt);
    
    return {
      success: true,
      analysis: result.content,
      model: result.model,
    };
  },

  async windsurf_fix_error(args) {
    const { error_message, code, context } = args;
    
    const prompt = `Fix this error:

Error: ${error_message}

Context: ${context || 'N/A'}

Code:
\`\`\`
${code}
\`\`\`

Provide:
1. Root cause analysis
2. Fixed code
3. Explanation of the fix`;

    const result = await windsurfClient.request(prompt, {
      model: 'gpt-5-codex',  // Використовуємо Codex для fixing
      temperature: 0.1
    });
    
    return {
      success: true,
      fix: result.content,
      model: result.model,
    };
  },

  async windsurf_improve_code(args) {
    const { code, goals } = args;
    
    const goalsText = goals && goals.length > 0 
      ? `Focus on: ${goals.join(', ')}` 
      : 'General improvements';
    
    const prompt = `Improve this code. ${goalsText}

Code:
\`\`\`
${code}
\`\`\`

Provide:
1. Improved version
2. List of improvements made
3. Explanation why these improvements matter`;

    const result = await windsurfClient.request(prompt, {
      model: 'claude-sonnet-4.5-thinking',  // Thinking model для deep improvements
    });
    
    return {
      success: true,
      improvements: result.content,
      model: result.model,
    };
  },

  async windsurf_explain_code(args) {
    const { code, detail_level = 'detailed' } = args;
    
    const detailPrompts = {
      brief: 'Provide a brief summary of what this code does',
      detailed: 'Provide a detailed explanation of this code including logic flow',
      expert: 'Provide an expert-level analysis including design patterns, complexity, and best practices'
    };
    
    const prompt = `${detailPrompts[detail_level]}:

\`\`\`
${code}
\`\`\``;

    const result = await windsurfClient.request(prompt);
    
    return {
      success: true,
      explanation: result.content,
      model: result.model,
    };
  },
};

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args = {} } = request.params;
    
    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    const result = await handler(args);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
          }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  // Initialize Windsurf client
  windsurfClient = getWindsurfClient();
  
  if (!windsurfClient.isActive) {
    console.error("[WINDSURF MCP] ⚠️ Windsurf API not configured properly");
    console.error("[WINDSURF MCP] Set WINDSURF_API_KEY in .env file");
  } else {
    console.error("[WINDSURF MCP] ✅ Windsurf MCP Server initialized");
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[WINDSURF MCP] Running on stdio");
}

main().catch((error) => {
  console.error("[WINDSURF MCP] Server error:", error);
  process.exit(1);
});
