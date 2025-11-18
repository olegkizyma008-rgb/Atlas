/**
 * ChatHandler
 * 
 * Handles CHAT state
 * Provides simple chat responses from Atlas
 * 
 * @class ChatHandler
 * @extends StateHandler
 */
const StateHandler = require('./StateHandler');

class ChatHandler extends StateHandler {
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
     * Execute chat mode
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Chat result
     */
    async execute(context, data = {}) {
        this._log('Starting CHAT mode');

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing userMessage or session');
            }

            const { userMessage, session, res, wsManager, localizationService, container } = context;

            // CHAT mode is handled by the original executor logic
            // This handler is a placeholder for future integration
            // For now, return a signal to use the original CHAT logic

            this._log('CHAT mode handler executed', {
                userMessageLength: userMessage.length,
                sessionId: session.id
            });

            return {
                success: true,
                mode: 'chat',
                message: 'Chat mode executed',
                useLegacyLogic: true  // Signal to use original logic
            };
        } catch (error) {
            this._logError('CHAT mode failed', error);
            throw error;
        }
    }
}

module.exports = ChatHandler;
