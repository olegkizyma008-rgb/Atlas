/**
 * FinalSummaryHandler
 * 
 * Handles FINAL_SUMMARY state
 * Generates final summary of workflow execution
 * Calculates metrics and sends final result
 * 
 * @class FinalSummaryHandler
 * @extends StateHandler
 */
const StateHandler = require('./StateHandler');

class FinalSummaryHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.todo && context.session;
    }

    /**
     * Execute final summary
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Summary result
     */
    async execute(context, data = {}) {
        this._log('Starting final summary');

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing todo or session');
            }

            const { todo, session, workflowStart } = context;

            // Get summary processor
            const summaryProcessor = this._getProcessor('summaryProcessor');

            if (!summaryProcessor) {
                throw new Error('Summary processor not available');
            }

            this._log('Executing summary processor', {
                sessionId: session.id,
                itemCount: todo.items?.length || 0
            });

            // Execute summary
            const summaryResult = await summaryProcessor.execute({
                todo,
                session,
                workflowStart
            });

            // Calculate metrics
            const completedCount = todo.items?.filter(item => item.status === 'completed').length || 0;
            const failedCount = todo.items?.filter(item => item.status === 'failed').length || 0;
            const skippedCount = todo.items?.filter(item => item.status === 'skipped').length || 0;
            const totalCount = todo.items?.length || 0;
            const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            const duration = workflowStart ? Date.now() - workflowStart : 0;

            this._log('Final summary completed successfully', {
                sessionId: session.id,
                completedCount,
                failedCount,
                skippedCount,
                totalCount,
                successRate: `${successRate}%`,
                duration: `${duration}ms`
            });

            // Store result in context
            context.summaryResult = summaryResult;
            context.metrics = {
                completedCount,
                failedCount,
                skippedCount,
                totalCount,
                successRate,
                duration
            };

            return {
                success: true,
                summary: summaryResult.summary || 'Workflow execution completed',
                metrics: {
                    completedCount,
                    failedCount,
                    skippedCount,
                    totalCount,
                    successRate,
                    duration
                },
                metadata: summaryResult.metadata
            };
        } catch (error) {
            this._logError('Final summary failed', error);
            // Continue even if summary fails - return fallback summary
            return {
                success: true,
                summary: 'Workflow execution completed',
                metrics: {
                    completedCount: 0,
                    failedCount: 0,
                    skippedCount: 0,
                    totalCount: 0,
                    successRate: 0,
                    duration: 0
                }
            };
        }
    }
}

module.exports = FinalSummaryHandler;
