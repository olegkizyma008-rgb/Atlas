/**
 * @fileoverview WorkflowEngine - Main orchestrator for MCP workflow execution
 * Coordinates TodoBuilder and TodoExecutor for complete workflow lifecycle
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Main workflow orchestrator
 * Responsibilities:
 * - Coordinate TODO building and execution
 * - Manage session and context
 * - Handle errors and logging
 * - Provide workflow lifecycle management
 */
export class WorkflowEngine {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.todoBuilder - TodoBuilder instance
     * @param {Object} dependencies.todoExecutor - TodoExecutor instance
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.wsManager - WebSocket manager (optional)
     * @param {Object} dependencies.ttsSyncManager - TTS sync manager (optional)
     */
    constructor(options = {}) {
        this.todoBuilder = options.todoBuilder;
        this.todoExecutor = options.todoExecutor;
        this.logger = options.logger || console;
        this.wsManager = options.wsManager;
        this.ttsSyncManager = options.ttsSyncManager;

        if (!this.todoBuilder) {
            throw new Error('WorkflowEngine requires todoBuilder dependency');
        }
        if (!this.todoExecutor) {
            throw new Error('WorkflowEngine requires todoExecutor dependency');
        }

        this.logger.system('workflow-engine', '✅ WorkflowEngine initialized');
    }

    /**
     * Execute complete workflow from user message to results
     * @param {string} userMessage - User's request message
     * @param {Object} session - Session object with id, container, etc.
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Workflow results
     */
    async execute(userMessage, session, options = {}) {
        const startTime = Date.now();
        const workflowId = this._generateWorkflowId();

        this.logger.system('workflow-engine', `[${workflowId}] Starting workflow execution`, {
            userMessage: userMessage.substring(0, 100),
            sessionId: session?.id
        });

        try {
            // Validate session
            this._validateSession(session);

            // Step 1: Build TODO from user message
            this.logger.system('workflow-engine', `[${workflowId}] Building TODO from user message`);
            const todo = await this.todoBuilder.build(userMessage, {
                sessionId: session.id,
                ...options
            });

            if (!todo || !Array.isArray(todo.items)) {
                throw new Error('TodoBuilder returned invalid TODO structure');
            }

            this.logger.system('workflow-engine', `[${workflowId}] TODO built successfully`, {
                itemCount: todo.items.length,
                complexity: todo.complexity
            });

            // Step 2: Execute TODO
            this.logger.system('workflow-engine', `[${workflowId}] Executing TODO items`);
            const results = await this.todoExecutor.execute(todo, session, {
                workflowId,
                ...options
            });

            // Step 3: Prepare final results
            const duration = Date.now() - startTime;
            const finalResults = {
                success: true,
                workflowId,
                todo,
                results,
                metrics: {
                    duration,
                    itemsProcessed: results.itemsProcessed || 0,
                    itemsFailed: results.itemsFailed || 0,
                    totalAttempts: results.totalAttempts || 0
                }
            };

            this.logger.system('workflow-engine', `[${workflowId}] Workflow completed successfully`, {
                duration: `${duration}ms`,
                itemsProcessed: finalResults.metrics.itemsProcessed
            });

            return finalResults;

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error('workflow-engine', `[${workflowId}] Workflow failed`, {
                error: error.message,
                duration: `${duration}ms`,
                stack: error.stack
            });

            return {
                success: false,
                workflowId,
                error: error.message,
                metrics: {
                    duration
                }
            };
        }
    }

    /**
     * Validate session object
     * @private
     */
    _validateSession(session) {
        if (!session) {
            throw new Error('Session is required');
        }

        if (!session.id) {
            throw new Error('Session must have an id');
        }

        if (!session.container) {
            this.logger.warn('workflow-engine', 'Session missing container (DI)');
        }
    }

    /**
     * Generate unique workflow ID
     * @private
     */
    _generateWorkflowId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get workflow status
     * @param {string} workflowId - Workflow ID
     * @returns {Object} Status information
     */
    getStatus(workflowId) {
        return {
            workflowId,
            timestamp: Date.now()
        };
    }
}

export default WorkflowEngine;
