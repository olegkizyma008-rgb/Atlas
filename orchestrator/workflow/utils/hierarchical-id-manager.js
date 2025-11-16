/**
 * @fileoverview Hierarchical ID Manager for TODO items
 * Manages hierarchical IDs (1, 2, 2.1, 2.2, 2.2.1, etc.) for replanning
 * 
 * Benefits:
 * - Clear parent-child relationships (2.1 is child of 2)
 * - Depth tracking (2.2.1 = 3 levels deep, 2 replans)
 * - Unique identifiers for each item
 * - Visual structure in logs and UI
 * 
 * @version 1.0.0
 * @date 2025-10-23
 */

/**
 * Hierarchical ID Manager
 * 
 * Handles creation, parsing, and manipulation of hierarchical TODO item IDs
 */
export class HierarchicalIdManager {
    /**
     * Parse hierarchical ID into components
     * 
     * @param {string} id - Hierarchical ID (e.g., "2.2.1")
     * @returns {Object} Parsed ID components
     * 
     * @example
     * parseId("2.2.1") => { 
     *   full: "2.2.1", 
     *   parts: [2, 2, 1],
     *   depth: 3,
     *   parent: "2.2",
     *   root: "2",
     *   isRoot: false,
     *   isChild: true,
     *   level: 2  // 0=root, 1=first replan, 2=second replan
     * }
     */
    static parseId(id) {
        const idStr = String(id);
        const parts = idStr.split('.').map(p => parseInt(p, 10));

        if (parts.some(isNaN)) {
            throw new Error(`Invalid hierarchical ID: ${id}`);
        }

        const depth = parts.length;
        const parent = depth > 1 ? parts.slice(0, -1).join('.') : null;
        const root = String(parts[0]);
        const isRoot = depth === 1;
        const isChild = depth > 1;
        const level = depth - 1; // 0 for root, 1 for first replan, etc.

        return {
            full: idStr,
            parts,
            depth,
            parent,
            root,
            isRoot,
            isChild,
            level
        };
    }

    /**
     * Generate next child ID for a parent
     * 
     * @param {string} parentId - Parent item ID
     * @param {Array<Object>} existingItems - Existing TODO items (to check for conflicts)
     * @returns {string} Next available child ID
     * 
     * @example
     * generateChildId("2", []) => "2.1"
     * generateChildId("2", [{id: "2.1"}]) => "2.2"
     * generateChildId("2.2", [{id: "2.2.1", id: "2.2.2"}]) => "2.2.3"
     */
    static generateChildId(parentId, existingItems = []) {
        const parentIdStr = String(parentId);

        // FIXED 2025-11-07: Prevent infinite recursion - limit depth to 10 levels (increased from 5)
        const parentDepth = parentIdStr.split('.').length;
        const MAX_DEPTH = 10; // Maximum nesting levels (increased to allow complex workflows)

        if (parentDepth >= MAX_DEPTH) {
            throw new Error(`Maximum nesting depth (${MAX_DEPTH}) reached. Cannot create child for ${parentIdStr}`);
        }

        // Find all existing children of this parent
        const childIds = existingItems
            .map(item => String(item.id))
            .filter(id => {
                // Check if this is a direct child (not grandchild)
                const prefix = `${parentIdStr}.`;
                if (!id.startsWith(prefix)) return false;

                // Ensure it's a direct child (no more dots after parent)
                const suffix = id.substring(prefix.length);
                return !suffix.includes('.');
            })
            .map(id => {
                const lastPart = id.split('.').pop();
                return parseInt(lastPart, 10);
            })
            .filter(n => !isNaN(n));

        // Find next available number
        const nextNum = childIds.length > 0 ? Math.max(...childIds) + 1 : 1;

        return `${parentIdStr}.${nextNum}`;
    }

    /**
     * Get all descendants of an item (children, grandchildren, etc.)
     * 
     * @param {string} itemId - Item ID to find descendants for
     * @param {Array<Object>} items - All TODO items
     * @returns {Array<Object>} All descendant items
     * 
     * @example
     * getDescendants("2", items) => [item_2.1, item_2.2, item_2.2.1, item_2.2.2]
     */
    static getDescendants(itemId, items) {
        const idStr = String(itemId);
        const prefix = `${idStr}.`;

        return items.filter(item => {
            const itemIdStr = String(item.id);
            return itemIdStr.startsWith(prefix);
        });
    }

    /**
     * Get direct children only (not grandchildren)
     * 
     * @param {string} itemId - Parent item ID
     * @param {Array<Object>} items - All TODO items
     * @returns {Array<Object>} Direct child items
     * 
     * @example
     * getChildren("2", items) => [item_2.1, item_2.2] // NOT 2.2.1
     */
    static getChildren(itemId, items) {
        const idStr = String(itemId);
        const prefix = `${idStr}.`;

        return items.filter(item => {
            const itemIdStr = String(item.id);
            if (!itemIdStr.startsWith(prefix)) return false;

            // Ensure direct child (no more dots)
            const suffix = itemIdStr.substring(prefix.length);
            return !suffix.includes('.');
        });
    }

    /**
     * Get parent item
     * 
     * @param {string} itemId - Child item ID
     * @param {Array<Object>} items - All TODO items
     * @returns {Object|null} Parent item or null if root
     * 
     * @example
     * getParent("2.2.1", items) => item_2.2
     */
    static getParent(itemId, items) {
        const parsed = this.parseId(itemId);
        if (parsed.isRoot) return null;

        return items.find(item => String(item.id) === parsed.parent) || null;
    }

    /**
     * Get root ancestor
     * 
     * @param {string} itemId - Any item ID
     * @param {Array<Object>} items - All TODO items
     * @returns {Object|null} Root item
     * 
     * @example
     * getRoot("2.2.1", items) => item_2
     */
    static getRoot(itemId, items) {
        const parsed = this.parseId(itemId);
        return items.find(item => String(item.id) === parsed.root) || null;
    }

    /**
     * Check if itemB depends on itemA (directly or through ancestry)
     * 
     * @param {string} itemAId - Potential dependency
     * @param {string} itemBId - Item that may depend on A
     * @param {Array<Object>} items - All TODO items
     * @returns {boolean} True if B depends on A
     * 
     * @example
     * isDependency("2", "2.2.1", items) => true (2.2.1 is descendant of 2)
     * isDependency("2.1", "2.2", items) => false (siblings)
     */
    static isDependency(itemAId, itemBId, items) {
        const aStr = String(itemAId);
        const bStr = String(itemBId);

        // Check if B is descendant of A
        if (bStr.startsWith(`${aStr}.`)) {
            return true;
        }

        // Check explicit dependencies
        const itemB = items.find(item => String(item.id) === bStr);
        if (itemB && itemB.dependencies) {
            return itemB.dependencies.some(dep => String(dep) === aStr);
        }

        return false;
    }

    /**
     * Compare two IDs for sorting (natural hierarchical order)
     * 
     * @param {string} idA - First ID
     * @param {string} idB - Second ID
     * @returns {number} -1 if A < B, 0 if equal, 1 if A > B
     * 
     * @example
     * [2.1, 2, 2.2, 1, 2.2.1].sort(compareIds) => [1, 2, 2.1, 2.2, 2.2.1]
     */
    static compareIds(idA, idB) {
        const partsA = String(idA).split('.').map(p => parseInt(p, 10));
        const partsB = String(idB).split('.').map(p => parseInt(p, 10));

        const maxLen = Math.max(partsA.length, partsB.length);

        for (let i = 0; i < maxLen; i++) {
            const a = partsA[i] || 0;
            const b = partsB[i] || 0;

            if (a < b) return -1;
            if (a > b) return 1;
        }

        return 0;
    }

    /**
     * Generate next root-level ID
     * 
     * @param {Array<Object>} items - Existing TODO items
     * @returns {string} Next root ID
     * 
     * @example
     * generateNextRootId([{id: "1"}, {id: "2"}, {id: "2.1"}]) => "3"
     */
    static generateNextRootId(items) {
        const rootIds = items
            .map(item => String(item.id))
            .filter(id => !id.includes('.')) // Only root IDs
            .map(id => parseInt(id, 10))
            .filter(n => !isNaN(n));

        const maxRoot = rootIds.length > 0 ? Math.max(...rootIds) : 0;
        return String(maxRoot + 1);
    }

    /**
     * Format ID for display with visual hierarchy
     * 
     * @param {string} id - Item ID
     * @param {boolean} showIndent - Add visual indentation
     * @returns {string} Formatted ID
     * 
     * @example
     * formatForDisplay("2.2.1", true) => "    ↳ 2.2.1"
     * formatForDisplay("2.1", true) => "  ↳ 2.1"
     */
    static formatForDisplay(id, showIndent = false) {
        if (!showIndent) return String(id);

        const parsed = this.parseId(id);
        const indent = '  '.repeat(parsed.level);
        const arrow = parsed.isRoot ? '' : '↳ ';

        return `${indent}${arrow}${id}`;
    }
}

export default HierarchicalIdManager;
