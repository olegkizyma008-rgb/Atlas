/**
 * @fileoverview MCP Manager - управління прямими MCP серверами
 * Запускає та керує lifecycle MCP серверів через stdio protocol
 *
 * @version 4.0.0
 * @date 2025-10-13
 */

import { spawn } from 'child_process';
import logger from '../utils/logger.js';
import { normalizeToolName, denormalizeToolName, extractServerName } from '../utils/tool-name-normalizer.js';

/**
 * Представляє один MCP server process
 */
class MCPServer {
  constructor(name, config, process) {
    this.name = name;
    this.config = config;
    this.process = process;
    this.tools = [];
    this.ready = false;
    this.messageId = 0;

    // Buffers для stdio communication
    this.stdoutBuffer = '';
    this.stderrBuffer = '';

    this._setupStreams();
  }

  /**
   * Налаштувати stdio streams для MCP protocol
   * @private
   */
  _setupStreams() {
    // stdout - MCP JSON-RPC messages
    this.process.stdout.on('data', (data) => {
      const chunk = data.toString();
      this.stdoutBuffer += chunk;
      logger.debug('mcp-server', `[MCP ${this.name}] stdout: ${chunk.substring(0, 200)}`);
      this._processStdoutBuffer();
    });

    // stderr - логи (зберігаємо для діагностики)
    this.process.stderr.on('data', (data) => {
      const message = data.toString().trim();
      this.stderrBuffer += message + '\n';

      if (message) {
        // Показуємо npm warnings та errors
        if (message.includes('warn') || message.includes('error') || message.includes('ERR')) {
          logger.warn('mcp-server', `[MCP ${this.name}] stderr: ${message}`);
        } else {
          logger.debug('mcp-server', `[MCP ${this.name}] stderr: ${message}`);
        }
      }
    });

    // Process events
    this.process.on('error', (error) => {
      logger.error('mcp-server', `[MCP ${this.name}] ❌ Process error: ${error.message}`);
      this._cleanupPendingRequests(new Error(`Process error: ${error.message}`));
    });

    this.process.on('exit', (code, signal) => {
      logger.warn('mcp-server', `[MCP ${this.name}] Process exited (code: ${code}, signal: ${signal})`);
      this.ready = false;
      this._cleanupPendingRequests(new Error(`Process exited with code ${code}`));
    });
  }

  /**
   * Обробити накопичений stdout buffer
   * @private
   */
  _processStdoutBuffer() {
    // MCP protocol: JSON-RPC messages розділені newline
    const lines = this.stdoutBuffer.split('\n');
    this.stdoutBuffer = lines.pop() || ''; // Залишити неповну лінію в buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this._handleMCPMessage(message);
      } catch (error) {
        logger.error('mcp-server', `[MCP ${this.name}] ❌ Invalid JSON: ${line}`, { error: error.message });
      }
    }
  }

  /**
   * Обробити MCP protocol message
   * @private
   */
  _handleMCPMessage(message) {
    logger.debug('mcp-server', `[MCP ${this.name}] Received message:`, message);

    // Handle різні типи MCP повідомлень
    if (message.result && message.id) {
      // Response на наш request
      if (this.pendingRequests && this.pendingRequests.has(message.id)) {
        const resolver = this.pendingRequests.get(message.id);
        this.pendingRequests.delete(message.id);
        resolver.resolve(message.result);
      }

      // FIXED: Handle initialize response
      if (message.result.protocolVersion) {
        this.ready = true;
        logger.system('mcp-server', `[MCP ${this.name}] ✅ Server initialized (protocol: ${message.result.protocolVersion})`);
      }
    } else if (message.method === 'initialized') {
      // Server готовий після ініціалізації
      this.ready = true;
      logger.system('mcp-server', `[MCP ${this.name}] Server initialized`);
    } else if (message.method === 'tools/listChanged') {
      // Notification про зміну tools
      logger.debug('mcp-server', `[MCP ${this.name}] Tools list changed, requesting update...`);
      this.requestToolsList();
    } else if (message.error) {
      // Error response - log with more details
      const errorDetails = {
        server: this.name,
        errorCode: message.error.code || 'UNKNOWN',
        errorMessage: message.error.message || 'No error message provided',
        errorData: message.error.data || null,
        messageId: message.id || null
      };

      // Only log as error if it's not a common/expected error
      const isExpectedError = message.error.code === -32601 || // Method not found
        message.error.code === -32602 || // Invalid params
        message.error.message?.includes('not supported');

      if (isExpectedError) {
        logger.debug('mcp-server', `[MCP ${this.name}] Expected error response:`, errorDetails);
      } else {
        logger.error('mcp-server', `[MCP ${this.name}] Error response:`, errorDetails);
      }

      if (message.id && this.pendingRequests && this.pendingRequests.has(message.id)) {
        const resolver = this.pendingRequests.get(message.id);
        this.pendingRequests.delete(message.id);
        resolver.reject(new Error(message.error.message || 'Unknown MCP error'));
      }
    }
  }

  /**
   * Ініціалізувати MCP server (handshake)
   */
  async initialize() {
    logger.system('mcp-server', `[MCP ${this.name}] Initializing...`);
    logger.debug('mcp-server', `[MCP ${this.name}] Command: ${this.config.command} ${this.config.args.join(' ')}`);

    const initMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',  // FIXED: MCP standard protocol version (було '1.0')
        capabilities: {
          tools: { listChanged: true }
        },
        clientInfo: {
          name: 'atlas-orchestrator',
          version: '4.0.0'
        }
      }
    };

    try {
      this.process.stdin.write(JSON.stringify(initMessage) + '\n');
      logger.debug('mcp-server', `[MCP ${this.name}] Initialize message sent, waiting for response...`);
    } catch (error) {
      logger.error('mcp-server', `[MCP ${this.name}] Failed to send initialize message: ${error.message}`);
      throw error;
    }

    // Store initialize request for tracking
    const initId = this.messageId;
    if (!this.pendingRequests) {
      this.pendingRequests = new Map();
    }

    // Wait for initialize response
    const initPromise = new Promise((resolve, reject) => {
      this.pendingRequests.set(initId, {
        resolve: (result) => {
          if (result.protocolVersion) {
            this.ready = true;
            logger.system('mcp-server', `[MCP ${this.name}] ✅ Initialized with protocol ${result.protocolVersion}`);
          }
          resolve(result);
        },
        reject
      });

      // Timeout 20s for Mac M1 + npx
      setTimeout(() => {
        if (!this.ready) {
          logger.warn('mcp-server', `[MCP ${this.name}] ⚠️ Initialization timeout after 20s`);
          logger.debug('mcp-server', `[MCP ${this.name}] Stdout buffer: ${this.stdoutBuffer}`);
          logger.debug('mcp-server', `[MCP ${this.name}] Stderr buffer: ${this.stderrBuffer}`);

          // Don't reject - some servers work without explicit init confirmation
          this.ready = true; // Force ready state
          logger.system('mcp-server', `[MCP ${this.name}] ⚠️ Proceeding despite timeout`);
          this.pendingRequests.delete(initId);
          resolve();
        }
      }, 20000);
    });

    await initPromise;

    logger.system('mcp-server', `[MCP ${this.name}] ✅ Ready`);

    // FIXED: Після ініціалізації запитати список tools
    await this.requestToolsList();
  }

  /**
   * Запитати список доступних tools у MCP server
   * @private
   */
  async requestToolsList() {
    logger.debug('mcp-server', `[MCP ${this.name}] Requesting tools list...`);

    const messageId = ++this.messageId;
    const listMessage = {
      jsonrpc: '2.0',
      id: messageId,
      method: 'tools/list',
      params: {}
    };

    // Створити pending request для tools/list
    if (!this.pendingRequests) {
      this.pendingRequests = new Map();
    }

    const toolsPromise = new Promise((resolve, reject) => {
      this.pendingRequests.set(messageId, {
        resolve: (result) => {
          // Витягти tools з response
          if (result && Array.isArray(result.tools)) {
            this.tools = result.tools;
            logger.system('mcp-server', `[MCP ${this.name}] ✅ Loaded ${this.tools.length} tools`);
            if (this.tools.length > 0) {
              logger.debug('mcp-server', `[MCP ${this.name}] Tools: ${this.tools.map(t => t.name).join(', ')}`);
            }
          } else {
            logger.warn('mcp-server', `[MCP ${this.name}] ⚠️ No tools returned`);
            this.tools = [];
          }
          resolve();
        },
        reject
      });

      // Timeout 20s (INCREASED 14.10.2025 - some MCP servers are slow to list tools)
      setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          logger.warn('mcp-server', `[MCP ${this.name}] ⚠️ Tools list request timeout after 20s`);
          logger.debug('mcp-server', `[MCP ${this.name}] This may indicate the MCP server doesn't support tools/list or is too slow`);
          this.tools = []; // Fallback на пустий масив
          resolve(); // НЕ reject - сервер може працювати без tools
        }
      }, 20000);
    });

    try {
      this.process.stdin.write(JSON.stringify(listMessage) + '\n');
      await toolsPromise;
    } catch (error) {
      logger.warn('mcp-server', `[MCP ${this.name}] ⚠️ Failed to get tools list: ${error.message}`);
      this.tools = []; // Fallback
    }
  }

  /**
   * Викликати tool через MCP protocol
   *
   * @param {string} toolName - Назва tool
   * @param {Object} parameters - Параметри для tool
   * @returns {Promise<Object>} Результат виконання
   */
  async call(toolName, parameters) {
    if (!this.ready) {
      throw new Error(`MCP server ${this.name} not ready`);
    }

    const messageId = ++this.messageId;

    const request = {
      jsonrpc: '2.0',
      id: messageId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters
      }
    };

    logger.debug('mcp-server', `[MCP ${this.name}] Calling tool: ${toolName}`, parameters);

    // Створити pending request
    if (!this.pendingRequests) {
      this.pendingRequests = new Map();
    }

    const resultPromise = new Promise((resolve, reject) => {
      this.pendingRequests.set(messageId, { resolve, reject });

      // Timeout 60s (INCREASED 14.10.2025 - playwright operations can be slow)
      setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          logger.error('mcp-server', `[MCP ${this.name}] ❌ Tool ${toolName} timeout after 60s`);
          reject(new Error(`Tool ${toolName} timeout after 60s`));
        }
      }, 60000);
    });

    // Відправити request
    this.process.stdin.write(JSON.stringify(request) + '\n');

    return resultPromise;
  }

  /**
   * Cleanup all pending requests (memory leak prevention)
   * Called when process exits or errors occur
   * @private
   */
  _cleanupPendingRequests(error) {
    if (!this.pendingRequests || this.pendingRequests.size === 0) {
      return;
    }

    const count = this.pendingRequests.size;
    logger.warn('mcp-server', `[MCP ${this.name}] ⚠️ Cleaning up ${count} pending requests`);

    // Reject all pending requests
    for (const [id, resolver] of this.pendingRequests.entries()) {
      if (resolver && typeof resolver.reject === 'function') {
        resolver.reject(error || new Error('MCP server terminated'));
      }
    }

    // Clear the map
    this.pendingRequests.clear();
  }

  /**
   * Отримати список доступних tools
   * @returns {Array} Список tool definitions
   */
  getTools() {
    return this.tools;
  }

  /**
   * Зупинити MCP server
   */
  async shutdown() {
    logger.system('mcp-server', `[MCP ${this.name}] Shutting down...`);

    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');

      // Чекати на graceful exit (timeout 3s)
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (!this.process.killed) {
            logger.warn('mcp-server', `[MCP ${this.name}] Force killing...`);
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 3000);

        this.process.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    logger.system('mcp-server', `[MCP ${this.name}] ✅ Stopped`);
  }
}

/**
 * Менеджер для управління множиною MCP серверів
 * OPTIMIZED 2025-10-17: Added tool caching and dynamic loading
 * UPDATED 2025-10-23: Using MCP_REGISTRY for centralized configuration
 */
export class MCPManager {
  /**
   * @param {Object} serversConfig - Конфігурація серверів (з MCP_REGISTRY)
   */
  constructor(serversConfig) {
    this.config = serversConfig;
    this.servers = new Map();

    // OPTIMIZED: Cache available tools to avoid repeated lookups
    this.toolsCache = null;
    this.toolsCacheTimestamp = 0;
    this.toolsCacheTTL = 60000; // 1 minute cache

    // OPTIMIZED: Track tool usage statistics
    this.toolStats = new Map(); // toolName -> { calls, errors, avgTime }
  }

  /**
   * Повертає список всіх доступних tools з усіх MCP серверів
   * OPTIMIZED: Added caching
   * @returns {Array<string>} Масив назв tools
   */
  listTools() {
    // Check cache first
    const now = Date.now();
    if (this.toolsCache && (now - this.toolsCacheTimestamp) < this.toolsCacheTTL) {
      return this.toolsCache;
    }

    // Rebuild cache
    const allTools = [];
    for (const server of this.servers.values()) {
      if (Array.isArray(server.tools)) {
        allTools.push(...server.tools);
      }
    }

    this.toolsCache = allTools;
    this.toolsCacheTimestamp = now;

    return allTools;
  }

  /**
   * Invalidate tools cache (call after server restart)
   */
  invalidateToolsCache() {
    this.toolsCache = null;
    this.toolsCacheTimestamp = 0;
    logger.debug('mcp-manager', '[MCP Manager] Tools cache invalidated');
  }

  /**
   * Запустити всі MCP servers
   */
  async initialize() {
    logger.system('mcp-manager', '[MCP Manager] Starting MCP servers...');

    const startPromises = [];
    const errors = [];

    for (const [name, config] of Object.entries(this.config)) {
      // Запускаємо кожен сервер окремо з error handling
      startPromises.push(
        this.startServer(name, config).catch((error) => {
          logger.error('mcp-manager', `[MCP Manager] ❌ ${name} failed: ${error.message}`);
          errors.push({ name, error: error.message });
          return null; // Продовжуємо з іншими серверами
        })
      );
    }

    await Promise.all(startPromises);

    const successCount = this.servers.size;
    const failedCount = errors.length;

    if (successCount === 0) {
      logger.error('mcp-manager', '[MCP Manager] ❌ No MCP servers started successfully');
      throw new Error('All MCP servers failed to initialize');
    }

    if (failedCount > 0) {
      logger.warn('mcp-manager', `[MCP Manager] ⚠️ ${failedCount} server(s) failed to start: ${errors.map(e => e.name).join(', ')}`);
    }

    logger.system('mcp-manager', `[MCP Manager] ✅ ${successCount}/${successCount + failedCount} servers started`);
  }

  /**
   * Запустити один MCP server
   *
   * @param {string} name - Назва server (filesystem, playwright, etc)
   * @param {Object} config - Конфігурація { command, args, env }
   */
  async startServer(name, config) {
    logger.system('mcp-manager', `[MCP Manager] Starting ${name}...`);

    try {
      // Spawn process
      const childProcess = spawn(config.command, config.args, {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Створити MCP server wrapper
      const server = new MCPServer(name, config, childProcess);

      // Ініціалізувати (handshake)
      await server.initialize();

      this.servers.set(name, server);

      logger.system('mcp-manager', `[MCP Manager] ✅ ${name} started (${server.tools.length} tools)`);

    } catch (error) {
      logger.error('mcp-manager', `[MCP Manager] ❌ Failed to start ${name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Викликати tool на відповідному server
   * FIXED 14.10.2025 - Changed signature to accept (serverName, toolName, parameters)
   * OPTIMIZED 2025-10-17 - Added stats tracking and parameter validation
   *
   * @param {string} serverName - Назва server (напр. "filesystem")
   * @param {string} toolName - Назва tool (напр. "createFile")
   * @param {Object} parameters - Параметри для tool
   * @returns {Promise<Object>} Результат виконання
   */
  async executeTool(serverName, toolName, parameters) {
    const startTime = Date.now();
    const toolKey = `${serverName}:${toolName}`;

    // Initialize stats if not exists
    if (!this.toolStats.has(toolKey)) {
      this.toolStats.set(toolKey, { calls: 0, errors: 0, avgTime: 0 });
    }

    try {
      // Знайти server за назвою
      const server = this.servers.get(serverName);

      if (!server) {
        // FIXED 14.10.2025 - Better error message with list of available servers
        const availableServers = Array.from(this.servers.keys()).join(', ');
        throw new Error(`MCP server '${serverName}' not found. Available servers: ${availableServers}`);
      }

      if (!server.ready) {
        throw new Error(`MCP server ${serverName} not ready`);
      }

      // UPDATED 2025-11-02: Use centralized normalizer
      // Normalize input tool name to internal format (double __)
      const normalizedToolName = normalizeToolName(toolName, serverName);

      // Denormalize for MCP server call (single _)
      const mcpToolName = denormalizeToolName(normalizedToolName);

      // Check if tool exists on server (check both formats)
      const toolExists = Array.isArray(server.tools) &&
        server.tools.some(t => t.name === mcpToolName || normalizeToolName(t.name, serverName) === normalizedToolName);

      if (!toolExists) {
        const availableTools = Array.isArray(server.tools)
          ? server.tools.map(t => normalizeToolName(t.name, serverName)).join(', ')
          : 'none';

        // FIXED 2025-11-16: Return graceful error instead of throwing
        // This allows workflow to continue with fallback handling
        logger.warn('mcp-manager', `[MCP Manager] ⚠️ Tool '${normalizedToolName}' not available on server '${serverName}'. Available: ${availableTools}`);

        return {
          success: false,
          error: `Tool '${normalizedToolName}' not available on server '${serverName}'`,
          availableTools: availableTools,
          suggestion: `Available tools on ${serverName}: ${availableTools}`
        };
      }

      // Find tool definition for validation and actual MCP call
      const tool = server.tools.find(t =>
        t.name === mcpToolName || normalizeToolName(t.name, serverName) === normalizedToolName
      );

      // Validate parameters before calling
      if (tool && tool.inputSchema) {
        this._validateParameters(tool, parameters);
      }

      let callParams = parameters;
      if (serverName === 'filesystem' && parameters && typeof parameters === 'object') {
        callParams = { ...parameters };
        const pathKeys = ['path', 'file_path', 'directory', 'target', 'targetPath', 'sourcePath', 'destinationPath'];
        for (const key of pathKeys) {
          const value = callParams[key];
          if (typeof value === 'string') {
            if (value === '/tmp') {
              callParams[key] = '/private/tmp';
            } else if (value.startsWith('/tmp/')) {
              callParams[key] = '/private/tmp' + value.slice(4);
            }
          }
        }
      }

      // IMPORTANT: Use the original MCP tool name from server.tools for the actual call
      // `tool.name` is what the MCP server advertised in tools/list (e.g. read_file, write_file, execute_command)
      // `mcpToolName` (e.g. filesystem_read_file) may NOT exist on the server and would cause "Unknown tool" errors
      const finalToolName = tool?.name || mcpToolName;

      logger.debug('mcp-manager', `[MCP Manager] Executing ${finalToolName} on ${serverName} (normalized: ${normalizedToolName}, denormalized: ${mcpToolName})`);

      const result = await server.call(finalToolName, callParams);

      // EXTRA DEBUG 2025-11-16: Log raw results for filesystem/shell to diagnose side effects
      // UPDATED 2025-11-16: Also log results for python_sdk and java_sdk to debug SDK MCP behavior
      if (serverName === 'filesystem' || serverName === 'shell' || serverName === 'python_sdk' || serverName === 'java_sdk') {
        try {
          logger.system('mcp-manager',
            `[MCP Manager] RESULT ${serverName}.${finalToolName} ` +
            `params=${JSON.stringify(callParams)} result=${JSON.stringify(result).slice(0, 300)}`
          );
        } catch (logError) {
          logger.debug('mcp-manager', `[MCP Manager] Failed to log tool result: ${logError.message}`);
        }
      }

      // Update stats
      const duration = Date.now() - startTime;
      const stats = this.toolStats.get(toolKey);
      stats.calls++;
      stats.avgTime = Math.round((stats.avgTime * (stats.calls - 1) + duration) / stats.calls);

      logger.debug('mcp-manager', `[MCP Manager] ✅ ${toolName} completed in ${duration}ms`);

      return result;

    } catch (error) {
      // Update error stats
      const stats = this.toolStats.get(toolKey);
      if (stats) {
        stats.errors++;
      }

      logger.error('mcp-manager', `[MCP Manager] ❌ ${toolName} failed: ${error.message}`);
      throw error;
    }
  }

  // REMOVED 2025-11-02: Duplicate simple validation
  // Advanced validation method exists at lines 874+

  /**
   * Get tool usage statistics
   * @returns {Map} Tool stats
   */
  getToolStats() {
    return this.toolStats;
  }

  /**
   * Знайти server який має вказаний tool
   * @private
   */
  findServerForTool(toolName) {
    for (const server of this.servers.values()) {
      // FIXED: Додано перевірку що tools існує і є масивом
      if (!Array.isArray(server.tools)) {
        logger.warn('mcp-manager', `[MCP Manager] Server ${server.name} has invalid tools (not array)`);
        continue;
      }

      const hasTool = server.tools.some(tool =>
        tool.name === toolName || toolName.includes(server.name)
      );

      if (hasTool) {
        return server;
      }
    }

    return null;
  }

  /**
   * Отримати всі доступні tools з усіх servers
   * @returns {Array} Список всіх tool definitions
   */
  getAvailableTools() {
    const allTools = [];

    for (const server of this.servers.values()) {
      // FIXED: Переконуємось що tools є масивом перед map
      if (!Array.isArray(server.tools)) {
        logger.warn('mcp-manager', `[MCP Manager] Server ${server.name} has invalid tools`);
        continue;
      }

      const serverTools = server.getTools().map(tool => ({
        ...tool,
        server: server.name
      }));
      allTools.push(...serverTools);
    }

    return allTools;
  }

  /**
   * Отримати компактний опис доступних MCP серверів і tools
   * Використовується для підстановки в промпти ({{AVAILABLE_TOOLS}})
   *
   * @param {Array<string>} [filterServers] - Опціонально фільтрувати тільки ці сервери (NEW 15.10.2025)
   * @returns {string} Компактний текстовий опис всіх серверів і кількості tools
   */
  getToolsSummary(filterServers = null) {
    const summary = [];

    for (const server of this.servers.values()) {
      if (!Array.isArray(server.tools)) {
        continue;
      }

      // OPTIMIZATION (15.10.2025): Фільтр по конкретних серверах
      if (filterServers && !filterServers.includes(server.name)) {
        continue;
      }

      const toolCount = server.tools.length;
      const toolNames = server.tools.map(t => t.name).slice(0, 5); // Перші 5 tools
      const moreCount = toolCount > 5 ? ` (+${toolCount - 5} more)` : '';

      summary.push(
        `- **${server.name}** (${toolCount} tools): ${toolNames.join(', ')}${moreCount}`
      );
    }

    return summary.join('\n');
  }

  /**
   * Отримати ДЕТАЛЬНИЙ опис tools для конкретних серверів
   * Повертає ВСІ tools з ПОВНОЮ інформацією про параметри для LLM
   * FIXED 2025-10-20: Додано inputSchema параметри, required/optional, приклади
   *
   * @param {Array<string>} serverNames - Назви серверів
   * @returns {string} Детальний опис всіх tools з параметрами
   * @version 4.3.0
   * @date 2025-10-20
   */
  getDetailedToolsSummary(serverNames) {
    const summary = [];

    for (const serverName of serverNames) {
      const server = this.servers.get(serverName);

      if (!server || !Array.isArray(server.tools)) {
        logger.warn('mcp-manager', `[MCP Manager] Server '${serverName}' not found or has no tools`);
        continue;
      }

      const toolsList = server.tools.map(t => {
        let toolInfo = `  **${t.name}**\n    Description: ${t.description || 'No description'}`;

        // Додати параметри з inputSchema
        if (t.inputSchema && t.inputSchema.properties) {
          const props = t.inputSchema.properties;
          const required = t.inputSchema.required || [];

          // Required параметри
          const requiredParams = Object.keys(props)
            .filter(key => required.includes(key))
            .map(key => {
              const prop = props[key];
              const typeInfo = prop.type || 'any';
              const desc = prop.description || '';
              const enumInfo = prop.enum ? ` (values: ${prop.enum.join(', ')})` : '';
              return `      • ${key} (${typeInfo}, REQUIRED)${enumInfo}: ${desc}`;
            });

          // Optional параметри
          const optionalParams = Object.keys(props)
            .filter(key => !required.includes(key))
            .map(key => {
              const prop = props[key];
              const typeInfo = prop.type || 'any';
              const desc = prop.description || '';
              const enumInfo = prop.enum ? ` (values: ${prop.enum.join(', ')})` : '';
              const defaultInfo = prop.default !== undefined ? ` [default: ${JSON.stringify(prop.default)}]` : '';
              return `      • ${key} (${typeInfo}, optional)${enumInfo}${defaultInfo}: ${desc}`;
            });

          if (requiredParams.length > 0 || optionalParams.length > 0) {
            toolInfo += '\n    Parameters:';
            if (requiredParams.length > 0) {
              toolInfo += '\n' + requiredParams.join('\n');
            }
            if (optionalParams.length > 0) {
              toolInfo += '\n' + optionalParams.join('\n');
            }
          }

          // Додати приклад виклику
          const exampleParams = {};
          required.forEach(key => {
            const prop = props[key];
            if (prop.enum) {
              exampleParams[key] = prop.enum[0];
            } else if (prop.type === 'string') {
              exampleParams[key] = prop.description ? `<${key}>` : 'example';
            } else if (prop.type === 'number') {
              exampleParams[key] = prop.default !== undefined ? prop.default : 0;
            } else if (prop.type === 'boolean') {
              exampleParams[key] = prop.default !== undefined ? prop.default : true;
            } else {
              exampleParams[key] = `<${key}>`;
            }
          });

          if (Object.keys(exampleParams).length > 0) {
            toolInfo += `\n    Example call: {"server": "${serverName}", "tool": "${t.name}", "parameters": ${JSON.stringify(exampleParams)}}`;
          }
        }

        return toolInfo;
      });

      summary.push(
        `### Server: **${server.name}** (${server.tools.length} tools)\n\n${toolsList.join('\n\n')}`
      );
    }

    return summary.join('\n\n');
  }

  /**
   * Отримати tools тільки з конкретних серверів
   *
   * @param {Array<string>} serverNames - Назви серверів
   * @returns {Array<Object>} Tools з цих серверів
   * @version 4.2.0
   * @date 2025-10-15
   */
  getToolsFromServers(serverNames) {
    const tools = [];

    for (const serverName of serverNames) {
      const server = this.servers.get(serverName);

      if (!server || !Array.isArray(server.tools)) {
        continue;
      }

      const serverTools = server.tools.map(tool => ({
        ...tool,
        server: server.name
      }));

      tools.push(...serverTools);
    }

    return tools;
  }

  /**
   * Знайти найбільш схожий рядок з масиву (fuzzy matching)
   * Використовує Levenshtein distance та підрядкові збіги
   * @param {string} target - Цільовий рядок
   * @param {Array<string>} candidates - Масив кандидатів
   * @returns {string|null} Найбільш схожий рядок або null
   * @private
   */
  _findSimilarString(target, candidates) {
    if (!target || !candidates || candidates.length === 0) return null;

    const targetLower = target.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const candidateLower = candidate.toLowerCase();
      let score = 0;

      // Прямий збіг (найвищий пріоритет)
      if (candidateLower === targetLower) return candidate;

      // Підрядоковий збіг
      if (candidateLower.includes(targetLower)) {
        score += 0.8;
      } else if (targetLower.includes(candidateLower)) {
        score += 0.7;
      }

      // Levenshtein distance (normalized)
      const distance = this._levenshteinDistance(targetLower, candidateLower);
      const maxLen = Math.max(targetLower.length, candidateLower.length);
      const similarity = 1 - (distance / maxLen);
      score += similarity * 0.5;

      // Збіг початку
      if (candidateLower.startsWith(targetLower) || targetLower.startsWith(candidateLower)) {
        score += 0.3;
      }

      if (score > bestScore && score > 0.5) { // Поріг 50% схожості
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  }

  /**
   * Обчислити Levenshtein distance між двома рядками
   * @param {string} a - Перший рядок
   * @param {string} b - Другий рядок
   * @returns {number} Відстань
   * @private
   */
  _levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Валідувати параметри проти inputSchema інструменту
   * @param {Object} toolDef - Дефініція інструменту з inputSchema
   * @param {Object} parameters - Параметри для валідації
   * @returns {Object} {valid: boolean, errors: Array, suggestions: Array, correctedParams: Object}
   * @private
   */
  _validateParameters(toolDef, parameters = {}) {
    const errors = [];
    const suggestions = [];
    const correctedParams = { ...parameters };
    let hasCorrections = false;

    const schema = toolDef.inputSchema;
    if (!schema || !schema.properties) {
      return { valid: true, errors: [], suggestions: [], correctedParams: null };
    }

    const props = schema.properties;
    const required = schema.required || [];

    // Перевірка обов'язкових параметрів
    for (const requiredParam of required) {
      if (!(requiredParam in parameters)) {
        errors.push(`Missing required parameter: '${requiredParam}'`);

        // Спроба знайти схожий параметр
        const similar = this._findSimilarString(requiredParam, Object.keys(parameters));
        if (similar) {
          suggestions.push(`Did you mean '${requiredParam}' instead of '${similar}'?`);
          // Автокорекція: перейменування параметру
          correctedParams[requiredParam] = correctedParams[similar];
          delete correctedParams[similar];
          hasCorrections = true;
        }
      }
    }

    // Перевірка типів параметрів
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const propDef = props[paramName];

      if (!propDef) {
        // Невідомий параметр - може бути помилка у назві
        const similar = this._findSimilarString(paramName, Object.keys(props));
        if (similar) {
          suggestions.push(`Unknown parameter '${paramName}'. Did you mean '${similar}'?`);
          // Автокорекція
          correctedParams[similar] = correctedParams[paramName];
          delete correctedParams[paramName];
          hasCorrections = true;
        } else {
          errors.push(`Unknown parameter: '${paramName}'`);
        }
        continue;
      }

      // Перевірка типу
      const expectedType = propDef.type;
      const actualType = typeof paramValue;

      if (expectedType === 'string' && actualType !== 'string') {
        errors.push(`Parameter '${paramName}' should be string, got ${actualType}`);
      } else if (expectedType === 'number' && actualType !== 'number') {
        errors.push(`Parameter '${paramName}' should be number, got ${actualType}`);
      } else if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push(`Parameter '${paramName}' should be boolean, got ${actualType}`);
      } else if (expectedType === 'array' && !Array.isArray(paramValue)) {
        errors.push(`Parameter '${paramName}' should be array, got ${actualType}`);
      } else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(paramValue))) {
        errors.push(`Parameter '${paramName}' should be object, got ${actualType}`);
      }

      // Перевірка enum значень
      if (propDef.enum && !propDef.enum.includes(paramValue)) {
        errors.push(`Parameter '${paramName}' must be one of: ${propDef.enum.join(', ')}. Got: ${paramValue}`);
        suggestions.push(`Valid values for '${paramName}': ${propDef.enum.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions,
      correctedParams: hasCorrections ? correctedParams : null
    };
  }

  /**
   * Валідувати tool_calls план проти доступних tools
   * ENHANCED 2025-10-20: Підтримка різних форматів назв, валідація параметрів
   *
   * @param {Array} toolCalls - Масив tool_calls з LLM response
   * @param {Object} options - Опції валідації
   * @param {boolean} options.autoCorrect - Автоматично виправляти помилки (default: false)
   * @param {boolean} options.validateParams - Валідувати параметри проти inputSchema (default: true)
   * @returns {Object} {valid: boolean, errors: Array, suggestions: Array, correctedCalls: Array}
   */
  validateToolCalls(toolCalls, options = {}) {
    const { autoCorrect = false, validateParams = true } = options;
    const errors = [];
    const suggestions = [];
    const correctedCalls = [];

    if (!Array.isArray(toolCalls)) {
      return {
        valid: false,
        errors: ['tool_calls must be an array'],
        suggestions: [],
        correctedCalls: []
      };
    }

    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      let { server, tool, parameters } = call;
      let corrected = false;

      // ENHANCED: Підтримка різних форматів назв інструментів
      // Формат 1: {server: "playwright", tool: "playwright_navigate"}
      // Формат 2: {server: "playwright", tool: "navigate"} (без префіксу)
      // Формат 3: {tool: "playwright__navigate"} (з подвійним підкресленням)

      // Парсинг формату 3 (server__tool)
      if (!server && tool && tool.includes('__')) {
        const parts = tool.split('__');
        server = parts[0];
        tool = parts.join('__'); // Залишаємо повну назву
        corrected = true;
        logger.debug('mcp-manager', `[Validation] Parsed server__tool format: ${server}.${tool}`);
      }

      // Перевірка: чи існує server
      if (!this.servers.has(server)) {
        const availableServers = Array.from(this.servers.keys());
        errors.push(`[Call ${i}] Server '${server}' not found. Available: ${availableServers.join(', ')}`);

        // ENHANCED: Більш розумний fuzzy matching
        const similar = this._findSimilarString(server, availableServers);
        if (similar) {
          suggestions.push(`[Call ${i}] Did you mean server: '${similar}'?`);
          if (autoCorrect) {
            server = similar;
            corrected = true;
          }
        }

        if (!autoCorrect) continue;
      }

      // Перевірка: чи існує tool на сервері
      const mcpServer = this.servers.get(server);
      if (!mcpServer || !Array.isArray(mcpServer.tools)) {
        errors.push(`[Call ${i}] Server '${server}' has no tools loaded`);
        continue;  // FIXED: Завжди пропускаємо, незалежно від autoCorrect
      }

      const availableTools = mcpServer.tools.map(t => t.name);

      // ENHANCED: Перевірка різних варіантів назви інструменту
      let toolDef = mcpServer.tools.find(t => t.name === tool);

      // Якщо не знайдено - пробуємо з префіксом server
      if (!toolDef && !tool.startsWith(server + '_')) {
        const toolWithPrefix = `${server}_${tool}`;
        toolDef = mcpServer.tools.find(t => t.name === toolWithPrefix);
        if (toolDef) {
          tool = toolWithPrefix;
          corrected = true;
          logger.debug('mcp-manager', `[Validation] Added server prefix: ${tool}`);
        }
      }

      // Якщо все ще не знайдено - fuzzy matching
      if (!toolDef) {
        errors.push(`[Call ${i}] Tool '${tool}' not found on '${server}'. Available: ${availableTools.slice(0, 5).join(', ')}${availableTools.length > 5 ? '...' : ''}`);

        const similar = this._findSimilarString(tool, availableTools);
        if (similar) {
          suggestions.push(`[Call ${i}] Did you mean tool: '${similar}' on '${server}'?`);
          if (autoCorrect) {
            tool = similar;
            toolDef = mcpServer.tools.find(t => t.name === similar);
            corrected = true;
          }
        }

        if (!autoCorrect || !toolDef) continue;
      }

      // ENHANCED: Валідація параметрів проти inputSchema
      if (validateParams && toolDef && toolDef.inputSchema) {
        const paramValidation = this._validateParameters(toolDef, parameters);
        if (!paramValidation.valid) {
          errors.push(...paramValidation.errors.map(e => `[Call ${i}] ${e}`));
          suggestions.push(...paramValidation.suggestions.map(s => `[Call ${i}] ${s}`));

          if (autoCorrect && paramValidation.correctedParams) {
            parameters = paramValidation.correctedParams;
            corrected = true;
          }
        }
      }

      // Зберегти виправлений виклик
      if (corrected || autoCorrect) {
        correctedCalls.push({
          ...call,
          server,
          tool,
          parameters,
          _corrected: corrected
        });
      } else {
        correctedCalls.push(call);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions,
      correctedCalls
    };
  }

  /**
   * Згенерувати правила автокорекції параметрів на основі inputSchema
   * Аналізує всі інструменти та визначає поширені помилки у назвах параметрів
   * @returns {Object} Об'єкт з правилами автокорекції {server: {tool: [{from, to}]}}
   * @version 4.3.0
   * @date 2025-10-20
   */
  generateCorrectionRules() {
    const rules = {};

    for (const [serverName, server] of this.servers.entries()) {
      if (!Array.isArray(server.tools) || server.tools.length === 0) continue;

      rules[serverName] = {};

      for (const tool of server.tools) {
        if (!tool.inputSchema || !tool.inputSchema.properties) continue;

        const toolRules = [];
        const props = tool.inputSchema.properties;

        // Аналіз кожного параметру для генерації правил корекції
        for (const [paramName, paramDef] of Object.entries(props)) {
          // Генерація варіантів назв на основі семантики
          const commonVariants = this._generateParamVariants(paramName, paramDef);

          for (const variant of commonVariants) {
            if (variant !== paramName) {
              toolRules.push({ from: variant, to: paramName });
            }
          }
        }

        if (toolRules.length > 0) {
          rules[serverName][tool.name] = toolRules;
        }
      }
    }

    logger.debug('mcp-manager', `[MCP Manager] Generated correction rules for ${Object.keys(rules).length} servers`);
    return rules;
  }

  /**
   * Згенерувати варіанти назв параметру на основі семантики
   * @param {string} paramName - Оригінальна назва параметру
   * @param {Object} paramDef - Дефініція параметру з inputSchema
   * @returns {Array<string>} Масив можливих варіантів назв
   * @private
   */
  _generateParamVariants(paramName, paramDef) {
    const variants = new Set([paramName]);
    const description = (paramDef.description || '').toLowerCase();

    // Словник поширених синонімів
    const synonymMap = {
      // Загальні
      'path': ['file', 'filename', 'filepath', 'location', 'destination'],
      'url': ['link', 'address', 'uri', 'href', 'location'],
      'content': ['text', 'data', 'body', 'value', 'message'],
      'value': ['text', 'input', 'content', 'data'],
      'selector': ['element', 'target', 'locator', 'query'],
      'command': ['cmd', 'script', 'exec', 'run'],
      'code_snippet': ['script', 'code', 'snippet'],
      'name': ['title', 'label', 'id', 'identifier'],
      'description': ['desc', 'text', 'summary', 'info'],

      // Playwright специфічні
      'wait_until': ['waitUntil', 'wait', 'waitFor'],
      'full_page': ['fullPage', 'entire', 'complete'],

      // Filesystem специфічні
      'data': ['content', 'text', 'body'],

      // Memory специфічні
      'entities': ['items', 'nodes', 'objects'],
      'observations': ['facts', 'notes', 'data'],
      'entityType': ['type', 'kind', 'category'],
      'relationType': ['relation', 'type', 'link']
    };

    // Додати синоніми
    if (synonymMap[paramName]) {
      synonymMap[paramName].forEach(syn => variants.add(syn));
    }

    // Зворотній пошук - якщо paramName є синонімом
    for (const [original, syns] of Object.entries(synonymMap)) {
      if (syns.includes(paramName)) {
        variants.add(original);
        syns.forEach(syn => variants.add(syn));
      }
    }

    // Варіанти camelCase/snake_case
    if (paramName.includes('_')) {
      // snake_case -> camelCase
      const camelCase = paramName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      variants.add(camelCase);
    } else if (paramName.match(/[a-z][A-Z]/)) {
      // camelCase -> snake_case
      const snakeCase = paramName.replace(/([A-Z])/g, '_$1').toLowerCase();
      variants.add(snakeCase);
    }

    // Аналіз опису для додаткових підказок
    if (description.includes('url') || description.includes('link')) {
      variants.add('url');
      variants.add('link');
    }
    if (description.includes('path') || description.includes('file')) {
      variants.add('path');
      variants.add('file');
    }
    if (description.includes('selector') || description.includes('element')) {
      variants.add('selector');
      variants.add('element');
    }

    return Array.from(variants);
  }

  /**
   * Отримати статус всіх servers
   * @returns {Object} Статус кожного server
   */
  getStatus() {
    const status = {};

    for (const [name, server] of this.servers.entries()) {
      status[name] = {
        ready: server.ready,
        tools: Array.isArray(server.tools) ? server.tools.length : 0,
        pid: server.process.pid
      };
    }

    return status;
  }

  /**
   * Зупинити всі MCP servers
   */
  async shutdown() {
    logger.system('mcp-manager', '[MCP Manager] Shutting down all servers...');

    const shutdownPromises = [];

    for (const server of this.servers.values()) {
      shutdownPromises.push(server.shutdown());
    }

    await Promise.all(shutdownPromises);

    this.servers.clear();

    logger.system('mcp-manager', '[MCP Manager] ✅ All servers stopped');
  }
}

export default MCPManager;
