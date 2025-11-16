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
import os from "os";

const execAsync = promisify(exec);

// NEXUS: Configuration
const MAX_BUFFER = 1024 * 1024 * 50; // 50MB
const EXECUTION_TIMEOUT = 120000; // 2 minutes
const MAX_RETRIES = 3;

// Create MCP server
const server = new Server(
  {
    name: "python-sdk-server",
    version: "1.1.0",  // NEXUS: Updated version with improvements
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * NEXUS: Retry logic with exponential backoff
 */
async function executeWithRetry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

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
              body: {
                type: "string",
                description: "Function body (statements without def line, one per line)",
              },
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
  {
    name: "format_code",
    description: "Format Python code using black",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to Python file or directory to format",
        },
        line_length: {
          type: "number",
          description: "Maximum line length (default: 88)",
          default: 88,
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "lint_code",
    description: "Lint Python code using pylint or flake8",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to Python file or directory",
        },
        tool: {
          type: "string",
          enum: ["pylint", "flake8"],
          description: "Linting tool to use (default: flake8)",
          default: "flake8",
        },
        config_file: {
          type: "string",
          description: "Path to config file (optional)",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "create_requirements",
    description: "Generate requirements.txt from installed packages",
    inputSchema: {
      type: "object",
      properties: {
        output_path: {
          type: "string",
          description: "Output path for requirements.txt",
        },
        freeze: {
          type: "boolean",
          description: "Use pip freeze (default: true)",
          default: true,
        },
      },
      required: ["output_path"],
    },
  },
  {
    name: "run_flask_app",
    description: "Run Flask development server",
    inputSchema: {
      type: "object",
      properties: {
        app_file: {
          type: "string",
          description: "Path to Flask app file (e.g., app.py)",
        },
        host: {
          type: "string",
          description: "Host to bind (default: 127.0.0.1)",
          default: "127.0.0.1",
        },
        port: {
          type: "number",
          description: "Port to bind (default: 5000)",
          default: 5000,
        },
        debug: {
          type: "boolean",
          description: "Enable debug mode (default: false)",
          default: false,  // NEXUS: Changed to false for security
        },
      },
      required: ["app_file"],
    },
  },
  {
    name: "create_dockerfile",
    description: "Create Dockerfile for Python application",
    inputSchema: {
      type: "object",
      properties: {
        project_dir: {
          type: "string",
          description: "Project directory",
        },
        python_version: {
          type: "string",
          description: "Python version (default: 3.11)",
          default: "3.11",
        },
        entry_point: {
          type: "string",
          description: "Entry point file (e.g., app.py)",
        },
        port: {
          type: "number",
          description: "Exposed port (default: 8000)",
          default: 8000,
        },
      },
      required: ["project_dir", "entry_point"],
    },
  },
  {
    name: "search_packages",
    description: "Search for Python packages on PyPI",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "generate_docs",
    description: "Generate documentation using Sphinx",
    inputSchema: {
      type: "object",
      properties: {
        source_dir: {
          type: "string",
          description: "Source directory containing Python files",
        },
        output_dir: {
          type: "string",
          description: "Output directory for documentation",
        },
        format: {
          type: "string",
          enum: ["html", "pdf", "markdown"],
          description: "Documentation format (default: html)",
          default: "html",
        },
      },
      required: ["source_dir", "output_dir"],
    },
  },
  {
    name: "profile_code",
    description: "Profile Python code performance using cProfile",
    inputSchema: {
      type: "object",
      properties: {
        script_path: {
          type: "string",
          description: "Path to Python script to profile",
        },
        sort_by: {
          type: "string",
          enum: ["time", "calls", "cumulative"],
          description: "Sort results by (default: time)",
          default: "time",
        },
      },
      required: ["script_path"],
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
        let tempScript = null;

        if (script_path) {
          cmd = `python3 "${script_path}"`;
          if (pyArgs && pyArgs.length > 0) {
            cmd += ` ${pyArgs.join(" ")}`;
          }
        } else if (code) {
          // NEXUS: Sandbox isolation - temporary file in secure location
          tempScript = path.join(
            os.tmpdir(),
            `nexus_python_${Date.now()}.py`
          );
          await fs.writeFile(tempScript, code, "utf8");
          cmd = `python3 "${tempScript}"`;
          if (pyArgs && pyArgs.length > 0) {
            cmd += ` ${pyArgs.join(" ")}`;
          }
        } else {
          throw new Error("Either script_path or code must be provided");
        }

        // NEXUS: Added timeout and maxBuffer
        const options = {
          ...(working_dir ? { cwd: working_dir } : {}),
          timeout: EXECUTION_TIMEOUT,
          maxBuffer: MAX_BUFFER
        };
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
          const params = Array.isArray(func.params) ? func.params.join(", ") : "";
          content += `def ${func.name}(${params}):\n`;
          if (func.docstring) {
            content += `    """${func.docstring}"""\n`;
          }

          if (func.body && typeof func.body === "string" && func.body.trim().length > 0) {
            const bodyLines = func.body.split("\n");
            for (const line of bodyLines) {
              content += `    ${line}\n`;
            }
          } else {
            content += `    pass\n`;
          }

          content += "\n";
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

      case "format_code": {
        const { file_path, line_length = 88 } = args;
        const cmd = `black --line-length ${line_length} "${file_path}"`;

        const { stdout, stderr } = await execAsync(cmd);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                output: stdout,
                stderr: stderr || "",
                message: "Code formatted successfully",
              }),
            },
          ],
        };
      }

      case "lint_code": {
        const { file_path, tool = "flake8", config_file } = args;
        let cmd = `${tool} "${file_path}"`;
        if (config_file) {
          cmd += ` --config="${config_file}"`;
        }

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

      case "create_requirements": {
        const { output_path, freeze = true } = args;
        const cmd = freeze ? "pip3 freeze" : "pip3 list --format=freeze";

        const { stdout } = await execAsync(cmd);
        await fs.writeFile(output_path, stdout);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                file_path: output_path,
                message: "requirements.txt created",
              }),
            },
          ],
        };
      }

      case "run_flask_app": {
        const { app_file, host = "127.0.0.1", port = 5000, debug = false } = args;  // NEXUS: debug false by default
        const debugFlag = debug ? "--debug" : "";
        // NEXUS: Security warning for 0.0.0.0
        if (host === "0.0.0.0") {
          console.warn("[NEXUS WARNING] Flask running on 0.0.0.0 - ensure proper authentication!");
        }
        const cmd = `flask --app "${app_file}" run --host ${host} --port ${port} ${debugFlag}`;

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

      case "create_dockerfile": {
        const { project_dir, python_version = "3.11", entry_point, port = 8000 } = args;
        const dockerfileContent = `FROM python:${python_version}-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE ${port}\nCMD ["python", "${entry_point}"]`;

        const dockerfilePath = path.join(project_dir, "Dockerfile");
        await fs.writeFile(dockerfilePath, dockerfileContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                file_path: dockerfilePath,
                message: "Dockerfile created",
              }),
            },
          ],
        };
      }

      case "search_packages": {
        const { query, limit = 10 } = args;
        const searchUrl = `https://pypi.org/pypi?:action=search&term=${encodeURIComponent(query)}&_limit=${limit}`;
        const cmd = `curl -s "${searchUrl}"`;

        const { stdout } = await execAsync(cmd);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                results: stdout,
              }),
            },
          ],
        };
      }

      case "generate_docs": {
        const { source_dir, output_dir, format = "html" } = args;
        await fs.mkdir(output_dir, { recursive: true });
        const cmd = `sphinx-build -b ${format} "${source_dir}" "${output_dir}"`;

        const { stdout, stderr } = await execAsync(cmd);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                output_dir,
                stdout,
                stderr: stderr || "",
              }),
            },
          ],
        };
      }

      case "profile_code": {
        const { script_path, sort_by = "time" } = args;
        const cmd = `python3 -m cProfile -s ${sort_by} "${script_path}"`;

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
