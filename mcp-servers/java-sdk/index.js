#!/usr/bin/env node

/**
 * MCP Server for Java SDK
 * Provides tools for Java development, compilation, and execution
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
    name: "java-sdk-server",
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
    name: "compile_java",
    description: "Compile Java source file(s) using javac",
    inputSchema: {
      type: "object",
      properties: {
        source_file: {
          type: "string",
          description: "Path to Java source file (.java)",
        },
        output_dir: {
          type: "string",
          description: "Output directory for compiled .class files (optional)",
        },
        classpath: {
          type: "string",
          description: "Classpath for compilation (optional)",
        },
      },
      required: ["source_file"],
    },
  },
  {
    name: "run_java",
    description: "Run compiled Java class with main method",
    inputSchema: {
      type: "object",
      properties: {
        class_name: {
          type: "string",
          description: "Fully qualified class name (e.g., com.example.Main)",
        },
        classpath: {
          type: "string",
          description: "Classpath for execution (optional)",
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Command line arguments (optional)",
        },
      },
      required: ["class_name"],
    },
  },
  {
    name: "create_java_class",
    description: "Create a new Java class file with basic structure",
    inputSchema: {
      type: "object",
      properties: {
        package_name: {
          type: "string",
          description: "Package name (e.g., com.example)",
        },
        class_name: {
          type: "string",
          description: "Class name",
        },
        output_dir: {
          type: "string",
          description: "Output directory for the file",
        },
        class_type: {
          type: "string",
          enum: ["class", "interface", "enum"],
          description: "Type of Java file to create",
        },
      },
      required: ["class_name", "output_dir"],
    },
  },
  {
    name: "run_maven_command",
    description: "Execute Maven command (compile, test, package, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Maven command (e.g., 'clean install', 'test', 'package')",
        },
        project_dir: {
          type: "string",
          description: "Project directory containing pom.xml",
        },
      },
      required: ["command", "project_dir"],
    },
  },
  {
    name: "run_gradle_command",
    description: "Execute Gradle command (build, test, run, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Gradle command (e.g., 'build', 'test', 'run')",
        },
        project_dir: {
          type: "string",
          description: "Project directory containing build.gradle",
        },
      },
      required: ["command", "project_dir"],
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
      case "compile_java": {
        const { source_file, output_dir, classpath } = args;
        let cmd = `javac "${source_file}"`;
        if (output_dir) cmd += ` -d "${output_dir}"`;
        if (classpath) cmd += ` -cp "${classpath}"`;

        const { stdout, stderr } = await execAsync(cmd);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                stdout: stdout || "Compilation successful",
                stderr: stderr || "",
              }),
            },
          ],
        };
      }

      case "run_java": {
        const { class_name, classpath, args: javaArgs } = args;
        let cmd = `java`;
        if (classpath) cmd += ` -cp "${classpath}"`;
        cmd += ` ${class_name}`;
        if (javaArgs && javaArgs.length > 0) {
          cmd += ` ${javaArgs.join(" ")}`;
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

      case "create_java_class": {
        const { package_name, class_name, output_dir, class_type = "class" } = args;
        
        // Create package directory structure
        const packagePath = package_name ? package_name.replace(/\./g, "/") : "";
        const fullDir = path.join(output_dir, packagePath);
        await fs.mkdir(fullDir, { recursive: true });

        // Generate class content
        let content = "";
        if (package_name) {
          content += `package ${package_name};\n\n`;
        }
        
        if (class_type === "interface") {
          content += `public interface ${class_name} {\n    // Interface methods\n}\n`;
        } else if (class_type === "enum") {
          content += `public enum ${class_name} {\n    // Enum constants\n}\n`;
        } else {
          content += `public class ${class_name} {\n    public static void main(String[] args) {\n        System.out.println("Hello from ${class_name}");\n    }\n}\n`;
        }

        const filePath = path.join(fullDir, `${class_name}.java`);
        await fs.writeFile(filePath, content);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                file_path: filePath,
                message: `Created ${class_type} ${class_name}`,
              }),
            },
          ],
        };
      }

      case "run_maven_command": {
        const { command, project_dir } = args;
        const cmd = `cd "${project_dir}" && mvn ${command}`;
        
        const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 });
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

      case "run_gradle_command": {
        const { command, project_dir } = args;
        const cmd = `cd "${project_dir}" && ./gradlew ${command}`;
        
        const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 });
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
  console.error("Java SDK MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
