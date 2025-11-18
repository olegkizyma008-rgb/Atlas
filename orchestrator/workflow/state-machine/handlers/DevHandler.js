/**
 * DevHandler
 * 
 * Handles DEV state
 * Internal NEXUS operations for self-analysis and intervention
 * 
 * @class DevHandler
 * @extends StateHandler
 */
import StateHandler from './StateHandler.js';

class DevHandler extends StateHandler {
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
     * Execute DEV mode
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} DEV result
     */
    async execute(context, data = {}) {
        this._log('Starting DEV mode');

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing userMessage or session');
            }

            const { userMessage, session, container } = context;

            // Get DEV processor
            const devProcessor = this._getProcessor('devProcessor');

            // Check if user is providing password for pending DEV intervention
            const isPasswordProvided = session.awaitingDevPassword &&
                (userMessage.toLowerCase() === 'mykola' ||
                    userMessage.toLowerCase() === 'микола' ||
                    userMessage.toLowerCase().trim() === 'mykola' ||
                    userMessage.toLowerCase().trim() === 'микола');

            // Check if user is requesting intervention after analysis
            const isInterventionRequest = session.lastDevAnalysis &&
                (userMessage.toLowerCase().includes('виправ') ||
                    userMessage.toLowerCase().includes('внеси зміни') ||
                    userMessage.toLowerCase().includes('fix') ||
                    userMessage.toLowerCase().includes('make changes'));

            // Check if password is included in intervention request
            const passwordInMessage = userMessage.toLowerCase().includes('mykola') ||
                userMessage.toLowerCase().includes('микола');

            // Execute self-analysis with container for MCP access
            const analysisResult = await devProcessor.execute({
                userMessage,
                session,
                requiresIntervention: isInterventionRequest,
                password: isPasswordProvided ? userMessage.trim() : null,
                container
            });

            this._log('DEV mode analysis complete', {
                sessionId: session.id,
                requiresAuth: analysisResult.requiresAuth
            });

            return {
                success: true,
                mode: 'dev',
                analysisResult,
                useLegacyLogic: true  // Signal to use original logic for now
            };
        } catch (error) {
            this._logError('DEV mode failed', error);
            throw error;
        }
    }
}

export default DevHandler;
