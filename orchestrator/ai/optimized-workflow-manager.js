/**
 * OPTIMIZED WORKFLOW MANAGER
 * Integration layer between API Request Optimizer and existing workflow components
 * 
 * Features:
 * - Replaces sequential mode/server/tool selection with batch processing
 * - Integrates with existing processors while optimizing API calls
 * - Maintains backward compatibility with current workflow
 * - Eliminates redundant self-analysis requests
 * 
 * Created: 2025-11-13
 */

import logger from '../utils/logger.js';
import { apiOptimizer } from './api-request-optimizer.js';
import { EventEmitter } from 'events';

export class OptimizedWorkflowManager extends EventEmitter {
    constructor(container) {
        super();
        this.container = container;
        this.logger = logger;
        this.apiOptimizer = apiOptimizer;
        
        // Track active workflows to prevent duplicates
        this.activeWorkflows = new Map();
        
        // Self-analysis throttling
        this.lastSelfAnalysis = null;
        this.selfAnalysisThrottle = 300000; // 5 minutes
        
        // Request deduplication
        this.requestFingerprints = new Map();
        this.fingerprintTTL = 60000; // 1 minute
        
        this.logger.info('[OPTIMIZED-WORKFLOW] 🚀 Optimized Workflow Manager initialized');
    }

    /**
     * MAIN WORKFLOW OPTIMIZATION ENTRY POINT
     * Replaces traditional executor-v3.js workflow with optimized version
     */
    async processOptimizedWorkflow(userMessage, context = {}) {
        const workflowId = this._generateWorkflowId(userMessage, context);
        
        // Check for duplicate workflow
        if (this.activeWorkflows.has(workflowId)) {
            this.logger.info('[OPTIMIZED-WORKFLOW] 🔄 Duplicate workflow detected, returning existing');
            return await this.activeWorkflows.get(workflowId);
        }
        
        // Check request fingerprint for deduplication
        const fingerprint = this._generateRequestFingerprint(userMessage);
        const existingResult = this._checkRequestFingerprint(fingerprint);
        if (existingResult) {
            this.logger.info('[OPTIMIZED-WORKFLOW] 💾 Request fingerprint match, returning cached result');
            return existingResult;
        }
        
        const workflowPromise = this._executeOptimizedWorkflow(userMessage, context, workflowId);
        this.activeWorkflows.set(workflowId, workflowPromise);
        
        try {
            const result = await workflowPromise;
            
            // Cache result by fingerprint
            this._cacheRequestResult(fingerprint, result);
            
            return result;
            
        } finally {
            this.activeWorkflows.delete(workflowId);
        }
    }

    /**
     * EXECUTE OPTIMIZED WORKFLOW
     * Single batch request instead of multiple sequential requests
     */
    async _executeOptimizedWorkflow(userMessage, context, workflowId) {
        this.logger.info('[OPTIMIZED-WORKFLOW] 🎯 Starting optimized workflow', { workflowId });
        
        try {
            // Step 1: Batch system selection (replaces stages 0, 1, 2.1)
            const systemSelection = await this.apiOptimizer.batchSystemSelection(userMessage, {
                ...context,
                workflowId: workflowId,
                previousMode: context.mode,
                sessionId: context.sessionId
            });
            
            this.logger.info('[OPTIMIZED-WORKFLOW] ✅ Batch selection completed', {
                mode: systemSelection.mode,
                servers: systemSelection.selectedServers?.length || 0,
                tools: systemSelection.toolPlanning?.tool_calls?.length || 0,
                requestsSaved: systemSelection.optimization?.requests_saved || 0
            });
            
            // Step 2: Execute based on mode with optimization
            let executionResult;
            
            switch (systemSelection.mode) {
                case 'chat':
                    executionResult = await this._optimizedChatExecution(userMessage, systemSelection, context);
                    break;
                    
                case 'task':
                    executionResult = await this._optimizedTaskExecution(userMessage, systemSelection, context);
                    break;
                    
                case 'dev':
                    executionResult = await this._optimizedDevExecution(userMessage, systemSelection, context);
                    break;
                    
                default:
                    this.logger.warn('[OPTIMIZED-WORKFLOW] ⚠️ Unknown mode, defaulting to chat');
                    executionResult = await this._optimizedChatExecution(userMessage, systemSelection, context);
            }
            
            return {
                workflowId: workflowId,
                mode: systemSelection.mode,
                systemSelection: systemSelection,
                execution: executionResult,
                optimization: {
                    requestsSaved: systemSelection.optimization?.requests_saved || 0,
                    batchEfficiency: systemSelection.optimization?.batch_efficiency || 0,
                    processingTime: Date.now() - context.startTime
                }
            };
            
        } catch (error) {
            this.logger.error('[OPTIMIZED-WORKFLOW] ❌ Workflow failed:', error.message);
            
            // Fallback to traditional workflow
            return await this._fallbackTraditionalWorkflow(userMessage, context);
        }
    }

    /**
     * OPTIMIZED CHAT EXECUTION
     * Direct response with minimal API calls
     */
    async _optimizedChatExecution(userMessage, systemSelection, context) {
        this.logger.info('[OPTIMIZED-WORKFLOW] 💬 Executing optimized chat mode');
        
        // Check if this is inappropriate self-analysis request
        if (this._isInappropriateSelfAnalysis(userMessage, context)) {
            return {
                type: 'chat',
                response: this._generateSelfAnalysisThrottleResponse(),
                blocked: true,
                reason: 'Self-analysis throttled to prevent spam'
            };
        }
        
        // Use optimized API call for chat response
        const chatResponse = await this.apiOptimizer.optimizedRequest('chat_completion', {
            messages: [
                { role: 'system', content: this._getChatSystemPrompt(context) },
                { role: 'user', content: userMessage }
            ],
            model: 'atlas-gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 1000
        });
        
        return {
            type: 'chat',
            response: chatResponse.choices?.[0]?.message?.content || 'No response generated',
            model: 'atlas-gpt-4o-mini',
            optimized: true
        };
    }

    /**
     * OPTIMIZED TASK EXECUTION
     * Uses pre-planned tools from batch selection
     */
    async _optimizedTaskExecution(userMessage, systemSelection, context) {
        this.logger.info('[OPTIMIZED-WORKFLOW] ⚙️ Executing optimized task mode');
        
        const toolCalls = systemSelection.toolPlanning?.tool_calls || [];
        
        if (toolCalls.length === 0) {
            this.logger.warn('[OPTIMIZED-WORKFLOW] ⚠️ No tools planned, falling back to chat');
            return await this._optimizedChatExecution(userMessage, systemSelection, context);
        }
        
        // Get MCP manager from container
        const mcpManager = this.container.resolve('mcpManager');
        
        // Execute tools with optimization
        const results = [];
        for (const toolCall of toolCalls) {
            try {
                const result = await mcpManager.executeTool(
                    toolCall.server,
                    toolCall.tool,
                    toolCall.parameters
                );
                
                results.push({
                    tool: toolCall.tool,
                    server: toolCall.server,
                    success: true,
                    result: result
                });
                
            } catch (error) {
                this.logger.error('[OPTIMIZED-WORKFLOW] ❌ Tool execution failed:', error.message);
                results.push({
                    tool: toolCall.tool,
                    server: toolCall.server,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return {
            type: 'task',
            toolsExecuted: results.length,
            successfulTools: results.filter(r => r.success).length,
            results: results,
            optimized: true
        };
    }

    /**
     * OPTIMIZED DEV EXECUTION
     * Throttled self-analysis with intelligent caching
     */
    async _optimizedDevExecution(userMessage, systemSelection, context) {
        this.logger.info('[OPTIMIZED-WORKFLOW] 🔬 Executing optimized dev mode');
        
        // Check self-analysis throttling
        if (this._shouldThrottleSelfAnalysis()) {
            return {
                type: 'dev',
                response: this._generateSelfAnalysisThrottleResponse(),
                throttled: true,
                nextAllowedTime: this.lastSelfAnalysis + this.selfAnalysisThrottle
            };
        }
        
        // Get dev processor from container
        const devProcessor = this.container.resolve('devSelfAnalysisProcessor');
        
        // Execute with optimization
        const analysisResult = await devProcessor.process({
            userMessage: userMessage,
            context: context,
            optimized: true
        });
        
        // Update throttling
        this.lastSelfAnalysis = Date.now();
        
        return {
            type: 'dev',
            analysis: analysisResult,
            optimized: true,
            throttled: false
        };
    }

    /**
     * REQUEST DEDUPLICATION SYSTEM
     */
    _generateRequestFingerprint(userMessage) {
        // Create fingerprint based on message content and timing
        const normalized = userMessage.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Group similar requests within time window
        const timeWindow = Math.floor(Date.now() / 30000); // 30-second windows
        
        return `${this._hashString(normalized)}_${timeWindow}`;
    }

    _checkRequestFingerprint(fingerprint) {
        const cached = this.requestFingerprints.get(fingerprint);
        if (cached && (Date.now() - cached.timestamp) < this.fingerprintTTL) {
            return cached.result;
        }
        
        if (cached) {
            this.requestFingerprints.delete(fingerprint);
        }
        
        return null;
    }

    _cacheRequestResult(fingerprint, result) {
        this.requestFingerprints.set(fingerprint, {
            result: result,
            timestamp: Date.now()
        });
        
        // Cleanup old fingerprints
        if (this.requestFingerprints.size > 50) {
            const oldestKey = this.requestFingerprints.keys().next().value;
            this.requestFingerprints.delete(oldestKey);
        }
    }

    /**
     * SELF-ANALYSIS THROTTLING
     */
    _isInappropriateSelfAnalysis(userMessage, context) {
        const selfAnalysisKeywords = [
            'проаналізуй себе', 'analyze yourself', 'виправ себе', 'fix yourself',
            'перевір себе', 'check yourself', 'твої помилки', 'your errors'
        ];
        
        const hasKeywords = selfAnalysisKeywords.some(keyword => 
            userMessage.toLowerCase().includes(keyword.toLowerCase())
        );
        
        return hasKeywords && this._shouldThrottleSelfAnalysis();
    }

    _shouldThrottleSelfAnalysis() {
        if (!this.lastSelfAnalysis) return false;
        
        const timeSinceLastAnalysis = Date.now() - this.lastSelfAnalysis;
        return timeSinceLastAnalysis < this.selfAnalysisThrottle;
    }

    _generateSelfAnalysisThrottleResponse() {
        const timeRemaining = Math.ceil(
            (this.lastSelfAnalysis + this.selfAnalysisThrottle - Date.now()) / 60000
        );
        
        return `Я нещодавно проводив самоаналіз. Щоб уникнути надмірного навантаження на систему, ` +
               `наступний аналіз буде доступний через ${timeRemaining} хвилин. ` +
               `Поки що можу відповісти на інші питання або допомогти з завданнями.`;
    }

    /**
     * FALLBACK TO TRADITIONAL WORKFLOW
     */
    async _fallbackTraditionalWorkflow(userMessage, context) {
        this.logger.warn('[OPTIMIZED-WORKFLOW] 🔄 Falling back to traditional workflow');
        
        // Get executor from container
        const executor = this.container.resolve('executor');
        
        return await executor.processWorkflow(userMessage, context);
    }

    /**
     * UTILITY METHODS
     */
    _generateWorkflowId(userMessage, context) {
        const timestamp = Date.now();
        const messageHash = this._hashString(userMessage.substring(0, 50));
        const sessionId = context.sessionId || 'default';
        
        return `workflow_${sessionId}_${messageHash}_${timestamp}`;
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    _getChatSystemPrompt(context) {
        return `You are Atlas, an intelligent AI assistant. Respond naturally and helpfully to the user's message. 
        
Current context:
- Mode: Chat (optimized)
- Session: ${context.sessionId || 'new'}
- Language: Ukrainian (respond in Ukrainian)

Be concise but informative. If the user asks about system analysis or fixes, explain that such operations are throttled to prevent system overload.`;
    }

    /**
     * HEALTH CHECK
     */
    async healthCheck() {
        try {
            const apiHealth = await this.apiOptimizer.healthCheck();
            const activeWorkflows = this.activeWorkflows.size;
            const cacheSize = this.requestFingerprints.size;
            
            const status = apiHealth.status === 'healthy' && activeWorkflows < 10 ? 'healthy' : 'degraded';
            
            return {
                status: status,
                activeWorkflows: activeWorkflows,
                cacheSize: cacheSize,
                apiOptimizer: apiHealth,
                lastCheck: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
        }
    }

    /**
     * CLEAR OPTIMIZATION CACHE
     */
    clearOptimizationCache() {
        this.requestFingerprints.clear();
        this.activeWorkflows.clear();
        this.lastSelfAnalysis = null;
        
        this.logger.info('[OPTIMIZED-WORKFLOW] 🧹 Optimization cache cleared');
    }

    /**
     * PUBLIC API METHODS
     */
    
    /**
     * Get optimization statistics
     */
    getOptimizationStats() {
        return {
            ...this.apiOptimizer.getStats(),
            activeWorkflows: this.activeWorkflows.size,
            cachedFingerprints: this.requestFingerprints.size,
            lastSelfAnalysis: this.lastSelfAnalysis,
            selfAnalysisThrottleRemaining: this.lastSelfAnalysis 
                ? Math.max(0, this.lastSelfAnalysis + this.selfAnalysisThrottle - Date.now())
                : 0
        };
    }

    /**
     * Force clear all caches and throttles
     */
    clearOptimizationCache() {
        this.apiOptimizer.clearCache();
        this.requestFingerprints.clear();
        this.activeWorkflows.clear();
        this.lastSelfAnalysis = null;
        
        this.logger.info('[OPTIMIZED-WORKFLOW] 🧹 All optimization caches cleared');
    }

    /**
     * Health check
     */
    async healthCheck() {
        const apiHealth = await this.apiOptimizer.healthCheck();
        
        return {
            status: apiHealth.status === 'healthy' ? 'healthy' : 'degraded',
            apiOptimizer: apiHealth,
            activeWorkflows: this.activeWorkflows.size,
            memoryUsage: {
                fingerprints: this.requestFingerprints.size,
                workflows: this.activeWorkflows.size
            }
        };
    }
}

export default OptimizedWorkflowManager;
