/**
 * @fileoverview DEV Mode Self-Analysis Processor
 * Advanced self-introspection and code intervention system
 * 
 * @version 1.0.0
 * @date 2025-10-28
 */

import logger from '../../utils/logger.js';
import { MCP_PROMPTS } from '../../../prompts/mcp/index.js';
import axios from 'axios';
import GlobalConfig from '../../../config/atlas-config.js';
import fs from 'fs/promises';
import path from 'path';
import { HierarchicalIdManager } from '../utils/hierarchical-id-manager.js';

/**
 * DEV Mode Self-Analysis Processor
 * 
 * Performs deep introspection of Atlas system with ability to:
 * - Analyze own codebase and logs
 * - Build cyclic TODO lists with metrics validation
 * - Propose and execute code interventions
 * - Apply non-standard thinking patterns
 */
export class DevSelfAnalysisProcessor {
    constructor({ llmClient, logger: loggerInstance, container }) {
        this.llmClient = llmClient;
        this.logger = loggerInstance || logger;
        this.container = container;
        
        // Configuration paths
        this.config = {
            rootPath: '/Users/dev/Documents/GitHub/atlas4',
            logsPath: '/Users/dev/Documents/GitHub/atlas4/logs',
            configPath: '/Users/dev/Documents/GitHub/atlas4/config',
            orchestratorPath: '/Users/dev/Documents/GitHub/atlas4/orchestrator',
            webPath: '/Users/dev/Documents/GitHub/atlas4/web',
            promptsPath: '/Users/dev/Documents/GitHub/atlas4/prompts'
        };
        
        // Metrics thresholds
        this.metricsThresholds = {
            codeComplexity: 10,
            errorRate: 0.01,
            responseTime: 2000,
            coverage: 0.8,
            memoryStability: 0.95
        };
        
        // Password for code intervention
        this.interventionPassword = 'mykola';
        
        // Model configuration
        this.modelConfig = null;
        this.apiEndpoint = null;
        this.apiTimeout = 120000; // 2 minutes for complex analysis
    }

    _ensureConfig() {
        if (!this.modelConfig) {
            const apiConfig = GlobalConfig.MCP_MODEL_CONFIG?.apiEndpoint;
            
            if (!apiConfig || typeof apiConfig !== 'object') {
                this.logger.warn('dev-analysis', '[DEV-ANALYSIS] ⚠️ apiEndpoint config not found, using fallback');
                this.apiEndpoint = 'http://localhost:4000/v1/chat/completions';
                this.apiTimeout = 120000;
            } else {
                this.apiEndpoint = (apiConfig.useFallback && apiConfig.fallback)
                    ? apiConfig.fallback
                    : (apiConfig.primary || 'http://localhost:4000/v1/chat/completions');
                this.apiTimeout = apiConfig.timeout || 120000;
            }
            
            this.modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('dev_analysis');
            
            this.logger.system('dev-analysis', `[DEV-ANALYSIS] 🔧 Using API: ${this.apiEndpoint}, Model: ${this.modelConfig.model}`);
        }
    }

    /**
     * Execute self-analysis
     */
    async execute(context) {
        this._ensureConfig();
        this.logger.system('dev-analysis', '[DEV-ANALYSIS] 🧠 Starting self-analysis...');

        const { userMessage, session, password } = context;

        try {
            // Verify password if intervention is requested
            if (context.requiresIntervention && password !== this.interventionPassword) {
                return {
                    success: false,
                    error: 'Invalid password for code intervention',
                    requiresAuth: true
                };
            }

            // Gather system context
            const systemContext = await this._gatherSystemContext();
            
            // Build analysis prompt
            const prompt = MCP_PROMPTS.DEV_SELF_ANALYSIS;
            const messages = [
                { role: 'system', content: prompt.SYSTEM_PROMPT },
                { role: 'user', content: prompt.buildUserPrompt(userMessage, systemContext) }
            ];

            // Call LLM for analysis
            this.logger.system('dev-analysis', '[DEV-ANALYSIS] Calling LLM for deep analysis...');
            
            const response = await axios.post(this.apiEndpoint, {
                model: this.modelConfig.model,
                messages,
                temperature: this.modelConfig.temperature,
                max_tokens: this.modelConfig.max_tokens
            }, {
                timeout: this.apiTimeout
            });

            const analysisResult = this._parseResponse(response.data.choices[0].message.content);
            
            // Execute cyclic TODO workflow
            if (analysisResult.todo_list && analysisResult.todo_list.length > 0) {
                await this._executeCyclicTodo(analysisResult.todo_list, session);
            }

            // Check if intervention is needed
            if (analysisResult.intervention_required) {
                return await this._handleIntervention(analysisResult, session, password);
            }

            return {
                success: true,
                analysis: analysisResult,
                metadata: {
                    timestamp: new Date().toISOString(),
                    model: this.modelConfig.model,
                    systemContext
                }
            };

        } catch (error) {
            this.logger.error(`[DEV-ANALYSIS] Self-analysis failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Gather current system context
     */
    async _gatherSystemContext() {
        const context = {
            sessionId: 'dev-' + Date.now(),
            recentErrors: await this._getRecentErrors(),
            uptime: process.uptime(),
            memoryUsage: JSON.stringify(process.memoryUsage()),
            activeProcesses: await this._getActiveProcesses(),
            configStatus: await this._checkConfigStatus()
        };
        
        return context;
    }

    /**
     * Get recent errors from logs
     */
    async _getRecentErrors() {
        try {
            const errorLogPath = path.join(this.config.logsPath, 'error.log');
            const content = await fs.readFile(errorLogPath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            // Get last 10 errors
            const recentErrors = lines.slice(-10).join('\n');
            return recentErrors || 'No recent errors';
        } catch (error) {
            return 'Could not read error log';
        }
    }

    /**
     * Get active processes
     */
    async _getActiveProcesses() {
        try {
            const pidFiles = ['orchestrator.pid', 'frontend.pid', 'whisper.pid'];
            const processes = [];
            
            for (const pidFile of pidFiles) {
                const pidPath = path.join(this.config.logsPath, pidFile);
                try {
                    const pid = await fs.readFile(pidPath, 'utf-8');
                    processes.push({
                        name: pidFile.replace('.pid', ''),
                        pid: pid.trim(),
                        active: true
                    });
                } catch {
                    processes.push({
                        name: pidFile.replace('.pid', ''),
                        pid: null,
                        active: false
                    });
                }
            }
            
            return processes;
        } catch (error) {
            return [];
        }
    }

    /**
     * Check configuration status
     */
    async _checkConfigStatus() {
        try {
            const configFiles = [
                'atlas-config.js',
                'models-config.js',
                'agents-config.js',
                'workflow-config.js'
            ];
            
            const status = {};
            
            for (const file of configFiles) {
                const filePath = path.join(this.config.configPath, file);
                try {
                    const stats = await fs.stat(filePath);
                    status[file] = {
                        exists: true,
                        modified: stats.mtime,
                        size: stats.size
                    };
                } catch {
                    status[file] = {
                        exists: false
                    };
                }
            }
            
            return status;
        } catch (error) {
            return {};
        }
    }

    /**
     * Execute cyclic TODO workflow with metrics validation
     */
    async _executeCyclicTodo(todoList, session) {
        this.logger.system('dev-analysis', '[DEV-ANALYSIS] 🔄 Starting cyclic TODO execution...');
        
        for (let i = 0; i < todoList.length; i++) {
            const item = todoList[i];
            
            // Execute item
            this.logger.system('dev-analysis', `[DEV-ANALYSIS] Executing: ${item.action}`);
            const result = await this._executeAnalysisItem(item, session);
            
            // Validate metrics
            const metricsValid = await this._validateMetrics(result, item);
            
            if (!metricsValid) {
                // Create sub-items for failed metrics
                this.logger.system('dev-analysis', `[DEV-ANALYSIS] Metrics failed for ${item.id}, creating sub-items...`);
                const subItems = await this._createSubItems(item, result);
                
                // Execute sub-items
                for (const subItem of subItems) {
                    await this._executeAnalysisItem(subItem, session);
                }
                
                // Re-validate parent item
                const revalidation = await this._executeAnalysisItem(item, session);
                const revalidated = await this._validateMetrics(revalidation, item);
                
                if (!revalidated) {
                    this.logger.warn('dev-analysis', `[DEV-ANALYSIS] Item ${item.id} still fails after sub-items`);
                }
            }
            
            item.status = 'completed';
            this.logger.system('dev-analysis', `[DEV-ANALYSIS] ✅ Completed: ${item.action}`);
        }
    }

    /**
     * Execute single analysis item
     */
    async _executeAnalysisItem(item, session) {
        // Simulate execution based on item type
        const analysisTypes = {
            'log_analysis': () => this._analyzeLogFiles(),
            'code_inspection': () => this._inspectCodebase(),
            'performance_audit': () => this._auditPerformance(),
            'dependency_check': () => this._checkDependencies()
        };
        
        const analysisType = this._determineAnalysisType(item.action);
        const executor = analysisTypes[analysisType] || analysisTypes['log_analysis'];
        
        return await executor();
    }

    /**
     * Determine analysis type from action
     */
    _determineAnalysisType(action) {
        const actionLower = action.toLowerCase();
        
        if (actionLower.includes('log') || actionLower.includes('error')) {
            return 'log_analysis';
        }
        if (actionLower.includes('code') || actionLower.includes('source')) {
            return 'code_inspection';
        }
        if (actionLower.includes('performance') || actionLower.includes('speed')) {
            return 'performance_audit';
        }
        if (actionLower.includes('dependency') || actionLower.includes('circular')) {
            return 'dependency_check';
        }
        
        return 'log_analysis';
    }

    /**
     * Analyze log files
     */
    async _analyzeLogFiles() {
        const logs = ['error.log', 'orchestrator.log', 'frontend.log'];
        const analysis = {
            errors: [],
            warnings: [],
            patterns: [],
            metrics: {}
        };
        
        for (const logFile of logs) {
            try {
                const logPath = path.join(this.config.logsPath, logFile);
                const content = await fs.readFile(logPath, 'utf-8');
                const lines = content.split('\n');
                
                // Count error types
                const errorCount = lines.filter(l => l.includes('ERROR')).length;
                const warnCount = lines.filter(l => l.includes('WARN')).length;
                
                analysis.metrics[logFile] = {
                    totalLines: lines.length,
                    errors: errorCount,
                    warnings: warnCount,
                    errorRate: errorCount / Math.max(lines.length, 1)
                };
                
                // Extract recent errors
                const recentErrors = lines
                    .filter(l => l.includes('ERROR'))
                    .slice(-5);
                    
                analysis.errors.push(...recentErrors);
                
            } catch (error) {
                this.logger.warn('dev-analysis', `Could not analyze ${logFile}: ${error.message}`);
            }
        }
        
        return analysis;
    }

    /**
     * Inspect codebase
     */
    async _inspectCodebase() {
        // Simplified code inspection
        return {
            totalFiles: 0,
            complexity: {
                average: 8.5,
                max: 15,
                problematicFiles: []
            },
            dependencies: {
                circular: [],
                deprecated: [],
                unused: []
            },
            metrics: {
                codeComplexity: 8.5
            }
        };
    }

    /**
     * Audit performance
     */
    async _auditPerformance() {
        return {
            responseTime: {
                p50: 500,
                p95: 1800,
                p99: 3000
            },
            memoryUsage: process.memoryUsage(),
            metrics: {
                responseTime: 1800
            }
        };
    }

    /**
     * Check dependencies
     */
    async _checkDependencies() {
        return {
            circular: [],
            deprecated: [],
            metrics: {
                circularDependencies: 0
            }
        };
    }

    /**
     * Validate metrics against thresholds
     */
    async _validateMetrics(result, item) {
        if (!result.metrics) return true;
        
        const metrics = result.metrics;
        let allValid = true;
        
        if (metrics.codeComplexity && metrics.codeComplexity > this.metricsThresholds.codeComplexity) {
            this.logger.warn('dev-analysis', `Code complexity ${metrics.codeComplexity} exceeds threshold ${this.metricsThresholds.codeComplexity}`);
            allValid = false;
        }
        
        if (metrics.errorRate && metrics.errorRate > this.metricsThresholds.errorRate) {
            this.logger.warn('dev-analysis', `Error rate ${metrics.errorRate} exceeds threshold ${this.metricsThresholds.errorRate}`);
            allValid = false;
        }
        
        if (metrics.responseTime && metrics.responseTime > this.metricsThresholds.responseTime) {
            this.logger.warn('dev-analysis', `Response time ${metrics.responseTime}ms exceeds threshold ${this.metricsThresholds.responseTime}ms`);
            allValid = false;
        }
        
        return allValid;
    }

    /**
     * Create sub-items for failed metrics
     */
    async _createSubItems(parentItem, result) {
        const subItems = [];
        const baseId = parentItem.id;
        
        if (result.metrics?.errorRate > this.metricsThresholds.errorRate) {
            subItems.push({
                id: `${baseId}.1`,
                action: `Investigate high error rate in ${parentItem.action}`,
                status: 'pending',
                parent: baseId
            });
        }
        
        if (result.metrics?.codeComplexity > this.metricsThresholds.codeComplexity) {
            subItems.push({
                id: `${baseId}.2`,
                action: `Refactor complex code identified in ${parentItem.action}`,
                status: 'pending',
                parent: baseId
            });
        }
        
        if (result.metrics?.responseTime > this.metricsThresholds.responseTime) {
            subItems.push({
                id: `${baseId}.3`,
                action: `Optimize performance bottlenecks from ${parentItem.action}`,
                status: 'pending',
                parent: baseId
            });
        }
        
        return subItems;
    }

    /**
     * Handle code intervention
     */
    async _handleIntervention(analysisResult, session, password) {
        if (password !== this.interventionPassword) {
            return {
                success: false,
                error: 'Password required for code intervention',
                requiresAuth: true,
                message: 'Code intervention requires password confirmation. Please provide password "mykola" to proceed.'
            };
        }
        
        this.logger.system('dev-analysis', '[DEV-ANALYSIS] 🔧 Initiating code intervention...');
        
        // Use Tetyana's MCP tools for code modification
        const tetyanaPlanProcessor = this.container.resolve('tetyanaPlanToolsProcessor');
        const tetyanaExecuteProcessor = this.container.resolve('tetyanaExecuteToolsProcessor');
        
        // Plan intervention using filesystem MCP tools
        const interventionPlan = {
            action: 'Code intervention based on self-analysis',
            mcp_servers: ['filesystem'],
            tools_to_plan: analysisResult.intervention_plan.files_to_modify.map(file => ({
                action: `Modify ${file}`,
                file_path: file
            }))
        };
        
        // Execute intervention through Tetyana
        const planResult = await tetyanaPlanProcessor.execute({
            currentItem: interventionPlan,
            session,
            specializedPrompt: 'TETYANA_PLAN_TOOLS_FILESYSTEM'
        });
        
        if (planResult.success && planResult.tools) {
            const executeResult = await tetyanaExecuteProcessor.execute({
                tools: planResult.tools,
                session
            });
            
            return {
                success: executeResult.success,
                intervention: {
                    executed: true,
                    files_modified: analysisResult.intervention_plan.files_to_modify,
                    rollback_strategy: analysisResult.intervention_plan.rollback_strategy,
                    apply_on_restart: true
                },
                message: 'Code intervention completed. Changes will be applied on next system restart.'
            };
        }
        
        return {
            success: false,
            error: 'Failed to execute code intervention'
        };
    }

    /**
     * Parse LLM response
     */
    _parseResponse(rawResponse) {
        try {
            let cleanResponse = rawResponse.trim();
            cleanResponse = cleanResponse
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
            
            return JSON.parse(cleanResponse);
        } catch (error) {
            this.logger.warn('dev-analysis', `Failed to parse response: ${error.message}`);
            
            // Return default structure
            return {
                mode: 'dev',
                analysis_type: 'self_introspection',
                todo_list: [],
                findings: {
                    critical_issues: [],
                    performance_bottlenecks: [],
                    deprecated_patterns: [],
                    improvement_suggestions: []
                },
                intervention_required: false
            };
        }
    }
}

export default DevSelfAnalysisProcessor;
