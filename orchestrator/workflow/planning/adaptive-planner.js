/**
 * @fileoverview AdaptivePlanner - Adaptive planning strategy selection
 * Selects best planning approach based on TODO complexity and context
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Adaptive planner that selects best planning strategy
 * Responsibilities:
 * - Select planning strategy based on complexity
 * - Coordinate with ToolPlanner
 * - Manage planning context
 * - Provide adaptive planning recommendations
 */
export class AdaptivePlanner {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.toolPlanner - ToolPlanner instance
     * @param {Object} dependencies.dependencyResolver - DependencyResolver instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.toolPlanner = options.toolPlanner;
        this.dependencyResolver = options.dependencyResolver;
        this.logger = options.logger || console;

        this.logger.system('adaptive-planner', '✅ AdaptivePlanner initialized');
    }

    /**
     * Plan TODO execution adaptively
     * @param {Object} todo - TODO object
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Planning result
     */
    async plan(todo, session) {
        const planId = this._generatePlanId();

        this.logger.system('adaptive-planner', `[${planId}] Starting adaptive planning`, {
            itemCount: todo.items.length,
            complexity: todo.complexity
        });

        try {
            // Step 1: Determine planning strategy
            const strategy = this._selectStrategy(todo);

            this.logger.system('adaptive-planner', `[${planId}] Selected strategy: ${strategy}`);

            // Step 2: Resolve dependencies
            const depResult = this._resolveDependencies(todo);
            if (!depResult.success) {
                this.logger.error('adaptive-planner', `[${planId}] Dependency resolution failed`, {
                    error: depResult.error
                });

                return {
                    success: false,
                    error: depResult.error,
                    planId
                };
            }

            // Step 3: Plan tools for each item
            const itemPlans = await this._planItems(todo, session, planId);

            // Step 4: Optimize plan based on strategy
            const optimizedPlan = this._optimizePlan(itemPlans, strategy, todo.complexity);

            this.logger.system('adaptive-planner', `[${planId}] Adaptive planning completed`, {
                strategy,
                itemsPlanned: itemPlans.length,
                optimizations: optimizedPlan.optimizations.length
            });

            return {
                success: true,
                strategy,
                items: itemPlans,
                dependencies: depResult.order,
                optimizations: optimizedPlan.optimizations,
                planId
            };

        } catch (error) {
            this.logger.error('adaptive-planner', `[${planId}] Planning failed`, {
                error: error.message
            });

            return {
                success: false,
                error: error.message,
                planId
            };
        }
    }

    /**
     * Select planning strategy based on complexity
     * @private
     */
    _selectStrategy(todo) {
        const complexity = todo.complexity || 5;
        const itemCount = todo.items?.length || 0;

        // Simple tasks: direct planning
        if (complexity <= 3) {
            return 'direct';
        }

        // Medium complexity: sequential planning
        if (complexity <= 6) {
            return 'sequential';
        }

        // Complex tasks: parallel planning with optimization
        if (complexity <= 8) {
            return 'parallel';
        }

        // Very complex: advanced planning with multiple strategies
        return 'advanced';
    }

    /**
     * Resolve dependencies
     * @private
     */
    _resolveDependencies(todo) {
        try {
            if (!this.dependencyResolver) {
                return {
                    success: true,
                    order: todo.items.map(item => item.id)
                };
            }

            const result = this.dependencyResolver.resolve(todo.items);
            return result;

        } catch (error) {
            this.logger.error('adaptive-planner', `Dependency resolution error: ${error.message}`);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Plan items
     * @private
     */
    async _planItems(todo, session, planId) {
        const itemPlans = [];

        for (const item of todo.items) {
            try {
                let plan;

                if (this.toolPlanner) {
                    plan = await this.toolPlanner.plan(item, session);
                } else {
                    plan = { tools: [] };
                }

                itemPlans.push({
                    itemId: item.id,
                    action: item.action,
                    plan,
                    status: 'planned'
                });

            } catch (error) {
                this.logger.warn('adaptive-planner', `[${planId}] Failed to plan item ${item.id}: ${error.message}`);

                itemPlans.push({
                    itemId: item.id,
                    action: item.action,
                    plan: { tools: [] },
                    status: 'planned_with_error',
                    error: error.message
                });
            }
        }

        return itemPlans;
    }

    /**
     * Optimize plan based on strategy
     * @private
     */
    _optimizePlan(itemPlans, strategy, complexity) {
        const optimizations = [];

        if (strategy === 'direct') {
            // No optimizations for simple tasks
            return { optimizations };
        }

        if (strategy === 'sequential') {
            // Optimize for sequential execution
            optimizations.push({
                type: 'sequential_optimization',
                description: 'Optimized for sequential execution'
            });
        }

        if (strategy === 'parallel') {
            // Identify parallelizable items
            const independentItems = this._findIndependentItems(itemPlans);
            if (independentItems.length > 1) {
                optimizations.push({
                    type: 'parallel_optimization',
                    description: `${independentItems.length} items can be executed in parallel`,
                    items: independentItems
                });
            }
        }

        if (strategy === 'advanced') {
            // Multiple optimizations
            optimizations.push({
                type: 'caching_optimization',
                description: 'Cache tool results for reuse'
            });

            optimizations.push({
                type: 'batching_optimization',
                description: 'Batch similar tool calls'
            });

            const independentItems = this._findIndependentItems(itemPlans);
            if (independentItems.length > 1) {
                optimizations.push({
                    type: 'parallel_optimization',
                    description: `${independentItems.length} items can be executed in parallel`,
                    items: independentItems
                });
            }
        }

        return { optimizations };
    }

    /**
     * Find independent items that can be executed in parallel
     * @private
     */
    _findIndependentItems(itemPlans) {
        // Simple heuristic: items with no dependencies are independent
        const independent = [];

        for (const itemPlan of itemPlans) {
            // In a real implementation, would check dependency graph
            // For now, assume all items are independent
            independent.push(itemPlan.itemId);
        }

        return independent;
    }

    /**
     * Get planning recommendations
     * @param {Object} todo - TODO object
     * @returns {Object} Recommendations
     */
    getRecommendations(todo) {
        const strategy = this._selectStrategy(todo);
        const complexity = todo.complexity || 5;

        const recommendations = {
            strategy,
            complexity,
            suggestions: []
        };

        if (complexity <= 3) {
            recommendations.suggestions.push('Use direct planning for fast execution');
        } else if (complexity <= 6) {
            recommendations.suggestions.push('Use sequential planning for reliability');
        } else if (complexity <= 8) {
            recommendations.suggestions.push('Use parallel planning for performance');
        } else {
            recommendations.suggestions.push('Use advanced planning with optimizations');
        }

        if (todo.items?.length > 5) {
            recommendations.suggestions.push('Consider breaking down into smaller TODOs');
        }

        return recommendations;
    }

    /**
     * Generate unique plan ID
     * @private
     */
    _generatePlanId() {
        return `plan_adaptive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default AdaptivePlanner;
