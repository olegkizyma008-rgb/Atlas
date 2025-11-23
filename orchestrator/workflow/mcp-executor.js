/**
 * @fileoverview MCP Executor Module
 * Handles execution of TODO items using MCP tools
 * Extracted from MCPTodoManager for better modularity
 *
 * @version 1.0.0
 * @date 2025-11-23
 */

import { MCP_MODEL_CONFIG } from '../../config/models-config.js';
import { VisualCaptureService } from '../services/visual-capture-service.js';
import { postToLLM } from '../utils/llm-api-client.js';
import adaptiveThrottler from '../utils/adaptive-request-throttler.js';
import axios from 'axios';

/**
 * MCP Executor - Handles execution of TODO items with MCP tools
 */
export class MCPExecutor {
  /**
   * @param {Object} options
   * @param {Object} options.mcpManager - MCP Manager instance
   * @param {Object} options.logger - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.mcpManager = options.mcpManager;
    this.mcpModelConfig = MCP_MODEL_CONFIG;
    this.rateLimiter = adaptiveThrottler;
    this.visualCapture = null;
    this._correctionRulesCache = null;
  }

  /**
   * Execute a TODO item with MCP tools
   * @param {Object} item - TODO item to execute
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution results
   */
  async executeItem(item, context = {}) {
    try {
      this.logger.info('mcp-executor', `Executing item: ${item.action}`);

      // Enhance success criteria
      this._enhanceItemSuccessCriteria(item);

      // Plan execution
      const plan = await this._planExecution(item, context);

      // Execute tools
      const results = await this._executeTools(item, plan, context);

      return {
        success: true,
        results,
        plan
      };
    } catch (error) {
      this.logger.error('mcp-executor', `Execution failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        item_id: item.id
      };
    }
  }

  /**
   * Plan execution strategy for an item
   * @private
   */
  async _planExecution(item, context) {
    try {
      const prompt = {
        systemPrompt: `You are Tetyana - MCP tool execution planner.
Plan how to execute the user's request using available MCP tools.

**OUTPUT FORMAT (JSON only):**
{
  "steps": [
    {
      "step": 1,
      "action": "description",
      "tool": "server__tool_name",
      "parameters": {...},
      "expected_output": "what to expect"
    }
  ],
  "reasoning": "why this approach"
}

Respond ONLY with JSON.`,
        userPrompt: `**Action:** ${item.action}
**Success Criteria:** ${item.success_criteria}
**Available Tools:** ${this.mcpManager ? 'MCP tools available' : 'No MCP tools'}

Plan the execution steps.`
      };

      const modelConfig = this._getModelForStage('planning');
      const apiUrl = this.mcpModelConfig.apiEndpoint.primary || 'http://localhost:4000/v1/chat/completions';

      const response = await this._makeApiCall(apiUrl, {
        model: modelConfig.model,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.data.choices[0].message.content;
      const plan = JSON.parse(this._extractJSON(content));

      return plan;
    } catch (error) {
      this.logger.warn('mcp-executor', `Planning failed: ${error.message}`);
      return { steps: [] };
    }
  }

  /**
   * Execute tools according to plan
   * @private
   */
  async _executeTools(item, plan, context) {
    const results = [];

    if (!plan.steps || plan.steps.length === 0) {
      return results;
    }

    for (const step of plan.steps) {
      try {
        // Normalize tool name
        const toolName = this._normalizeToolName(
          step.tool.split('__')[0],
          step.tool.split('__')[1]
        );

        // Auto-correct parameters
        const params = this._autoCorrectParameters(
          step.tool.split('__')[0],
          step.tool.split('__')[1],
          step.parameters || {}
        );

        // Execute tool
        const result = await this._executeTool(toolName, params);

        results.push({
          step: step.step,
          tool: toolName,
          success: true,
          result
        });

        this.logger.info('mcp-executor', `Step ${step.step} completed: ${toolName}`);
      } catch (error) {
        this.logger.error('mcp-executor', `Step ${step.step} failed: ${error.message}`);
        results.push({
          step: step.step,
          tool: step.tool,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Execute a single tool
   * @private
   */
  async _executeTool(toolName, parameters) {
    if (!this.mcpManager) {
      throw new Error('MCP Manager not available');
    }

    return await this.mcpManager.callTool(toolName, parameters);
  }

  /**
   * Capture visual context
   */
  async captureVisualContext() {
    try {
      if (!this.visualCapture) {
        this.visualCapture = new VisualCaptureService({ logger: this.logger });
      }

      return await this.visualCapture.capture();
    } catch (error) {
      this.logger.warn('mcp-executor', `Visual capture failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Make API call with throttling
   * @private
   */
  async _makeApiCall(apiUrl, payload, options = {}) {
    const priority = options.priority || 7;
    const timeout = options.timeout || 30000;

    return this.rateLimiter.throttledRequest(
      async () => axios.post(apiUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout
      }),
      {
        priority,
        timeout,
        batchKey: options.batchKey || null
      }
    );
  }

  /**
   * Enhance item success criteria
   * @private
   */
  _enhanceItemSuccessCriteria(item) {
    if (!item || typeof item !== 'object') {
      return;
    }

    let successCriteria = typeof item.success_criteria === 'string' ? item.success_criteria : '';
    const actionText = (item.action || '').toLowerCase();

    const videoKeywords = ['video', 'watch', 'movie', 'film', 'відео', 'перегля', 'відтвор'];
    const playbackIndicators = ['playback controls', 'pause button', 'timeline', 'progress bar', 'play button', 'timer', 'playback time'];
    const fullscreenKeywords = ['full screen', 'fullscreen', 'повноекран'];
    const fullscreenIndicators = ['fullscreen indicator', 'full screen mode', 'entire screen', 'window covers entire display'];

    let criteriaLower = successCriteria.toLowerCase();
    let modified = false;

    if (this._textContainsAny(actionText, videoKeywords) || this._textContainsAny(criteriaLower, videoKeywords)) {
      if (!this._textContainsAny(criteriaLower, playbackIndicators)) {
        successCriteria = this._appendCriterion(successCriteria, 'Video player is visible with playback controls and the playback timer is running.');
        criteriaLower = successCriteria.toLowerCase();
        modified = true;
      }
    }

    if (this._textContainsAny(actionText, fullscreenKeywords) || this._textContainsAny(criteriaLower, fullscreenKeywords)) {
      if (!this._textContainsAny(criteriaLower, fullscreenIndicators)) {
        successCriteria = this._appendCriterion(successCriteria, 'Fullscreen mode is confirmed (fullscreen indicator visible or window covers the entire display).');
        modified = true;
      }
    }

    if (modified) {
      item.success_criteria = successCriteria.trim();
    }
  }

  /**
   * Normalize tool name
   * @private
   */
  _normalizeToolName(server, tool) {
    if (!server || !tool) {
      return tool;
    }

    const prefix = `${server}__`;
    let cleanTool = tool;

    if (cleanTool.startsWith(prefix)) {
      cleanTool = cleanTool.slice(prefix.length);
    } else if (cleanTool.startsWith(`${server}_`)) {
      cleanTool = cleanTool.slice(server.length + 1);
    }

    if (cleanTool.startsWith(`${server}_`)) {
      cleanTool = cleanTool.slice(server.length + 1);
    }

    return `${server}__${cleanTool}`;
  }

  /**
   * Auto-correct parameters
   * @private
   */
  _autoCorrectParameters(server, tool, params) {
    if (!this._correctionRulesCache) {
      this.logger.debug('mcp-executor', 'Generating parameter correction rules...');
      this._correctionRulesCache = this.mcpManager?.generateCorrectionRules() || {};
    }

    const correctionRules = this._correctionRulesCache;
    const serverRules = correctionRules[server];

    if (serverRules && serverRules[tool]) {
      const rules = serverRules[tool];
      const corrected = { ...params };
      let correctionsMade = 0;

      for (const rule of rules) {
        if (!corrected[rule.to] && corrected[rule.from]) {
          corrected[rule.to] = corrected[rule.from];
          delete corrected[rule.from];
          correctionsMade++;
          this.logger.warn('mcp-executor', `Auto-corrected ${server}.${tool}: '${rule.from}' → '${rule.to}'`);
        }
      }

      if (correctionsMade > 0) {
        this.logger.info('mcp-executor', `Applied ${correctionsMade} parameter correction(s)`);
      }

      return corrected;
    }

    return params;
  }

  /**
   * Get model for stage
   * @private
   */
  _getModelForStage(stage) {
    const stageConfig = this.mcpModelConfig.stages?.[stage];
    return stageConfig || { model: 'gpt-4' };
  }

  /**
   * Extract JSON from text
   * @private
   */
  _extractJSON(text) {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    }

    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanText = cleanText.slice(jsonStart, jsonEnd + 1);
    }

    return cleanText;
  }

  /**
   * Append criterion to success criteria
   * @private
   */
  _appendCriterion(existing, addition) {
    const trimmedExisting = (existing || '').trim();
    if (!trimmedExisting) {
      return addition;
    }

    const endsWithTerminator = /[.!?]$/.test(trimmedExisting);
    if (endsWithTerminator) {
      return `${trimmedExisting} ${addition}`;
    }

    return `${trimmedExisting}. ${addition}`;
  }

  /**
   * Check if text contains any keywords
   * @private
   */
  _textContainsAny(text, keywords) {
    if (!text || !keywords || keywords.length === 0) {
      return false;
    }

    const lower = text.toLowerCase();
    return keywords.some(keyword => lower.includes(keyword.toLowerCase()));
  }
}

export default MCPExecutor;
