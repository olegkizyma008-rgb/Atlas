/**
 * ItemLoopHandler
 * 
 * Handles ITEM_LOOP state
 * Processes TODO items sequentially with nested state transitions
 * For each item: SERVER_SELECTION → TOOL_PLANNING → EXECUTION → VERIFICATION → (REPLAN if needed)
 * 
 * @class ItemLoopHandler
 * @extends StateHandler
 */
const StateHandler = require('./StateHandler');

class ItemLoopHandler extends StateHandler {
    /**
     * Validate handler can execute
     * 
     * @param {Object} context - State machine context
     * @returns {boolean} True if handler can execute
     */
    validate(context) {
        return context && context.session && context.todo && Array.isArray(context.todo.items);
    }

    /**
     * Execute item loop
     * 
     * @param {Object} context - State machine context
     * @param {Object} data - Handler input data
     * @returns {Promise<Object>} Item loop result
     */
    async execute(context, data = {}) {
        this._log('Starting item loop processing');

        try {
            // Validate context
            if (!this.validate(context)) {
                throw new Error('Invalid context: missing session, todo, or todo.items');
            }

            const { session, todo, stateMachine } = context;

            this._log('Item loop initialized', {
                sessionId: session.id,
                itemCount: todo.items.length
            });

            // Process items sequentially
            let i = 0;
            let lastItemCompletionTime = 0;
            const MIN_DELAY_BETWEEN_ITEMS = 3000; // 3 seconds minimum between items

            while (i < todo.items.length) {
                const item = todo.items[i];

                // Add delay between items to prevent rate limiting
                const timeSinceLastItem = Date.now() - lastItemCompletionTime;
                if (lastItemCompletionTime > 0 && timeSinceLastItem < MIN_DELAY_BETWEEN_ITEMS) {
                    const delayNeeded = MIN_DELAY_BETWEEN_ITEMS - timeSinceLastItem;
                    this._log(`Rate limiting: waiting ${delayNeeded}ms before item ${item.id}`);
                    await new Promise(resolve => setTimeout(resolve, delayNeeded));
                }

                // Skip already processed items
                if (item.status === 'completed' || item.status === 'failed' || item.status === 'skipped') {
                    this._log(`Skipping item ${item.id} (status: ${item.status})`);
                    lastItemCompletionTime = Date.now();
                    i++;
                    continue;
                }

                // Skip replanned items (new items will replace them)
                if (item.status === 'replanned') {
                    this._log(`Skipping replanned item ${item.id}`);
                    lastItemCompletionTime = Date.now();
                    i++;
                    continue;
                }

                this._log(`Processing item ${i + 1}/${todo.items.length}: ${item.id}`, {
                    action: item.action,
                    sessionId: session.id
                });

                // Check dependencies
                const dependencies = Array.isArray(item.dependencies) ? item.dependencies : [];
                if (dependencies.length > 0) {
                    if (!item.blocked_check_count) {
                        item.blocked_check_count = 0;
                    }
                    item.blocked_check_count++;

                    // Check if dependencies are resolved
                    const unresolvedDependencies = dependencies
                        .map(depId => todo.items.find(todoItem => String(todoItem.id) === String(depId)))
                        .filter(depItem => depItem && depItem.status !== 'completed');

                    if (unresolvedDependencies.length > 0) {
                        if (item.blocked_check_count >= 10) {
                            // Too many blocked checks - skip item
                            item.status = 'skipped';
                            item.skip_reason = 'Blocked too many times - infinite loop protection';
                            this._log(`Item ${item.id} skipped (blocked ${item.blocked_check_count} times)`);
                        } else {
                            // Item is blocked - continue to next item
                            this._log(`Item ${item.id} blocked (dependencies not resolved)`);
                            i++;
                            continue;
                        }
                    }
                }

                // Process item through nested states
                try {
                    await this._processItem(item, context, stateMachine);
                } catch (itemError) {
                    this._log(`Item ${item.id} processing error: ${itemError.message}`);
                    item.status = 'failed';
                    item.error = itemError.message;
                }

                // Update completion time for rate limiting
                lastItemCompletionTime = Date.now();
                i++;
            }

            this._log('Item loop completed', {
                sessionId: session.id,
                totalItems: todo.items.length,
                completedItems: todo.items.filter(item => item.status === 'completed').length,
                failedItems: todo.items.filter(item => item.status === 'failed').length,
                skippedItems: todo.items.filter(item => item.status === 'skipped').length
            });

            return {
                success: true,
                itemsProcessed: todo.items.length,
                results: todo.items
            };
        } catch (error) {
            this._logError('Item loop failed', error);
            throw error;
        }
    }

    /**
     * Process single item through nested state transitions
     * 
     * @private
     * @param {Object} item - TODO item to process
     * @param {Object} context - State machine context
     * @param {Object} stateMachine - State machine instance
     * @returns {Promise<void>}
     */
    async _processItem(item, context, stateMachine) {
        let attempt = 1;
        const maxAttempts = item.max_attempts || 1;

        while (attempt <= maxAttempts) {
            try {
                // Step 1: SERVER_SELECTION
                this._log(`Item ${item.id}: SERVER_SELECTION (attempt ${attempt}/${maxAttempts})`);
                await stateMachine.transition(stateMachine.constructor.States.SERVER_SELECTION);
                const serverResult = await stateMachine.executeHandler({ item });

                if (!serverResult.success) {
                    throw new Error(`Server selection failed: ${serverResult.error}`);
                }

                // Step 2: TOOL_PLANNING
                this._log(`Item ${item.id}: TOOL_PLANNING`);
                await stateMachine.transition(stateMachine.constructor.States.TOOL_PLANNING);
                const planResult = await stateMachine.executeHandler({ item, servers: serverResult });

                if (!planResult.success) {
                    throw new Error(`Tool planning failed: ${planResult.error}`);
                }

                // Step 3: EXECUTION
                this._log(`Item ${item.id}: EXECUTION`);
                await stateMachine.transition(stateMachine.constructor.States.EXECUTION);
                const execResult = await stateMachine.executeHandler({ item, plan: planResult });

                if (!execResult.success) {
                    throw new Error(`Execution failed: ${execResult.error}`);
                }

                // Step 4: VERIFICATION
                this._log(`Item ${item.id}: VERIFICATION`);
                await stateMachine.transition(stateMachine.constructor.States.VERIFICATION);
                const verifyResult = await stateMachine.executeHandler({ item, execution: execResult });

                if (verifyResult.verified) {
                    // Success!
                    item.status = 'completed';
                    item.verification = verifyResult.verification;
                    item.attempt = attempt;
                    this._log(`Item ${item.id} completed successfully`);
                    break; // Exit retry loop
                }

                // Step 5: REPLAN if verification failed
                this._log(`Item ${item.id}: REPLAN (verification failed)`);
                await stateMachine.transition(stateMachine.constructor.States.REPLAN);
                const replanResult = await stateMachine.executeHandler({
                    item,
                    execution: execResult,
                    verification: verifyResult
                });

                if (replanResult.strategy === 'skip_and_continue') {
                    item.status = 'skipped';
                    item.skip_reason = replanResult.reasoning;
                    this._log(`Item ${item.id} skipped by Atlas`);
                    break; // Exit retry loop
                }

                if (replanResult.new_items && replanResult.new_items.length > 0) {
                    // New items generated - mark current as replanned
                    item.status = 'replanned';
                    item.replan_reason = replanResult.reasoning;

                    // Insert new items after current item
                    const currentIndex = context.todo.items.indexOf(item);
                    if (currentIndex !== -1) {
                        context.todo.items.splice(currentIndex + 1, 0, ...replanResult.new_items);
                        this._log(`Item ${item.id} replanned with ${replanResult.new_items.length} new items`);
                    }
                    break; // Exit retry loop
                }

                // No replan - retry
                attempt++;
            } catch (stepError) {
                this._log(`Item ${item.id} step error: ${stepError.message}`);
                attempt++;

                if (attempt > maxAttempts) {
                    item.status = 'failed';
                    item.error = stepError.message;
                    throw stepError;
                }
            }
        }

        // Ensure item has a status
        if (!item.status || item.status === 'pending') {
            item.status = 'failed';
            item.error = 'Max attempts reached';
        }
    }
}

module.exports = ItemLoopHandler;
