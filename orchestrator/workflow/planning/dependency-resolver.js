/**
 * @fileoverview DependencyResolver - Resolves item dependencies
 * Manages dependency tracking and resolution for TODO items
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Resolves dependencies between TODO items
 * Responsibilities:
 * - Track item dependencies
 * - Resolve dependency chains
 * - Detect circular dependencies
 * - Provide execution order
 */
export class DependencyResolver {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.dependencyGraph = new Map();

        this.logger.system('dependency-resolver', '✅ DependencyResolver initialized');
    }

    /**
     * Build dependency graph from TODO items
     * @param {Array<Object>} items - TODO items
     * @returns {Object} Dependency graph
     */
    buildGraph(items) {
        this.dependencyGraph.clear();

        // Initialize graph nodes
        for (const item of items) {
            this.dependencyGraph.set(item.id, {
                item,
                dependencies: item.dependencies || [],
                dependents: [],
                resolved: false,
                order: -1
            });
        }

        // Build reverse dependencies (dependents)
        for (const [itemId, node] of this.dependencyGraph.entries()) {
            for (const depId of node.dependencies) {
                const depNode = this.dependencyGraph.get(depId);
                if (depNode) {
                    depNode.dependents.push(itemId);
                }
            }
        }

        return {
            nodes: this.dependencyGraph.size,
            edges: Array.from(this.dependencyGraph.values())
                .reduce((sum, node) => sum + node.dependencies.length, 0)
        };
    }

    /**
     * Resolve dependencies and return execution order
     * @param {Array<Object>} items - TODO items
     * @returns {Object} Resolution result with order
     */
    resolve(items) {
        const resolveId = this._generateResolveId();

        this.logger.system('dependency-resolver', `[${resolveId}] Resolving dependencies`, {
            itemCount: items.length
        });

        try {
            // Build graph
            this.buildGraph(items);

            // Check for circular dependencies
            const cycles = this._detectCycles();
            if (cycles.length > 0) {
                this.logger.error('dependency-resolver', `[${resolveId}] Circular dependencies detected`, {
                    cycles: cycles.length
                });

                return {
                    success: false,
                    error: 'Circular dependencies detected',
                    cycles,
                    resolveId
                };
            }

            // Calculate execution order using topological sort
            const order = this._topologicalSort();

            this.logger.system('dependency-resolver', `[${resolveId}] Dependencies resolved`, {
                order: order.length,
                resolveId
            });

            return {
                success: true,
                order,
                graph: {
                    nodes: this.dependencyGraph.size,
                    edges: Array.from(this.dependencyGraph.values())
                        .reduce((sum, node) => sum + node.dependencies.length, 0)
                },
                resolveId
            };

        } catch (error) {
            this.logger.error('dependency-resolver', `[${resolveId}] Resolution failed`, {
                error: error.message
            });

            return {
                success: false,
                error: error.message,
                resolveId
            };
        }
    }

    /**
     * Check if item can be executed
     * @param {number} itemId - Item ID
     * @param {Array<Object>} completedItems - Completed items
     * @returns {boolean}
     */
    canExecute(itemId, completedItems) {
        const node = this.dependencyGraph.get(itemId);
        if (!node) {
            return false;
        }

        const completedIds = completedItems.map(item => item.id);

        // Check if all dependencies are completed
        for (const depId of node.dependencies) {
            if (!completedIds.includes(depId)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get next executable items
     * @param {Array<Object>} items - All items
     * @param {Array<Object>} completedItems - Completed items
     * @returns {Array<Object>} Executable items
     */
    getNextExecutable(items, completedItems) {
        const executable = [];

        for (const item of items) {
            if (item.status === 'pending' && this.canExecute(item.id, completedItems)) {
                executable.push(item);
            }
        }

        return executable;
    }

    /**
     * Detect circular dependencies
     * @private
     */
    _detectCycles() {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();

        for (const [itemId] of this.dependencyGraph.entries()) {
            if (!visited.has(itemId)) {
                this._dfs(itemId, visited, recursionStack, cycles);
            }
        }

        return cycles;
    }

    /**
     * Depth-first search for cycle detection
     * @private
     */
    _dfs(itemId, visited, recursionStack, cycles) {
        visited.add(itemId);
        recursionStack.add(itemId);

        const node = this.dependencyGraph.get(itemId);
        if (!node) {
            return;
        }

        for (const depId of node.dependencies) {
            if (!visited.has(depId)) {
                this._dfs(depId, visited, recursionStack, cycles);
            } else if (recursionStack.has(depId)) {
                cycles.push([itemId, depId]);
            }
        }

        recursionStack.delete(itemId);
    }

    /**
     * Topological sort for execution order
     * @private
     */
    _topologicalSort() {
        const order = [];
        const visited = new Set();
        const visiting = new Set();

        const visit = (itemId) => {
            if (visited.has(itemId)) {
                return;
            }

            if (visiting.has(itemId)) {
                // Cycle detected (should have been caught earlier)
                return;
            }

            visiting.add(itemId);

            const node = this.dependencyGraph.get(itemId);
            if (node) {
                for (const depId of node.dependencies) {
                    visit(depId);
                }
            }

            visiting.delete(itemId);
            visited.add(itemId);
            order.push(itemId);
        };

        for (const [itemId] of this.dependencyGraph.entries()) {
            visit(itemId);
        }

        return order;
    }

    /**
     * Get dependency information for item
     * @param {number} itemId - Item ID
     * @returns {Object} Dependency info
     */
    getDependencyInfo(itemId) {
        const node = this.dependencyGraph.get(itemId);
        if (!node) {
            return null;
        }

        return {
            itemId,
            dependencies: node.dependencies,
            dependents: node.dependents,
            dependencyCount: node.dependencies.length,
            dependentCount: node.dependents.length
        };
    }

    /**
     * Generate unique resolve ID
     * @private
     */
    _generateResolveId() {
        return `resolve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default DependencyResolver;
