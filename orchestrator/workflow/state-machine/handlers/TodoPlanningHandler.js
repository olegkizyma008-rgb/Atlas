/**
 * TodoPlanningHandler
 * 
 * Handles TODO_PLANNING state
 * Creates TODO plan from enriched message
 * 
 * @class TodoPlanningHandler
 * @extends StateHandler
 */
const StateHandler = require('./StateHandler');

class TodoPlanningHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.userMessage && context.session && context.workflowContext;
    }

    /**
     * Execute TODO planning
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} TODO planning result
     */
    async execute(context, data = {}) {
        this._log('Starting TODO planning');

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing userMessage, session, or workflowContext');
            }

            const { userMessage, session, workflowContext, enrichedMessage } = context;

            // Get TODO planning processor
            const todoProcessor = this._getProcessor('todoProcessor');

            if (!todoProcessor) {
                throw new Error('TODO planning processor not available');
            }

            this._log('Executing TODO planning processor', {
                sessionId: session.id,
                enrichedMessageLength: enrichedMessage?.length || userMessage.length
            });

            // Use enriched message if available, otherwise use original
            const messageForPlanning = enrichedMessage || userMessage;

            // Execute TODO planning
            const todoResult = await todoProcessor.execute({
                userMessage: messageForPlanning,
                session,
                workflowContext
            });

            if (!todoResult.success) {
                throw new Error(`TODO planning failed: ${todoResult.error}`);
            }

            const todo = todoResult.todo || { items: [] };
            const summary = todoResult.summary || '';

            // Store TODO in context for downstream handlers
            context.todo = todo;
            context.todoSummary = summary;

            this._log('TODO planning completed successfully', {
                sessionId: session.id,
                itemCount: todo.items?.length || 0,
                mode: todo.mode || 'unknown'
            });

            return {
                success: true,
                todo,
                summary
            };
        } catch (error) {
            this._logError('TODO planning failed', error);
            throw error;
        }
    }
}

module.exports = TodoPlanningHandler;
