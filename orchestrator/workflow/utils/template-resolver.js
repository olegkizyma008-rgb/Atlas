/**
 * @fileoverview TemplateResolver - Resolves template strings in workflow context
 * Handles variable substitution and template processing
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

/**
 * Resolves template strings in workflow context
 * Responsibilities:
 * - Resolve template variables
 * - Handle nested templates
 * - Provide context substitution
 * - Validate template syntax
 */
export class TemplateResolver {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.templatePattern = /\{\{([^}]+)\}\}/g;

        this.logger.system('template-resolver', '✅ TemplateResolver initialized');
    }

    /**
     * Resolve template string with context
     * @param {string} template - Template string
     * @param {Object} context - Context object
     * @returns {string} Resolved string
     */
    resolve(template, context = {}) {
        if (!template || typeof template !== 'string') {
            return template;
        }

        try {
            return template.replace(this.templatePattern, (match, key) => {
                return this._resolveKey(key.trim(), context);
            });
        } catch (error) {
            this.logger.warn('template-resolver', `Failed to resolve template: ${error.message}`);
            return template;
        }
    }

    /**
     * Resolve nested object with templates
     * @param {Object} obj - Object with template strings
     * @param {Object} context - Context object
     * @returns {Object} Resolved object
     */
    resolveObject(obj, context = {}) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        const resolved = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                resolved[key] = this.resolve(value, context);
            } else if (typeof value === 'object' && value !== null) {
                resolved[key] = this.resolveObject(value, context);
            } else {
                resolved[key] = value;
            }
        }

        return resolved;
    }

    /**
     * Resolve single key from context
     * @private
     */
    _resolveKey(key, context) {
        const parts = key.split('.');

        let value = context;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return `{{${key}}}`; // Return unresolved if not found
            }
        }

        return String(value);
    }

    /**
     * Check if string contains templates
     * @param {string} str - String to check
     * @returns {boolean}
     */
    hasTemplates(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }

        return this.templatePattern.test(str);
    }

    /**
     * Extract template variables
     * @param {string} template - Template string
     * @returns {Array<string>} Variable names
     */
    extractVariables(template) {
        if (!template || typeof template !== 'string') {
            return [];
        }

        const variables = [];
        let match;

        while ((match = this.templatePattern.exec(template)) !== null) {
            variables.push(match[1].trim());
        }

        return variables;
    }

    /**
     * Validate template syntax
     * @param {string} template - Template string
     * @returns {Object} Validation result
     */
    validate(template) {
        if (!template || typeof template !== 'string') {
            return { valid: true, errors: [] };
        }

        const errors = [];
        const openBraces = (template.match(/\{\{/g) || []).length;
        const closeBraces = (template.match(/\}\}/g) || []).length;

        if (openBraces !== closeBraces) {
            errors.push(`Mismatched braces: ${openBraces} opening, ${closeBraces} closing`);
        }

        return {
            valid: errors.length === 0,
            errors,
            variables: this.extractVariables(template)
        };
    }
}

export default TemplateResolver;
