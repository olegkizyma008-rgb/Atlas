/**
 * ReplanHandler
 * 
 * Handles REPLAN state
 * Replans failed items
 * 
 * @class ReplanHandler
 * @extends StateHandler
 */
import StateHandler from './StateHandler.js';

class ReplanHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.currentItem && context.verifyResult;
    }

    /**
     * Execute replan
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Replan result
     */
    async execute(context, data = {}) {
        this._log('Starting replan', { itemId: context.currentItem?.id });

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing currentItem or verifyResult');
            }

            // Get replan processor
            const replanProcessor = this._getProcessor('replanProcessor');

            // Prepare data for replan
            const tetyanaData = {
                plan: context.plan || { tool_calls: [] },
                execution: context.execResult?.execution || { all_successful: false },
                tools_used: context.execResult?.execution?.results?.map(r => r.tool) || []
            };

            const grishaData = {
                verified: false,
                reason: context.verifyResult.reason,
                visual_evidence: context.verifyResult.visual_evidence,
                screenshot_path: context.verifyResult.screenshot_path,
                confidence: context.verifyResult.metadata?.confidence || 0,
                suggestions: context.verifyResult.suggestions,
                failure_analysis: context.verifyResult.failure_analysis
            };

            // Execute replan
            const replanResult = await replanProcessor.execute({
                failedItem: context.currentItem,
                todo: context.todo,
                tetyanaData,
                grishaData,
                session: context.session,
                res: context.res
            });

            this._log('Replan completed', {
                itemId: context.currentItem.id,
                strategy: replanResult.strategy,
                replanned: replanResult.replanned,
                newItemsCount: replanResult.new_items?.length || 0
            });

            // Store result in context
            context.replanResult = replanResult;

            return {
                success: true,
                strategy: replanResult.strategy,
                replanned: replanResult.replanned,
                newItemsCount: replanResult.new_items?.length || 0,
                newItems: replanResult.new_items
            };
        } catch (error) {
            this._logError('Replan failed', error);
            throw error;
        }
    }
}

export default ReplanHandler;
