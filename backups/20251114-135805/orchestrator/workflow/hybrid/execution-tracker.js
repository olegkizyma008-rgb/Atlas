/**
 * Task Execution Tracker
 * Tracks progress and state of task execution
 * Inspired by Goose's TaskExecutionTracker
 * 
 * @version 1.0.0
 * @date 2025-11-04
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';

/**
 * Display modes for tracking
 */
export const DisplayMode = {
  SINGLE_TASK: 'single_task',
  MULTIPLE_TASKS: 'multiple_tasks',
  SILENT: 'silent'
};

/**
 * Task status enum
 */
export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying'
};

/**
 * Tracks execution progress of tasks
 */
export class TaskExecutionTracker extends EventEmitter {
  constructor(tasks, notifier = null, displayMode = DisplayMode.MULTIPLE_TASKS) {
    super();
    
    this.tasks = new Map();
    this.notifier = notifier;
    this.displayMode = displayMode;
    this.startTime = Date.now();
    this.cancellationToken = null;
    
    // Initialize task tracking
    this._initializeTasks(tasks);
    
    // Statistics
    this.stats = {
      total: tasks.length,
      pending: tasks.length,
      inProgress: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      retrying: 0
    };
    
    // Progress tracking
    this.progressCheckpoints = [];
    this.lastProgressUpdate = Date.now();
    
    logger.debug('execution-tracker', `Tracker initialized with ${tasks.length} tasks`);
  }

  /**
   * Initialize task tracking structures
   */
  _initializeTasks(tasks) {
    for (const task of tasks) {
      this.tasks.set(task.id, {
        id: task.id,
        action: task.action,
        status: TaskStatus.PENDING,
        startTime: null,
        endTime: null,
        duration: null,
        result: null,
        error: null,
        attempts: 0,
        maxAttempts: task.max_attempts || 3,
        dependencies: task.dependencies || [],
        metadata: {
          tools_needed: task.tools_needed,
          mcp_servers: task.mcp_servers,
          success_criteria: task.success_criteria
        }
      });
    }
  }

  /**
   * Start tracking a task
   */
  async startTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('execution-tracker', `Task ${taskId} not found`);
      return;
    }
    
    // Update task state
    task.status = TaskStatus.IN_PROGRESS;
    task.startTime = Date.now();
    task.attempts++;
    
    // Update statistics
    this.stats.pending--;
    this.stats.inProgress++;
    
    // Emit event
    this.emit('task-started', {
      taskId,
      action: task.action,
      attempt: task.attempts,
      timestamp: task.startTime
    });
    
    // Send notification if enabled
    if (this.notifier && this.displayMode !== DisplayMode.SILENT) {
      await this.notifier.notify('task-started', {
        taskId,
        action: task.action,
        progress: this.getProgress()
      });
    }
    
    // Log progress
    this._logProgress(`Starting task ${taskId}: ${task.action}`);
  }

  /**
   * Complete a task successfully
   */
  async completeTask(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('execution-tracker', `Task ${taskId} not found`);
      return;
    }
    
    // Update task state
    task.status = TaskStatus.COMPLETED;
    task.endTime = Date.now();
    task.duration = task.endTime - task.startTime;
    task.result = result;
    
    // Update statistics
    this.stats.inProgress--;
    this.stats.completed++;
    
    // Emit event
    this.emit('task-completed', {
      taskId,
      action: task.action,
      duration: task.duration,
      result,
      timestamp: task.endTime
    });
    
    // Send notification if enabled
    if (this.notifier && this.displayMode !== DisplayMode.SILENT) {
      await this.notifier.notify('task-completed', {
        taskId,
        action: task.action,
        duration: task.duration,
        progress: this.getProgress()
      });
    }
    
    // Log progress
    this._logProgress(`Completed task ${taskId} in ${task.duration}ms`);
    
    // Check if all tasks are complete
    this._checkCompletion();
  }

  /**
   * Mark task as failed
   */
  async failTask(taskId, error) {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('execution-tracker', `Task ${taskId} not found`);
      return;
    }
    
    // Check if we should retry
    if (task.attempts < task.maxAttempts) {
      return await this.retryTask(taskId, error);
    }
    
    // Update task state
    task.status = TaskStatus.FAILED;
    task.endTime = Date.now();
    task.duration = task.endTime - task.startTime;
    task.error = error;
    
    // Update statistics
    this.stats.inProgress--;
    this.stats.failed++;
    
    // Emit event
    this.emit('task-failed', {
      taskId,
      action: task.action,
      error: error.message || error,
      attempts: task.attempts,
      timestamp: task.endTime
    });
    
    // Send notification if enabled
    if (this.notifier && this.displayMode !== DisplayMode.SILENT) {
      await this.notifier.notify('task-failed', {
        taskId,
        action: task.action,
        error: error.message || error,
        progress: this.getProgress()
      });
    }
    
    // Log progress
    this._logProgress(`Failed task ${taskId}: ${error.message || error}`);
    
    // Check if all tasks are complete
    this._checkCompletion();
  }

  /**
   * Retry a failed task
   */
  async retryTask(taskId, previousError) {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('execution-tracker', `Task ${taskId} not found`);
      return;
    }
    
    // Update task state
    task.status = TaskStatus.RETRYING;
    task.error = previousError;
    
    // Update statistics
    this.stats.inProgress--;
    this.stats.retrying++;
    
    // Emit event
    this.emit('task-retrying', {
      taskId,
      action: task.action,
      attempt: task.attempts + 1,
      maxAttempts: task.maxAttempts,
      previousError: previousError.message || previousError,
      timestamp: Date.now()
    });
    
    // Send notification if enabled
    if (this.notifier && this.displayMode !== DisplayMode.SILENT) {
      await this.notifier.notify('task-retrying', {
        taskId,
        action: task.action,
        attempt: task.attempts + 1,
        maxAttempts: task.maxAttempts,
        progress: this.getProgress()
      });
    }
    
    // Log progress
    this._logProgress(`Retrying task ${taskId} (attempt ${task.attempts + 1}/${task.maxAttempts})`);
    
    // Reset for retry
    setTimeout(() => {
      task.status = TaskStatus.PENDING;
      this.stats.retrying--;
      this.stats.pending++;
    }, 1000); // Brief delay before retry
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId, reason = 'User cancelled') {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('execution-tracker', `Task ${taskId} not found`);
      return;
    }
    
    // Update task state
    const previousStatus = task.status;
    task.status = TaskStatus.CANCELLED;
    task.endTime = Date.now();
    if (task.startTime) {
      task.duration = task.endTime - task.startTime;
    }
    task.error = reason;
    
    // Update statistics based on previous status
    switch (previousStatus) {
      case TaskStatus.PENDING:
        this.stats.pending--;
        break;
      case TaskStatus.IN_PROGRESS:
        this.stats.inProgress--;
        break;
      case TaskStatus.RETRYING:
        this.stats.retrying--;
        break;
    }
    this.stats.cancelled++;
    
    // Emit event
    this.emit('task-cancelled', {
      taskId,
      action: task.action,
      reason,
      timestamp: task.endTime
    });
    
    // Send notification if enabled
    if (this.notifier && this.displayMode !== DisplayMode.SILENT) {
      await this.notifier.notify('task-cancelled', {
        taskId,
        action: task.action,
        reason,
        progress: this.getProgress()
      });
    }
    
    // Log progress
    this._logProgress(`Cancelled task ${taskId}: ${reason}`);
  }

  /**
   * Get current progress
   */
  getProgress() {
    const total = this.stats.total;
    const completed = this.stats.completed + this.stats.failed + this.stats.cancelled;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      percentage,
      completed,
      total,
      stats: { ...this.stats },
      duration: Date.now() - this.startTime,
      estimatedTimeRemaining: this._estimateTimeRemaining()
    };
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    return task ? task.status : null;
  }

  /**
   * Get all tasks with specific status
   */
  getTasksByStatus(status) {
    const tasks = [];
    for (const task of this.tasks.values()) {
      if (task.status === status) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  /**
   * Get ready tasks (dependencies satisfied)
   */
  getReadyTasks() {
    const completedIds = new Set(
      this.getTasksByStatus(TaskStatus.COMPLETED).map(t => t.id)
    );
    
    const readyTasks = [];
    for (const task of this.tasks.values()) {
      if (task.status === TaskStatus.PENDING) {
        const dependenciesSatisfied = task.dependencies.every(
          depId => completedIds.has(depId)
        );
        if (dependenciesSatisfied) {
          readyTasks.push(task);
        }
      }
    }
    
    return readyTasks;
  }

  /**
   * Refresh display (for UI updates)
   */
  async refreshDisplay() {
    if (this.notifier && this.displayMode !== DisplayMode.SILENT) {
      const progress = this.getProgress();
      await this.notifier.notify('progress-update', progress);
      
      // Add checkpoint
      this.progressCheckpoints.push({
        timestamp: Date.now(),
        progress: progress.percentage,
        stats: { ...this.stats }
      });
    }
  }

  /**
   * Set cancellation token
   */
  setCancellationToken(token) {
    this.cancellationToken = token;
  }

  /**
   * Check if execution is cancelled
   */
  isCancelled() {
    return this.cancellationToken && this.cancellationToken.cancelled;
  }

  /**
   * Estimate time remaining
   */
  _estimateTimeRemaining() {
    if (this.stats.completed === 0) {
      return null; // Can't estimate without completed tasks
    }
    
    const elapsed = Date.now() - this.startTime;
    const avgTimePerTask = elapsed / this.stats.completed;
    const remainingTasks = this.stats.pending + this.stats.inProgress + this.stats.retrying;
    
    return Math.round(avgTimePerTask * remainingTasks);
  }

  /**
   * Check if all tasks are complete
   */
  _checkCompletion() {
    const incomplete = this.stats.pending + this.stats.inProgress + this.stats.retrying;
    
    if (incomplete === 0) {
      const duration = Date.now() - this.startTime;
      const success = this.stats.failed === 0 && this.stats.cancelled === 0;
      
      this.emit('execution-complete', {
        success,
        duration,
        stats: { ...this.stats },
        tasks: Array.from(this.tasks.values())
      });
      
      logger.info('execution-tracker', `Execution complete in ${duration}ms`, {
        success,
        completed: this.stats.completed,
        failed: this.stats.failed,
        cancelled: this.stats.cancelled
      });
    }
  }

  /**
   * Log progress message
   */
  _logProgress(message) {
    const progress = this.getProgress();
    logger.debug('execution-tracker', `[${progress.percentage}%] ${message}`);
  }

  /**
   * Get execution summary
   */
  getSummary() {
    const tasks = Array.from(this.tasks.values());
    const duration = Date.now() - this.startTime;
    
    return {
      duration,
      stats: { ...this.stats },
      progress: this.getProgress(),
      tasks: tasks.map(t => ({
        id: t.id,
        action: t.action,
        status: t.status,
        duration: t.duration,
        attempts: t.attempts,
        error: t.error
      })),
      checkpoints: this.progressCheckpoints,
      success: this.stats.failed === 0 && this.stats.cancelled === 0
    };
  }

  /**
   * Export execution data
   */
  exportData() {
    return {
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
      stats: { ...this.stats },
      tasks: Array.from(this.tasks.entries()),
      checkpoints: this.progressCheckpoints,
      displayMode: this.displayMode
    };
  }
}

export default TaskExecutionTracker;
