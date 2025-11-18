/**
 * OPTIMIZED EXECUTOR
 * Replacement for executor-v3.js with API optimization integration
 * 
 * Features:
 * - Uses APIRequestOptimizer for all LLM calls
 * - Integrates with IntelligentRateLimiter
 * - Batch processing for system selections
 * - Eliminates redundant API calls
 * 
 * Created: 2025-11-13
 */

import logger from '../utils/logger.js';
import { apiOptimizer } from './api-request-optimizer.js';
import adaptiveThrottler from '../utils/adaptive-request-throttler.js';
import OptimizedWorkflowManager from './optimized-workflow-manager.js';
import GlobalConfig from '../../config/global-config.js';

export class OptimizedExecutor {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        this.apiOptimizer = apiOptimizer;
        this.rateLimiter = adaptiveThrottler;

        // Initialize optimized workflow manager
        this.workflowManager = new OptimizedWorkflowManager(container);

        // Performance tracking
        this.executionStats = {
            totalExecutions: 0,
            optimizedExecutions: 0,
            fallbackExecutions: 0,
            averageExecutionTime: 0,
            apiCallsSaved: 0
        };

        this.logger.info('[OPTIMIZED-EXECUTOR] 🚀 Optimized Executor initialized');
    }

    /**
     * MAIN EXECUTION METHOD
     * Replaces traditional executor workflow with optimized version
     */
    async executeWorkflow(userMessage, context = {}) {
        const startTime = Date.now();
        this.executionStats.totalExecutions++;

        try {
            // Enhanced context with optimization metadata
            const optimizedContext = {
                ...context,
                startTime: startTime,
                executorType: 'optimized',
                sessionId: context.sessionId || this._generateSessionId(),
                optimization: {
                    enabled: true,
                    batchRequests: true,
                    cacheEnabled: true
                }
            };

            this.logger.info('[OPTIMIZED-EXECUTOR] 🎯 Starting optimized workflow execution', {
                sessionId: optimizedContext.sessionId,
                messageLength: userMessage.length
            });

            // Use optimized workflow manager
            const result = await this.workflowManager.processOptimizedWorkflow(
                userMessage,
                optimizedContext
            );

            // Track optimization success
            this.executionStats.optimizedExecutions++;
            this.executionStats.apiCallsSaved += result.optimization?.requestsSaved || 0;

            // Update execution time
            const executionTime = Date.now() - startTime;
            this._updateExecutionTimeStats(executionTime);

            this.logger.info('[OPTIMIZED-EXECUTOR] ✅ Optimized execution completed', {
                mode: result.mode,
                executionTime: executionTime,
                requestsSaved: result.optimization?.requestsSaved || 0
            });

            return this._formatExecutionResult(result, executionTime);

        } catch (error) {
            this.logger.error('[OPTIMIZED-EXECUTOR] ❌ Optimized execution failed:', error.message);

            // Fallback to traditional execution
            return await this._fallbackExecution(userMessage, context, startTime);
        }
    }

    /**
     * OPTIMIZED MODE SELECTION
     * Uses batch processing instead of separate API calls
     */
    async optimizedModeSelection(userMessage, context = {}) {
        try {
            // Use batch system selection from API optimizer
            const batchResult = await this.apiOptimizer.batchSystemSelection(userMessage, context);

            return {
                mode: batchResult.mode,
                confidence: batchResult.modeConfidence,
                reasoning: batchResult.modeReasoning,
                selectedServers: batchResult.selectedServers,
                toolPlanning: batchResult.toolPlanning,
                optimized: true,
                requestsSaved: batchResult.optimization?.requests_saved || 2
            };

        } catch (error) {
            this.logger.warn('[OPTIMIZED-EXECUTOR] ⚠️ Batch selection failed, using fallback');

            // Fallback to individual mode selection
            return await this._fallbackModeSelection(userMessage, context);
        }
    }

    /**
     * OPTIMIZED CHAT EXECUTION
     */
    async executeOptimizedChat(userMessage, systemSelection, context) {
        const chatPrompt = this._buildChatPrompt(userMessage, context);

        // Use rate-limited API call
        const response = await this.rateLimiter.executeRequest(
            async () => {
                return await this.apiOptimizer.optimizedRequest('chat_completion', {
                    messages: chatPrompt,
                    model: 'atlas-gpt-4o-mini',
                    temperature: 0.7,
                    max_tokens: 1000
                });
            },
            {
                priority: this.rateLimiter.priorityLevels.HIGH,
                metadata: { type: 'chat', sessionId: context.sessionId }
            }
        );

        return {
            type: 'chat',
            response: response.choices?.[0]?.message?.content || 'No response generated',
            model: 'atlas-gpt-4o-mini',
            optimized: true,
            usage: response.usage
        };
    }

    /**
     * OPTIMIZED TASK EXECUTION
     */
    async executeOptimizedTask(userMessage, systemSelection, context) {
        const toolCalls = systemSelection.toolPlanning?.tool_calls || [];

        if (toolCalls.length === 0) {
            this.logger.warn('[OPTIMIZED-EXECUTOR] No tools planned, switching to chat');
            return await this.executeOptimizedChat(userMessage, systemSelection, context);
        }

        // Get MCP manager
        const mcpManager = this.container.resolve('mcpManager');

        // Execute tools with rate limiting
        const results = [];
        for (const toolCall of toolCalls) {
            try {
                const result = await this.rateLimiter.executeRequest(
                    async () => {
                        return await mcpManager.executeTool(
                            toolCall.server,
                            toolCall.tool,
                            toolCall.parameters
                        );
                    },
                    {
                        priority: this.rateLimiter.priorityLevels.HIGH,
                        metadata: {
                            type: 'mcp_tool',
                            tool: toolCall.tool,
                            server: toolCall.server
                        }
                    }
                );

                results.push({
                    tool: toolCall.tool,
                    server: toolCall.server,
                    success: true,
                    result: result
                });

            } catch (error) {
                this.logger.error('[OPTIMIZED-EXECUTOR] Tool execution failed:', error.message);
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
     * FALLBACK METHODS
     */
    async _fallbackExecution(userMessage, context, startTime) {
        this.executionStats.fallbackExecutions++;

        this.logger.info('[OPTIMIZED-EXECUTOR] 🔄 Using fallback execution');

        try {
            // Get traditional executor
            const traditionalExecutor = this.container.resolve('executor');

            const result = await traditionalExecutor.processWorkflow(userMessage, context);

            const executionTime = Date.now() - startTime;
            this._updateExecutionTimeStats(executionTime);

            return {
                ...result,
                optimized: false,
                fallback: true,
                executionTime: executionTime
            };

        } catch (error) {
            this.logger.error('[OPTIMIZED-EXECUTOR] ❌ Fallback execution also failed:', error.message);
            throw error;
        }
    }

    async _fallbackModeSelection(userMessage, context) {
        // Use traditional mode selection processor
        const modeProcessor = this.container.resolve('modeSelectionProcessor');

        const result = await modeProcessor.process({
            userMessage: userMessage,
            context: context
        });

        return {
            mode: result.mode || 'chat',
            confidence: result.confidence || 0.5,
            reasoning: result.reasoning || 'Fallback mode selection',
            optimized: false,
            fallback: true
        };
    }

    /**
     * UTILITY METHODS
     */
    _buildChatPrompt(userMessage, context) {
        const systemPrompt = `You are Atlas, an intelligent AI assistant. Respond naturally and helpfully.

Current context:
- Mode: Chat (optimized execution)
- Session: ${context.sessionId || 'new'}
- Language: Ukrainian (respond in Ukrainian)
- Optimization: Enabled

Provide a helpful, concise response to the user's message.`;

        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];
    }

    _formatExecutionResult(result, executionTime) {
        return {
            success: true,
            mode: result.mode,
            execution: result.execution,
            systemSelection: result.systemSelection,
            optimization: {
                enabled: true,
                executionTime: executionTime,
                requestsSaved: result.optimization?.requestsSaved || 0,
                batchEfficiency: result.optimization?.batchEfficiency || 0,
                cacheHits: this.apiOptimizer.getStats().cacheHits
            },
            metadata: {
                workflowId: result.workflowId,
                timestamp: new Date().toISOString(),
                executorVersion: 'optimized-v1.0'
            }
        };
    }

    _updateExecutionTimeStats(executionTime) {
        const currentAvg = this.executionStats.averageExecutionTime;
        const totalExecutions = this.executionStats.totalExecutions;

        this.executionStats.averageExecutionTime =
            (currentAvg * (totalExecutions - 1) + executionTime) / totalExecutions;
    }

    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * COMPATIBILITY METHOD
     * Provides backward compatibility with traditional executor interface
     */
    async processWorkflow(userMessage, context = {}) {
        return await this.executeWorkflow(userMessage, context);
    }

    /**
     * PUBLIC API
     */

    /**
     * Get executor statistics
     */
    getExecutorStats() {
        return {
            ...this.executionStats,
            optimizationRatio: this.executionStats.totalExecutions > 0
                ? this.executionStats.optimizedExecutions / this.executionStats.totalExecutions
                : 0,
            apiOptimizer: this.apiOptimizer.getStats(),
            rateLimiter: this.rateLimiter.getMetrics(),
            workflowManager: this.workflowManager.getOptimizationStats()
        };
    }

    /**
     * Health check
     */
    async getHealthStatus() {
        const apiHealth = await this.apiOptimizer.healthCheck();
        const rateLimiterHealth = this.rateLimiter.getHealthStatus();
        const workflowHealth = await this.workflowManager.healthCheck();

        const overallStatus = [apiHealth.status, rateLimiterHealth.status, workflowHealth.status]
            .includes('unhealthy') ? 'unhealthy' :
            [apiHealth.status, rateLimiterHealth.status, workflowHealth.status]
                .includes('degraded') ? 'degraded' : 'healthy';

        return {
            status: overallStatus,
            components: {
                apiOptimizer: apiHealth,
                rateLimiter: rateLimiterHealth,
                workflowManager: workflowHealth
            },
            stats: this.getExecutorStats()
        };
    }

    /**
     * Reset all optimization components
     */
    resetOptimization() {
        this.apiOptimizer.clearCache();
        this.rateLimiter.reset();
        this.workflowManager.clearOptimizationCache();

        // Reset local stats
        Object.keys(this.executionStats).forEach(key => {
            this.executionStats[key] = 0;
        });

        this.logger.info('[OPTIMIZED-EXECUTOR] 🔄 All optimization components reset');
    }
}

export default OptimizedExecutor;
