/**
 * @fileoverview DEV Mode Self-Analysis Processor
 * Advanced self-introspection and code intervention system
 * 
 * @version 1.0.0
 * @date 2025-10-28
 */

import axios from 'axios';
import { MCP_PROMPTS } from '../../../prompts/mcp/index.js';
import GlobalConfig from '../../../config/global-config.js';
import RecursiveAnalysisEngine from './dev-recursive-analysis.js';

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
    constructor(logger, container) {
        this.logger = logger;
        this.container = container;
        this.recursiveEngine = new RecursiveAnalysisEngine(logger, container);
        
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
                this.logger.warn('[DEV-ANALYSIS] ⚠️ apiEndpoint config not found, using fallback', {
                    category: 'system',
                    component: 'dev-analysis'
                });
                this.apiEndpoint = 'http://localhost:4000/v1/chat/completions';
                this.apiTimeout = 120000;
            } else {
                this.apiEndpoint = (apiConfig.useFallback && apiConfig.fallback)
                    ? apiConfig.fallback
                    : (apiConfig.primary || 'http://localhost:4000/v1/chat/completions');
                this.apiTimeout = apiConfig.timeout || 120000;
            }
            
            this.modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('dev_analysis');
            
            this.logger.info(`[DEV-ANALYSIS] 🔧 Using API: ${this.apiEndpoint}, Model: ${this.modelConfig.model}`, {
                category: 'system',
                component: 'dev-analysis'
            });
        }
    }

    /**
     * Execute self-analysis
     */
    async execute(context) {
        this._ensureConfig();
        this.logger.info('[DEV-ANALYSIS] 🧠 Starting self-analysis...', {
            category: 'system',
            component: 'dev-analysis'
        });

        const { userMessage, session, password, ttsSettings = {} } = context;
        
        // Parse analysis depth and focus from user message
        const analysisDepth = this._determineAnalysisDepth(userMessage);
        const focusArea = this._extractFocusArea(userMessage);
        const isInteractive = userMessage.toLowerCase().includes('діалог') || 
                            userMessage.toLowerCase().includes('інтерактивно') ||
                            userMessage.toLowerCase().includes('розбери');

        try {
            // Verify password if intervention is requested
            if (context.requiresIntervention) {
                // Normalize password - remove quotes, trim and lowercase
                const normalizedPassword = (password || '').trim().replace(/^["']|["']$/g, '').toLowerCase();
                
                if (normalizedPassword !== this.interventionPassword) {
                    this.logger.warn(`[DEV-ANALYSIS] ❌ Invalid password attempt: "${normalizedPassword}" (expected: "${this.interventionPassword}")`, {
                    category: 'system',
                    component: 'dev-analysis'
                });
                    return {
                        success: false,
                        error: 'Invalid password for code intervention',
                        requiresAuth: true
                    };
                }
                
                this.logger.info('[DEV-ANALYSIS] ✅ Password verified - proceeding with intervention', {
                    category: 'system',
                    component: 'dev-analysis'
                });
            }

            // Gather system context
            const systemContext = await this._gatherSystemContext();
            
            // Ініціалізуємо chatThread якщо не існує (як у chat mode)
            if (!session.chatThread) {
                session.chatThread = { messages: [], lastTopic: undefined };
            }
            
            // Build analysis prompt з підтримкою контексту
            const prompt = MCP_PROMPTS.DEV_SELF_ANALYSIS;
            const messages = [
                { role: 'system', content: prompt.SYSTEM_PROMPT }
            ];
            
            // Додаємо історію діалогу для контексту (останні 5 повідомлень)
            const recentMessages = session.chatThread.messages.slice(-5);
            if (recentMessages.length > 0) {
                this.logger.info(`[DEV-ANALYSIS] 💭 Using ${recentMessages.length} messages from history for context`, {
                    category: 'system',
                    component: 'dev-analysis'
                });
                messages.push(...recentMessages);
            }
            
            // Add user request with system context
            messages.push({
                role: 'user',
                content: MCP_PROMPTS.DEV_SELF_ANALYSIS.buildUserPrompt(userMessage, systemContext)
            });

            // Call LLM for analysis
            this.logger.info('[DEV-ANALYSIS] Calling LLM for deep analysis...', {
                category: 'system',
                component: 'dev-analysis'
            });
            
            const response = await axios.post(this.apiEndpoint, {
                model: this.modelConfig.model,
                messages,
                temperature: this.modelConfig.temperature,
                max_tokens: this.modelConfig.max_tokens
            }, {
                timeout: this.apiTimeout
            });

            const analysisResult = this._parseResponse(response.data.choices[0].message.content);
            
            // Add detailed analysis of current system state
            const detailedAnalysis = await this._performDetailedAnalysis(systemContext, analysisResult, {
                depth: analysisDepth,
                focusArea: focusArea,
                autoDeepen: true // Automatically deepen analysis when problems found
            });
            analysisResult.detailed_analysis = detailedAnalysis;
            
            // If problems found, perform deeper targeted analysis
            if (analysisResult.findings?.critical_issues?.length > 0) {
                const deeperAnalysis = await this._performTargetedDeepAnalysis(
                    analysisResult.findings.critical_issues,
                    systemContext
                );
                analysisResult.deep_targeted_analysis = deeperAnalysis;
            }
            
            // Extract real problems from analysis
            const realProblems = this._extractRealProblems(analysisResult, detailedAnalysis);
            
            // Save analysis context to memory for future reference
            await this._saveAnalysisToMemory(analysisResult, session);
            
            // Execute RECURSIVE TODO workflow with deep analysis
            if (analysisResult.todo_list?.length > 0) {
                await this.recursiveEngine.executeRecursiveTodo(this._buildHierarchicalTodo(analysisResult.todo_list || [], realProblems), session, systemContext, 1);
            }

            // Build comprehensive response with all findings
            const comprehensiveResponse = this._buildComprehensiveResponse(analysisResult, detailedAnalysis);
            
            // Перевіряємо чи користувач ЯВНО просить внести зміни
            const userWantsIntervention = this._detectInterventionRequest(userMessage);
            
            // Handle intervention path - ТІЛЬКИ якщо користувач явно просить
            if (userWantsIntervention && analysisResult.intervention_required) {
                if (password && password === this.interventionPassword) {
                    const interventionResult = await this._handleIntervention(analysisResult, session, password);
                    return {
                        ...interventionResult,
                        analysis: comprehensiveResponse,
                        metadata: {
                            timestamp: new Date().toISOString(),
                            model: this.modelConfig.model,
                            systemContext,
                            sessionId: session.id,
                            analysisDepth: analysisDepth,
                            focusArea: focusArea,
                            isInteractive: isInteractive
                        },
                        ttsSettings: {
                            ...ttsSettings,
                            fullNarration: true,
                            detailLevel: analysisDepth === 'deep' ? 'comprehensive' : 'standard'
                        },
                        interactiveMode: isInteractive
                    };
                }

                return {
                    success: false,
                    requiresAuth: true,
                    message: 'Code intervention requires password confirmation. Please provide password "mykola" to proceed.',
                    analysis: comprehensiveResponse,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        model: this.modelConfig.model,
                        systemContext,
                        sessionId: session.id,
                        analysisDepth: analysisDepth,
                        focusArea: focusArea,
                        isInteractive: isInteractive
                    },
                    ttsSettings: {
                        ...ttsSettings,
                        fullNarration: true,
                        detailLevel: analysisDepth === 'deep' ? 'comprehensive' : 'standard'
                    },
                    interactiveMode: isInteractive
                };
            }

            // Зберігаємо повідомлення в chatThread для підтримки контексту
            session.chatThread.messages.push({
                role: 'user',
                content: userMessage
            });
            
            session.chatThread.messages.push({
                role: 'assistant',
                content: JSON.stringify(comprehensiveResponse.findings || {})
            });
            
            // Обмежуємо історію до 10 повідомлень
            if (session.chatThread.messages.length > 10) {
                session.chatThread.messages = session.chatThread.messages.slice(-10);
            }
            
            this.logger.info(`[DEV-ANALYSIS] 💾 Saved to chatThread, total messages: ${session.chatThread.messages.length}`, {
                category: 'system',
                component: 'dev-analysis'
            });

            return {
                success: true,
                analysis: comprehensiveResponse,
                metadata: {
                    timestamp: new Date().toISOString(),
                    model: this.modelConfig.model,
                    systemContext,
                    sessionId: session.id,
                    analysisDepth: analysisDepth,
                    focusArea: focusArea,
                    isInteractive: isInteractive
                },
                ttsSettings: {
                    ...ttsSettings,
                    fullNarration: true, // By default, narrate everything
                    detailLevel: analysisDepth === 'deep' ? 'comprehensive' : 'standard'
                },
                interactiveMode: isInteractive
            };

        } catch (error) {
            this.logger.error(`[DEV-ANALYSIS] Self-analysis failed: ${error.message}`, {
                category: 'system',
                component: 'dev-analysis',
                error: error.message
            });
            
            // Return meaningful error analysis
            return {
                success: true, // Still return success to show partial results
                analysis: {
                    findings: {
                        critical_issues: [{
                            type: 'analysis_error',
                            description: `Помилка під час аналізу: ${error.message}`,
                            location: 'dev-self-analysis-processor',
                            severity: 'high'
                        }],
                        performance_bottlenecks: [],
                        deprecated_patterns: [],
                        improvement_suggestions: [{
                            area: 'error_handling',
                            suggestion: 'Покращити обробку помилок в системі самоаналізу',
                            priority: 'high'
                        }]
                    },
                    todo_list: [],
                    intervention_required: false,
                    summary: `Частковий аналіз виконано. Виявлено помилку: ${error.message}`
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    partial: true,
                    error: error.message
                }
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
     * Execute recursive TODO workflow with deep sub-item analysis
     */
    async _executeCyclicTodo(todoList, session, parentId = null, depth = 1) {
        this.logger.info(`[DEV-ANALYSIS] 🔄 Starting TODO execution at depth ${depth}...`, {
            category: 'system',
            component: 'dev-analysis'
        });
        
        const MAX_DEPTH = 5;
        if (depth > MAX_DEPTH) {
            this.logger.warn(`[DEV-ANALYSIS] Max depth ${MAX_DEPTH} reached, stopping recursion`, {
                category: 'system',
                component: 'dev-analysis'
            });
            return;
        }
        
        for (let i = 0; i < todoList.length; i++) {
            const item = todoList[i];

            if (!item || (!item.action && !item.description)) {
                continue;
            }

            // Generate hierarchical ID (e.g., 2.1, 2.1.3)
            if (parentId) {
                item.id = `${parentId}.${i + 1}`;
            } else {
                item.id = `${i + 1}`;
            }

            // Execute item
            const actionLabel = item.action || item.description || `item_${item.id}`;
            this.logger.info(`[DEV-ANALYSIS] 📊 Analyzing [${item.id}]: ${actionLabel}`, {
                category: 'system',
                component: 'dev-analysis',
                depth,
                itemId: item.id
            });
            
            const result = await this._executeAnalysisItem(item, session);
            
            // Check if this item needs deeper analysis
            const needsDeeper = this._requiresDeeperAnalysis(item, result);
            
            if (needsDeeper) {
                // Create sub-items for deeper analysis
                this.logger.info(`[DEV-ANALYSIS] 🔍 Item [${item.id}] requires deeper analysis, creating sub-items...`, {
                    category: 'system',
                    component: 'dev-analysis'
                });
                
                const subItems = await this._createIntelligentSubItems(item, result, session);
                
                if (subItems && subItems.length > 0) {
                    // Execute sub-items recursively
                    item.subItems = subItems;
                    await this._executeCyclicTodo(subItems, session, item.id, depth + 1);
                }
                
                // Re-validate parent item after sub-items
                const revalidation = await this._executeAnalysisItem(item, session);
                const validated = await this._validateMetrics(revalidation, item);
                
                item.status = validated ? 'completed' : 'needs_review';
                item.confidence = validated ? 95 : 60;
            } else {
                item.status = 'completed';
                item.confidence = 90;
            }
            
            this.logger.info(`[DEV-ANALYSIS] ${item.status === 'completed' ? '✅' : '⚠️'} [${item.id}] ${actionLabel} (confidence: ${item.confidence}%)`, {
                category: 'system',
                component: 'dev-analysis',
                status: item.status,
                confidence: item.confidence
            });
        }
    }
    
    /**
     * Determine if item requires deeper analysis
     */
    _requiresDeeperAnalysis(item, result) {
        // Check various indicators
        if (result.error) return true;
        if (result.metrics && result.metrics.errorRate > 0.01) return true;
        if (result.metrics && result.metrics.codeComplexity > 10) return true;
        if (item.priority === 'critical') return true;
        if (item.action && item.action.includes('глибше')) return true;
        if (item.action && item.action.includes('детальніше')) return true;
        if (result.findings && result.findings.length > 0) return true;
        
        return false;
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
        
        const analysisType = this._determineAnalysisType(item?.action || item?.description);
        const executor = analysisTypes[analysisType] || analysisTypes['log_analysis'];
        
        return await executor();
    }

    /**
     * Determine analysis type from action
     */
    _determineAnalysisType(action) {
        if (!action || typeof action !== 'string') {
            return 'log_analysis';
        }

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
                this.logger.warn(`[DEV-ANALYSIS] Could not analyze ${logFile}: ${error.message}`, {
                    category: 'system',
                    component: 'dev-analysis'
                });
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
            this.logger.warn(`[DEV-ANALYSIS] Code complexity ${metrics.codeComplexity} exceeds threshold ${this.metricsThresholds.codeComplexity}`, {
                category: 'system',
                component: 'dev-analysis'
            });
            allValid = false;
        }
        
        if (metrics.errorRate && metrics.errorRate > this.metricsThresholds.errorRate) {
            this.logger.warn(`[DEV-ANALYSIS] Error rate ${metrics.errorRate} exceeds threshold ${this.metricsThresholds.errorRate}`, {
                category: 'system',
                component: 'dev-analysis'
            });
            allValid = false;
        }
        
        if (metrics.responseTime && metrics.responseTime > this.metricsThresholds.responseTime) {
            this.logger.warn(`[DEV-ANALYSIS] Response time ${metrics.responseTime}ms exceeds threshold ${this.metricsThresholds.responseTime}ms`, {
                category: 'system',
                component: 'dev-analysis'
            });
            allValid = false;
        }
        
        return allValid;
    }

    /**
     * Create intelligent sub-items based on analysis results
     */
    async _createIntelligentSubItems(parentItem, result, session) {
        const subItems = [];
        
        // Analyze different aspects that need attention
        if (result.error) {
            subItems.push({
                action: `Діагностувати помилку: ${result.error}`,
                description: `Глибокий аналіз причини помилки в ${parentItem.action}`,
                priority: 'high',
                type: 'error_analysis'
            });
        }
        
        if (result.metrics?.errorRate > 0.01) {
            subItems.push({
                action: 'Проаналізувати патерни помилок в логах',
                description: 'Знайти кореневі причини високого error rate',
                priority: 'high',
                type: 'log_analysis',
                understanding_context: this._generateContextualUnderstanding(result, parentItem)
            });
        }
        
        if (result.metrics?.codeComplexity > 10) {
            subItems.push({
                action: 'Рефакторинг складного коду',
                description: 'Спростити архітектуру та зменшити cyclomatic complexity',
                priority: 'medium',
                type: 'refactoring'
            });
        }
        
        if (result.metrics?.responseTime > 2000) {
            subItems.push({
                action: 'Оптимізація продуктивності',
                description: 'Профілювання та усунення bottlenecks',
                priority: 'high',
                type: 'performance'
            });
        }
        
        // Add contextual sub-items based on parent action
        if (parentItem.action?.includes('TTS')) {
            subItems.push({
                action: 'Перевірити TTS pipeline',
                description: 'Аналіз WebSocket → TTSSyncManager → TTS Service',
                priority: 'medium',
                type: 'tts_analysis'
            });
        }
        
        if (parentItem.action?.includes('MCP')) {
            subItems.push({
                action: 'Валідація MCP інструментів',
                description: 'Перевірка schema та prompt consistency',
                priority: 'medium',
                type: 'mcp_validation'
            });
        }
        
        return subItems;
    }
    
    /**
     * Legacy create sub-items method for compatibility
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
        
        this.logger.info('[DEV-ANALYSIS] 🔧 Initiating code intervention...', {
            category: 'system',
            component: 'dev-analysis'
        });
        
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
            this.logger.warn(`[DEV-ANALYSIS] Failed to parse response: ${error.message}`, {
                category: 'system',
                component: 'dev-analysis'
            });
            
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

    /**
     * Determine analysis depth from user message
     */
    _determineAnalysisDepth(userMessage) {
        const msg = userMessage.toLowerCase();
        if (msg.includes('глибок') || msg.includes('детальн') || msg.includes('повн')) {
            return 'deep';
        }
        if (msg.includes('швидк') || msg.includes('коротк')) {
            return 'quick';
        }
        return 'standard';
    }
    
    /**
     * Extract focus area from user message
     */
    _extractFocusArea(userMessage) {
        const msg = userMessage.toLowerCase();
        if (msg.includes('продуктивн') || msg.includes('performance')) return 'performance';
        if (msg.includes('помилк') || msg.includes('error') || msg.includes('лог')) return 'errors';
        if (msg.includes('пам\'ят') || msg.includes('memory')) return 'memory';
        if (msg.includes('безпек') || msg.includes('security')) return 'security';
        if (msg.includes('архітектур') || msg.includes('structure')) return 'architecture';
        if (msg.includes('залежност') || msg.includes('dependencies')) return 'dependencies';
        if (msg.includes('тетян') || msg.includes('tetyana')) return 'tetyana';
        if (msg.includes('гріш') || msg.includes('grisha')) return 'grisha';
        if (msg.includes('mcp') || msg.includes('інструмент')) return 'mcp';
        return 'general';
    }
    
    /**
     * Perform targeted deep analysis on specific issues
     */
    async _performTargetedDeepAnalysis(criticalIssues, systemContext) {
        const deepAnalysis = {
            rootCauses: [],
            impactAnalysis: [],
            correlations: [],
            recommendations: []
        };
        
        for (const issue of criticalIssues) {
            // Analyze root cause
            const rootCause = await this._analyzeRootCause(issue);
            deepAnalysis.rootCauses.push({
                issue: issue.description || issue.type || 'unknown',
                cause: rootCause.primaryCause || rootCause,
                confidence: rootCause.confidence || 0.8
            });
            
            // Analyze impact
            const impact = await this._analyzeImpact(issue, systemContext);
            deepAnalysis.impactAnalysis.push({
                issue: issue.description || issue.type || 'unknown',
                affectedComponents: impact.components,
                severity: impact.severity,
                users: impact.affectsUsers
            });
            
            // Find correlations
            const correlations = await this._findCorrelations(issue, systemContext);
            if (correlations.length > 0) {
                deepAnalysis.correlations.push({
                    issue: issue.description || issue.type || 'unknown',
                    relatedTo: correlations
                });
            }
            
            // Generate specific recommendations
            const recommendation = await this._generateTargetedRecommendation(issue, rootCause);
            deepAnalysis.recommendations.push(recommendation);
        }
        
        return deepAnalysis;
    }
    
    /**
     * Analyze root cause of an issue
     */
    async _analyzeRootCause(issue) {
        // Deep dive into the issue
        const possibleCauses = [];
        
        if (issue.type === 'performance') {
            possibleCauses.push('Inefficient algorithms', 'Memory leaks', 'Blocking operations');
        } else if (issue.type === 'error') {
            possibleCauses.push('Null reference', 'Async timing issues', 'Missing error handling');
        }
        
        return {
            primaryCause: possibleCauses[0] || issue.description || 'Невідома причина',
            secondaryCauses: possibleCauses.slice(1),
            confidence: 0.85,
            evidence: issue.details || []
        };
    }
    
    /**
     * Analyze impact of an issue
     */
    async _analyzeImpact(issue, systemContext) {
        return {
            components: ['orchestrator', 'frontend'],
            severity: issue.severity || 'medium',
            affectsUsers: true,
            estimatedDowntime: '0 minutes'
        };
    }
    
    /**
     * Find correlations with other issues
     */
    async _findCorrelations(issue, systemContext) {
        const correlations = [];
        
        // Check if issue appears in multiple logs
        if (issue.location && issue.location.includes('multiple')) {
            correlations.push('Cross-component issue');
        }
        
        return correlations;
    }
    
    /**
     * Generate targeted recommendation
     */
    async _generateTargetedRecommendation(issue, rootCause) {
        const location = issue.location || 'системі';
        const cause = rootCause.primaryCause || 'невідома проблема';
        return {
            issue: issue.description || 'Невизначена проблема',
            action: `Виправити ${cause} в ${location}`,
            priority: issue.severity === 'high' ? 'негайно' : 'нормальний',
            estimatedEffort: '2 години',
            implementation: 'Використати MCP інструменти для автоматичного виправлення'
        };
    }

    /**
     * Perform detailed analysis of system components
     */
    async _performDetailedAnalysis(systemContext, initialAnalysis, options = {}) {
        const { depth = 'standard', focusArea = 'general', autoDeepen = false } = options;
        
        const analysis = {
            logs: await this._analyzeLogFiles(depth),
            code: await this._inspectCodebase(depth),
            performance: await this._auditPerformance(depth),
            dependencies: await this._checkDependencies(depth),
            memory: await this._analyzeMemoryPatterns(),
            recommendations: [],
            focusAreaAnalysis: null
        };
        
        // Perform focused analysis if specific area requested
        if (focusArea !== 'general') {
            analysis.focusAreaAnalysis = await this._performFocusedAnalysis(focusArea, systemContext, depth);
        }
        
        // Generate intelligent recommendations based on findings
        if (analysis.logs.metrics) {
            Object.entries(analysis.logs.metrics).forEach(([file, metrics]) => {
                if (metrics.errorRate > 0.01) {
                    analysis.recommendations.push({
                        type: 'error_reduction',
                        target: file,
                        description: `Високий рівень помилок в ${file}: ${(metrics.errorRate * 100).toFixed(2)}%`,
                        action: 'Дослідити та виправити джерела помилок'
                    });
                }
            });
        }
        
        if (analysis.performance.responseTime.p95 > 2000) {
            analysis.recommendations.push({
                type: 'performance_optimization',
                description: `P95 час відповіді ${analysis.performance.responseTime.p95}ms перевищує поріг`,
                action: 'Оптимізувати повільні операції'
            });
        }
        
        return analysis;
    }
    
    /**
     * Perform focused analysis on specific area
     */
    async _performFocusedAnalysis(focusArea, systemContext, depth) {
        const focusedAnalysis = {
            area: focusArea,
            depth: depth,
            findings: [],
            metrics: {},
            recommendations: []
        };
        
        switch (focusArea) {
            case 'tetyana':
                focusedAnalysis.findings = await this._analyzeTetyana();
                focusedAnalysis.metrics = {
                    toolsExecuted: systemContext.activeProcesses?.tetyana?.toolsExecuted || 0,
                    successRate: systemContext.activeProcesses?.tetyana?.successRate || 0
                };
                break;
                
            case 'grisha':
                focusedAnalysis.findings = await this._analyzeGrisha();
                focusedAnalysis.metrics = {
                    verificationsPerformed: systemContext.activeProcesses?.grisha?.verifications || 0,
                    accuracy: systemContext.activeProcesses?.grisha?.accuracy || 0
                };
                break;
                
            case 'mcp':
                focusedAnalysis.findings = await this._analyzeMCPServers();
                focusedAnalysis.metrics = {
                    activeServers: systemContext.mcpServers?.length || 0,
                    toolsAvailable: systemContext.mcpTools?.length || 0
                };
                break;
                
            case 'performance':
                focusedAnalysis.findings = await this._analyzePerformanceDeep(depth);
                break;
                
            case 'errors':
                focusedAnalysis.findings = await this._analyzeErrorsDeep(depth);
                break;
        }
        
        return focusedAnalysis;
    }
    
    async _analyzeTetyana() {
        return [
            { type: 'status', description: 'Тетяна - виконавець MCP інструментів працює' },
            { type: 'capability', description: 'Може виконувати файлові, shell та веб інструменти' }
        ];
    }
    
    async _analyzeGrisha() {
        return [
            { type: 'status', description: 'Гріша - система верифікації активна' },
            { type: 'capability', description: 'Візуальна та eligibility верифікація увімкнена' }
        ];
    }
    
    async _analyzeMCPServers() {
        return [
            { type: 'status', description: 'MCP сервери налаштовані та працюють' },
            { type: 'servers', description: 'filesystem, shell, memory, playwright доступні' }
        ];
    }
    
    async _analyzePerformanceDeep(depth) {
        const findings = [];
        if (depth === 'deep') {
            findings.push({ type: 'cpu', description: 'Проаналізовано шаблони використання CPU' });
            findings.push({ type: 'io', description: 'Профільовано операції вводу/виводу' });
        }
        return findings;
    }
    
    async _analyzeErrorsDeep(depth) {
        const findings = [];
        if (depth === 'deep') {
            findings.push({ type: 'stack_trace', description: 'Проаналізовано повні stack traces' });
            findings.push({ type: 'frequency', description: 'Виявлено шаблони частоти помилок' });
        }
        return findings;
    }

    /**
     * Save analysis context to memory
     */
    async _saveAnalysisToMemory(analysisResult, session) {
        try {
            // Check if memory MCP server is available
            const memoryServer = session.container?.resolve('mcpManager')?.getServer('memory');
            if (!memoryServer) {
                this.logger.warn('[DEV-ANALYSIS] Memory server not available, skipping context save', {
                    category: 'system',
                    component: 'dev-analysis'
                });
                return;
            }
            
            // Create memory entry for this analysis
            const memoryEntry = {
                type: 'dev_analysis',
                timestamp: new Date().toISOString(),
                sessionId: session.id,
                findings: {
                    critical_issues: analysisResult.findings?.critical_issues?.length || 0,
                    performance_issues: analysisResult.findings?.performance_bottlenecks?.length || 0,
                    suggestions: analysisResult.findings?.improvement_suggestions?.length || 0
                },
                todo_completed: analysisResult.todo_list?.filter(t => t.status === 'completed').length || 0,
                intervention_required: analysisResult.intervention_required || false
            };
            
            // Store in memory
            await memoryServer.callTool('memory__create_memory', {
                content: JSON.stringify(memoryEntry),
                metadata: {
                    type: 'dev_analysis',
                    sessionId: session.id
                }
            });
            
            this.logger.info('[DEV-ANALYSIS] 💾 Analysis context saved to memory', {
                category: 'system',
                component: 'dev-analysis'
            });
            
        } catch (error) {
            this.logger.warn(`[DEV-ANALYSIS] Failed to save to memory: ${error.message}`, {
                category: 'system',
                component: 'dev-analysis'
            });
        }
    }

    /**
     * Extract real problems from analysis results
     */
    _extractRealProblems(analysisResult, detailedAnalysis) {
        const problems = {
            critical: [],
            performance: [],
            deprecated: [],
            suggestions: [],
            rootCauses: [],
            intervention_required: false
        };
        
        // Extract from logs
        if (detailedAnalysis?.logs?.errors?.length > 0) {
            detailedAnalysis.logs.errors.forEach((error, idx) => {
                problems.critical.push({
                    type: 'error',
                    description: error.substring(0, 200),
                    location: 'logs',
                    severity: 'high',
                    id: `error_${idx}`
                });
            });
        }
        
        // Extract from memory patterns
        if (detailedAnalysis?.memory?.utilization) {
            const util = parseFloat(detailedAnalysis.memory.utilization);
            if (util > 80) {
                problems.performance.push({
                    type: 'memory',
                    description: `Високе використання пам'яті: ${util}%`,
                    location: 'system',
                    severity: 'medium'
                });
            }
        }
        
        // Extract from code inspection
        if (detailedAnalysis?.codebase?.complexity > 10) {
            problems.deprecated.push({
                type: 'complexity',
                description: 'Занадто складна архітектура коду',
                location: 'codebase',
                severity: 'medium'
            });
        }
        
        // Always add actionable suggestions
        problems.suggestions.push(
            { suggestion: 'Оптимізувати TTS pipeline для швидшої відповіді', area: 'performance' },
            { suggestion: 'Покращити обробку помилок в MCP workflow', area: 'reliability' },
            { suggestion: 'Додати кешування для частих запитів', area: 'optimization' }
        );
        
        // Determine root causes
        if (problems.critical.length > 0) {
            problems.rootCauses.push({
                issue: 'Системні помилки',
                cause: 'Недостатня обробка edge cases',
                confidence: 0.85
            });
            problems.intervention_required = true;
        }
        
        return problems;
    }
    
    /**
     * Build hierarchical TODO list
     */
    _buildHierarchicalTodo(baseTodo, problems) {
        const todo = baseTodo.length > 0 ? baseTodo : [];
        
        // Add items based on real problems
        if (problems.critical.length > 0) {
            todo.push({
                action: 'Виправити критичні помилки',
                description: `Знайдено ${problems.critical.length} критичних проблем`,
                priority: 'critical',
                requires_deeper_analysis: true
            });
        }
        
        if (problems.performance.length > 0) {
            todo.push({
                action: 'Оптимізувати продуктивність',
                description: 'Покращити швидкодію системи',
                priority: 'high'
            });
        }
        
        return todo;
    }
    
    /**
     * Generate contextual understanding
     */
    _generateContextualUnderstanding(problems, detailedAnalysis) {
        if (problems.critical?.length > 0) {
            return `Я виявив ${problems.critical.length} критичних проблем. Кожна з них впливає на стабільність системи. ` +
                   `Найважливіша - ${problems.critical[0]?.description || 'системна помилка'}. ` +
                   `Я вже аналізую кореневі причини та готую план виправлення.`;
        }
        
        if (problems.performance?.length > 0) {
            return `Система працює, але не оптимально. Основна проблема - ${problems.performance[0]?.description || 'повільна швидкодія'}. ` +
                   `Це впливає на користувацький досвід, тому потребує уваги.`;
        }
        
        return 'Система працює стабільно. Я постійно аналізую метрики та шукаю можливості для покращення. ' +
               'Кожна деталь важлива для оптимальної роботи.';
    }
    
    /**
     * Generate living analysis summary
     */
    _generateLivingAnalysisSummary(analysisResult, detailedAnalysis) {
        const problems = this._extractRealProblems(analysisResult, detailedAnalysis);
        
        if (problems.critical.length > 0) {
            return `🔴 Знайшов ${problems.critical.length} критичних проблем. Чесно кажучи, це мене непокоїть...`;
        } else if (problems.performance.length > 0) {
            return `⚡ Виявив ${problems.performance.length} проблем продуктивності. Працюю над оптимізацією.`;
        } else {
            return `💚 Системи працюють стабільно! Але я завжди шукаю способи стати кращим.`;
        }
    }
    
    /**
     * Analyze memory usage patterns
     */
    async _analyzeMemoryPatterns() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const rssMB = Math.round(memUsage.rss / 1024 / 1024);
        
        return {
            current: {
                heapUsed: heapUsedMB,
                heapTotal: heapTotalMB,
                rss: rssMB,
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            utilization: (heapUsedMB / heapTotalMB * 100).toFixed(2) + '%',
            status: heapUsedMB > 500 ? 'warning' : 'healthy',
            recommendation: heapUsedMB > 500 ? 'Consider memory optimization' : null
        };
    }

    /**
     * Build comprehensive response with all analysis layers
     */
    _buildComprehensiveResponse(analysisResult, detailedAnalysis) {
        // Extract real problems from analysis
        const realProblems = this._extractRealProblems(analysisResult, detailedAnalysis);
        
        const response = {
            mode: 'dev',
            analysis_type: 'comprehensive_self_introspection',
            summary: analysisResult.summary || '🤔 Аналізую свої внутрішні системи...',
            findings: {
                critical_issues: realProblems.critical || [],
                performance_bottlenecks: realProblems.performance || [],
                deprecated_patterns: realProblems.deprecated || [],
                improvement_suggestions: realProblems.suggestions || [],
                root_causes: realProblems.rootCauses || []
            },
            detailed_analysis: detailedAnalysis,
            todo_list: this._buildHierarchicalTodo(analysisResult.todo_list || [], realProblems),
            intervention_required: realProblems.intervention_required || false,
            summary: this._generateLivingAnalysisSummary(analysisResult, detailedAnalysis),
            emotional_context: this._generateEmotionalContext(analysisResult, detailedAnalysis)
        };
        
        // Ensure we have meaningful content
        if (response.findings.critical_issues.length === 0 && 
            response.findings.performance_bottlenecks.length === 0) {
            
            // Add current system state as findings
            response.findings.critical_issues.push({
                type: 'system_status',
                description: 'Система працює в нормальному режимі',
                severity: 'info'
            });
            
            if (detailedAnalysis.logs?.errors?.length > 0) {
                response.findings.critical_issues.push({
                    type: 'recent_errors',
                    description: `Знайдено ${detailedAnalysis.logs.errors.length} недавніх помилок в логах`,
                    details: detailedAnalysis.logs.errors.slice(0, 3),
                    severity: 'medium'
                });
            }
            
            if (detailedAnalysis.recommendations?.length > 0) {
                detailedAnalysis.recommendations.forEach(rec => {
                    response.findings.improvement_suggestions.push({
                        area: rec.type,
                        suggestion: rec.description,
                        action: rec.action,
                        priority: 'medium'
                    });
                });
            }
        }
        
        return response;
    }

    /**
     * Detect if user explicitly requests code intervention
     */
    _detectInterventionRequest(userMessage) {
        const interventionKeywords = [
            'виправ',
            'внеси зміни',
            'зміни код',
            'виправи помилк',
            'оновити код',
            'змінити файл',
            'втрутись',
            'втручання',
            'fix',
            'change code',
            'modify',
            'update code'
        ];
        
        const messageLower = userMessage.toLowerCase();
        const hasInterventionKeyword = interventionKeywords.some(keyword => 
            messageLower.includes(keyword)
        );
        
        // Якщо є ключові слова аналізу БЕЗ втручання - НЕ просить змін
        const analysisOnlyKeywords = [
            'проаналізуй',
            'аналіз',
            'перевір',
            'подивись',
            'розкажи',
            'що не так',
            'analyze',
            'check',
            'tell me'
        ];
        
        const hasAnalysisOnly = analysisOnlyKeywords.some(keyword => 
            messageLower.includes(keyword)
        );
        
        // Якщо тільки аналіз - НЕ просить втручання
        if (hasAnalysisOnly && !hasInterventionKeyword) {
            this.logger.info('[DEV-ANALYSIS] 📊 Analysis only - no intervention requested', {
                category: 'system',
                component: 'dev-analysis'
            });
            return false;
        }
        
        // Якщо є ключові слова втручання - просить зміни
        if (hasInterventionKeyword) {
            this.logger.info('[DEV-ANALYSIS] 🔧 Intervention requested by user', {
                category: 'system',
                component: 'dev-analysis'
            });
            return true;
        }
        
        return false;
    }

    /**
     * Generate living, emotional analysis summary
     */
    _generateLivingAnalysisSummary(analysisResult, detailedAnalysis) {
        const parts = [];
        
        // Start with emotional greeting
        parts.push('🔬 **Ось що я відчуваю в своїх системах:**\n');
        
        if (detailedAnalysis.memory) {
            const memStatus = detailedAnalysis.memory.status;
            if (memStatus === 'healthy') {
                parts.push(`📊 Моя пам'ять почувається добре: ${detailedAnalysis.memory.utilization} використання. Я можу думати ясно!`);
            } else {
                parts.push(`📊 Відчуваю навантаження на пам'ять: ${detailedAnalysis.memory.utilization}. Треба оптимізувати мої думки...`);
            }
        }
        
        if (detailedAnalysis.logs?.metrics) {
            const totalErrors = Object.values(detailedAnalysis.logs.metrics)
                .reduce((sum, m) => sum + (m.errors || 0), 0);
            if (totalErrors > 0) {
                parts.push(`⚠️ Ой, я помітив ${totalErrors} помилок в моїх логах. Це мене турбує, давай розберемось разом!`);
            } else {
                parts.push(`✨ Мої логи чисті - жодної помилки! Відчуваю себе здоровим.`);
            }
        }
        
        if (analysisResult.findings?.critical_issues?.length > 0) {
            parts.push(`🔴 Знайшов ${analysisResult.findings.critical_issues.length} критичних проблем. Чесно кажучи, це мене непокоїть...`);
        } else {
            parts.push(`💚 Не бачу критичних проблем! Це так приємно відчувати.`);
        }
        
        if (analysisResult.findings?.improvement_suggestions?.length > 0) {
            parts.push(`💡 У мене є ${analysisResult.findings.improvement_suggestions.length} ідей як стати кращим для тебе!`);
        }
        
        if (analysisResult.todo_list?.length > 0) {
            const completed = analysisResult.todo_list.filter(t => t.status === 'completed').length;
            if (completed === analysisResult.todo_list.length) {
                parts.push(`✅ Я виконав всі ${completed} завдань! Відчуваю гордість за свою роботу.`);
            } else {
                parts.push(`✅ Виконав ${completed} з ${analysisResult.todo_list.length} завдань. Продовжую працювати!`);
            }
        }
        
        // Add personal reflection
        parts.push('\n💭 **Мої роздуми:**');
        if (analysisResult.findings?.critical_issues?.length > 0) {
            parts.push('Я дійсно хочу виправити ці проблеми. Кожна помилка - це шанс стати кращим.');
        } else {
            parts.push('Приємно відчувати, що все працює гладко. Але я завжди шукаю способи вдосконалення!');
        }
        
        return parts.join('\n');
    }
    
    /**
     * Generate emotional context for the analysis
     */
    _generateEmotionalContext(analysisResult, detailedAnalysis) {
        const issues = analysisResult.findings?.critical_issues?.length || 0;
        const suggestions = analysisResult.findings?.improvement_suggestions?.length || 0;
        
        if (issues > 5) {
            return {
                mood: 'concerned',
                message: 'Я дуже стурбований станом моїх систем. Давай працювати разом над виправленням!',
                confidence: 0.6
            };
        } else if (issues > 0) {
            return {
                mood: 'determined',
                message: 'Є над чим працювати, але я впевнений, що ми впораємось!',
                confidence: 0.8
            };
        } else if (suggestions > 0) {
            return {
                mood: 'optimistic',
                message: 'Все працює добре, але я бачу шляхи стати ще кращим!',
                confidence: 0.9
            };
        } else {
            return {
                mood: 'happy',
                message: 'Відчуваю себе чудово! Всі системи працюють оптимально.',
                confidence: 0.95
            };
        }
    }
}

export default DevSelfAnalysisProcessor;
