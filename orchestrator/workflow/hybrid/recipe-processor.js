/**
 * Recipe Processor for Complex Workflows
 * Handles recipe-based task execution inspired by Goose
 * 
 * @version 1.0.0
 * @date 2025-11-04
 */

import logger from '../../utils/logger.js';

/**
 * Recipe types
 */
export const RecipeType = {
  INLINE: 'inline',
  SUB_RECIPE: 'sub_recipe',
  COMPOSITE: 'composite'
};

/**
 * Processes recipe-based tasks
 */
export class RecipeProcessor {
  constructor(container) {
    this.container = container;
    this.recipeCache = new Map();
    
    logger.debug('recipe-processor', 'Recipe processor initialized');
  }

  /**
   * Process a recipe task
   */
  async processRecipe(task, context) {
    const recipe = await this._extractRecipe(task);
    
    if (!recipe) {
      throw new Error(`No recipe found for task ${task.id}`);
    }
    
    logger.info('recipe-processor', `Processing recipe: ${recipe.name || task.id}`, {
      type: recipe.type,
      steps: recipe.steps?.length || 0
    });
    
    switch (recipe.type) {
      case RecipeType.INLINE:
        return await this._processInlineRecipe(recipe, context);
      case RecipeType.SUB_RECIPE:
        return await this._processSubRecipe(recipe, context);
      case RecipeType.COMPOSITE:
        return await this._processCompositeRecipe(recipe, context);
      default:
        throw new Error(`Unknown recipe type: ${recipe.type}`);
    }
  }

  /**
   * Extract recipe from task
   */
  async _extractRecipe(task) {
    // Check cache first
    if (this.recipeCache.has(task.id)) {
      return this.recipeCache.get(task.id);
    }
    
    let recipe = null;
    
    // Check if task has embedded recipe
    if (task.recipe) {
      recipe = task.recipe;
    } else if (task.payload?.recipe) {
      recipe = task.payload.recipe;
    } else if (task.recipe_path) {
      // Load recipe from path
      recipe = await this._loadRecipeFromPath(task.recipe_path);
    } else {
      // Generate recipe from task definition
      recipe = this._generateRecipeFromTask(task);
    }
    
    // Normalize recipe
    if (recipe) {
      recipe = this._normalizeRecipe(recipe);
      this.recipeCache.set(task.id, recipe);
    }
    
    return recipe;
  }

  /**
   * Process inline recipe
   */
  async _processInlineRecipe(recipe, context) {
    const results = {
      recipe: recipe.name,
      type: RecipeType.INLINE,
      steps: [],
      success: true,
      startTime: Date.now()
    };
    
    // Execute each step sequentially
    for (const step of recipe.steps) {
      const stepResult = await this._executeStep(step, context, results.steps);
      results.steps.push(stepResult);
      
      // Check if step failed and is critical
      if (!stepResult.success && step.critical) {
        results.success = false;
        results.error = `Critical step failed: ${step.name || step.id}`;
        break;
      }
      
      // Check cancellation
      if (context.cancellationToken?.cancelled) {
        results.success = false;
        results.error = 'Recipe cancelled';
        break;
      }
    }
    
    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;
    
    return results;
  }

  /**
   * Process sub-recipe
   */
  async _processSubRecipe(recipe, context) {
    // Sub-recipes are executed as separate processes
    const subRecipeManager = this.container.resolve('subRecipeManager');
    
    if (!subRecipeManager) {
      throw new Error('SubRecipeManager not available');
    }
    
    return await subRecipeManager.execute(recipe, context);
  }

  /**
   * Process composite recipe
   */
  async _processCompositeRecipe(recipe, context) {
    const results = {
      recipe: recipe.name,
      type: RecipeType.COMPOSITE,
      groups: [],
      success: true,
      startTime: Date.now()
    };
    
    // Composite recipes have parallel and sequential groups
    for (const group of recipe.groups) {
      const groupResult = await this._executeGroup(group, context);
      results.groups.push(groupResult);
      
      if (!groupResult.success && group.critical) {
        results.success = false;
        results.error = `Critical group failed: ${group.name}`;
        break;
      }
    }
    
    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;
    
    return results;
  }

  /**
   * Execute a single step
   */
  async _executeStep(step, context, previousSteps = []) {
    const startTime = Date.now();
    
    try {
      // Resolve step parameters from context and previous results
      const parameters = this._resolveParameters(step.parameters, context, previousSteps);
      
      // Get appropriate processor for step
      const processor = this._getProcessorForStep(step);
      
      if (!processor) {
        throw new Error(`No processor found for step: ${step.action_type}`);
      }
      
      // Execute step
      const result = await processor.execute({
        ...step,
        parameters,
        session: context.session
      });
      
      return {
        id: step.id,
        name: step.name,
        action: step.action,
        success: result.success !== false,
        result: result.data || result,
        duration: Date.now() - startTime,
        timestamp: startTime
      };
      
    } catch (error) {
      logger.error('recipe-processor', `Step failed: ${step.name || step.id}`, {
        error: error.message
      });
      
      return {
        id: step.id,
        name: step.name,
        action: step.action,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: startTime
      };
    }
  }

  /**
   * Execute a group of steps
   */
  async _executeGroup(group, context) {
    const startTime = Date.now();
    
    if (group.parallel) {
      // Execute steps in parallel
      const promises = group.steps.map(step => 
        this._executeStep(step, context)
      );
      
      const results = await Promise.allSettled(promises);
      
      return {
        name: group.name,
        parallel: true,
        steps: results.map((r, i) => {
          if (r.status === 'fulfilled') {
            return r.value;
          } else {
            return {
              id: group.steps[i].id,
              name: group.steps[i].name,
              success: false,
              error: r.reason.message
            };
          }
        }),
        success: results.every(r => r.status === 'fulfilled'),
        duration: Date.now() - startTime
      };
    } else {
      // Execute steps sequentially
      const stepResults = [];
      let success = true;
      
      for (const step of group.steps) {
        const result = await this._executeStep(step, context, stepResults);
        stepResults.push(result);
        
        if (!result.success && step.critical) {
          success = false;
          break;
        }
      }
      
      return {
        name: group.name,
        parallel: false,
        steps: stepResults,
        success,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Resolve parameters with context and previous results
   */
  _resolveParameters(parameters, context, previousSteps) {
    if (!parameters) return {};
    
    const resolved = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        // Check for template variables
        resolved[key] = this._resolveTemplate(value, context, previousSteps);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve nested objects
        resolved[key] = this._resolveParameters(value, context, previousSteps);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  /**
   * Resolve template string
   */
  _resolveTemplate(template, context, previousSteps) {
    // Replace {{context.variable}} with context values
    let resolved = template.replace(/\{\{context\.(\w+)\}\}/g, (match, key) => {
      return context[key] || match;
    });
    
    // Replace {{step[index].result.variable}} with previous step results
    resolved = resolved.replace(/\{\{step\[(\d+)\]\.result\.(\w+)\}\}/g, (match, index, key) => {
      const stepIndex = parseInt(index);
      if (stepIndex < previousSteps.length && previousSteps[stepIndex].result) {
        return previousSteps[stepIndex].result[key] || match;
      }
      return match;
    });
    
    // Replace {{previous.variable}} with last step result
    if (previousSteps.length > 0) {
      const lastStep = previousSteps[previousSteps.length - 1];
      resolved = resolved.replace(/\{\{previous\.(\w+)\}\}/g, (match, key) => {
        return lastStep.result?.[key] || match;
      });
    }
    
    return resolved;
  }

  /**
   * Get processor for step
   */
  _getProcessorForStep(step) {
    const processorMap = {
      'tool-planning': 'tetyanaPlanToolsProcessor',
      'tool-execution': 'tetyanaExecuteToolsProcessor',
      'verification': 'grishaVerifyItemProcessor',
      'mcp-workflow': 'mcpTodoManager'
    };
    
    const processorName = processorMap[step.action_type];
    if (processorName) {
      try {
        return this.container.resolve(processorName);
      } catch (error) {
        logger.warn('recipe-processor', `Failed to resolve processor: ${processorName}`);
      }
    }
    
    // Default to MCP workflow
    return {
      execute: async (params) => {
        const mcpTodoManager = this.container.resolve('mcpTodoManager');
        return await mcpTodoManager.executeVerificationWorkflow(params, params.session);
      }
    };
  }

  /**
   * Generate recipe from task definition
   */
  _generateRecipeFromTask(task) {
    return {
      name: task.action,
      type: RecipeType.INLINE,
      steps: [
        {
          id: `${task.id}_step1`,
          name: 'Plan Tools',
          action: 'Plan MCP tools',
          action_type: 'tool-planning',
          parameters: {
            action: task.action,
            tools_needed: task.tools_needed,
            mcp_servers: task.mcp_servers
          }
        },
        {
          id: `${task.id}_step2`,
          name: 'Execute Tools',
          action: 'Execute MCP tools',
          action_type: 'tool-execution',
          parameters: {
            tools: '{{previous.tools}}'
          }
        },
        {
          id: `${task.id}_step3`,
          name: 'Verify',
          action: 'Verify execution',
          action_type: 'verification',
          parameters: {
            success_criteria: task.success_criteria,
            results: '{{previous.results}}'
          }
        }
      ]
    };
  }

  /**
   * Normalize recipe structure
   */
  _normalizeRecipe(recipe) {
    // Ensure recipe has required fields
    if (!recipe.type) {
      recipe.type = RecipeType.INLINE;
    }
    
    if (!recipe.name) {
      recipe.name = 'Unnamed Recipe';
    }
    
    // Normalize steps
    if (recipe.steps && !recipe.groups) {
      recipe.steps = recipe.steps.map((step, index) => ({
        id: step.id || `step_${index}`,
        name: step.name || step.action,
        action: step.action,
        action_type: step.action_type || 'mcp-workflow',
        parameters: step.parameters || {},
        critical: step.critical !== false
      }));
    }
    
    // Normalize groups
    if (recipe.groups) {
      recipe.type = RecipeType.COMPOSITE;
      recipe.groups = recipe.groups.map((group, gIndex) => ({
        name: group.name || `Group ${gIndex}`,
        parallel: group.parallel === true,
        critical: group.critical !== false,
        steps: (group.steps || []).map((step, sIndex) => ({
          id: step.id || `group${gIndex}_step${sIndex}`,
          name: step.name || step.action,
          action: step.action,
          action_type: step.action_type || 'mcp-workflow',
          parameters: step.parameters || {},
          critical: step.critical !== false
        }))
      }));
    }
    
    return recipe;
  }

  /**
   * Load recipe from path (placeholder for future implementation)
   */
  async _loadRecipeFromPath(path) {
    // This would load recipe from file system or database
    logger.warn('recipe-processor', `Recipe loading from path not implemented: ${path}`);
    return null;
  }

  /**
   * Clear recipe cache
   */
  clearCache() {
    this.recipeCache.clear();
  }
}

export default RecipeProcessor;
