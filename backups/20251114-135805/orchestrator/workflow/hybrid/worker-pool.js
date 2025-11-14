/**
 * Worker Pool for Parallel Task Execution
 * Inspired by Goose's parallel execution model
 * 
 * @version 1.0.0
 * @date 2025-11-04
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';

/**
 * Worker states
 */
const WorkerState = {
  IDLE: 'idle',
  BUSY: 'busy',
  ERROR: 'error',
  TERMINATED: 'terminated'
};

/**
 * Individual worker that processes tasks
 */
class Worker extends EventEmitter {
  constructor(id, container) {
    super();
    this.id = id;
    this.container = container;
    this.state = WorkerState.IDLE;
    this.currentTask = null;
    this.taskCount = 0;
    this.errorCount = 0;
    
    logger.debug('worker-pool', `Worker ${id} created`);
  }

  /**
   * Execute a task
   */
  async execute(task, context) {
    if (this.state === WorkerState.BUSY) {
      throw new Error(`Worker ${this.id} is already busy`);
    }
    
    this.state = WorkerState.BUSY;
    this.currentTask = task;
    const startTime = Date.now();
    
    try {
      logger.debug('worker-pool', `Worker ${this.id} starting task ${task.id}`);
      
      // Check for cancellation
      if (context.cancellationToken && context.cancellationToken.cancelled) {
        throw new Error('Task cancelled');
      }
      
      // Execute based on task type
      let result;
      switch (task.task_type) {
        case 'atomic':
          result = await this._executeAtomic(task, context);
          break;
        case 'recipe':
          result = await this._executeRecipe(task, context);
          break;
        case 'parallel_group':
          result = await this._executeParallelGroup(task, context);
          break;
        default:
          result = await this._executeDefault(task, context);
      }
      
      // Update metrics
      this.taskCount++;
      const duration = Date.now() - startTime;
      
      logger.debug('worker-pool', `Worker ${this.id} completed task ${task.id} in ${duration}ms`);
      
      this.emit('task-complete', {
        workerId: this.id,
        taskId: task.id,
        duration,
        result
      });
      
      return {
        taskId: task.id,
        status: 'completed',
        data: result,
        error: null,
        workerId: this.id,
        duration
      };
      
    } catch (error) {
      this.errorCount++;
      const duration = Date.now() - startTime;
      
      logger.error('worker-pool', `Worker ${this.id} failed task ${task.id}`, {
        error: error.message,
        duration
      });
      
      this.emit('task-error', {
        workerId: this.id,
        taskId: task.id,
        error: error.message,
        duration
      });
      
      return {
        taskId: task.id,
        status: 'failed',
        data: null,
        error: error.message,
        workerId: this.id,
        duration
      };
      
    } finally {
      this.state = WorkerState.IDLE;
      this.currentTask = null;
    }
  }

  /**
   * Execute atomic task (single operation)
   */
  async _executeAtomic(task, context) {
    // Get appropriate processor from container
    const processor = this._getProcessor(task);
    
    if (!processor) {
      throw new Error(`No processor found for task type: ${task.action_type}`);
    }
    
    // Execute through processor
    const result = await processor.execute({
      action: task.action,
      parameters: task.parameters,
      tools_needed: task.tools_needed,
      mcp_servers: task.mcp_servers,
      session: context.session
    });
    
    return result;
  }

  /**
   * Execute recipe task (composite operations)
   */
  async _executeRecipe(task, context) {
    // Recipe tasks contain multiple sub-tasks
    const recipe = task.recipe || task.payload?.recipe;
    
    if (!recipe) {
      throw new Error('Recipe task missing recipe definition');
    }
    
    const results = [];
    
    for (const step of recipe.steps) {
      // Check cancellation before each step
      if (context.cancellationToken && context.cancellationToken.cancelled) {
        throw new Error('Recipe execution cancelled');
      }
      
      // Execute step
      const stepResult = await this._executeAtomic({
        ...step,
        task_type: 'atomic'
      }, context);
      
      results.push(stepResult);
      
      // Check if step failed and should stop
      if (!stepResult.success && step.critical) {
        throw new Error(`Critical recipe step failed: ${step.id}`);
      }
    }
    
    return {
      recipe: recipe.name,
      steps: results,
      success: results.every(r => r.success)
    };
  }

  /**
   * Execute parallel group (multiple parallel operations)
   */
  async _executeParallelGroup(task, context) {
    const group = task.group || task.payload?.group;
    
    if (!group || !Array.isArray(group)) {
      throw new Error('Parallel group task missing group definition');
    }
    
    // Execute all tasks in parallel
    const promises = group.map(subtask => 
      this._executeAtomic({
        ...subtask,
        task_type: 'atomic'
      }, context)
    );
    
    const results = await Promise.allSettled(promises);
    
    return {
      group: task.id,
      results: results.map((r, i) => ({
        taskId: group[i].id,
        status: r.status,
        value: r.status === 'fulfilled' ? r.value : null,
        error: r.status === 'rejected' ? r.reason.message : null
      })),
      success: results.every(r => r.status === 'fulfilled')
    };
  }

  /**
   * Execute default task (fallback to MCP workflow)
   */
  async _executeDefault(task, context) {
    // Use existing MCP workflow
    const mcpTodoManager = this.container.resolve('mcpTodoManager');
    
    if (!mcpTodoManager) {
      throw new Error('MCPTodoManager not available');
    }
    
    // Convert task to MCP format
    const mcpItem = {
      id: task.id,
      action: task.action,
      tools_needed: task.tools_needed || [],
      mcp_servers: task.mcp_servers || [],
      parameters: task.parameters || {},
      success_criteria: task.success_criteria,
      fallback_options: task.fallback_options || [],
      dependencies: task.dependencies || [],
      attempt: task.attempt || 1,
      max_attempts: task.max_attempts || 3,
      status: 'pending'
    };
    
    // Execute through MCP workflow
    const result = await mcpTodoManager.executeVerificationWorkflow(mcpItem, context.session);
    
    return result;
  }

  /**
   * Get processor based on task requirements
   */
  _getProcessor(task) {
    // Determine which processor to use
    if (task.mcp_servers && task.mcp_servers.length > 0) {
      // Use MCP workflow for MCP tasks
      return {
        execute: async (params) => {
          const mcpTodoManager = this.container.resolve('mcpTodoManager');
          return await mcpTodoManager.executeVerificationWorkflow(params, params.session);
        }
      };
    }
    
    // Try to get specific processor
    const processorMap = {
      'tool-planning': 'tetyanaPlanToolsProcessor',
      'tool-execution': 'tetyanaExecuteToolsProcessor',
      'verification': 'grishaVerifyItemProcessor'
    };
    
    const processorName = processorMap[task.action_type];
    if (processorName) {
      try {
        return this.container.resolve(processorName);
      } catch (error) {
        logger.warn('worker-pool', `Failed to resolve processor: ${processorName}`);
      }
    }
    
    return null;
  }

  /**
   * Terminate worker
   */
  terminate() {
    this.state = WorkerState.TERMINATED;
    this.removeAllListeners();
    logger.debug('worker-pool', `Worker ${this.id} terminated`);
  }
}

/**
 * Worker Pool manages multiple workers for parallel execution
 */
export class WorkerPool extends EventEmitter {
  constructor(maxWorkers = 10, container = null) {
    super();
    this.maxWorkers = maxWorkers;
    this.container = container;
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers = 0;
    this.completedTasks = 0;
    this.failedTasks = 0;
    
    // Initialize workers
    this._initializeWorkers();
    
    logger.system('worker-pool', `Worker pool initialized with ${maxWorkers} workers`);
  }

  /**
   * Initialize worker instances
   */
  _initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(i, this.container);
      
      // Listen to worker events
      worker.on('task-complete', (data) => {
        this.completedTasks++;
        this.emit('task-complete', data);
        this._processNextTask(worker);
      });
      
      worker.on('task-error', (data) => {
        this.failedTasks++;
        this.emit('task-error', data);
        this._processNextTask(worker);
      });
      
      this.workers.push(worker);
    }
  }

  /**
   * Execute a single task
   */
  async executeTask(task, context) {
    return new Promise((resolve, reject) => {
      // Find idle worker
      const worker = this._findIdleWorker();
      
      if (worker) {
        // Execute immediately
        this.activeWorkers++;
        worker.execute(task, context)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.activeWorkers--;
          });
      } else {
        // Queue the task
        this.taskQueue.push({
          task,
          context,
          resolve,
          reject
        });
        
        logger.debug('worker-pool', `Task ${task.id} queued (queue size: ${this.taskQueue.length})`);
      }
    });
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeBatch(tasks, context) {
    const promises = tasks.map(task => this.executeTask(task, context));
    return await Promise.allSettled(promises);
  }

  /**
   * Find an idle worker
   */
  _findIdleWorker() {
    return this.workers.find(w => w.state === WorkerState.IDLE);
  }

  /**
   * Process next task in queue
   */
  _processNextTask(worker) {
    if (this.taskQueue.length === 0) {
      return;
    }
    
    const { task, context, resolve, reject } = this.taskQueue.shift();
    
    logger.debug('worker-pool', `Dequeuing task ${task.id} for worker ${worker.id}`);
    
    this.activeWorkers++;
    worker.execute(task, context)
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.activeWorkers--;
      });
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.activeWorkers,
      idleWorkers: this.workers.filter(w => w.state === WorkerState.IDLE).length,
      queueSize: this.taskQueue.length,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      workerStats: this.workers.map(w => ({
        id: w.id,
        state: w.state,
        taskCount: w.taskCount,
        errorCount: w.errorCount,
        currentTask: w.currentTask?.id || null
      }))
    };
  }

  /**
   * Resize worker pool
   */
  async resize(newSize) {
    if (newSize === this.maxWorkers) {
      return;
    }
    
    if (newSize > this.maxWorkers) {
      // Add workers
      for (let i = this.maxWorkers; i < newSize; i++) {
        const worker = new Worker(i, this.container);
        
        worker.on('task-complete', (data) => {
          this.completedTasks++;
          this.emit('task-complete', data);
          this._processNextTask(worker);
        });
        
        worker.on('task-error', (data) => {
          this.failedTasks++;
          this.emit('task-error', data);
          this._processNextTask(worker);
        });
        
        this.workers.push(worker);
      }
    } else {
      // Remove workers (only idle ones)
      const workersToRemove = this.maxWorkers - newSize;
      let removed = 0;
      
      for (let i = this.workers.length - 1; i >= 0 && removed < workersToRemove; i--) {
        if (this.workers[i].state === WorkerState.IDLE) {
          this.workers[i].terminate();
          this.workers.splice(i, 1);
          removed++;
        }
      }
    }
    
    this.maxWorkers = this.workers.length;
    logger.info('worker-pool', `Worker pool resized to ${this.maxWorkers} workers`);
  }

  /**
   * Terminate all workers
   */
  terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    
    this.workers = [];
    this.taskQueue = [];
    this.removeAllListeners();
    
    logger.info('worker-pool', 'Worker pool terminated');
  }
}

export default WorkerPool;
