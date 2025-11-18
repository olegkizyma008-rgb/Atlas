/**
 * TaskHandler
 * 
 * Handles TASK state
 * Coordinates TASK mode processing with nested state transitions:
 * CONTEXT_ENRICHMENT → TODO_PLANNING → ITEM_LOOP → FINAL_SUMMARY
 * 
 * @class TaskHandler
 * @extends StateHandler
 */
import StateHandler from './StateHandler.js';

class TaskHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.userMessage && context.session;
    }

    /**
     * Execute TASK mode with nested state transitions
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} TASK result
     */
    async execute(context, data = {}) {
        this._log('Starting TASK mode with nested state transitions');

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing userMessage or session');
            }

            const { userMessage, session, stateMachine } = context;

            this._log('TASK mode: Coordinating nested state transitions', {
                sessionId: session.id,
                userMessageLength: userMessage.length
            });

            // Phase 2.4.3: Nested state transitions for TODO processing

            // Step 1: Context Enrichment
            this._log('TASK: Transitioning to CONTEXT_ENRICHMENT state');
            await stateMachine.transition(stateMachine.constructor.States.CONTEXT_ENRICHMENT);
            const enrichmentResult = await stateMachine.executeHandler({});

            if (!enrichmentResult.success) {
                throw new Error(`Context enrichment failed: ${enrichmentResult.error}`);
            }

            // Step 2: TODO Planning
            this._log('TASK: Transitioning to TODO_PLANNING state');
            await stateMachine.transition(stateMachine.constructor.States.TODO_PLANNING);
            const todoResult = await stateMachine.executeHandler({});

            if (!todoResult.success) {
                throw new Error(`TODO planning failed: ${todoResult.error}`);
            }

            // Store TODO in context for downstream handlers
            context.todo = todoResult.todo;

            // Step 3: Item Loop (process TODO items)
            this._log('TASK: Transitioning to ITEM_LOOP state');
            await stateMachine.transition(stateMachine.constructor.States.ITEM_LOOP);
            const itemLoopResult = await stateMachine.executeHandler({});

            if (!itemLoopResult.success) {
                throw new Error(`Item loop failed: ${itemLoopResult.error}`);
            }

            // Step 4: Final Summary
            this._log('TASK: Transitioning to FINAL_SUMMARY state');
            await stateMachine.transition(stateMachine.constructor.States.FINAL_SUMMARY);
            const summaryResult = await stateMachine.executeHandler({});

            if (!summaryResult.success) {
                throw new Error(`Final summary failed: ${summaryResult.error}`);
            }

            this._log('TASK mode completed successfully', {
                sessionId: session.id,
                completedItems: summaryResult.metrics?.completedCount || 0,
                totalItems: summaryResult.metrics?.totalCount || 0
            });

            return summaryResult;
        } catch (error) {
            this._logError('TASK mode failed', error);
            throw error;
        }
    }
}

export default TaskHandler;
