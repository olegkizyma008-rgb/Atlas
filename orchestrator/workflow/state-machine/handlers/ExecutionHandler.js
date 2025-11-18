/**
 * ExecutionHandler
 * 
 * Handles EXECUTION state
 * Executes planned tools
 * 
 * @class ExecutionHandler
 * @extends StateHandler
 */
import StateHandler from './StateHandler.js';

class ExecutionHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.currentItem && context.plan;
    }

    /**
     * Execute tools
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Execution result
     */
    async execute(context, data = {}) {
        this._log('Starting execution', { itemId: context.currentItem?.id });

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing currentItem or plan');
            }

            // Get execution processor
            const executeProcessor = this._getProcessor('executeProcessor');

            // Execute tools
            const execResult = await executeProcessor.execute({
                currentItem: context.currentItem,
                plan: context.plan,
                todo: context.todo,
                session: context.session,
                res: context.res
            });

            this._log('Execution completed', {
                itemId: context.currentItem.id,
                success: execResult.success,
                resultsCount: execResult.execution?.results?.length || 0
            });

            // Store result in context
            context.execResult = execResult;

            return {
                success: true,
                execution: execResult.execution,
                summary: execResult.summary
            };
        } catch (error) {
            this._logError('Execution failed', error);
            throw error;
        }
    }
}

export default ExecutionHandler;
