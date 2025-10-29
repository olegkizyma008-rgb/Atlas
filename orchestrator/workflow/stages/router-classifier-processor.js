/**
 * Router Classifier Processor
 * Fast initial classification to narrow down relevant MCP servers
 * Based on refactor.md best practices
 * 
 * @version 1.0.0
 * @date 2025-10-29
 */

class RouterClassifierProcessor {
  constructor(logger, llmClient) {
    this.logger = logger;
    this.llmClient = llmClient;
    
    // Use fast model for routing
    this.routerModel = process.env.MCP_MODEL_ROUTER || 'atlas-gemini-flash';
    this.routerTemperature = 0.1;
    
    // Server categories and keywords
    this.serverCategories = {
      filesystem: {
        keywords: ['file', 'folder', 'directory', 'read', 'write', 'create', 'delete', 'path', 'csv', 'json', 'txt'],
        servers: ['filesystem'],
        confidence: 0
      },
      shell: {
        keywords: ['command', 'terminal', 'bash', 'script', 'execute', 'run', 'git', 'npm', 'python', 'node'],
        servers: ['shell'],
        confidence: 0
      },
      web: {
        keywords: ['browser', 'web', 'page', 'click', 'navigate', 'screenshot', 'scrape', 'url', 'website'],
        servers: ['playwright'],
        confidence: 0
      },
      applescript: {
        keywords: ['app', 'application', 'calculator', 'textedit', 'safari', 'finder', 'system'],
        servers: ['applescript'],
        confidence: 0
      },
      memory: {
        keywords: ['remember', 'store', 'recall', 'context', 'save', 'retrieve', 'memory'],
        servers: ['memory'],
        confidence: 0
      },
      development: {
        keywords: ['java', 'python', 'class', 'module', 'package', 'maven', 'gradle', 'pip', 'poetry'],
        servers: ['java_sdk', 'python_sdk'],
        confidence: 0
      }
    };
  }

  /**
   * Execute router classification
   */
  async execute(params) {
    const { action, context, availableServers } = params;
    const startTime = Date.now();
    
    this.logger.info('Router classifier starting', {
      action: action.substring(0, 100),
      availableServers: availableServers.length
    });

    try {
      // Step 1: Keyword-based initial classification
      const keywordClassification = this._classifyByKeywords(action);
      
      // Step 2: LLM-based classification for ambiguous cases
      let llmClassification = null;
      if (keywordClassification.needsLLM) {
        llmClassification = await this._classifyByLLM(action, availableServers);
      }
      
      // Step 3: Combine classifications
      const selectedServers = this._combineClassifications(
        keywordClassification,
        llmClassification,
        availableServers
      );
      
      // Step 4: Validate and limit selection
      const finalServers = this._validateAndLimit(selectedServers, availableServers);
      
      const duration = Date.now() - startTime;
      
      this.logger.info('Router classification complete', {
        selectedServers: finalServers,
        duration,
        method: llmClassification ? 'hybrid' : 'keyword-only'
      });
      
      return {
        success: true,
        selectedServers: finalServers,
        classification: {
          keyword: keywordClassification,
          llm: llmClassification
        },
        metadata: {
          duration,
          method: llmClassification ? 'hybrid' : 'keyword-only'
        }
      };
      
    } catch (error) {
      this.logger.error('Router classification failed', { error: error.message });
      
      // Fallback: return top 3 most common servers
      return {
        success: false,
        selectedServers: ['filesystem', 'shell', 'playwright'].filter(s => 
          availableServers.includes(s)
        ),
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
          method: 'fallback'
        }
      };
    }
  }

  /**
   * Classify by keywords
   */
  _classifyByKeywords(action) {
    const actionLower = action.toLowerCase();
    const results = { ...this.serverCategories };
    let totalMatches = 0;
    
    // Count keyword matches for each category
    for (const [category, config] of Object.entries(results)) {
      let matches = 0;
      for (const keyword of config.keywords) {
        if (actionLower.includes(keyword)) {
          matches++;
        }
      }
      config.confidence = matches;
      totalMatches += matches;
    }
    
    // Normalize confidence scores
    if (totalMatches > 0) {
      for (const config of Object.values(results)) {
        config.confidence = config.confidence / totalMatches;
      }
    }
    
    // Get top categories
    const topCategories = Object.entries(results)
      .filter(([_, config]) => config.confidence > 0)
      .sort((a, b) => b[1].confidence - a[1].confidence)
      .slice(0, 2);
    
    // Extract servers from top categories
    const servers = [];
    for (const [category, config] of topCategories) {
      servers.push(...config.servers);
    }
    
    return {
      servers: [...new Set(servers)], // Remove duplicates
      confidence: topCategories[0]?.[1]?.confidence || 0,
      needsLLM: servers.length === 0 || topCategories[0]?.[1]?.confidence < 0.3
    };
  }

  /**
   * Classify using LLM
   */
  async _classifyByLLM(action, availableServers) {
    const prompt = this._buildClassificationPrompt(action, availableServers);
    
    try {
      const response = await this.llmClient.generateResponse({
        model: this.routerModel,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: this.routerTemperature,
        max_tokens: 100
      });
      
      // Parse response
      const content = response.content.trim();
      const servers = this._parseServerList(content, availableServers);
      
      return {
        servers,
        confidence: 0.8,
        raw: content
      };
      
    } catch (error) {
      this.logger.warn('LLM classification failed', { error: error.message });
      return null;
    }
  }

  /**
   * Build classification prompt
   */
  _buildClassificationPrompt(action, availableServers) {
    const system = `You are a fast router that classifies tasks to appropriate MCP servers.
Your job is to quickly identify which 1-2 servers are most relevant for the task.

AVAILABLE SERVERS:
- filesystem: File and directory operations
- shell: Terminal commands and scripts
- playwright: Web browser automation
- applescript: macOS application control
- memory: Store and retrieve context
- java_sdk: Java development tasks
- python_sdk: Python development tasks

RULES:
1. Return ONLY the server names, comma-separated
2. Maximum 2 servers
3. Only servers that are NECESSARY for the task
4. If unsure, prefer filesystem and shell`;

    const user = `Task: ${action}

Which servers are needed? (comma-separated list, max 2)`;

    return { system, user };
  }

  /**
   * Parse server list from LLM response
   */
  _parseServerList(content, availableServers) {
    const servers = [];
    const contentLower = content.toLowerCase();
    
    // Try to extract comma-separated list
    const parts = contentLower.split(',').map(s => s.trim());
    
    for (const part of parts) {
      // Check if part matches any available server
      for (const server of availableServers) {
        if (part.includes(server) || server.includes(part)) {
          servers.push(server);
          break;
        }
      }
    }
    
    // If no matches, try to find server names in the content
    if (servers.length === 0) {
      for (const server of availableServers) {
        if (contentLower.includes(server)) {
          servers.push(server);
        }
      }
    }
    
    return [...new Set(servers)].slice(0, 2); // Unique, max 2
  }

  /**
   * Combine keyword and LLM classifications
   */
  _combineClassifications(keywordResult, llmResult, availableServers) {
    const servers = new Set();
    
    // Add keyword-based servers
    if (keywordResult && keywordResult.servers) {
      for (const server of keywordResult.servers) {
        servers.add(server);
      }
    }
    
    // Add LLM-based servers
    if (llmResult && llmResult.servers) {
      for (const server of llmResult.servers) {
        servers.add(server);
      }
    }
    
    // If still empty, use defaults
    if (servers.size === 0) {
      servers.add('filesystem');
      servers.add('shell');
    }
    
    return Array.from(servers);
  }

  /**
   * Validate and limit server selection
   */
  _validateAndLimit(selectedServers, availableServers) {
    // Filter to only available servers
    const valid = selectedServers.filter(s => availableServers.includes(s));
    
    // Limit to max 2 servers
    const limited = valid.slice(0, 2);
    
    // If no valid servers, fallback to filesystem
    if (limited.length === 0 && availableServers.includes('filesystem')) {
      limited.push('filesystem');
    }
    
    return limited;
  }
}

module.exports = RouterClassifierProcessor;
