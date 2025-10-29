/**
 * Context-Aware Tool Filter
 * Dynamically filters available tools based on current context
 * Based on refactor.md best practices
 * 
 * @version 1.0.0
 * @date 2025-10-29
 */

class ContextAwareToolFilter {
  constructor(logger) {
    this.logger = logger;
    
    // Define context rules for tool availability
    this.contextRules = {
      filesystem: {
        // Filesystem tools availability rules
        'filesystem__edit_file': {
          requires: ['file_exists'],
          excludeWhen: ['file_locked', 'readonly_mode']
        },
        'filesystem__delete_file': {
          requires: ['file_exists'],
          excludeWhen: ['critical_file', 'system_file']
        },
        'filesystem__create_directory': {
          excludeWhen: ['directory_exists']
        }
      },
      
      shell: {
        // Shell tools availability rules
        'shell__git_commit': {
          requires: ['git_repo_exists', 'changes_staged'],
          excludeWhen: ['no_changes']
        },
        'shell__npm_install': {
          requires: ['package_json_exists'],
          excludeWhen: ['node_modules_exists']
        },
        'shell__python_run': {
          requires: ['python_installed'],
          excludeWhen: ['venv_not_activated']
        }
      },
      
      playwright: {
        // Playwright tools availability rules
        'playwright__click': {
          requires: ['browser_open', 'page_loaded'],
          excludeWhen: ['element_not_visible']
        },
        'playwright__navigate': {
          requires: ['browser_open'],
          excludeWhen: []
        },
        'playwright__screenshot': {
          requires: ['browser_open', 'page_loaded'],
          excludeWhen: []
        }
      },
      
      applescript: {
        // AppleScript tools availability rules
        'applescript__activate_app': {
          requires: [],
          excludeWhen: ['app_not_installed']
        },
        'applescript__keystroke': {
          requires: ['app_active'],
          excludeWhen: []
        }
      },
      
      memory: {
        // Memory tools availability rules
        'memory__retrieve': {
          requires: ['key_exists'],
          excludeWhen: []
        },
        'memory__delete': {
          requires: ['key_exists'],
          excludeWhen: ['protected_key']
        }
      }
    };
    
    // Context detection patterns
    this.contextDetectors = {
      file_exists: (context) => {
        return context.targetFile && context.fileSystem?.exists(context.targetFile);
      },
      directory_exists: (context) => {
        return context.targetDir && context.fileSystem?.isDirectory(context.targetDir);
      },
      git_repo_exists: (context) => {
        return context.gitStatus?.isRepo === true;
      },
      changes_staged: (context) => {
        return context.gitStatus?.stagedChanges > 0;
      },
      package_json_exists: (context) => {
        return context.fileSystem?.exists('./package.json');
      },
      node_modules_exists: (context) => {
        return context.fileSystem?.exists('./node_modules');
      },
      python_installed: (context) => {
        return context.systemInfo?.python !== undefined;
      },
      venv_not_activated: (context) => {
        return !context.pythonEnv?.venvActive;
      },
      browser_open: (context) => {
        return context.playwright?.browserOpen === true;
      },
      page_loaded: (context) => {
        return context.playwright?.pageLoaded === true;
      },
      element_not_visible: (context) => {
        return context.playwright?.targetElement?.visible === false;
      },
      app_active: (context) => {
        return context.applescript?.activeApp !== undefined;
      },
      app_not_installed: (context) => {
        return context.applescript?.installedApps && 
               !context.applescript.installedApps.includes(context.targetApp);
      },
      key_exists: (context) => {
        return context.memory?.keys?.includes(context.targetKey);
      },
      protected_key: (context) => {
        return context.memory?.protectedKeys?.includes(context.targetKey);
      },
      critical_file: (context) => {
        const criticalPaths = ['/etc', '/System', '/usr/bin', '/usr/sbin'];
        return criticalPaths.some(path => context.targetFile?.startsWith(path));
      },
      system_file: (context) => {
        return context.targetFile?.startsWith('/System') || 
               context.targetFile?.includes('.system');
      },
      file_locked: (context) => {
        return context.fileSystem?.locked?.includes(context.targetFile);
      },
      readonly_mode: (context) => {
        return context.mode === 'readonly';
      },
      no_changes: (context) => {
        return context.gitStatus?.changes === 0;
      }
    };
  }

  /**
   * Filter available tools based on context
   * @param {Array} availableTools - List of all available tools
   * @param {Object} context - Current execution context
   * @returns {Array} Filtered list of tools appropriate for context
   */
  filterTools(availableTools, context) {
    const startTime = Date.now();
    
    this.logger.info('Filtering tools based on context', {
      totalTools: availableTools.length,
      contextKeys: Object.keys(context)
    });
    
    // Evaluate context conditions
    const contextConditions = this._evaluateContext(context);
    
    // Filter tools
    const filteredTools = availableTools.filter(tool => {
      return this._shouldIncludeTool(tool, contextConditions, context);
    });
    
    // Add context-specific tool recommendations
    const recommendedTools = this._getRecommendedTools(context, filteredTools);
    
    // Combine and deduplicate
    const finalTools = this._combineAndPrioritize(filteredTools, recommendedTools);
    
    const duration = Date.now() - startTime;
    
    this.logger.info('Tool filtering complete', {
      originalCount: availableTools.length,
      filteredCount: finalTools.length,
      removed: availableTools.length - finalTools.length,
      duration
    });
    
    return finalTools;
  }

  /**
   * Get dynamic tool recommendations based on context
   */
  getRecommendations(context) {
    const recommendations = [];
    
    // File operation recommendations
    if (context.action?.includes('create') && context.action?.includes('file')) {
      recommendations.push({
        tool: 'filesystem__create_directory',
        reason: 'Create parent directory before file',
        priority: 1
      });
      recommendations.push({
        tool: 'filesystem__write_file',
        reason: 'Write content to new file',
        priority: 2
      });
    }
    
    // Git workflow recommendations
    if (context.gitStatus?.changes > 0) {
      recommendations.push({
        tool: 'shell__git_add',
        reason: 'Stage changes before commit',
        priority: 1
      });
      recommendations.push({
        tool: 'shell__git_commit',
        reason: 'Commit staged changes',
        priority: 2
      });
    }
    
    // Web automation recommendations
    if (context.action?.includes('screenshot')) {
      recommendations.push({
        tool: 'playwright__navigate',
        reason: 'Navigate to page first',
        priority: 1
      });
      recommendations.push({
        tool: 'playwright__wait',
        reason: 'Wait for page load',
        priority: 2
      });
      recommendations.push({
        tool: 'playwright__screenshot',
        reason: 'Capture screenshot',
        priority: 3
      });
    }
    
    return recommendations;
  }

  /**
   * Evaluate context conditions
   */
  _evaluateContext(context) {
    const conditions = {};
    
    for (const [condition, detector] of Object.entries(this.contextDetectors)) {
      try {
        conditions[condition] = detector(context);
      } catch (error) {
        this.logger.debug(`Context detector error for ${condition}`, {
          error: error.message
        });
        conditions[condition] = false;
      }
    }
    
    return conditions;
  }

  /**
   * Check if tool should be included based on context
   */
  _shouldIncludeTool(tool, contextConditions, context) {
    const toolName = this._getToolFullName(tool);
    
    // Find rules for this tool
    const rules = this._findToolRules(toolName);
    if (!rules) {
      // No rules defined, include by default
      return true;
    }
    
    // Check required conditions
    if (rules.requires && rules.requires.length > 0) {
      for (const required of rules.requires) {
        if (!contextConditions[required]) {
          this.logger.debug(`Tool ${toolName} excluded - missing required: ${required}`);
          return false;
        }
      }
    }
    
    // Check exclusion conditions
    if (rules.excludeWhen && rules.excludeWhen.length > 0) {
      for (const exclude of rules.excludeWhen) {
        if (contextConditions[exclude]) {
          this.logger.debug(`Tool ${toolName} excluded - condition met: ${exclude}`);
          return false;
        }
      }
    }
    
    // Additional dynamic checks
    if (this._shouldExcludeDynamically(tool, context)) {
      return false;
    }
    
    return true;
  }

  /**
   * Dynamic exclusion based on context patterns
   */
  _shouldExcludeDynamically(tool, context) {
    const toolName = this._getToolFullName(tool);
    
    // Don't show edit tools if no files exist
    if (toolName.includes('edit') && !context.filesInWorkspace) {
      return true;
    }
    
    // Don't show git tools if not in a repo
    if (toolName.includes('git') && !context.isGitRepo) {
      return true;
    }
    
    // Don't show test tools if no test files
    if (toolName.includes('test') && !context.hasTestFiles) {
      return true;
    }
    
    // Limit tools if in beginner mode
    if (context.userLevel === 'beginner') {
      const advancedTools = ['rebase', 'cherry-pick', 'bisect', 'stash'];
      if (advancedTools.some(advanced => toolName.includes(advanced))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get recommended tools based on context
   */
  _getRecommendedTools(context, existingTools) {
    const recommendations = this.getRecommendations(context);
    const recommended = [];
    
    for (const rec of recommendations) {
      // Only recommend if not already in filtered list
      const exists = existingTools.some(tool => 
        this._getToolFullName(tool) === rec.tool
      );
      
      if (!exists) {
        recommended.push({
          name: rec.tool,
          recommended: true,
          reason: rec.reason,
          priority: rec.priority
        });
      }
    }
    
    return recommended;
  }

  /**
   * Combine and prioritize tools
   */
  _combineAndPrioritize(filtered, recommended) {
    // Combine lists
    const combined = [...filtered];
    
    // Add recommended tools that passed filtering
    for (const rec of recommended) {
      const toolObj = {
        name: rec.name,
        server: rec.name.split('__')[0],
        recommended: true,
        priority: rec.priority
      };
      combined.push(toolObj);
    }
    
    // Sort by priority (if available)
    combined.sort((a, b) => {
      const aPriority = a.priority || 999;
      const bPriority = b.priority || 999;
      return aPriority - bPriority;
    });
    
    // Remove duplicates
    const seen = new Set();
    return combined.filter(tool => {
      const name = this._getToolFullName(tool);
      if (seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    });
  }

  /**
   * Find rules for a tool
   */
  _findToolRules(toolName) {
    for (const serverRules of Object.values(this.contextRules)) {
      if (serverRules[toolName]) {
        return serverRules[toolName];
      }
    }
    return null;
  }

  /**
   * Get full tool name
   */
  _getToolFullName(tool) {
    if (typeof tool === 'string') {
      return tool;
    }
    if (tool.tool) {
      return tool.tool;
    }
    if (tool.name && tool.server) {
      return `${tool.server}__${tool.name}`;
    }
    return tool.name || '';
  }
}

module.exports = ContextAwareToolFilter;
