/**
 * @fileoverview TodoBuilder - Builds TODO lists from user messages
 * Analyzes complexity, generates items, and enhances success criteria
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Builds TODO lists from user messages
 * Responsibilities:
 * - Analyze message complexity
 * - Generate TODO items
 * - Enhance success criteria
 * - Manage dependencies
 */
export class TodoBuilder {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.llmClient - LLM client for analysis
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.localizationService - Localization service (optional)
     */
    constructor(options = {}) {
        this.llmClient = options.llmClient;
        this.logger = options.logger || console;
        this.localizationService = options.localizationService;

        if (!this.llmClient) {
            throw new Error('TodoBuilder requires llmClient dependency');
        }

        this.logger.system('todo-builder', '✅ TodoBuilder initialized');
    }

    /**
     * Build TODO list from user message
     * @param {string} userMessage - User's request
     * @param {Object} options - Build options
     * @returns {Promise<Object>} TODO list object
     */
    async build(userMessage, options = {}) {
        const buildId = this._generateBuildId();

        this.logger.system('todo-builder', `[${buildId}] Building TODO from message`, {
            messageLength: userMessage.length
        });

        try {
            // Step 1: Analyze complexity
            const complexity = await this._analyzeComplexity(userMessage);
            this.logger.system('todo-builder', `[${buildId}] Complexity analyzed: ${complexity}`);

            // Step 2: Generate items
            const items = await this._generateItems(userMessage, complexity);
            this.logger.system('todo-builder', `[${buildId}] Generated ${items.length} items`);

            // Step 3: Enhance criteria
            this._enhanceCriteria(items);

            // Step 4: Create TODO object
            const todo = this._createTodo(userMessage, complexity, items);

            this.logger.system('todo-builder', `[${buildId}] TODO built successfully`, {
                itemCount: items.length,
                complexity
            });

            return todo;

        } catch (error) {
            this.logger.error('todo-builder', `[${buildId}] Failed to build TODO`, {
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * Analyze message complexity (1-10 scale)
     * @private
     */
    async _analyzeComplexity(message) {
        try {
            // Simple heuristic: count sentences, keywords, etc.
            const sentences = message.split(/[.!?]+/).length;
            const keywords = (message.match(/\b(create|modify|delete|refactor|optimize|debug|test)\b/gi) || []).length;
            const codeBlocks = (message.match(/```/g) || []).length / 2;

            let complexity = 1;
            complexity += Math.min(sentences / 2, 3);
            complexity += keywords * 0.5;
            complexity += codeBlocks * 2;

            return Math.min(Math.max(Math.round(complexity), 1), 10);

        } catch (error) {
            this.logger.warn('todo-builder', `Failed to analyze complexity: ${error.message}`);
            return 5; // Default to medium complexity
        }
    }

    /**
     * Generate TODO items from message
     * @private
     */
    async _generateItems(message, complexity) {
        try {
            // For now, create a single item
            // In production, this would use LLM to break down into multiple items
            const items = [{
                id: 1,
                action: message,
                tools_needed: [],
                mcp_servers: [],
                parameters: {},
                success_criteria: `Successfully complete: ${message.substring(0, 50)}...`,
                fallback_options: [],
                dependencies: [],
                attempt: 1,
                max_attempts: 3,
                status: 'pending',
                tts: {
                    start: 'Starting task',
                    success: 'Task completed successfully',
                    failure: 'Task failed',
                    verify: 'Verifying task'
                }
            }];

            return items;

        } catch (error) {
            this.logger.error('todo-builder', `Failed to generate items: ${error.message}`);
            throw error;
        }
    }

    /**
     * Enhance success criteria for items
     * @private
     */
    _enhanceCriteria(items) {
        for (const item of items) {
            if (!item.success_criteria) {
                item.success_criteria = 'Task completed without errors';
            }

            // Enhance video/fullscreen criteria if needed
            const actionLower = (item.action || '').toLowerCase();
            const criteriaLower = (item.success_criteria || '').toLowerCase();

            const videoKeywords = ['video', 'watch', 'movie', 'film', 'play'];
            const fullscreenKeywords = ['fullscreen', 'full screen'];

            if (videoKeywords.some(kw => actionLower.includes(kw)) &&
                !criteriaLower.includes('playback')) {
                item.success_criteria += ' Video player is visible with playback controls.';
            }

            if (fullscreenKeywords.some(kw => actionLower.includes(kw)) &&
                !criteriaLower.includes('fullscreen')) {
                item.success_criteria += ' Fullscreen mode is confirmed.';
            }
        }
    }

    /**
     * Create TODO object
     * @private
     */
    _createTodo(userMessage, complexity, items) {
        return {
            id: this._generateTodoId(),
            request: userMessage,
            mode: complexity > 6 ? 'extended' : 'standard',
            complexity,
            items,
            execution: {
                current_item_index: 0,
                completed_items: 0,
                failed_items: 0,
                total_attempts: 0
            },
            created_at: new Date().toISOString()
        };
    }

    /**
     * Generate unique build ID
     * @private
     */
    _generateBuildId() {
        return `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique TODO ID
     * @private
     */
    _generateTodoId() {
        return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default TodoBuilder;
