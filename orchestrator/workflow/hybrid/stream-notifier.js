/**
 * Stream Notifier for Real-time Updates
 * Provides streaming notifications during task execution
 * Inspired by Goose's notification streams
 * 
 * @version 1.0.0
 * @date 2025-11-04
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';

// ADDED 2025-11-19: Get user language from environment
const USER_LANGUAGE = process.env.USER_LANGUAGE || 'uk';

/**
 * Notification types
 */
export const NotificationType = {
  TASK_START: 'task-start',
  TASK_COMPLETE: 'task-complete',
  TASK_FAILED: 'task-failed',
  TASK_RETRYING: 'task-retrying',
  BATCH_START: 'batch-start',
  BATCH_COMPLETE: 'batch-complete',
  PROGRESS_UPDATE: 'progress-update',
  LOG_MESSAGE: 'log-message',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Stream notifier for real-time updates
 */
export class StreamNotifier extends EventEmitter {
  constructor(wsManager = null) {
    super();

    this.wsManager = wsManager;
    this.subscribers = new Set();
    this.notificationBuffer = [];
    this.bufferSize = 100;
    this.streamActive = false;

    logger.debug('stream-notifier', 'Stream notifier initialized');
  }

  /**
   * Start streaming notifications
   */
  startStream() {
    this.streamActive = true;
    this.emit('stream-started');

    if (this.wsManager) {
      this.wsManager.broadcastToSubscribers('workflow', 'stream-started', {
        timestamp: Date.now()
      });
    }
  }

  /**
   * Stop streaming notifications
   */
  stopStream() {
    this.streamActive = false;
    this.emit('stream-stopped');

    if (this.wsManager) {
      this.wsManager.broadcastToSubscribers('workflow', 'stream-stopped', {
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send notification
   */
  async notify(type, data) {
    const notification = {
      id: this._generateId(),
      type,
      data,
      timestamp: Date.now()
    };

    // Add to buffer
    this._addToBuffer(notification);

    // Emit local event
    this.emit('notification', notification);
    this.emit(type, data);

    // Send via WebSocket if available and streaming
    if (this.streamActive && this.wsManager) {
      await this._sendViaWebSocket(notification);
    }

    // Log notification
    this._logNotification(notification);

    return notification.id;
  }

  /**
   * Send batch notification
   */
  async notifyBatch(notifications) {
    const batch = {
      id: this._generateId(),
      type: 'batch',
      notifications: notifications.map(n => ({
        type: n.type,
        data: n.data,
        timestamp: Date.now()
      })),
      timestamp: Date.now()
    };

    // Emit local event
    this.emit('batch-notification', batch);

    // Send via WebSocket if available
    if (this.streamActive && this.wsManager) {
      await this._sendViaWebSocket(batch);
    }

    return batch.id;
  }

  /**
   * Subscribe to notifications
   */
  subscribe(callback) {
    this.subscribers.add(callback);

    // Send buffered notifications to new subscriber
    for (const notification of this.notificationBuffer) {
      callback(notification);
    }

    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  /**
   * Get notification buffer
   */
  getBuffer() {
    return [...this.notificationBuffer];
  }

  /**
   * Clear notification buffer
   */
  clearBuffer() {
    this.notificationBuffer = [];
  }

  /**
   * Send via WebSocket
   */
  async _sendViaWebSocket(notification) {
    try {
      const channel = this._getChannelForType(notification.type);

      this.wsManager.broadcastToSubscribers(channel, 'workflow-notification', {
        ...notification,
        channel
      });

      // ADDED 2025-11-19: Get user language for agent messages
      const userLanguage = USER_LANGUAGE;

      // Special handling for certain types
      switch (notification.type) {
        case NotificationType.TASK_START:
          this.wsManager.broadcastToSubscribers('chat', 'agent_message', {
            content: `🔄 Starting: ${notification.data.action}`,
            agent: 'system',
            type: 'status',
            language: userLanguage  // ADDED 2025-11-19: User language for TTS
          });
          break;

        case NotificationType.TASK_COMPLETE:
          this.wsManager.broadcastToSubscribers('chat', 'agent_message', {
            content: `✅ Completed: ${notification.data.action}`,
            agent: 'system',
            type: 'status',
            language: userLanguage  // ADDED 2025-11-19: User language for TTS
          });
          break;

        case NotificationType.TASK_FAILED:
          this.wsManager.broadcastToSubscribers('chat', 'agent_message', {
            content: `❌ Failed: ${notification.data.action} - ${notification.data.error}`,
            agent: 'system',
            type: 'error',
            language: userLanguage  // ADDED 2025-11-19: User language for TTS
          });
          break;

        case NotificationType.PROGRESS_UPDATE:
          this.wsManager.broadcastToSubscribers('workflow', 'progress-update', {
            percentage: notification.data.percentage,
            completed: notification.data.completed,
            total: notification.data.total,
            estimatedTimeRemaining: notification.data.estimatedTimeRemaining
          });
          break;
      }

    } catch (error) {
      logger.error('stream-notifier', 'Failed to send WebSocket notification', {
        error: error.message,
        type: notification.type
      });
    }
  }

  /**
   * Get WebSocket channel for notification type
   */
  _getChannelForType(type) {
    const channelMap = {
      [NotificationType.TASK_START]: 'workflow',
      [NotificationType.TASK_COMPLETE]: 'workflow',
      [NotificationType.TASK_FAILED]: 'workflow',
      [NotificationType.TASK_RETRYING]: 'workflow',
      [NotificationType.BATCH_START]: 'workflow',
      [NotificationType.BATCH_COMPLETE]: 'workflow',
      [NotificationType.PROGRESS_UPDATE]: 'workflow',
      [NotificationType.LOG_MESSAGE]: 'logs',
      [NotificationType.WARNING]: 'alerts',
      [NotificationType.ERROR]: 'alerts'
    };

    return channelMap[type] || 'workflow';
  }

  /**
   * Add notification to buffer
   */
  _addToBuffer(notification) {
    this.notificationBuffer.push(notification);

    // Trim buffer if too large
    if (this.notificationBuffer.length > this.bufferSize) {
      this.notificationBuffer.shift();
    }

    // Notify subscribers
    for (const callback of this.subscribers) {
      try {
        callback(notification);
      } catch (error) {
        logger.error('stream-notifier', 'Subscriber callback error', {
          error: error.message
        });
      }
    }
  }

  /**
   * Log notification
   */
  _logNotification(notification) {
    const logLevel = this._getLogLevel(notification.type);
    const message = this._formatLogMessage(notification);

    logger[logLevel]('stream-notifier', message, {
      type: notification.type,
      data: notification.data
    });
  }

  /**
   * Get log level for notification type
   */
  _getLogLevel(type) {
    switch (type) {
      case NotificationType.ERROR:
      case NotificationType.TASK_FAILED:
        return 'error';
      case NotificationType.WARNING:
      case NotificationType.TASK_RETRYING:
        return 'warn';
      case NotificationType.TASK_START:
      case NotificationType.TASK_COMPLETE:
      case NotificationType.BATCH_START:
      case NotificationType.BATCH_COMPLETE:
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * Format log message
   */
  _formatLogMessage(notification) {
    switch (notification.type) {
      case NotificationType.TASK_START:
        return `Task started: ${notification.data.action}`;
      case NotificationType.TASK_COMPLETE:
        return `Task completed: ${notification.data.action} (${notification.data.duration}ms)`;
      case NotificationType.TASK_FAILED:
        return `Task failed: ${notification.data.action} - ${notification.data.error}`;
      case NotificationType.TASK_RETRYING:
        return `Task retrying: ${notification.data.action} (attempt ${notification.data.attempt}/${notification.data.maxAttempts})`;
      case NotificationType.BATCH_START:
        return `Batch started: ${notification.data.tasks.length} tasks`;
      case NotificationType.BATCH_COMPLETE:
        return `Batch completed: ${notification.data.results.length} results`;
      case NotificationType.PROGRESS_UPDATE:
        return `Progress: ${notification.data.percentage}% (${notification.data.completed}/${notification.data.total})`;
      default:
        return `Notification: ${notification.type}`;
    }
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create async iterator for streaming
   */
  async *stream() {
    const queue = [];
    let resolver = null;

    const listener = (notification) => {
      if (resolver) {
        resolver(notification);
        resolver = null;
      } else {
        queue.push(notification);
      }
    };

    this.on('notification', listener);

    try {
      while (this.streamActive) {
        if (queue.length > 0) {
          yield queue.shift();
        } else {
          yield await new Promise(resolve => {
            resolver = resolve;
          });
        }
      }
    } finally {
      this.off('notification', listener);
    }
  }
}

export default StreamNotifier;
