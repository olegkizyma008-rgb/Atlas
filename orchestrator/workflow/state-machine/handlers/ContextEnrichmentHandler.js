/**
 * ContextEnrichmentHandler
 * 
 * Handles CONTEXT_ENRICHMENT state
 * Enriches user message with contextual information
 * 
 * @class ContextEnrichmentHandler
 * @extends StateHandler
 */
const StateHandler = require('./StateHandler');

class ContextEnrichmentHandler extends StateHandler {
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
     * Execute context enrichment
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Enrichment result
     */
    async execute(context, data = {}) {
        this._log('Starting context enrichment');

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing userMessage, session, or workflowContext');
            }

            const { userMessage, session, workflowContext } = context;

            // Get context enrichment processor
            const contextEnrichmentProcessor = this._getProcessor('contextEnrichmentProcessor');

            if (!contextEnrichmentProcessor) {
                throw new Error('Context enrichment processor not available');
            }

            this._log('Executing context enrichment processor', {
                sessionId: session.id,
                userMessageLength: userMessage.length
            });

            // Execute context enrichment
            const enrichmentResult = await contextEnrichmentProcessor.execute({
                userMessage,
                session,
                workflowContext
            });

            if (!enrichmentResult.success) {
                throw new Error(`Context enrichment failed: ${enrichmentResult.error}`);
            }

            const enrichedMessage = enrichmentResult.enrichedMessage || userMessage;
            const metadata = enrichmentResult.metadata || {};

            // Store enriched message in context for downstream handlers
            context.enrichedMessage = enrichedMessage;
            context.enrichmentMetadata = metadata;

            this._log('Context enrichment completed successfully', {
                sessionId: session.id,
                originalLength: userMessage.length,
                enrichedLength: enrichedMessage.length,
                metadataKeys: Object.keys(metadata)
            });

            return {
                success: true,
                enrichedMessage,
                metadata
            };
        } catch (error) {
            this._logError('Context enrichment failed', error);
            throw error;
        }
    }
}

module.exports = ContextEnrichmentHandler;
