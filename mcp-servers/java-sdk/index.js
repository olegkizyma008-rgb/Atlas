#!/usr/bin/env node

/**
 * MCP Server for Java SDK
 * Provides tools for building, testing, packaging, and analyzing Java projects
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
const MAX_BUFFER = 1024 * 1024 * 20;
const MAX_RETRIES = 3;
const COMPILATION_TIMEOUT = 120000; // 2 minutes

const server = new Server(
  {
    name: "java-sdk-server",
    version: "2.1.0",  // NEXUS: Updated version with improvements
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
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

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
        options: {
          type: "string",
          description: "Additional javac options (optional)",
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
        jvm_options: {
          type: "string",
          description: "Additional JVM options (optional)",
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
    name: "create_maven_project",
    description: "Create a new Maven project using archetype generation",
    inputSchema: {
      type: "object",
      properties: {
        group_id: {
          type: "string",
          description: "Group ID for the project (e.g., com.example)",
        },
        artifact_id: {
          type: "string",
          description: "Artifact ID for the project (e.g., my-app)",
        },
        output_dir: {
          type: "string",
          description: "Directory where the project should be generated",
        },
        version: {
          type: "string",
          description: "Project version (default: 1.0-SNAPSHOT)",
          default: "1.0-SNAPSHOT",
        },
        package_name: {
          type: "string",
          description: "Base package for generated sources (defaults to groupId)",
        },
        archetype: {
          type: "string",
          description: "Maven archetype artifactId (default: maven-archetype-quickstart)",
          default: "maven-archetype-quickstart",
        },
      },
      required: ["group_id", "artifact_id", "output_dir"],
    },
  },
  {
    name: "create_gradle_project",
    description: "Initialize a Gradle project using gradle init",
    inputSchema: {
      type: "object",
      properties: {
        project_dir: {
          type: "string",
          description: "Directory where the project should be created",
        },
        project_name: {
          type: "string",
          description: "Project name (defaults to directory name)",
        },
        package_name: {
          type: "string",
          description: "Base package for generated sources",
        },
        project_type: {
          type: "string",
          description: "Gradle project type (default: java-application)",
          default: "java-application",
        },
        dsl: {
          type: "string",
          description: "Gradle DSL (groovy or kotlin)",
          default: "groovy",
        },
        test_framework: {
          type: "string",
          description: "Test framework (default: junit-jupiter)",
          default: "junit-jupiter",
        },
        wrapper: {
          type: "string",
          description: "Gradle executable to use (default: gradle)",
          default: "gradle",
        },
      },
      required: ["project_dir"],
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
        options: {
          type: "string",
          description: "Additional Maven options (optional)",
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
        wrapper: {
          type: "string",
          enum: ["gradlew", "gradlew.bat", "gradle"],
          description: "Gradle executable to use (default: gradlew)",
          default: "gradlew",
        },
      },
      required: ["command", "project_dir"],
    },
  },
  {
    name: "add_dependency",
    description: "Add a dependency declaration to Maven (pom.xml) or Gradle build files",
    inputSchema: {
      type: "object",
      properties: {
        build_file: {
          type: "string",
          description: "Path to pom.xml, build.gradle, or build.gradle.kts",
        },
        group_id: {
          type: "string",
          description: "Dependency group ID",
        },
        artifact_id: {
          type: "string",
          description: "Dependency artifact ID",
        },
        version: {
          type: "string",
          description: "Dependency version (optional for Gradle when using BOMs)",
        },
        scope: {
          type: "string",
          description: "Dependency scope/configuration (e.g., compile, test, runtime)",
        },
      },
      required: ["build_file", "group_id", "artifact_id"],
    },
  },
  {
    name: "run_junit_tests",
    description: "Execute JUnit tests using Maven, Gradle, or the Console Launcher",
    inputSchema: {
      type: "object",
      properties: {
        test_class: {
          type: "string",
          description: "Fully qualified test class name (optional)",
        },
        build_tool: {
          type: "string",
          enum: ["maven", "gradle", "none"],
          description: "Build tool to use (default: maven)",
          default: "maven",
        },
        project_dir: {
          type: "string",
          description: "Project directory containing build files",
        },
        classpath: {
          type: "string",
          description: "Classpath to use when build_tool is 'none'",
        },
        console_launcher_jar: {
          type: "string",
          description: "Path to junit-platform-console-standalone JAR when build_tool is 'none'",
        },
      },
    },
  },
  {
    name: "create_jar",
    description: "Package compiled classes into a JAR (optionally executable)",
    inputSchema: {
      type: "object",
      properties: {
        input_dir: {
          type: "string",
          description: "Directory containing compiled .class files",
        },
        output_jar: {
          type: "string",
          description: "Path to output JAR file",
        },
        main_class: {
          type: "string",
          description: "Main class for executable JAR (optional)",
        },
      },
      required: ["input_dir", "output_jar"],
    },
  },
  {
    name: "analyze_code",
    description: "Run static analysis using Maven Checkstyle or SpotBugs plugins",
    inputSchema: {
      type: "object",
      properties: {
        project_dir: {
          type: "string",
          description: "Project directory containing pom.xml",
        },
        tool: {
          type: "string",
          enum: ["checkstyle", "spotbugs"],
          description: "Analysis tool to invoke (default: checkstyle)",
          default: "checkstyle",
        },
        config_file: {
          type: "string",
          description: "Optional configuration file for the analysis tool",
        },
      },
      required: ["project_dir"],
    },
  },
  {
    name: "format_code",
    description: "Format Java code using Google Java Format",
    inputSchema: {
      type: "object",
      properties: {
        source_path: {
          type: "string",
          description: "Path to Java file or directory to format",
        },
        replace: {
          type: "boolean",
          description: "Replace files in-place (default: true)",
          default: true,
        },
      },
      required: ["source_path"],
    },
  },
  {
    name: "generate_javadoc",
    description: "Generate Javadoc documentation",
    inputSchema: {
      type: "object",
      properties: {
        source_dir: {
          type: "string",
          description: "Source directory containing Java files",
        },
        output_dir: {
          type: "string",
          description: "Output directory for generated documentation",
        },
        classpath: {
          type: "string",
          description: "Classpath for documentation generation (optional)",
        },
      },
      required: ["source_dir", "output_dir"],
    },
  },
  {
    name: "run_spring_boot",
    description: "Run Spring Boot application",
    inputSchema: {
      type: "object",
      properties: {
        project_dir: {
          type: "string",
          description: "Project directory containing Spring Boot app",
        },
        profile: {
          type: "string",
          description: "Spring profile to activate (e.g., dev, prod)",
        },
        port: {
          type: "number",
          description: "Server port (optional)",
        },
      },
      required: ["project_dir"],
    },
  },
  {
    name: "create_dockerfile",
    description: "Create Dockerfile for Java application",
    inputSchema: {
      type: "object",
      properties: {
        project_dir: {
          type: "string",
          description: "Project directory",
        },
        base_image: {
          type: "string",
          description: "Base Docker image (default: openjdk:17-slim)",
          default: "openjdk:17-slim",
        },
        jar_name: {
          type: "string",
          description: "JAR file name",
        },
        port: {
          type: "number",
          description: "Exposed port (default: 8080)",
          default: 8080,
        },
      },
      required: ["project_dir", "jar_name"],
    },
  },
  {
    name: "search_dependencies",
    description: "Search for dependencies in Maven Central",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (artifact name or group:artifact)",
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
    name: "decompile_class",
    description: "Decompile .class file to Java source using javap",
    inputSchema: {
      type: "object",
      properties: {
        class_file: {
          type: "string",
          description: "Path to .class file",
        },
        verbose: {
          type: "boolean",
          description: "Show verbose output (default: false)",
          default: false,
        },
      },
      required: ["class_file"],
    },
  },
];

function assertString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function quote(value) {
  return String(value).replace(/"/g, '\\"');
}

async function ensureDirectory(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function buildMavenDependencySnippet({ groupId, artifactId, version, scope }) {
  let snippet = "    <dependency>\n";
  snippet += `      <groupId>${groupId}</groupId>\n`;
  snippet += `      <artifactId>${artifactId}</artifactId>\n`;
  if (version) {
    snippet += `      <version>${version}</version>\n`;
  }
  if (scope) {
    snippet += `      <scope>${scope}</scope>\n`;
  }
  snippet += "    </dependency>";
  return snippet;
}

function mapScopeToGradleConfiguration(scope = "implementation") {
  const normalized = (scope || "").toLowerCase();
  switch (normalized) {
    case "test":
    case "testimplementation":
      return "testImplementation";
    case "runtime":
    case "runtimeonly":
      return "runtimeOnly";
    case "compileonly":
    case "provided":
      return "compileOnly";
    case "annotationprocessor":
      return "annotationProcessor";
    default:
      return "implementation";
  }
}

function buildGradleDependencyLine({ groupId, artifactId, version, scope }) {
  const configuration = mapScopeToGradleConfiguration(scope);
  const coordinates = version
    ? `${groupId}:${artifactId}:${version}`
    : `${groupId}:${artifactId}`;
  return `    ${configuration} "${coordinates}"`;
}

async function addDependencyToPom(buildFile, dependency) {
  const content = await fs.readFile(buildFile, "utf8");
  const snippet = buildMavenDependencySnippet(dependency);
  if (content.includes(snippet)) {
    return { changed: false, content, message: "Dependency already present" };
  }

  if (content.includes("</dependencies>")) {
    const updated = content.replace(
      /<\/dependencies>/,
      `${snippet}\n  </dependencies>`
    );
    return { changed: true, content: updated, message: "Dependency added to existing <dependencies> block" };
  }

  if (!content.includes("<project")) {
    throw new Error("Invalid pom.xml: missing <project> root element");
  }

  const dependenciesBlock = `  <dependencies>\n${snippet}\n  </dependencies>\n`;
  const updated = content.replace(
    /<\/project>/,
    `${dependenciesBlock}</project>`
  );
  return { changed: true, content: updated, message: "Created new <dependencies> block" };
}

async function addDependencyToGradle(buildFile, dependency) {
  const content = await fs.readFile(buildFile, "utf8");
  const line = buildGradleDependencyLine(dependency);
  if (content.includes(line.trim())) {
    return { changed: false, content, message: "Dependency already present" };
  }

  const dependenciesRegex = /dependencies\s*\{/;
  if (!dependenciesRegex.test(content)) {
    const block = `\ndependencies {\n${line}\n}\n`;
    return {
      changed: true,
      content: content + block,
      message: "Created new dependencies block",
    };
  }

  const updated = content.replace(dependenciesRegex, (match) => `${match}\n${line}`);
  return {
    changed: true,
    content: updated,
    message: "Dependency added to dependencies block",
  };
}

const TOOL_HANDLERS = {
  async compile_java(args) {
    const { source_file, output_dir, classpath, options } = args;
    assertString(source_file, "source_file");

    let cmd = `javac "${source_file}"`;
    if (output_dir) cmd += ` -d "${output_dir}"`;
    if (classpath) cmd += ` -cp "${classpath}"`;
    if (options) cmd += ` ${options}`;

    // NEXUS: Retry logic with timeout
    const { stdout, stderr } = await executeWithRetry(async () => {
      return await execAsync(cmd, {
        maxBuffer: MAX_BUFFER,
        timeout: COMPILATION_TIMEOUT  // NEXUS: Added timeout
      });
    });

    return {
      success: true,
      message: "Compilation successful",
      output: stdout,
      stderr: stderr || "",
    };
  },

  async run_java(args) {
    const { class_name, classpath, args: javaArgs, jvm_options } = args;
    assertString(class_name, "class_name");
    let cmd = "java";
    if (jvm_options) cmd += ` ${jvm_options}`;
    if (classpath) cmd += ` -cp "${quote(classpath)}"`;
    cmd += ` ${class_name}`;
    if (javaArgs && Array.isArray(javaArgs) && javaArgs.length > 0) {
      cmd += ` ${javaArgs.map((arg) => `"${quote(arg)}"`).join(" ")}`;
    }

    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: MAX_BUFFER });
    return {
      success: true,
      output: stdout,
      stderr: stderr || "",
    };
  },

  async create_java_class(args) {
    const { package_name, class_name, output_dir, class_type = "class" } = args;
    assertString(class_name, "class_name");
    assertString(output_dir, "output_dir");
    const packagePath = package_name ? package_name.replace(/\./g, "/") : "";
    const fullDir = path.join(output_dir, packagePath);
    await ensureDirectory(fullDir);

    let content = "";
    if (package_name) {
      content += `package ${package_name};\n\n`;
    }

    if (class_type === "interface") {
      content += `public interface ${class_name} {\n    // TODO: Define interface methods\n}\n`;
    } else if (class_type === "enum") {
      content += `public enum ${class_name} {\n    // TODO: Define enum constants\n}\n`;
    } else {
      content += `public class ${class_name} {\n    public static void main(String[] args) {\n        System.out.println("Hello from ${class_name}");\n    }\n}\n`;
    }

    const filePath = path.join(fullDir, `${class_name}.java`);
    await fs.writeFile(filePath, content, "utf8");
    return {
      success: true,
      file_path: filePath,
      message: `Created ${class_type} ${class_name}`,
    };
  },

  async create_maven_project(args) {
    const {
      group_id,
      artifact_id,
      output_dir,
      version = "1.0-SNAPSHOT",
      package_name,
      archetype = "maven-archetype-quickstart",
    } = args;
    assertString(group_id, "group_id");
    assertString(artifact_id, "artifact_id");
    assertString(output_dir, "output_dir");

    const workingDir = path.resolve(output_dir);
    await ensureDirectory(workingDir);
    const pkg = package_name || group_id;
    const command = `mvn archetype:generate -DgroupId=${group_id} -DartifactId=${artifact_id} -Dversion=${version} -DarchetypeArtifactId=${archetype} -Dpackage=${pkg} -DinteractiveMode=false`;
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      maxBuffer: MAX_BUFFER,
    });

    return {
      success: true,
      project_dir: path.join(workingDir, artifact_id),
      stdout,
      stderr: stderr || "",
    };
  },

  async create_gradle_project(args) {
    const {
      project_dir,
      project_name,
      package_name,
      project_type = "java-application",
      dsl = "groovy",
      test_framework = "junit-jupiter",
      wrapper = "gradle",
    } = args;
    assertString(project_dir, "project_dir");

    const targetDir = path.resolve(project_dir);
    await ensureDirectory(targetDir);
    const name = project_name || path.basename(targetDir);
    const pkg = package_name || "com.example";

    const command = `${wrapper} init --no-daemon --type ${project_type} --dsl ${dsl} --test-framework ${test_framework} --project-name ${name} --package ${pkg}`;
    const { stdout, stderr } = await execAsync(command, {
      cwd: targetDir,
      maxBuffer: MAX_BUFFER,
    });

    return {
      success: true,
      project_dir: targetDir,
      stdout,
      stderr: stderr || "",
    };
  },

  async run_maven_command(args) {
    const { command, project_dir, options } = args;
    assertString(command, "command");
    assertString(project_dir, "project_dir");
    const cmd = `mvn ${command}${options ? ` ${options}` : ""}`;
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: project_dir,
      maxBuffer: MAX_BUFFER,
    });
    return {
      success: true,
      output: stdout,
      stderr: stderr || "",
    };
  },

  async run_gradle_command(args) {
    const { command, project_dir, wrapper = "gradlew" } = args;
    assertString(command, "command");
    assertString(project_dir, "project_dir");
    const cmd = `${wrapper} ${command}`;
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: project_dir,
      maxBuffer: MAX_BUFFER,
    });
    return {
      success: true,
      output: stdout,
      stderr: stderr || "",
    };
  },

  async add_dependency(args) {
    const { build_file, group_id, artifact_id, version, scope } = args;
    assertString(build_file, "build_file");
    assertString(group_id, "group_id");
    assertString(artifact_id, "artifact_id");

    const dependency = {
      groupId: group_id,
      artifactId: artifact_id,
      version,
      scope,
    };

    let result;
    if (build_file.endsWith("pom.xml")) {
      result = await addDependencyToPom(build_file, dependency);
    } else if (build_file.endsWith(".gradle") || build_file.endsWith(".gradle.kts")) {
      result = await addDependencyToGradle(build_file, dependency);
    } else {
      throw new Error("Unsupported build file. Provide pom.xml, build.gradle, or build.gradle.kts");
    }

    if (result.changed) {
      await fs.writeFile(build_file, result.content, "utf8");
    }

    return {
      success: true,
      message: result.message,
      updated: result.changed,
    };
  },

  async run_junit_tests(args) {
    const {
      test_class,
      build_tool = "maven",
      project_dir,
      classpath,
      console_launcher_jar,
    } = args;

    let cmd;
    const options = {
      cwd: project_dir,
      maxBuffer: MAX_BUFFER,
    };

    if (build_tool === "maven") {
      assertString(project_dir, "project_dir");
      cmd = test_class ? `mvn -Dtest=${test_class} test` : "mvn test";
    } else if (build_tool === "gradle") {
      assertString(project_dir, "project_dir");
      const gradleCmd = test_class ? `test --tests ${test_class}` : "test";
      cmd = `./gradlew ${gradleCmd}`;
    } else {
      assertString(classpath, "classpath");
      assertString(console_launcher_jar, "console_launcher_jar");
      const selection = test_class ? `--select-class ${test_class}` : "--scan-class-path";
      cmd = `java -jar "${quote(console_launcher_jar)}" --class-path "${quote(classpath)}" ${selection}`;
      delete options.cwd;
    }

    const { stdout, stderr } = await execAsync(cmd, options);
    return {
      success: true,
      output: stdout,
      stderr: stderr || "",
    };
  },

  async create_jar(args) {
    const { input_dir, output_jar, main_class } = args;
    assertString(input_dir, "input_dir");
    assertString(output_jar, "output_jar");
    const parentDir = path.dirname(output_jar);
    await ensureDirectory(parentDir);
    const jarCmd = main_class
      ? `jar cfe "${quote(output_jar)}" ${main_class} -C "${quote(input_dir)}" .`
      : `jar cf "${quote(output_jar)}" -C "${quote(input_dir)}" .`;
    const { stdout, stderr } = await execAsync(jarCmd, { maxBuffer: MAX_BUFFER });
    return {
      success: true,
      stdout,
      stderr: stderr || "",
      jar: output_jar,
    };
  },

  async analyze_code(args) {
    const { project_dir, tool = "checkstyle", config_file } = args;
    assertString(project_dir, "project_dir");

    let cmd;
    if (tool === "checkstyle") {
      cmd = "mvn checkstyle:check";
      if (config_file) {
        cmd += ` -Dcheckstyle.config.location=${config_file}`;
      }
    } else if (tool === "spotbugs") {
      cmd = "mvn spotbugs:spotbugs";
    } else {
      throw new Error(`Unsupported analysis tool: ${tool}`);
    }

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: project_dir,
      maxBuffer: MAX_BUFFER,
    });

    return {
      success: true,
      output: stdout,
      stderr: stderr || "",
    };
  },

  async format_code(args) {
    const { source_path, replace = true } = args;
    assertString(source_path, "source_path");

    const replaceFlag = replace ? "--replace" : "";
    const cmd = `java -jar google-java-format.jar ${replaceFlag} "${quote(source_path)}"`;

    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: MAX_BUFFER });
    return {
      success: true,
      output: stdout,
      stderr: stderr || "",
      message: replace ? "Code formatted in-place" : "Formatted code returned",
    };
  },

  async generate_javadoc(args) {
    const { source_dir, output_dir, classpath } = args;
    assertString(source_dir, "source_dir");
    assertString(output_dir, "output_dir");

    await ensureDirectory(output_dir);
    let cmd = `javadoc -d "${quote(output_dir)}" -sourcepath "${quote(source_dir)}" -subpackages .`;
    if (classpath) {
      cmd += ` -classpath "${quote(classpath)}"`;
    }

    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: MAX_BUFFER });
    return {
      success: true,
      output_dir,
      stdout,
      stderr: stderr || "",
    };
  },

  async run_spring_boot(args) {
    const { project_dir, profile, port } = args;
    assertString(project_dir, "project_dir");

    let cmd = "mvn spring-boot:run";
    if (profile) {
      cmd += ` -Dspring-boot.run.profiles=${profile}`;
    }
    if (port) {
      cmd += ` -Dspring-boot.run.arguments=--server.port=${port}`;
    }

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: project_dir,
      maxBuffer: MAX_BUFFER,
    });

    return {
      success: true,
      output: stdout,
      stderr: stderr || "",
    };
  },

  async create_dockerfile(args) {
    const { project_dir, base_image = "openjdk:17-slim", jar_name, port = 8080 } = args;
    assertString(project_dir, "project_dir");
    assertString(jar_name, "jar_name");

    const dockerfileContent = `FROM ${base_image}
WORKDIR /app
COPY target/${jar_name} app.jar
EXPOSE ${port}
ENTRYPOINT ["java", "-jar", "app.jar"]`;

    const dockerfilePath = path.join(project_dir, "Dockerfile");
    await fs.writeFile(dockerfilePath, dockerfileContent, "utf8");

    return {
      success: true,
      file_path: dockerfilePath,
      message: "Dockerfile created",
    };
  },

  async search_dependencies(args) {
    const { query, limit = 10 } = args;
    assertString(query, "query");

    const searchUrl = `https://search.maven.org/solrsearch/select?q=${encodeURIComponent(query)}&rows=${limit}&wt=json`;
    const cmd = `curl -s "${searchUrl}"`;

    const { stdout } = await execAsync(cmd, { maxBuffer: MAX_BUFFER });
    const results = JSON.parse(stdout);

    return {
      success: true,
      results: results.response.docs.map(doc => ({
        group_id: doc.g,
        artifact_id: doc.a,
        latest_version: doc.latestVersion,
        repository_url: `https://mvnrepository.com/artifact/${doc.g}/${doc.a}`,
      })),
    };
  },

  async decompile_class(args) {
    const { class_file, verbose = false } = args;
    assertString(class_file, "class_file");

    const verboseFlag = verbose ? "-v" : "-c";
    const cmd = `javap ${verboseFlag} "${quote(class_file)}"`;

    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: MAX_BUFFER });
    return {
      success: true,
      output: stdout,
      stderr: stderr || "",
    };
  },
};

async function executeTool(name, args = {}) {
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(args);
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await executeTool(name, args ?? {});
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
