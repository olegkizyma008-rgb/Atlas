/**
 * @fileoverview Grisha Verification Strategy Selector
 * Intelligent selection between visual verification and MCP tool verification
 * 
 * CREATED 2025-10-22: Smart verification method selection
 * 
 * Priority:
 * 1. Visual screenshot verification (for UI/app interactions)
 * 2. MCP tool verification (for filesystem, shell, memory operations)
 * 
 * @version 1.0.0
 * @date 2025-10-22
 */

import logger from '../../utils/logger.js';

/**
 * Verification Strategy Selector
 * Determines the best verification method based on action type
 */
export class GrishaVerificationStrategy {
    constructor({ logger: loggerInstance }) {
        this.logger = loggerInstance || logger;
    }

    /**
     * Determine verification strategy for a TODO item
     * 
     * @param {Object} item - TODO item to verify
     * @param {Object} execution - Execution results
     * @returns {Object} Strategy decision
     */
    determineStrategy(item, execution) {
        const action = (item.action || '').toLowerCase();
        const successCriteria = (item.success_criteria || '').toLowerCase();
        
        // Analyze action and execution to determine best verification method
        const analysis = this._analyzeVerificationNeeds(action, successCriteria, execution);
        
        this.logger.system('grisha-verification-strategy', 
            `[STRATEGY] Selected: ${analysis.method} (confidence: ${analysis.confidence}%)`
        );
        this.logger.system('grisha-verification-strategy', 
            `[STRATEGY] Reason: ${analysis.reason}`
        );
        
        return analysis;
    }

    /**
     * Analyze verification needs based on action type
     * 
     * @param {string} action - Action text
     * @param {string} successCriteria - Success criteria text
     * @param {Object} execution - Execution results
     * @returns {Object} Analysis result
     * @private
     */
    _analyzeVerificationNeeds(action, successCriteria, execution) {
        // Check for visual indicators (UI/app interactions)
        const visualIndicators = this._detectVisualIndicators(action, successCriteria, execution);
        
        // Check for AppleScript indicators (macOS app automation)
        const applescriptIndicators = this._detectAppleScriptIndicators(action, successCriteria, execution);
        
        // Check for filesystem indicators
        const filesystemIndicators = this._detectFilesystemIndicators(action, successCriteria, execution);
        
        // Check for shell/command indicators
        const shellIndicators = this._detectShellIndicators(action, successCriteria, execution);
        
        // Check for memory/data indicators
        const memoryIndicators = this._detectMemoryIndicators(action, successCriteria, execution);
        
        // Decision logic: Visual has priority, but only if strong indicators present
        if (visualIndicators.score >= 70) {
            return {
                method: 'visual',
                targetApp: visualIndicators.targetApp,
                confidence: visualIndicators.score,
                reason: visualIndicators.reason,
                fallbackToMcp: true, // If visual fails, try MCP
                mcpFallbackTools: this._suggestMcpFallbackTools(filesystemIndicators, shellIndicators, memoryIndicators, applescriptIndicators)
            };
        }
        
        // AppleScript operations - use MCP verification (macOS app automation)
        if (applescriptIndicators.score >= 60) {
            return {
                method: 'mcp',
                mcpServer: 'applescript',
                tools: applescriptIndicators.suggestedTools,
                confidence: applescriptIndicators.score,
                reason: applescriptIndicators.reason,
                fallbackToVisual: true // Can fallback to visual for UI operations
            };
        }
        
        // Filesystem operations - use MCP verification
        if (filesystemIndicators.score >= 60) {
            return {
                method: 'mcp',
                mcpServer: 'filesystem',
                tools: filesystemIndicators.suggestedTools,
                confidence: filesystemIndicators.score,
                reason: filesystemIndicators.reason,
                fallbackToVisual: false // Filesystem verification doesn't need visual fallback
            };
        }
        
        // Shell operations - use MCP verification
        if (shellIndicators.score >= 60) {
            return {
                method: 'mcp',
                mcpServer: 'shell',
                tools: shellIndicators.suggestedTools,
                confidence: shellIndicators.score,
                reason: shellIndicators.reason,
                fallbackToVisual: false
            };
        }
        
        // Memory operations - use MCP verification
        if (memoryIndicators.score >= 60) {
            return {
                method: 'mcp',
                mcpServer: 'memory',
                tools: memoryIndicators.suggestedTools,
                confidence: memoryIndicators.score,
                reason: memoryIndicators.reason,
                fallbackToVisual: false
            };
        }
        
        // Default: Try visual first (with lower confidence), fallback to MCP
        return {
            method: 'visual',
            targetApp: visualIndicators.targetApp || null,
            confidence: Math.max(visualIndicators.score, 30), // Minimum 30% confidence
            reason: 'Default strategy: visual verification with MCP fallback',
            fallbackToMcp: true,
            mcpFallbackTools: this._suggestMcpFallbackTools(filesystemIndicators, shellIndicators, memoryIndicators, applescriptIndicators)
        };
    }

    /**
     * Detect visual verification indicators
     * 
     * @param {string} action - Action text
     * @param {string} successCriteria - Success criteria
     * @param {Object} execution - Execution results
     * @returns {Object} Detection result
     * @private
     */
    _detectVisualIndicators(action, successCriteria, execution) {
        let score = 0;
        let targetApp = null;
        const reasons = [];
        
        // App-specific keywords (strong visual indicators)
        const appKeywords = [
            { keywords: ['калькулятор', 'calculator'], app: 'Calculator', score: 90 },
            { keywords: ['safari відкр', 'safari browser', 'браузер'], app: 'Safari', score: 85 },
            { keywords: ['chrome відкр', 'chrome browser'], app: 'Google Chrome', score: 85 },
            { keywords: ['finder відкр', 'finder window'], app: 'Finder', score: 80 },
            { keywords: ['notes відкр', 'нотатки'], app: 'Notes', score: 80 }
        ];
        
        for (const mapping of appKeywords) {
            for (const keyword of mapping.keywords) {
                if (action.includes(keyword) || successCriteria.includes(keyword)) {
                    score = Math.max(score, mapping.score);
                    targetApp = mapping.app;
                    reasons.push(`App detected: ${mapping.app}`);
                    break;
                }
            }
        }
        
        // UI interaction keywords (medium visual indicators)
        const uiKeywords = [
            { keywords: ['відкрити', 'open', 'запустити', 'launch'], score: 60 },
            { keywords: ['натиснути', 'click', 'клік'], score: 70 },
            { keywords: ['показати', 'display', 'відобразити'], score: 65 },
            { keywords: ['результат', 'result', 'значення', 'value'], score: 50 },
            { keywords: ['вікно', 'window', 'екран', 'screen'], score: 55 }
        ];
        
        for (const mapping of uiKeywords) {
            for (const keyword of mapping.keywords) {
                if (action.includes(keyword) || successCriteria.includes(keyword)) {
                    score = Math.max(score, mapping.score);
                    reasons.push(`UI keyword: ${keyword}`);
                    break;
                }
            }
        }
        
        // Check execution tools for visual indicators
        if (execution && execution.results) {
            for (const result of execution.results) {
                const toolName = (result.tool || '').toLowerCase();
                
                // AppleScript indicates UI interaction
                if (toolName.includes('applescript')) {
                    score = Math.max(score, 75);
                    reasons.push('AppleScript tool used (UI interaction)');
                }
                
                // Playwright indicates web UI
                if (toolName.includes('playwright') || toolName.includes('browser')) {
                    score = Math.max(score, 80);
                    targetApp = targetApp || 'Safari';
                    reasons.push('Playwright tool used (web UI)');
                }
            }
        }
        
        return {
            score,
            targetApp,
            reason: reasons.length > 0 ? reasons.join('; ') : 'No visual indicators detected'
        };
    }

    /**
     * Detect filesystem verification indicators
     * 
     * @param {string} action - Action text
     * @param {string} successCriteria - Success criteria
     * @param {Object} execution - Execution results
     * @returns {Object} Detection result
     * @private
     */
    _detectFilesystemIndicators(action, successCriteria, execution) {
        let score = 0;
        const suggestedTools = [];
        const reasons = [];
        
        // Filesystem keywords
        const fsKeywords = [
            { keywords: ['файл', 'file', 'зберегти', 'save'], score: 80, tool: 'filesystem__read_file' },
            { keywords: ['папка', 'folder', 'директорія', 'directory'], score: 80, tool: 'filesystem__list_directory' },
            { keywords: ['створити', 'create'], score: 70, tool: 'filesystem__write_file' },
            { keywords: ['видалити', 'delete', 'remove'], score: 75, tool: 'filesystem__read_file' },
            { keywords: ['перемістити', 'move', 'копіювати', 'copy'], score: 75, tool: 'filesystem__read_file' },
            { keywords: ['існує', 'exists', 'наявний'], score: 70, tool: 'filesystem__read_file' }
        ];
        
        for (const mapping of fsKeywords) {
            for (const keyword of mapping.keywords) {
                if (action.includes(keyword) || successCriteria.includes(keyword)) {
                    score = Math.max(score, mapping.score);
                    if (!suggestedTools.includes(mapping.tool)) {
                        suggestedTools.push(mapping.tool);
                    }
                    reasons.push(`Filesystem keyword: ${keyword}`);
                    break;
                }
            }
        }
        
        // Check execution tools
        if (execution && execution.results) {
            for (const result of execution.results) {
                const toolName = (result.tool || '').toLowerCase();
                
                if (toolName.includes('filesystem')) {
                    score = Math.max(score, 85);
                    reasons.push(`Filesystem tool used: ${result.tool}`);
                    
                    // Suggest verification tool based on execution tool
                    if (toolName.includes('write') || toolName.includes('create')) {
                        suggestedTools.push('filesystem__read_file');
                    } else if (toolName.includes('move') || toolName.includes('copy')) {
                        suggestedTools.push('filesystem__read_file');
                    } else if (toolName.includes('delete')) {
                        suggestedTools.push('filesystem__list_directory');
                    }
                }
            }
        }
        
        return {
            score,
            suggestedTools: [...new Set(suggestedTools)], // Remove duplicates
            reason: reasons.length > 0 ? reasons.join('; ') : 'No filesystem indicators detected'
        };
    }

    /**
     * Detect AppleScript verification indicators
     * 
     * @param {string} action - Action text
     * @param {string} successCriteria - Success criteria
     * @param {Object} execution - Execution results
     * @returns {Object} Detection result
     * @private
     */
    _detectAppleScriptIndicators(action, successCriteria, execution) {
        let score = 0;
        const suggestedTools = [];
        const reasons = [];
        
        // AppleScript keywords - macOS app automation
        const applescriptKeywords = [
            { keywords: ['відкрити програму', 'відкрити аплікацію', 'open app', 'launch app'], score: 85, tool: 'applescript__applescript_execute' },
            { keywords: ['закрити програму', 'закрити аплікацію', 'close app', 'quit app'], score: 85, tool: 'applescript__applescript_execute' },
            { keywords: ['активне вікно', 'active window', 'front window'], score: 80, tool: 'applescript__applescript_execute' },
            { keywords: ['натиснути кнопку', 'click button', 'press button'], score: 75, tool: 'applescript__applescript_execute' },
            { keywords: ['меню', 'menu', 'menu item', 'пункт меню'], score: 80, tool: 'applescript__applescript_execute' },
            { keywords: ['applescript', 'tell application'], score: 90, tool: 'applescript__applescript_execute' },
            { keywords: ['системні події', 'system events', 'keystroke'], score: 85, tool: 'applescript__applescript_execute' }
        ];
        
        for (const mapping of applescriptKeywords) {
            for (const keyword of mapping.keywords) {
                if (action.includes(keyword) || successCriteria.includes(keyword)) {
                    score = Math.max(score, mapping.score);
                    if (!suggestedTools.includes(mapping.tool)) {
                        suggestedTools.push(mapping.tool);
                    }
                    reasons.push(`AppleScript keyword: ${keyword}`);
                    break;
                }
            }
        }
        
        // Check execution tools
        if (execution && execution.results) {
            for (const result of execution.results) {
                const toolName = (result.tool || '').toLowerCase();
                
                if (toolName.includes('applescript')) {
                    score = Math.max(score, 90);
                    suggestedTools.push('applescript__applescript_execute');
                    reasons.push(`AppleScript tool used: ${result.tool}`);
                }
            }
        }
        
        return {
            score,
            suggestedTools: [...new Set(suggestedTools)],
            reason: reasons.length > 0 ? reasons.join('; ') : 'No AppleScript indicators detected'
        };
    }

    /**
     * Detect shell verification indicators
     * 
     * @param {string} action - Action text
     * @param {string} successCriteria - Success criteria
     * @param {Object} execution - Execution results
     * @returns {Object} Detection result
     * @private
     */
    _detectShellIndicators(action, successCriteria, execution) {
        let score = 0;
        const suggestedTools = [];
        const reasons = [];
        
        // Shell keywords - SPECIFIC to actual shell/terminal operations
        // NOTE: Avoid general words like 'команда'/'execute' that appear in UI contexts
        const shellKeywords = [
            { keywords: ['bash', 'sh', 'zsh', 'terminal'], score: 85, tool: 'shell__execute_command' },
            { keywords: ['shell script', 'shell команда', 'термінал'], score: 85, tool: 'shell__execute_command' },
            { keywords: ['системна команда', 'system command'], score: 80, tool: 'shell__execute_command' },
            { keywords: ['grep', 'awk', 'sed', 'pipe', '|'], score: 90, tool: 'shell__execute_command' },
            { keywords: ['процес', 'process', 'ps', 'kill'], score: 75, tool: 'shell__execute_command' },
            { keywords: ['env', 'PATH', 'export', 'chmod'], score: 85, tool: 'shell__execute_command' }
        ];
        
        for (const mapping of shellKeywords) {
            for (const keyword of mapping.keywords) {
                if (action.includes(keyword) || successCriteria.includes(keyword)) {
                    score = Math.max(score, mapping.score);
                    if (!suggestedTools.includes(mapping.tool)) {
                        suggestedTools.push(mapping.tool);
                    }
                    reasons.push(`Shell keyword: ${keyword}`);
                    break;
                }
            }
        }
        
        // Check execution tools
        if (execution && execution.results) {
            for (const result of execution.results) {
                const toolName = (result.tool || '').toLowerCase();
                
                if (toolName.includes('shell')) {
                    score = Math.max(score, 85);
                    suggestedTools.push('shell__execute_command');
                    reasons.push(`Shell tool used: ${result.tool}`);
                }
            }
        }
        
        return {
            score,
            suggestedTools: [...new Set(suggestedTools)],
            reason: reasons.length > 0 ? reasons.join('; ') : 'No shell indicators detected'
        };
    }

    /**
     * Detect memory verification indicators
     * 
     * @param {string} action - Action text
     * @param {string} successCriteria - Success criteria
     * @param {Object} execution - Execution results
     * @returns {Object} Detection result
     * @private
     */
    _detectMemoryIndicators(action, successCriteria, execution) {
        let score = 0;
        const suggestedTools = [];
        const reasons = [];
        
        // Memory keywords
        const memoryKeywords = [
            { keywords: ['запам\'ятати', 'remember', 'зберегти в пам\'яті'], score: 80, tool: 'memory__read' },
            { keywords: ['знання', 'knowledge', 'інформація'], score: 70, tool: 'memory__search' }
        ];
        
        for (const mapping of memoryKeywords) {
            for (const keyword of mapping.keywords) {
                if (action.includes(keyword) || successCriteria.includes(keyword)) {
                    score = Math.max(score, mapping.score);
                    if (!suggestedTools.includes(mapping.tool)) {
                        suggestedTools.push(mapping.tool);
                    }
                    reasons.push(`Memory keyword: ${keyword}`);
                    break;
                }
            }
        }
        
        // Check execution tools
        if (execution && execution.results) {
            for (const result of execution.results) {
                const toolName = (result.tool || '').toLowerCase();
                
                if (toolName.includes('memory')) {
                    score = Math.max(score, 85);
                    suggestedTools.push('memory__read');
                    reasons.push(`Memory tool used: ${result.tool}`);
                }
            }
        }
        
        return {
            score,
            suggestedTools: [...new Set(suggestedTools)],
            reason: reasons.length > 0 ? reasons.join('; ') : 'No memory indicators detected'
        };
    }

    /**
     * Suggest MCP fallback tools based on detected indicators
     * 
     * @param {Object} filesystemIndicators - Filesystem detection result
     * @param {Object} shellIndicators - Shell detection result
     * @param {Object} memoryIndicators - Memory detection result
     * @param {Object} applescriptIndicators - AppleScript detection result
     * @returns {Array} Suggested MCP tools for fallback
     * @private
     */
    _suggestMcpFallbackTools(filesystemIndicators, shellIndicators, memoryIndicators, applescriptIndicators) {
        const tools = [];
        
        // AppleScript has higher priority for macOS UI operations
        if (applescriptIndicators && applescriptIndicators.score > 30) {
            tools.push(...applescriptIndicators.suggestedTools);
        }
        
        if (filesystemIndicators.score > 30) {
            tools.push(...filesystemIndicators.suggestedTools);
        }
        
        if (shellIndicators.score > 30) {
            tools.push(...shellIndicators.suggestedTools);
        }
        
        if (memoryIndicators.score > 30) {
            tools.push(...memoryIndicators.suggestedTools);
        }
        
        return [...new Set(tools)]; // Remove duplicates
    }
}

export default GrishaVerificationStrategy;
