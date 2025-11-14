/**
 * Verification Adapter
 * Unified verification system combining Atlas's verification strategies
 * 
 * @version 1.0.0
 * @date 2025-11-04
 */

import logger from '../../utils/logger.js';

/**
 * Verification strategies
 */
export const VerificationStrategy = {
  VISUAL: 'visual',
  MCP: 'mcp',
  LLM: 'llm',
  COMPOSITE: 'composite',
  SMART: 'smart'
};

/**
 * Adapts various verification methods into a unified interface
 */
export class VerificationAdapter {
  constructor(container) {
    this.container = container;
    this.verificationCache = new Map();
    
    logger.debug('verification-adapter', 'Verification adapter initialized');
  }

  /**
   * Verify task execution result
   */
  async verify({ task, result, session, strategy = VerificationStrategy.COMPOSITE }) {
    const verificationId = `${task.id}_${Date.now()}`;
    
    logger.info('verification-adapter', `Starting verification for task ${task.id}`, {
      strategy,
      criteria: task.success_criteria
    });
    
    try {
      let verificationResult;
      
      switch (strategy) {
        case VerificationStrategy.VISUAL:
          verificationResult = await this._verifyVisual(task, result, session);
          break;
        case VerificationStrategy.MCP:
          verificationResult = await this._verifyMCP(task, result, session);
          break;
        case VerificationStrategy.LLM:
          verificationResult = await this._verifyLLM(task, result, session);
          break;
        case VerificationStrategy.SMART:
          verificationResult = await this._verifySmart(task, result, session);
          break;
        case VerificationStrategy.COMPOSITE:
        default:
          verificationResult = await this._verifyComposite(task, result, session);
      }
      
      // Cache result
      this.verificationCache.set(verificationId, verificationResult);
      
      // Log result
      logger.info('verification-adapter', `Verification complete for task ${task.id}`, {
        verified: verificationResult.verified,
        confidence: verificationResult.confidence,
        method: verificationResult.method
      });
      
      return verificationResult;
      
    } catch (error) {
      logger.error('verification-adapter', `Verification failed for task ${task.id}`, {
        error: error.message
      });
      
      return {
        verified: false,
        confidence: 0,
        reason: `Verification error: ${error.message}`,
        error: error.message,
        method: 'error'
      };
    }
  }

  /**
   * Visual verification using screenshots
   */
  async _verifyVisual(task, result, session) {
    const grishaProcessor = this.container.resolve('grishaVerifyItemProcessor');
    
    if (!grishaProcessor) {
      throw new Error('Grisha verification processor not available');
    }
    
    // Use Grisha's visual verification
    const verificationResult = await grishaProcessor._performVisualVerification(
      task.success_criteria,
      {
        action: task.action,
        parameters: task.parameters
      },
      session
    );
    
    return {
      verified: verificationResult.verified,
      confidence: verificationResult.confidence,
      reason: verificationResult.reason,
      method: 'visual',
      details: verificationResult
    };
  }

  /**
   * MCP-based verification
   */
  async _verifyMCP(task, result, session) {
    const mcpTodoManager = this.container.resolve('mcpTodoManager');
    
    if (!mcpTodoManager) {
      throw new Error('MCP Todo Manager not available');
    }
    
    // Create verification item
    const verificationItem = {
      id: task.id,
      action: task.action,
      success_criteria: task.success_criteria,
      mcp_servers: task.mcp_servers || [],
      tools_needed: task.tools_needed || [],
      parameters: task.parameters || {}
    };
    
    // Execute verification workflow
    const workflowResult = await mcpTodoManager.executeVerificationWorkflow(
      verificationItem,
      session
    );
    
    return {
      verified: workflowResult.success,
      confidence: workflowResult.confidence || 75,
      reason: workflowResult.reason || 'MCP verification completed',
      method: 'mcp',
      details: workflowResult.execution
    };
  }

  /**
   * LLM-based verification
   */
  async _verifyLLM(task, result, session) {
    const llmClient = this.container.resolve('llmClient');
    
    if (!llmClient) {
      throw new Error('LLM Client not available');
    }
    
    const prompt = this._buildLLMVerificationPrompt(task, result);
    
    const response = await llmClient.complete({
      messages: [
        { role: 'system', content: 'You are a verification assistant. Analyze if the task was completed successfully based on the criteria and results.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    try {
      const parsed = JSON.parse(response.content);
      return {
        verified: parsed.verified === true,
        confidence: parsed.confidence || 50,
        reason: parsed.reason || 'LLM verification',
        method: 'llm',
        details: parsed
      };
    } catch (error) {
      logger.error('verification-adapter', 'Failed to parse LLM response', {
        error: error.message
      });
      
      return {
        verified: false,
        confidence: 0,
        reason: 'Failed to parse LLM response',
        method: 'llm',
        error: error.message
      };
    }
  }

  /**
   * Smart verification (combines multiple strategies)
   */
  async _verifySmart(task, result, session) {
    // Determine best strategy based on task type
    const strategy = this._determineOptimalStrategy(task);
    
    logger.debug('verification-adapter', `Smart verification selected strategy: ${strategy}`);
    
    // Execute selected strategy
    return await this.verify({
      task,
      result,
      session,
      strategy
    });
  }

  /**
   * Composite verification (tries multiple methods)
   */
  async _verifyComposite(task, result, session) {
    const methods = [];
    const results = [];
    
    // Try visual verification if applicable
    if (this._isVisualVerificationApplicable(task)) {
      try {
        const visualResult = await this._verifyVisual(task, result, session);
        results.push(visualResult);
        methods.push('visual');
        
        // If visual verification is highly confident, return early
        if (visualResult.verified && visualResult.confidence >= 90) {
          return visualResult;
        }
      } catch (error) {
        logger.warn('verification-adapter', 'Visual verification failed', {
          error: error.message
        });
      }
    }
    
    // Try MCP verification if applicable
    if (task.mcp_servers && task.mcp_servers.length > 0) {
      try {
        const mcpResult = await this._verifyMCP(task, result, session);
        results.push(mcpResult);
        methods.push('mcp');
        
        // If MCP verification is confident, consider it
        if (mcpResult.verified && mcpResult.confidence >= 80) {
          return mcpResult;
        }
      } catch (error) {
        logger.warn('verification-adapter', 'MCP verification failed', {
          error: error.message
        });
      }
    }
    
    // Fallback to LLM verification
    try {
      const llmResult = await this._verifyLLM(task, result, session);
      results.push(llmResult);
      methods.push('llm');
    } catch (error) {
      logger.warn('verification-adapter', 'LLM verification failed', {
        error: error.message
      });
    }
    
    // Aggregate results
    return this._aggregateVerificationResults(results, methods);
  }

  /**
   * Determine optimal verification strategy
   */
  _determineOptimalStrategy(task) {
    // Visual verification for UI tasks
    if (task.action?.toLowerCase().includes('open') ||
        task.action?.toLowerCase().includes('click') ||
        task.action?.toLowerCase().includes('display')) {
      return VerificationStrategy.VISUAL;
    }
    
    // MCP verification for tool-based tasks
    if (task.mcp_servers && task.mcp_servers.length > 0) {
      return VerificationStrategy.MCP;
    }
    
    // LLM verification for complex criteria
    if (task.success_criteria && task.success_criteria.length > 100) {
      return VerificationStrategy.LLM;
    }
    
    // Default to composite
    return VerificationStrategy.COMPOSITE;
  }

  /**
   * Check if visual verification is applicable
   */
  _isVisualVerificationApplicable(task) {
    const visualKeywords = [
      'open', 'display', 'show', 'visible', 'appear',
      'click', 'press', 'type', 'calculator', 'browser',
      'window', 'screen', 'ui', 'interface'
    ];
    
    const actionLower = (task.action || '').toLowerCase();
    const criteriaLower = (task.success_criteria || '').toLowerCase();
    
    return visualKeywords.some(keyword => 
      actionLower.includes(keyword) || criteriaLower.includes(keyword)
    );
  }

  /**
   * Aggregate multiple verification results
   */
  _aggregateVerificationResults(results, methods) {
    if (results.length === 0) {
      return {
        verified: false,
        confidence: 0,
        reason: 'No verification methods succeeded',
        method: 'none'
      };
    }
    
    // Calculate weighted average
    let totalConfidence = 0;
    let totalWeight = 0;
    let verifiedCount = 0;
    
    const weights = {
      visual: 1.5,  // Higher weight for visual verification
      mcp: 1.2,     // Good weight for MCP
      llm: 1.0      // Base weight for LLM
    };
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const method = methods[i];
      const weight = weights[method] || 1.0;
      
      if (result.verified) {
        verifiedCount++;
      }
      
      totalConfidence += result.confidence * weight;
      totalWeight += weight;
    }
    
    const avgConfidence = Math.round(totalConfidence / totalWeight);
    const verified = verifiedCount > results.length / 2; // Majority vote
    
    return {
      verified,
      confidence: avgConfidence,
      reason: `Composite verification (${methods.join(', ')})`,
      method: 'composite',
      details: {
        methods,
        results,
        verifiedCount,
        totalMethods: results.length
      }
    };
  }

  /**
   * Build LLM verification prompt
   */
  _buildLLMVerificationPrompt(task, result) {
    return `
Task: ${task.action}
Success Criteria: ${task.success_criteria}

Execution Result:
${JSON.stringify(result, null, 2)}

Please verify if the task was completed successfully based on the criteria.
Return a JSON object with:
- verified: boolean
- confidence: number (0-100)
- reason: string explaining the verification result
`;
  }

  /**
   * Get cached verification result
   */
  getCachedResult(verificationId) {
    return this.verificationCache.get(verificationId);
  }

  /**
   * Clear verification cache
   */
  clearCache() {
    this.verificationCache.clear();
  }
}

export default VerificationAdapter;
