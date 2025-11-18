/**
 * VerificationHandler
 * 
 * Handles VERIFICATION state
 * Verifies execution results
 * 
 * @class VerificationHandler
 * @extends StateHandler
 */
const StateHandler = require('./StateHandler');

class VerificationHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.currentItem && context.execResult;
    }

    /**
     * Execute verification
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Verification result
     */
    async execute(context, data = {}) {
        this._log('Starting verification', { itemId: context.currentItem?.id });

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing currentItem or execResult');
            }

            // Get verification processor
            const verifyProcessor = this._getProcessor('verifyProcessor');

            // Execute verification
            const verifyResult = await verifyProcessor.execute({
                currentItem: context.currentItem,
                execution: context.execResult.execution,
                todo: context.todo,
                session: context.session,
                res: context.res
            });

            this._log('Verification completed', {
                itemId: context.currentItem.id,
                verified: verifyResult.verified,
                confidence: verifyResult.metadata?.confidence || 0
            });

            // Store result in context
            context.verifyResult = verifyResult;

            return {
                success: true,
                verified: verifyResult.verified,
                confidence: verifyResult.metadata?.confidence || 0,
                summary: verifyResult.summary
            };
        } catch (error) {
            this._logError('Verification failed', error);
            throw error;
        }
    }
}

module.exports = VerificationHandler;
