/**
 * @fileoverview Tool Inspectors - Security and validation system
 * Inspired by Goose's tool inspection architecture
 * 
 * Implements multi-layer inspection:
 * 1. SecurityInspector - Detects dangerous operations
 * 2. PermissionInspector - Checks permissions and modes
 * 3. RepetitionInspector - Detects tool call loops
 * 
 * @version 5.0.0
 * @date 2025-10-20
 */

import logger from '../utils/logger.js';

/**
 * Inspection actions
 */
export const InspectionAction = {
    ALLOW: 'allow',
    DENY: 'deny',
    REQUIRE_APPROVAL: 'require_approval'
};

/**
 * Base Tool Inspector interface
 */
class ToolInspector {
    constructor(name) {
        this.name = name;
        this.enabled = true;
    }

    /**
     * Inspect tool calls
     * @param {Array} toolCalls - Tool calls to inspect
     * @param {Object} context - Execution context
     * @returns {Promise<Array>} Inspection results
     */
    async inspect(toolCalls, context) {
        throw new Error('inspect() must be implemented by subclass');
    }

    isEnabled() {
        return this.enabled;
    }
}

/**
 * Security Inspector
 * Detects potentially dangerous operations
 */
export class SecurityInspector extends ToolInspector {
    constructor() {
        super('security');
        
        // Dangerous patterns
        this.dangerousPatterns = [
            /rm\s+-rf/i,
            /format\s+[cd]:/i,
            /del\s+\/[sf]/i,
            /sudo\s+rm/i,
            /DROP\s+DATABASE/i,
            /DELETE\s+FROM.*WHERE\s+1=1/i,
            /eval\(/i,
            /exec\(/i
        ];

        // Dangerous tool names
        this.dangerousTools = new Set([
            'shell__execute_dangerous',
            'filesystem__delete_recursive',
            'system__format_disk'
        ]);
    }

    async inspect(toolCalls, context) {
        const results = [];

        for (const call of toolCalls) {
            const toolName = `${call.server}__${call.tool}`;
            let action = InspectionAction.ALLOW;
            let reason = 'Safe operation';
            let confidence = 1.0;
            let securityMessage = null;

            // Check tool name
            if (this.dangerousTools.has(toolName)) {
                action = InspectionAction.REQUIRE_APPROVAL;
                reason = 'Dangerous tool detected';
                confidence = 1.0;
                securityMessage = `⚠️ This tool (${toolName}) can perform dangerous operations. Please review carefully.`;
            }

            // Check parameters for dangerous patterns
            if (call.parameters) {
                const paramsStr = JSON.stringify(call.parameters);
                
                for (const pattern of this.dangerousPatterns) {
                    if (pattern.test(paramsStr)) {
                        action = InspectionAction.REQUIRE_APPROVAL;
                        reason = `Dangerous pattern detected: ${pattern}`;
                        confidence = 0.9;
                        securityMessage = `⚠️ Detected potentially dangerous command pattern. Please verify this is intentional.`;
                        break;
                    }
                }
            }

            // Check for system-level operations
            if (call.server === 'shell' || call.server === 'computercontroller') {
                if (call.tool.includes('execute') || call.tool.includes('run')) {
                    // Shell execution requires extra scrutiny
                    const command = call.parameters?.command || call.parameters?.script || '';
                    
                    if (this._isHighRiskCommand(command)) {
                        action = InspectionAction.REQUIRE_APPROVAL;
                        reason = 'High-risk shell command';
                        confidence = 0.95;
                        securityMessage = `⚠️ High-risk shell command detected. Review before execution.`;
                    }
                }
            }

            results.push({
                toolCallId: call.id || `${call.server}__${call.tool}`,
                action,
                reason,
                confidence,
                inspectorName: this.name,
                securityMessage
            });
        }

        return results;
    }

    _isHighRiskCommand(command) {
        const highRiskKeywords = [
            'rm', 'delete', 'format', 'mkfs',
            'dd', 'fdisk', 'parted',
            'chmod 777', 'chown root',
            'iptables', 'firewall',
            'systemctl stop', 'service stop'
        ];

        const commandLower = command.toLowerCase();
        return highRiskKeywords.some(keyword => commandLower.includes(keyword));
    }
}

/**
 * Permission Inspector
 * Checks permissions based on mode and tool categories
 */
export class PermissionInspector extends ToolInspector {
    constructor(mode = 'task') {
        super('permission');
        this.mode = mode; // 'task', 'chat', 'auto'
        
        // Readonly tools (always safe)
        this.readonlyTools = new Set([
            'filesystem__read_file',
            'filesystem__list_files',
            'filesystem__get_file_info',
            'playwright__get_page_content',
            'playwright__get_page_title',
            'memory__search',
            'memory__get',
            'memory__list'
        ]);

        // Tools requiring approval in chat mode
        this.writeTools = new Set([
            'filesystem__write_file',
            'filesystem__create_directory',
            'filesystem__delete_file',
            'filesystem__move_file',
            'shell__execute',
            'playwright__click',
            'playwright__fill_form'
        ]);
    }

    async inspect(toolCalls, context) {
        const results = [];

        for (const call of toolCalls) {
            const toolName = `${call.server}__${call.tool}`;
            let action = InspectionAction.ALLOW;
            let reason = 'Permission granted';
            let confidence = 1.0;

            // In chat mode, only allow readonly operations
            if (this.mode === 'chat') {
                if (this.readonlyTools.has(toolName)) {
                    action = InspectionAction.ALLOW;
                    reason = 'Readonly operation in chat mode';
                } else {
                    action = InspectionAction.DENY;
                    reason = 'Write operations not allowed in chat mode';
                    confidence = 1.0;
                }
            }
            // In task mode, allow most operations
            else if (this.mode === 'task' || this.mode === 'auto') {
                // Readonly tools are always allowed
                if (this.readonlyTools.has(toolName)) {
                    action = InspectionAction.ALLOW;
                    reason = 'Readonly operation';
                }
                // Write tools are allowed in task mode
                else if (this.writeTools.has(toolName)) {
                    action = InspectionAction.ALLOW;
                    reason = 'Write operation in task mode';
                }
                // Unknown tools default to allow (will be caught by security inspector if dangerous)
                else {
                    action = InspectionAction.ALLOW;
                    reason = 'Standard operation';
                }
            }

            results.push({
                toolCallId: call.id || `${call.server}__${call.tool}`,
                action,
                reason,
                confidence,
                inspectorName: this.name
            });
        }

        return results;
    }

    updateMode(mode) {
        this.mode = mode;
        logger.debug('permission-inspector', `Mode updated to: ${mode}`);
    }
}

/**
 * Repetition Inspector
 * Detects tool call loops and repetitive patterns
 */
export class RepetitionInspector extends ToolInspector {
    constructor(maxRepetitions = 3) {
        super('repetition');
        this.maxRepetitions = maxRepetitions;
        this.callHistory = []; // Recent tool calls
        this.maxHistorySize = 20;
    }

    async inspect(toolCalls, context) {
        const results = [];

        for (const call of toolCalls) {
            const toolName = `${call.server}__${call.tool}`;
            let action = InspectionAction.ALLOW;
            let reason = 'No repetition detected';
            let confidence = 1.0;

            // Count recent calls to this tool
            const recentCalls = this.callHistory.filter(
                h => h.toolName === toolName
            ).length;

            if (recentCalls >= this.maxRepetitions) {
                action = InspectionAction.REQUIRE_APPROVAL;
                reason = `Tool called ${recentCalls} times recently - possible loop`;
                confidence = 0.8;
            }

            // Check for exact parameter repetition
            const exactMatch = this.callHistory.find(
                h => h.toolName === toolName && 
                     JSON.stringify(h.parameters) === JSON.stringify(call.parameters)
            );

            if (exactMatch) {
                action = InspectionAction.REQUIRE_APPROVAL;
                reason = 'Exact same tool call detected - possible infinite loop';
                confidence = 0.95;
            }

            results.push({
                toolCallId: call.id || `${call.server}__${call.tool}`,
                action,
                reason,
                confidence,
                inspectorName: this.name
            });
        }

        return results;
    }

    recordCall(toolCall) {
        this.callHistory.push({
            toolName: `${toolCall.server}__${toolCall.tool}`,
            parameters: toolCall.parameters,
            timestamp: Date.now()
        });

        // Keep history size limited
        if (this.callHistory.length > this.maxHistorySize) {
            this.callHistory.shift();
        }
    }

    reset() {
        this.callHistory = [];
    }
}

/**
 * Tool Inspection Manager
 * Coordinates all inspectors
 */
export class ToolInspectionManager {
    constructor() {
        this.inspectors = [];
    }

    /**
     * Add inspector to the pipeline
     */
    addInspector(inspector) {
        this.inspectors.push(inspector);
        logger.debug('tool-inspection', `Added inspector: ${inspector.name}`);
    }

    /**
     * Run all inspectors on tool calls
     * 
     * @param {Array} toolCalls - Tool calls to inspect
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Inspection results with categorized actions
     */
    async inspectTools(toolCalls, context = {}) {
        const allResults = [];

        // Run each inspector
        for (const inspector of this.inspectors) {
            if (!inspector.isEnabled()) {
                continue;
            }

            try {
                const results = await inspector.inspect(toolCalls, context);
                allResults.push(...results);
                
                logger.debug('tool-inspection', 
                    `Inspector ${inspector.name}: ${results.length} results`);
            } catch (error) {
                logger.error('tool-inspection', 
                    `Inspector ${inspector.name} failed: ${error.message}`);
            }
        }

        // Categorize tool calls based on inspection results
        return this._categorizeToolCalls(toolCalls, allResults);
    }

    /**
     * Categorize tool calls into approved, needs_approval, denied
     * 
     * @private
     */
    _categorizeToolCalls(toolCalls, inspectionResults) {
        const approved = [];
        const needsApproval = [];
        const denied = [];

        for (const call of toolCalls) {
            const toolCallId = call.id || `${call.server}__${call.tool}`;
            
            // Get all inspection results for this call
            const callResults = inspectionResults.filter(
                r => r.toolCallId === toolCallId
            );

            // Determine final action (most restrictive wins)
            let finalAction = InspectionAction.ALLOW;
            let securityMessage = null;

            for (const result of callResults) {
                if (result.action === InspectionAction.DENY) {
                    finalAction = InspectionAction.DENY;
                    break;
                } else if (result.action === InspectionAction.REQUIRE_APPROVAL) {
                    finalAction = InspectionAction.REQUIRE_APPROVAL;
                    if (result.securityMessage) {
                        securityMessage = result.securityMessage;
                    }
                }
            }

            // Categorize
            const callWithMetadata = {
                ...call,
                inspectionResults: callResults,
                securityMessage
            };

            if (finalAction === InspectionAction.DENY) {
                denied.push(callWithMetadata);
            } else if (finalAction === InspectionAction.REQUIRE_APPROVAL) {
                needsApproval.push(callWithMetadata);
            } else {
                approved.push(callWithMetadata);
            }
        }

        logger.system('tool-inspection', 
            `Categorized: ${approved.length} approved, ${needsApproval.length} need approval, ${denied.length} denied`);

        return {
            approved,
            needsApproval,
            denied,
            allResults: inspectionResults
        };
    }

    /**
     * Update permission inspector mode
     */
    updatePermissionMode(mode) {
        for (const inspector of this.inspectors) {
            if (inspector.name === 'permission' && inspector.updateMode) {
                inspector.updateMode(mode);
            }
        }
    }

    /**
     * Get inspector by name
     */
    getInspector(name) {
        return this.inspectors.find(i => i.name === name);
    }
}

/**
 * Create default inspection manager with all inspectors
 */
export function createDefaultInspectionManager(mode = 'task') {
    const manager = new ToolInspectionManager();
    
    // Add inspectors in priority order
    manager.addInspector(new SecurityInspector());
    manager.addInspector(new PermissionInspector(mode));
    manager.addInspector(new RepetitionInspector());
    
    return manager;
}

export default ToolInspectionManager;
