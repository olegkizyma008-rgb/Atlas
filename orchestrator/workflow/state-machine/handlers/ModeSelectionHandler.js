/**
 * ModeSelectionHandler
 * 
 * Handles MODE_SELECTION state
 * Determines execution mode: chat, task, or dev
 * 
 * @class ModeSelectionHandler
 * @extends StateHandler
 */
import StateHandler from './StateHandler.js';

class ModeSelectionHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.userMessage;
    }

    /**
     * Execute mode selection
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Mode selection result
     */
    async execute(context, data = {}) {
        this._log('Starting mode selection');

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing userMessage');
            }

            // Get mode processor
            const modeProcessor = this._getProcessor('modeProcessor');

            // Execute mode selection
            const modeResult = await modeProcessor.execute({
                userMessage: context.userMessage,
                session: context.session
            });

            this._log('Mode selected', {
                mode: modeResult.mode,
                confidence: modeResult.confidence,
                mood: modeResult.mood
            });

            // Store result in context
            context.mode = modeResult.mode;
            context.modeResult = modeResult;

            return {
                success: true,
                mode: modeResult.mode,
                confidence: modeResult.confidence,
                mood: modeResult.mood,
                reasoning: modeResult.reasoning
            };
        } catch (error) {
            this._logError('Mode selection failed', error);
            throw error;
        }
    }
}

export default ModeSelectionHandler;
