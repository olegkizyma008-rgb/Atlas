/**
 * ToolPlanningHandler
 * 
 * Handles TOOL_PLANNING state
 * Plans tools for execution
 * 
 * @class ToolPlanningHandler
 * @extends StateHandler
 */
import StateHandler from './StateHandler.js';

class ToolPlanningHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.currentItem && context.selectedServers;
    }

    /**
     * Execute tool planning
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Planning result
     */
    async execute(context, data = {}) {
        this._log('Starting tool planning', { itemId: context.currentItem?.id });

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing currentItem or selectedServers');
            }

            // Get tool planning processor
            const planProcessor = this._getProcessor('planProcessor');

            // Execute tool planning
            const planResult = await planProcessor.execute({
                currentItem: context.currentItem,
                todo: context.todo,
                session: context.session,
                res: context.res,
                selected_servers: context.selectedServers,
                selected_prompts: context.selectedPrompts
            });

            if (!planResult.success) {
                throw new Error(planResult.error || 'Tool planning failed');
            }

            this._log('Tools planned', {
                itemId: context.currentItem.id,
                toolsCount: planResult.plan?.tool_calls?.length || 0
            });

            // Store result in context
            context.plan = planResult.plan;
            context.planResult = planResult;

            return {
                success: true,
                plan: planResult.plan,
                toolsCount: planResult.plan?.tool_calls?.length || 0
            };
        } catch (error) {
            this._logError('Tool planning failed', error);
            throw error;
        }
    }
}

export default ToolPlanningHandler;
