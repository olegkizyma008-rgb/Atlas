/**
 * Hybrid Workflow Executor
 * Combines Goose's parallel execution with Atlas's stage-based workflow
 * 
 * @version 1.0.0
 * @date 2025-11-04
 */

import { EventEmitter } from 'events';
import { WorkerPool } from './worker-pool.js';
import { TaskExecutionTracker } from './execution-tracker.js';
import { StreamNotifier } from './stream-notifier.js';
import { RecipeProcessor } from './recipe-processor.js';
import { VerificationAdapter } from './verification-adapter.js';
import logger from '../../utils/logger.js';

/**
 * Execution modes for tasks
 */
export const ExecutionMode = {
  SEQUENTIAL: 'sequential',
  PARALLEL: 'parallel',
  ADAPTIVE: 'adaptive'
};

/**
 * Task types inspired by Goose
 */
export const TaskType = {
  ATOMIC: 'atomic',
  RECIPE: 'recipe',
  PARALLEL_GROUP: 'parallel_group'
};

/**
 * Main hybrid executor that combines best of both systems
 */
export class HybridWorkflowExecutor extends EventEmitter {
  constructor({
    maxWorkers = 10,
    executionMode = ExecutionMode.ADAPTIVE,
    verificationStrategy = 'composite',
    container,
    wsManager,
    ttsSyncManager,
    localizationService
  }) {
    super();
    
    this.maxWorkers = maxWorkers;
    this.executionMode = executionMode;
    this.verificationStrategy = verificationStrategy;
    this.container = container;
    this.wsManager = wsManager;
    this.ttsSyncManager = ttsSyncManager;
    this.localizationService = localizationService;
    
    // Core components
    this.workerPool = new WorkerPool(maxWorkers);
    this.tracker = null; // Created per execution
    this.notifier = new StreamNotifier(wsManager);
    this.recipeProcessor = new RecipeProcessor(container);
    this.verificationAdapter = new VerificationAdapter(container);
    
    // Cancellation support (from Goose)
    this.cancellationTokens = new Map();
    
    // Performance metrics
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      parallelizationRatio: 0
    };
    
    logger.system('hybrid-executor', '🚀 Hybrid Workflow Executor initialized', {
      maxWorkers,
      executionMode,
      verificationStrategy
    });
  }

  /**
   * Main execution entry point
   * @param {Array} tasks - Array of hybrid tasks
   * @param {Object} options - Execution options
   */
  async execute(tasks, options = {}) {
    const {
      streaming = true,
      cancellable = true,
      verification = true,
      session = null
    } = options;
    
    const executionId = this._generateExecutionId();
    const startTime = Date.now();
    
    try {
      // Initialize execution tracker
      this.tracker = new TaskExecutionTracker(tasks, streaming ? this.notifier : null);
      
      // Create cancellation token if needed
      if (cancellable) {
        this.cancellationTokens.set(executionId, {
          cancelled: false,
          reason: null
        });
      }
      
      // Analyze task dependencies and execution strategy
      const executionPlan = await this._analyzeExecutionPlan(tasks);
      
      logger.workflow('hybrid', 'execution-plan', 'Execution plan created', {
        executionId,
        totalTasks: tasks.length,
        batches: executionPlan.batches.length,
        strategy: executionPlan.strategy
      });
      
      // Execute based on strategy
      let results;
      switch (executionPlan.strategy) {
        case ExecutionMode.PARALLEL:
          results = await this._executeParallel(executionPlan, session, executionId);
          break;
        case ExecutionMode.SEQUENTIAL:
          results = await this._executeSequential(executionPlan, session, executionId);
          break;
        case ExecutionMode.ADAPTIVE:
          results = await this._executeAdaptive(executionPlan, session, executionId);
          break;
        default:
          throw new Error(`Unknown execution strategy: ${executionPlan.strategy}`);
      }
      
      // Perform verification if enabled
      if (verification) {
        results = await this._verifyResults(results, tasks, session);
      }
      
      // Calculate metrics
      this._updateMetrics(tasks, results, startTime);
      
      // Emit completion event
      this.emit('execution-complete', {
        executionId,
        results,
        metrics: this.metrics,
        duration: Date.now() - startTime
      });
      
      return {
        success: results.every(r => r.status === 'completed'),
        results,
        metrics: this.metrics,
        executionId
      };
      
    } catch (error) {
      logger.error('hybrid-executor', 'Execution failed', {
        executionId,
        error: error.message
      });
      
      this.emit('execution-error', {
        executionId,
        error
      });
      
      throw error;
      
    } finally {
      // Cleanup
      if (cancellable) {
        this.cancellationTokens.delete(executionId);
      }
      this.tracker = null;
    }
  }

  /**
   * Execute tasks in parallel (Goose-inspired)
   */
  async _executeParallel(executionPlan, session, executionId) {
    const results = [];
    
    for (const batch of executionPlan.batches) {
      // Check cancellation
      if (this._isCancelled(executionId)) {
        throw new Error('Execution cancelled');
      }
      
      // Stream notification for batch start
      await this.notifier.notify('batch-start', {
        batchIndex: executionPlan.batches.indexOf(batch),
        tasks: batch.map(t => ({ id: t.id, action: t.action }))
      });
      
      // Execute batch in parallel using worker pool
      const batchPromises = batch.map(task => 
        this.workerPool.executeTask(task, {
          session,
          tracker: this.tracker,
          cancellationToken: this.cancellationTokens.get(executionId)
        })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const task = batch[i];
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
          await this.tracker.completeTask(task.id, result.value);
        } else {
          const errorResult = {
            taskId: task.id,
            status: 'failed',
            error: result.reason.message,
            data: null
          };
          results.push(errorResult);
          await this.tracker.failTask(task.id, result.reason);
        }
      }
      
      // Stream notification for batch complete
      await this.notifier.notify('batch-complete', {
        batchIndex: executionPlan.batches.indexOf(batch),
        results: results.filter(r => batch.some(t => t.id === r.taskId))
      });
    }
    
    return results;
  }

  /**
   * Execute tasks sequentially (Atlas-inspired)
   */
  async _executeSequential(executionPlan, session, executionId) {
    const results = [];
    
    // Flatten batches for sequential execution
    const allTasks = executionPlan.batches.flat();
    
    for (const task of allTasks) {
      // Check cancellation
      if (this._isCancelled(executionId)) {
        throw new Error('Execution cancelled');
      }
      
      // Stream notification for task start
      await this.notifier.notify('task-start', {
        taskId: task.id,
        action: task.action
      });
      
      try {
        // Execute task through Atlas-style stages
        const result = await this._executeTaskStaged(task, session);
        results.push(result);
        await this.tracker.completeTask(task.id, result);
        
        // Stream notification for task complete
        await this.notifier.notify('task-complete', {
          taskId: task.id,
          result
        });
        
      } catch (error) {
        const errorResult = {
          taskId: task.id,
          status: 'failed',
          error: error.message,
          data: null
        };
        results.push(errorResult);
        await this.tracker.failTask(task.id, error);
        
        // Stream notification for task failure
        await this.notifier.notify('task-failed', {
          taskId: task.id,
          error: error.message
        });
        
        // Check if we should continue or stop
        if (task.critical) {
          throw new Error(`Critical task ${task.id} failed: ${error.message}`);
        }
      }
    }
    
    return results;
  }

  /**
   * Execute tasks adaptively (Hybrid approach)
   */
  async _executeAdaptive(executionPlan, session, executionId) {
    const results = [];
    
    for (const batch of executionPlan.batches) {
      // Determine execution mode for this batch
      const batchMode = this._determineBatchMode(batch);
      
      logger.debug('hybrid-executor', `Executing batch with mode: ${batchMode}`, {
        batchSize: batch.length,
        taskIds: batch.map(t => t.id)
      });
      
      if (batchMode === ExecutionMode.PARALLEL && batch.length > 1) {
        // Execute in parallel if beneficial
        const batchResults = await this._executeParallel(
          { batches: [batch], strategy: ExecutionMode.PARALLEL },
          session,
          executionId
        );
        results.push(...batchResults);
      } else {
        // Execute sequentially for small batches or dependent tasks
        const batchResults = await this._executeSequential(
          { batches: [batch], strategy: ExecutionMode.SEQUENTIAL },
          session,
          executionId
        );
        results.push(...batchResults);
      }
    }
    
    return results;
  }

  /**
   * Execute task through Atlas-style stages
   */
  async _executeTaskStaged(task, session) {
    const stages = [
      'server-selection',
      'tool-planning',
      'tool-execution',
      'initial-verification'
    ];
    
    let stageResults = {};
    
    for (const stage of stages) {
      const processor = this._getStageProcessor(stage);
      if (!processor) {
        logger.warn('hybrid-executor', `No processor found for stage: ${stage}`);
        continue;
      }
      
      const stageResult = await processor.execute({
        task,
        session,
        previousResults: stageResults
      });
      
      stageResults[stage] = stageResult;
      
      // Check for stage failure
      if (!stageResult.success && stage === 'tool-execution') {
        throw new Error(`Stage ${stage} failed: ${stageResult.error}`);
      }
    }
    
    return {
      taskId: task.id,
      status: 'completed',
      data: stageResults,
      error: null
    };
  }

  /**
   * Analyze tasks and create execution plan
   */
  async _analyzeExecutionPlan(tasks) {
    // Build dependency graph
    const dependencyGraph = this._buildDependencyGraph(tasks);
    
    // Identify parallelizable batches
    const batches = this._identifyBatches(tasks, dependencyGraph);
    
    // Determine overall strategy
    const strategy = this._determineStrategy(tasks, batches);
    
    return {
      batches,
      strategy,
      dependencyGraph
    };
  }

  /**
   * Build dependency graph from tasks
   */
  _buildDependencyGraph(tasks) {
    const graph = new Map();
    
    for (const task of tasks) {
      graph.set(task.id, {
        task,
        dependencies: task.dependencies || [],
        dependents: []
      });
    }
    
    // Build reverse dependencies
    for (const [taskId, node] of graph) {
      for (const depId of node.dependencies) {
        const depNode = graph.get(depId);
        if (depNode) {
          depNode.dependents.push(taskId);
        }
      }
    }
    
    return graph;
  }

  /**
   * Identify parallelizable batches
   */
  _identifyBatches(tasks, dependencyGraph) {
    const batches = [];
    const processed = new Set();
    
    while (processed.size < tasks.length) {
      const batch = [];
      
      for (const task of tasks) {
        if (processed.has(task.id)) continue;
        
        // Check if all dependencies are processed
        const deps = dependencyGraph.get(task.id).dependencies;
        if (deps.every(d => processed.has(d))) {
          batch.push(task);
        }
      }
      
      if (batch.length === 0) {
        // Circular dependency detected
        throw new Error('Circular dependency detected in tasks');
      }
      
      batches.push(batch);
      batch.forEach(t => processed.add(t.id));
    }
    
    return batches;
  }

  /**
   * Determine execution strategy
   */
  _determineStrategy(tasks, batches) {
    if (this.executionMode !== ExecutionMode.ADAPTIVE) {
      return this.executionMode;
    }
    
    // Adaptive strategy selection
    const avgBatchSize = batches.reduce((sum, b) => sum + b.length, 0) / batches.length;
    const hasComplexDependencies = batches.length > tasks.length / 2;
    
    if (avgBatchSize > 3 && !hasComplexDependencies) {
      return ExecutionMode.PARALLEL;
    } else if (hasComplexDependencies || tasks.length < 3) {
      return ExecutionMode.SEQUENTIAL;
    } else {
      return ExecutionMode.ADAPTIVE;
    }
  }

  /**
   * Determine execution mode for a batch
   */
  _determineBatchMode(batch) {
    // Use parallel for large independent batches
    if (batch.length > 2 && batch.every(t => t.task_type === TaskType.ATOMIC)) {
      return ExecutionMode.PARALLEL;
    }
    
    // Use sequential for recipes or critical tasks
    if (batch.some(t => t.task_type === TaskType.RECIPE || t.critical)) {
      return ExecutionMode.SEQUENTIAL;
    }
    
    // Default to parallel for efficiency
    return ExecutionMode.PARALLEL;
  }

  /**
   * Verify results using Atlas's verification system
   */
  async _verifyResults(results, tasks, session) {
    const verifiedResults = [];
    
    for (const result of results) {
      if (result.status !== 'completed') {
        verifiedResults.push(result);
        continue;
      }
      
      const task = tasks.find(t => t.id === result.taskId);
      if (!task || !task.success_criteria) {
        verifiedResults.push(result);
        continue;
      }
      
      // Perform verification
      const verificationResult = await this.verificationAdapter.verify({
        task,
        result,
        session,
        strategy: this.verificationStrategy
      });
      
      if (verificationResult.verified) {
        verifiedResults.push({
          ...result,
          verification: verificationResult
        });
      } else {
        // Handle verification failure
        const retryResult = await this._handleVerificationFailure(task, result, session);
        verifiedResults.push(retryResult);
      }
    }
    
    return verifiedResults;
  }

  /**
   * Handle verification failure with retry logic
   */
  async _handleVerificationFailure(task, result, session) {
    const maxRetries = task.max_attempts || 3;
    const currentAttempt = task.attempt || 1;
    
    if (currentAttempt >= maxRetries) {
      return {
        ...result,
        status: 'failed',
        error: 'Verification failed after max attempts'
      };
    }
    
    // Retry the task
    logger.info('hybrid-executor', `Retrying task ${task.id} (attempt ${currentAttempt + 1}/${maxRetries})`);
    
    const retryTask = {
      ...task,
      attempt: currentAttempt + 1
    };
    
    return await this._executeTaskStaged(retryTask, session);
  }

  /**
   * Get stage processor from container
   */
  _getStageProcessor(stage) {
    const processorMap = {
      'server-selection': 'serverSelectionProcessor',
      'tool-planning': 'tetyanaPlanToolsProcessor',
      'tool-execution': 'tetyanaExecuteToolsProcessor',
      'initial-verification': 'grishaVerifyItemProcessor'
    };
    
    const processorName = processorMap[stage];
    if (!processorName) return null;
    
    try {
      return this.container.resolve(processorName);
    } catch (error) {
      logger.warn('hybrid-executor', `Failed to resolve processor: ${processorName}`);
      return null;
    }
  }

  /**
   * Update performance metrics
   */
  _updateMetrics(tasks, results, startTime) {
    const duration = Date.now() - startTime;
    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    this.metrics.totalTasks = tasks.length;
    this.metrics.completedTasks = completed;
    this.metrics.failedTasks = failed;
    this.metrics.averageExecutionTime = duration / tasks.length;
    this.metrics.parallelizationRatio = this._calculateParallelizationRatio(tasks);
    
    logger.info('hybrid-executor', 'Execution metrics updated', this.metrics);
  }

  /**
   * Calculate parallelization ratio
   */
  _calculateParallelizationRatio(tasks) {
    const independentTasks = tasks.filter(t => !t.dependencies || t.dependencies.length === 0).length;
    return independentTasks / tasks.length;
  }

  /**
   * Check if execution is cancelled
   */
  _isCancelled(executionId) {
    const token = this.cancellationTokens.get(executionId);
    return token && token.cancelled;
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId, reason = 'User cancelled') {
    const token = this.cancellationTokens.get(executionId);
    if (token) {
      token.cancelled = true;
      token.reason = reason;
      logger.info('hybrid-executor', `Execution ${executionId} cancelled: ${reason}`);
    }
  }

  /**
   * Generate unique execution ID
   */
  _generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default HybridWorkflowExecutor;
