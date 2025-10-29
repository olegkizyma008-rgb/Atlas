#!/usr/bin/env node

/**
 * MCP Server for Python SDK
 * Provides tools for Python development, execution, and package management
 * Based on Model Context Protocol SDK
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// Create MCP server
const server = new Server(
  {
    name: "python-sdk-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: "run_python",
    description: "Execute Python script or code",
    inputSchema: {
      type: "object",
      properties: {
        script_path: {
          type: "string",
          description: "Path to Python script file",
        },
        code: {
          type: "string",
          description: "Python code to execute directly (alternative to script_path)",
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Command line arguments (optional)",
        },
        working_dir: {
          type: "string",
          description: "Working directory for execution (optional)",
        },
      },
    },
  },
  {
    name: "create_python_module",
    description: "Create a new Python module with basic structure",
    inputSchema: {
      type: "object",
      properties: {
        module_path: {
          type: "string",
          description: "Path for the module file (e.g., app/models/user.py)",
        },
        imports: {
          type: "array",
          items: { type: "string" },
          description: "Import statements (optional)",
        },
        classes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              base_class: { type: "string" },
              attributes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    default: { type: "string" },
                  },
                },
              },
            },
          },
          description: "Class definitions (optional)",
        },
        functions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              params: {
                type: "array",
                items: { type: "string" },
              },
              docstring: { type: "string" },
            },
          },
          description: "Function definitions (optional)",
        },
      },
      required: ["module_path"],
    },
  },
  {
    name: "install_package",
    description: "Install Python package using pip",
    inputSchema: {
      type: "object",
      properties: {
        package: {
          type: "string",
          description: "Package name (e.g., 'requests', 'flask==2.0.0')",
        },
        upgrade: {
          type: "boolean",
          description: "Upgrade if already installed (optional)",
        },
      },
      required: ["package"],
    },
  },
  {
    name: "create_virtualenv",
    description: "Create Python virtual environment",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path for virtual environment",
        },
        python_version: {
          type: "string",
          description: "Python version (e.g., 'python3.11', optional)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "run_pytest",
    description: "Run pytest tests",
    inputSchema: {
      type: "object",
      properties: {
        test_path: {
          type: "string",
          description: "Path to test file or directory",
        },
        options: {
          type: "string",
          description: "Additional pytest options (e.g., '-v', '--cov')",
        },
      },
      required: ["test_path"],
    },
  },
  {
    name: "type_check",
    description: "Run mypy type checking",
    inputSchema: {
      type: "object",
      properties: {
        target_path: {
          type: "string",
          description: "Path to check (file or directory)",
        },
        strict: {
          type: "boolean",
          description: "Use strict mode (optional)",
        },
        ignore_missing_imports: {
          type: "boolean",
          description: "Ignore missing imports (optional)",
        },
      },
      required: ["target_path"],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "run_python": {
        const { script_path, code, args: pyArgs, working_dir } = args;
        let cmd;
        
        if (code) {
          // Execute code directly
          cmd = `python3 -c ${JSON.stringify(code)}`;
        } else if (script_path) {
          cmd = `python3 "${script_path}"`;
          if (pyArgs && pyArgs.length > 0) {
            cmd += ` ${pyArgs.join(" ")}`;
          }
        } else {
          throw new Error("Either script_path or code must be provided");
        }

        const options = working_dir ? { cwd: working_dir } : {};
        const { stdout, stderr } = await execAsync(cmd, options);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                output: stdout,
                stderr: stderr || "",
              }),
            },
          ],
        };
      }

      case "create_python_module": {
        const { module_path, imports = [], classes = [], functions = [] } = args;
        
        // Create directory structure
        const dir = path.dirname(module_path);
        await fs.mkdir(dir, { recursive: true });

        // Generate module content
        let content = "";
        
        // Add imports
        if (imports.length > 0) {
          content += imports.join("\n") + "\n\n";
        }

        // Add classes
        for (const cls of classes) {
          const baseClass = cls.base_class ? `(${cls.base_class})` : "";
          content += `class ${cls.name}${baseClass}:\n`;
          
          if (cls.attributes && cls.attributes.length > 0) {
            for (const attr of cls.attributes) {
              const typeHint = attr.type ? `: ${attr.type}` : "";
              const defaultVal = attr.default ? ` = ${attr.default}` : "";
              content += `    ${attr.name}${typeHint}${defaultVal}\n`;
            }
          } else {
            content += `    pass\n`;
          }
          content += "\n";
        }

        // Add functions
        for (const func of functions) {
          const params = func.params ? func.params.join(", ") : "";
          content += `def ${func.name}(${params}):\n`;
          if (func.docstring) {
            content += `    """${func.docstring}"""\n`;
          }
          content += `    pass\n\n`;
        }

        await fs.writeFile(module_path, content);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                file_path: module_path,
                message: `Created Python module at ${module_path}`,
              }),
            },
          ],
        };
      }

      case "install_package": {
        const { package: pkg, upgrade } = args;
        let cmd = `pip3 install ${pkg}`;
        if (upgrade) cmd += " --upgrade";

        const { stdout, stderr } = await execAsync(cmd);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                output: stdout,
                stderr: stderr || "",
              }),
            },
          ],
        };
      }

      case "create_virtualenv": {
        const { path: venvPath, python_version = "python3" } = args;
        const cmd = `${python_version} -m venv "${venvPath}"`;

        const { stdout, stderr } = await execAsync(cmd);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                venv_path: venvPath,
                message: "Virtual environment created",
                activate: `source ${venvPath}/bin/activate`,
              }),
            },
          ],
        };
      }

      case "run_pytest": {
        const { test_path, options = "" } = args;
        const cmd = `pytest "${test_path}" ${options}`;

        const { stdout, stderr } = await execAsync(cmd);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                output: stdout,
                stderr: stderr || "",
              }),
            },
          ],
        };
      }

      case "type_check": {
        const { target_path, strict, ignore_missing_imports } = args;
        let cmd = `mypy "${target_path}"`;
        if (strict) cmd += " --strict";
        if (ignore_missing_imports) cmd += " --ignore-missing-imports";

        const { stdout, stderr } = await execAsync(cmd);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                output: stdout,
                stderr: stderr || "",
              }),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
            stderr: error.stderr || "",
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Python SDK MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
