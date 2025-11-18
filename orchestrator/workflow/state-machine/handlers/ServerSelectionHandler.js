/**
 * ServerSelectionHandler
 * 
 * Handles SERVER_SELECTION state
 * Selects appropriate MCP servers for current item
 * 
 * @class ServerSelectionHandler
 * @extends StateHandler
 */
import StateHandler from './StateHandler.js';

class ServerSelectionHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.currentItem;
    }

    /**
     * Execute server selection
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Server selection result
     */
    async execute(context, data = {}) {
        this._log('Starting server selection', { itemId: context.currentItem?.id });

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing currentItem');
            }

            // Get server selection processor
            const serverSelectionProcessor = this._getProcessor('serverSelectionProcessor');

            // Execute server selection
            const selectionResult = await serverSelectionProcessor.execute({
                currentItem: context.currentItem,
                todo: context.todo,
                session: context.session,
                res: context.res,
                suggestedServers: data.suggestedServers
            });

            if (!selectionResult.success) {
                throw new Error(selectionResult.error || 'Server selection failed');
            }

            this._log('Servers selected', {
                itemId: context.currentItem.id,
                servers: selectionResult.selected_servers?.join(', '),
                prompts: selectionResult.selected_prompts?.join(', ')
            });

            // Store result in context
            context.selectedServers = selectionResult.selected_servers;
            context.selectedPrompts = selectionResult.selected_prompts;
            context.currentItem._mcp_selected_servers = selectionResult.selected_servers || [];
            context.currentItem._mcp_selected_prompts = selectionResult.selected_prompts;

            return {
                success: true,
                servers: selectionResult.selected_servers,
                prompts: selectionResult.selected_prompts
            };
        } catch (error) {
            this._logError('Server selection failed', error);
            throw error;
        }
    }
}

export default ServerSelectionHandler;
