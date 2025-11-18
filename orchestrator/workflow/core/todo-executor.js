/**
 * @fileoverview TodoExecutor - Executes TODO items sequentially
 * Handles planning, execution, verification, and retries
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Executes TODO items with planning, execution, verification, and retry logic
 * Responsibilities:
 * - Execute items sequentially
 * - Resolve dependencies
 * - Coordinate planning, execution, verification
 * - Handle retries and adjustments
 * - Track execution state
 */
export class TodoExecutor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.toolPlanner - Tool planner instance
     * @param {Object} dependencies.toolExecutor - Tool executor instance
     * @param {Object} dependencies.verificationEngine - Verification engine instance
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.wsManager - WebSocket manager (optional)
     * @param {Object} dependencies.ttsSyncManager - TTS sync manager (optional)
     */
    constructor(options = {}) {
        this.toolPlanner = options.toolPlanner;
        this.toolExecutor = options.toolExecutor;
        this.verificationEngine = options.verificationEngine;
        this.logger = options.logger || console;
        this.wsManager = options.wsManager;
        this.ttsSyncManager = options.ttsSyncManager;

        this.logger.system('todo-executor', '✅ TodoExecutor initialized');
    }

    /**
     * Execute TODO list
     * @param {Object} todo - TODO object with items
     * @param {Object} session - Session object
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution results
     */
    async execute(todo, session, options = {}) {
        const executionId = this._generateExecutionId();
        const startTime = Date.now();

        this.logger.system('todo-executor', `[${executionId}] Starting TODO execution`, {
            itemCount: todo.items.length,
            workflowId: options.workflowId
        });

        const results = {
            executionId,
            itemsProcessed: 0,
            itemsFailed: 0,
            totalAttempts: 0,
            items: []
        };

        try {
            // Execute each item
            for (let i = 0; i < todo.items.length; i++) {
                const item = todo.items[i];

                this.logger.system('todo-executor', `[${executionId}] Processing item ${i + 1}/${todo.items.length}`, {
                    itemId: item.id,
                    action: item.action.substring(0, 50)
                });

                // Resolve dependencies
                const dependenciesMet = await this._resolveDependencies(item, todo, results);
                if (!dependenciesMet) {
                    this.logger.warn('todo-executor', `[${executionId}] Skipping item ${item.id} - dependencies not met`);
                    results.items.push({
                        itemId: item.id,
                        status: 'skipped',
                        reason: 'dependencies_not_met'
                    });
                    continue;
                }

                // Execute item with retries
                const itemResult = await this._executeItemWithRetries(item, todo, session, executionId);
                results.items.push(itemResult);

                if (itemResult.status === 'completed') {
                    results.itemsProcessed++;
                } else if (itemResult.status === 'failed') {
                    results.itemsFailed++;
                }

                results.totalAttempts += itemResult.attempts || 1;
            }

            const duration = Date.now() - startTime;
            this.logger.system('todo-executor', `[${executionId}] TODO execution completed`, {
                duration: `${duration}ms`,
                processed: results.itemsProcessed,
                failed: results.itemsFailed
            });

            return results;

        } catch (error) {
            this.logger.error('todo-executor', `[${executionId}] TODO execution failed`, {
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * Execute single item with retry logic
     * @private
     */
    async _executeItemWithRetries(item, todo, session, executionId) {
        const itemId = item.id;
        let lastError = null;
        let attempts = 0;

        this.logger.system('todo-executor', `[${executionId}] Executing item ${itemId}`, {
            maxAttempts: item.max_attempts || 3
        });

        for (let attempt = 1; attempt <= (item.max_attempts || 3); attempt++) {
            attempts = attempt;

            try {
                // Step 1: Plan tools
                const plan = await this._planTools(item, session);

                // Step 2: Execute tools
                const execResult = await this._executeTools(item, plan, session);

                // Step 3: Verify result
                const verifyResult = await this._verifyResult(item, execResult, session);

                if (verifyResult.verified) {
                    this.logger.system('todo-executor', `[${executionId}] Item ${itemId} completed successfully`);
                    return {
                        itemId,
                        status: 'completed',
                        attempts,
                        result: execResult,
                        verification: verifyResult
                    };
                } else {
                    lastError = new Error(`Verification failed: ${verifyResult.reason}`);
                    this.logger.warn('todo-executor', `[${executionId}] Item ${itemId} verification failed, retrying...`);
                }

            } catch (error) {
                lastError = error;
                this.logger.warn('todo-executor', `[${executionId}] Item ${itemId} attempt ${attempt} failed: ${error.message}`);
            }

            // Wait before retry
            if (attempt < (item.max_attempts || 3)) {
                await this._delay(1000 * attempt); // Exponential backoff
            }
        }

        this.logger.error('todo-executor', `[${executionId}] Item ${itemId} failed after ${attempts} attempts`, {
            error: lastError?.message
        });

        return {
            itemId,
            status: 'failed',
            attempts,
            error: lastError?.message
        };
    }

    /**
     * Resolve item dependencies
     * @private
     */
    async _resolveDependencies(item, todo, results) {
        if (!item.dependencies || item.dependencies.length === 0) {
            return true;
        }

        for (const depId of item.dependencies) {
            const depResult = results.items.find(r => r.itemId === depId);
            if (!depResult || depResult.status !== 'completed') {
                return false;
            }
        }

        return true;
    }

    /**
     * Plan tools for item
     * @private
     */
    async _planTools(item, session) {
        if (!this.toolPlanner) {
            return { tools: [] };
        }

        try {
            return await this.toolPlanner.plan(item, session);
        } catch (error) {
            this.logger.warn('todo-executor', `Failed to plan tools: ${error.message}`);
            return { tools: [] };
        }
    }

    /**
     * Execute tools for item
     * @private
     */
    async _executeTools(item, plan, session) {
        if (!this.toolExecutor) {
            return { success: true, output: 'No executor available' };
        }

        try {
            return await this.toolExecutor.execute(item, plan, session);
        } catch (error) {
            this.logger.error('todo-executor', `Tool execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verify execution result
     * @private
     */
    async _verifyResult(item, execResult, session) {
        if (!this.verificationEngine) {
            return { verified: true, confidence: 100 };
        }

        try {
            return await this.verificationEngine.verify(item, execResult, session);
        } catch (error) {
            this.logger.warn('todo-executor', `Verification failed: ${error.message}`);
            return { verified: false, reason: error.message, confidence: 0 };
        }
    }

    /**
     * Delay execution
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique execution ID
     * @private
     */
    _generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default TodoExecutor;
