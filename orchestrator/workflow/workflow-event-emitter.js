/**
 * Workflow Event Emitter
 * Централізована система подій для workflow orchestrator
 */

import { EventEmitter } from 'events';

export class WorkflowEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Збільшуємо ліміт для складних workflows
    
    // Зареєстровані події
    this.events = {
      // Workflow lifecycle
      WORKFLOW_START: 'workflow:start',
      WORKFLOW_COMPLETE: 'workflow:complete',
      WORKFLOW_ERROR: 'workflow:error',
      
      // Stage events
      STAGE_START: 'stage:start',
      STAGE_COMPLETE: 'stage:complete',
      STAGE_ERROR: 'stage:error',
      
      // Task events
      TASK_START: 'task:start',
      TASK_PROGRESS: 'task:progress',
      TASK_COMPLETE: 'task:complete',
      TASK_ERROR: 'task:error',
      
      // Agent events
      AGENT_MESSAGE: 'agent:message',
      AGENT_THINKING: 'agent:thinking',
      AGENT_ACTION: 'agent:action',
      
      // TTS events
      TTS_START: 'tts:start',
      TTS_COMPLETE: 'tts:complete',
      TTS_ERROR: 'tts:error',
      
      // MCP events
      MCP_TOOL_CALL: 'mcp:tool_call',
      MCP_TOOL_RESULT: 'mcp:tool_result',
      MCP_ERROR: 'mcp:error',
      
      // ETERNITY events
      ETERNITY_ANALYSIS: 'eternity:analysis',
      ETERNITY_IMPROVEMENT: 'eternity:improvement',
      ETERNITY_EVOLUTION: 'eternity:evolution'
    };
  }
  
  /**
   * Emit workflow event with structured data
   */
  emitWorkflowEvent(eventType, data) {
    const eventData = {
      type: eventType,
      timestamp: Date.now(),
      ...data
    };
    
    this.emit(eventType, eventData);
    
    // Also emit generic 'workflow:event' for global listeners
    this.emit('workflow:event', eventData);
  }
  
  /**
   * Emit stage event
   */
  emitStageEvent(stageName, status, data = {}) {
    this.emitWorkflowEvent(this.events[`STAGE_${status.toUpperCase()}`], {
      stage: stageName,
      ...data
    });
  }
  
  /**
   * Emit task event
   */
  emitTaskEvent(taskId, status, data = {}) {
    this.emitWorkflowEvent(this.events[`TASK_${status.toUpperCase()}`], {
      taskId,
      ...data
    });
  }
  
  /**
   * Emit agent message
   */
  emitAgentMessage(agent, message, metadata = {}) {
    this.emitWorkflowEvent(this.events.AGENT_MESSAGE, {
      agent,
      message,
      ...metadata
    });
  }
  
  /**
   * Emit TTS event
   */
  emitTTSEvent(status, data = {}) {
    this.emitWorkflowEvent(this.events[`TTS_${status.toUpperCase()}`], data);
  }
  
  /**
   * Emit MCP event
   */
  emitMCPEvent(type, data = {}) {
    const eventKey = `MCP_${type.toUpperCase()}`;
    if (this.events[eventKey]) {
      this.emitWorkflowEvent(this.events[eventKey], data);
    }
  }
  
  /**
   * Emit ETERNITY module event
   */
  emitEternityEvent(type, data = {}) {
    const eventKey = `ETERNITY_${type.toUpperCase()}`;
    if (this.events[eventKey]) {
      this.emitWorkflowEvent(this.events[eventKey], data);
    }
  }
  
  /**
   * Wait for specific event with timeout
   */
  async waitForEvent(eventType, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Event ${eventType} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      const handler = (data) => {
        clearTimeout(timeout);
        resolve(data);
      };
      
      this.once(eventType, handler);
    });
  }
  
  /**
   * Create scoped emitter for specific workflow
   */
  createScopedEmitter(workflowId) {
    const scopedEmitter = new WorkflowEventEmitter();
    
    // Forward all events with workflow scope
    scopedEmitter.on('workflow:event', (data) => {
      this.emitWorkflowEvent(data.type, {
        ...data,
        workflowId
      });
    });
    
    return scopedEmitter;
  }
  
  /**
   * Get all registered events
   */
  getRegisteredEvents() {
    return { ...this.events };
  }
  
  /**
   * Clear all listeners (cleanup)
   */
  cleanup() {
    this.removeAllListeners();
  }
}

// Singleton instance
let instance = null;

export function getWorkflowEmitter() {
  if (!instance) {
    instance = new WorkflowEventEmitter();
  }
  return instance;
}

export default WorkflowEventEmitter;
