/**
 * API REQUEST OPTIMIZER
 * Intelligent batching and optimization system for API 4000 requests
 * 
 * Features:
 * - Batch system selections (mode + server + tools) in single request
 * - Request deduplication and intelligent caching
 * - Automatic request throttling and load balancing
 * - Fallback handling with model availability checking
 * 
 * Created: 2025-11-13
 * Author: Atlas System Optimization
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import GlobalConfig from '../../config/global-config.js';
import { EventEmitter } from 'events';

export class APIRequestOptimizer extends EventEmitter {
    constructor() {
        super();
        this.logger = logger;
        
        // Core configuration
        this.apiEndpoint = 'http://localhost:4000/v1';
        this.maxConcurrentRequests = 3;
        this.requestTimeout = 30000;
        
        // Batching system
        this.batchQueue = new Map();
        this.batchTimeout = 100; // ms to wait before processing batch
        this.maxBatchSize = 5;
        
        // Caching system
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
        
        // Request deduplication
        this.pendingRequests = new Map();
        
        // Statistics and monitoring
        this.stats = {
            totalRequests: 0,
            batchedRequests: 0,
            cacheHits: 0,
            duplicatesAvoided: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            requestsSaved: 0
        };
        
        // Active request tracking
        this.activeRequests = new Set();
        
        // Model availability cache
        this.modelCache = {
            models: null,
            lastUpdated: null,
            ttl: 300000 // 5 minutes
        };
        
        this.logger.info('[API-OPTIMIZER] 🚀 Intelligent API Request Optimizer initialized');
    }

    /**
     * MAIN OPTIMIZATION METHOD
     * Intelligently processes requests with batching, caching, and deduplication
     */
    async optimizedRequest(requestType, payload, options = {}) {
        const startTime = Date.now();
        this.stats.totalRequests++;
        
        const cacheKey = this._generateCacheKey(requestType, payload);
        
        try {
            // Step 1: Check cache first
            const cachedResult = this._getCachedResult(cacheKey);
            if (cachedResult) {
                this.stats.cacheHits++;
                this.logger.debug('[API-OPTIMIZER] 💾 Cache hit for', requestType);
                return cachedResult;
            }
            
            // Step 2: Check for duplicate pending requests
            if (this.pendingRequests.has(cacheKey)) {
                this.stats.duplicatesAvoided++;
                this.logger.debug('[API-OPTIMIZER] 🔄 Waiting for duplicate request', requestType);
                return await this.pendingRequests.get(cacheKey);
            }
            
            // Step 3: Determine if request can be batched
            if (this._canBatch(requestType)) {
                return await this._handleBatchedRequest(requestType, payload, options, cacheKey);
            }
            
            // Step 4: Execute single optimized request
            const requestPromise = this._executeSingleRequest(requestType, payload, options);
            this.pendingRequests.set(cacheKey, requestPromise);
            
            const result = await requestPromise;
            
            // Step 5: Cache successful results
            this._cacheResult(cacheKey, result);
            this.pendingRequests.delete(cacheKey);
            
            // Update statistics
            const responseTime = Date.now() - startTime;
            this._updateStats(responseTime);
            
            return result;
            
        } catch (error) {
            this.stats.failedRequests++;
            this.pendingRequests.delete(cacheKey);
            this.logger.error('[API-OPTIMIZER] ❌ Request failed:', error.message);
            throw error;
        }
    }

    /**
     * INTELLIGENT BATCH SYSTEM SELECTION
     * Combines mode selection, server selection, and tool planning in one request
     */
    async batchSystemSelection(userMessage, context = {}) {
        this.logger.info('[API-OPTIMIZER] 🎯 Starting batch system selection');
        
        const batchPrompt = this._buildBatchSelectionPrompt(userMessage, context);
        
        try {
            const response = await this.optimizedRequest('batch_system_selection', {
                messages: [{ role: 'user', content: batchPrompt }],
                model: this._selectOptimalModel('system_selection'),
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });
            
            const result = this._parseBatchSelectionResponse(response);
            this.stats.batchedRequests++;
            this.stats.requestsSaved += 2; // Saved mode + server selection requests
            
            this.logger.info('[API-OPTIMIZER] ✅ Batch selection completed', {
                mode: result.mode,
                servers: result.selectedServers?.length || 0,
                toolsPlanned: result.toolPlanning?.tool_calls?.length || 0
            });
            
            return result;
            
        } catch (error) {
            this.logger.error('[API-OPTIMIZER] ❌ Batch selection failed, falling back to sequential');
            return await this._fallbackSequentialSelection(userMessage, context);
        }
    }

    /**
     * OPTIMIZED MODEL AVAILABILITY CHECK
     * Cached and batched model availability checking
     */
    async getAvailableModels(forceRefresh = false) {
        const now = Date.now();
        
        // Return cached models if still valid
        if (!forceRefresh && 
            this.modelCache.models && 
            this.modelCache.lastUpdated && 
            (now - this.modelCache.lastUpdated) < this.modelCache.ttl) {
            
            this.stats.cacheHits++;
            return this.modelCache.models;
        }
        
        try {
            const response = await axios.get(`${this.apiEndpoint}/models`, {
                timeout: 5000
            });
            
            const models = response.data?.data || [];
            
            // Update cache
            this.modelCache = {
                models: models,
                lastUpdated: now,
                ttl: this.modelCache.ttl
            };
            
            this.logger.info('[API-OPTIMIZER] 📋 Updated model cache', { count: models.length });
            return models;
            
        } catch (error) {
            this.logger.error('[API-OPTIMIZER] ❌ Failed to fetch models:', error.message);
            
            // Return cached models if available, even if expired
            if (this.modelCache.models) {
                this.logger.warn('[API-OPTIMIZER] 🔄 Using expired model cache as fallback');
                return this.modelCache.models;
            }
            
            throw error;
        }
    }

    /**
     * SMART REQUEST THROTTLING
     * Prevents API overload with intelligent queuing
     */
    async throttledRequest(requestFn, priority = 5) {
        // Wait if too many concurrent requests
        while (this.activeRequests.size >= this.maxConcurrentRequests) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.activeRequests.add(requestId);
        
        try {
            const result = await requestFn();
            return result;
        } finally {
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * BUILD BATCH SELECTION PROMPT
     * Creates intelligent prompt for combined system selection
     */
    _buildBatchSelectionPrompt(userMessage, context) {
        return `You are an intelligent system selector for Atlas4. Analyze the user request and provide ALL selections in ONE response.

USER REQUEST: "${userMessage}"

CONTEXT:
- Previous mode: ${context.previousMode || 'none'}
- Available servers: filesystem, shell, playwright, applescript, memory, java_sdk, python_sdk
- Current session: ${context.sessionId || 'new'}

PROVIDE COMPLETE ANALYSIS IN JSON FORMAT:

{
  "mode_selection": {
    "mode": "chat|task|dev",
    "confidence": 0.95,
    "reasoning": "Why this mode was selected"
  },
  "server_selection": {
    "selected_servers": ["server1", "server2"],
    "reasoning": "Why these servers were selected",
    "confidence": 0.90
  },
  "tool_planning": {
    "tool_calls": [
      {
        "server": "filesystem",
        "tool": "filesystem__create_file",
        "parameters": {"path": "/example", "content": "example"}
      }
    ],
    "reasoning": "Step-by-step plan explanation"
  },
  "optimization_metadata": {
    "requests_saved": 2,
    "batch_efficiency": 0.85,
    "processing_time_estimate": "2-3 seconds"
  }
}

CRITICAL RULES:
1. ALWAYS provide all three selections (mode, server, tools)
2. Use EXACT server names from available list
3. Tool names must follow server__tool format
4. If task mode, provide concrete tool planning
5. If chat mode, tool_calls can be empty array
6. Confidence scores must be realistic (0.7-0.99)

Analyze and respond with complete JSON:`;
    }

    /**
     * PARSE BATCH SELECTION RESPONSE
     */
    _parseBatchSelectionResponse(response) {
        try {
            const content = response.choices?.[0]?.message?.content;
            if (!content) throw new Error('No response content');
            
            const parsed = JSON.parse(content);
            
            return {
                mode: parsed.mode_selection?.mode || 'chat',
                modeConfidence: parsed.mode_selection?.confidence || 0.5,
                modeReasoning: parsed.mode_selection?.reasoning || 'Default selection',
                
                selectedServers: parsed.server_selection?.selected_servers || [],
                serverReasoning: parsed.server_selection?.reasoning || 'No servers needed',
                serverConfidence: parsed.server_selection?.confidence || 0.5,
                
                toolPlanning: {
                    tool_calls: parsed.tool_planning?.tool_calls || [],
                    reasoning: parsed.tool_planning?.reasoning || 'No tools needed'
                },
                
                optimization: parsed.optimization_metadata || {
                    requests_saved: 2,
                    batch_efficiency: 0.8
                }
            };
            
        } catch (error) {
            this.logger.error('[API-OPTIMIZER] ❌ Failed to parse batch response:', error.message);
            throw new Error(`Batch selection parsing failed: ${error.message}`);
        }
    }

    /**
     * FALLBACK SEQUENTIAL SELECTION
     * When batch selection fails, use optimized sequential approach
     */
    async _fallbackSequentialSelection(userMessage, context) {
        this.logger.info('[API-OPTIMIZER] 🔄 Using fallback sequential selection');
        
        // Use existing processors but with optimization
        const modeResult = await this.optimizedRequest('mode_selection', {
            messages: [{ role: 'user', content: userMessage }],
            model: this._selectOptimalModel('mode_selection')
        });
        
        return {
            mode: modeResult.mode || 'chat',
            modeConfidence: modeResult.confidence || 0.5,
            selectedServers: [],
            toolPlanning: { tool_calls: [] },
            fallback: true
        };
    }

    /**
     * CACHE MANAGEMENT
     */
    _generateCacheKey(requestType, payload) {
        const keyData = {
            type: requestType,
            model: payload.model,
            messages: payload.messages?.map(m => m.content).join('|') || '',
            params: JSON.stringify(payload.parameters || {})
        };
        
        return `${requestType}_${this._hashString(JSON.stringify(keyData))}`;
    }

    _getCachedResult(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.result;
        }
        
        if (cached) {
            this.cache.delete(cacheKey); // Remove expired cache
        }
        
        return null;
    }

    _cacheResult(cacheKey, result) {
        this.cache.set(cacheKey, {
            result: result,
            timestamp: Date.now()
        });
        
        // Cleanup old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    /**
     * REQUEST EXECUTION
     */
    async _executeSingleRequest(requestType, payload, options) {
        const model = payload.model || this._selectOptimalModel(requestType);
        
        return await this.throttledRequest(async () => {
            try {
                const response = await axios.post(`${this.apiEndpoint}/chat/completions`, {
                    model: model,
                    messages: payload.messages,
                    temperature: payload.temperature || 0.1,
                    max_tokens: payload.max_tokens || 4000,
                    response_format: payload.response_format,
                    ...payload.parameters
                }, {
                    timeout: this.requestTimeout,
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: (status) => status < 500 // Don't throw on 4xx errors
                });
                
                if (response.status >= 400) {
                    throw new Error(`API returned ${response.status}: ${response.data?.error?.message || 'Unknown error'}`);
                }
                
                return response.data;
                
            } catch (error) {
                // Enhanced error handling with fallback
                if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
                    this.logger.warn('[API-OPTIMIZER] ⚠️ Primary API unavailable, attempting fallback');
                    
                    // Try alternative models or endpoints
                    const fallbackModels = await this._getFallbackModels();
                    for (const fallbackModel of fallbackModels) {
                        try {
                            const fallbackResponse = await axios.post(`${this.apiEndpoint}/chat/completions`, {
                                model: fallbackModel,
                                messages: payload.messages,
                                temperature: payload.temperature || 0.1,
                                max_tokens: Math.min(payload.max_tokens || 1000, 1000), // Reduce tokens for fallback
                                ...payload.parameters
                            }, {
                                timeout: 10000, // Shorter timeout for fallback
                                headers: { 'Content-Type': 'application/json' },
                                validateStatus: (status) => status < 500
                            });
                            
                            if (fallbackResponse.status < 400) {
                                this.logger.info('[API-OPTIMIZER] ✅ Fallback successful with model:', fallbackModel);
                                return fallbackResponse.data;
                            }
                        } catch (fallbackError) {
                            continue; // Try next fallback
                        }
                    }
                }
                
                throw error;
            }
        });
    }

    /**
     * BATCHING LOGIC
     */
    _canBatch(requestType) {
        const batchableTypes = [
            'mode_selection',
            'server_selection', 
            'tool_planning',
            'system_selection'
        ];
        
        return batchableTypes.includes(requestType);
    }

    async _handleBatchedRequest(requestType, payload, options, cacheKey) {
        // Add to batch queue
        if (!this.batchQueue.has(requestType)) {
            this.batchQueue.set(requestType, []);
        }
        
        const batch = this.batchQueue.get(requestType);
        batch.push({ payload, options, cacheKey });
        
        // Process batch if full or after timeout
        if (batch.length >= this.maxBatchSize) {
            return await this._processBatch(requestType);
        } else {
            // Set timeout to process batch
            setTimeout(() => {
                if (this.batchQueue.has(requestType) && this.batchQueue.get(requestType).length > 0) {
                    this._processBatch(requestType);
                }
            }, this.batchTimeout);
            
            // Return promise that resolves when batch is processed
            return new Promise((resolve, reject) => {
                const item = batch[batch.length - 1];
                item.resolve = resolve;
                item.reject = reject;
            });
        }
    }

    async _processBatch(requestType) {
        const batch = this.batchQueue.get(requestType) || [];
        if (batch.length === 0) return;
        
        this.batchQueue.delete(requestType);
        this.logger.info('[API-OPTIMIZER] 📦 Processing batch', { type: requestType, size: batch.length });
        
        try {
            // Execute batch request
            const results = await this._executeBatchRequest(requestType, batch);
            
            // Resolve individual promises
            batch.forEach((item, index) => {
                if (item.resolve) {
                    item.resolve(results[index]);
                }
            });
            
            this.stats.batchedRequests += batch.length;
            
        } catch (error) {
            // Reject all promises in batch
            batch.forEach(item => {
                if (item.reject) {
                    item.reject(error);
                }
            });
        }
    }

    async _executeBatchRequest(requestType, batch) {
        // For now, execute requests in parallel with throttling
        // Future: implement true batch API calls
        
        const promises = batch.map(item => 
            this._executeSingleRequest(requestType, item.payload, item.options)
        );
        
        return await Promise.all(promises);
    }

    /**
     * UTILITY METHODS
     */
    _selectOptimalModel(taskType) {
        const modelMap = {
            'mode_selection': 'atlas-mistral-small-2503',
            'system_selection': 'atlas-gpt-4o-mini',
            'tool_planning': 'atlas-gpt-4o-mini',
            'batch_system_selection': 'atlas-gpt-4o',
            'default': 'atlas-gpt-4o-mini'
        };
        
        return modelMap[taskType] || modelMap.default;
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    _updateStats(responseTime) {
        const currentAvg = this.stats.averageResponseTime;
        const totalRequests = this.stats.totalRequests;
        
        this.stats.averageResponseTime = 
            (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
    }

    /**
     * GET FALLBACK MODELS
     * Returns list of alternative models to try when primary fails
     */
    async _getFallbackModels() {
        try {
            const models = await this.getAvailableModels();
            const modelNames = models.map(m => m.id || m.name).filter(Boolean);
            
            // Prioritize smaller, more reliable models for fallback
            const fallbackPriority = [
                'atlas-gpt-4o-mini',
                'atlas-mistral-small-2503',
                'atlas-ministral-3b',
                'atlas-gpt-3.5-turbo'
            ];
            
            const availableFallbacks = fallbackPriority.filter(model => 
                modelNames.includes(model)
            );
            
            // Add any other available models as last resort
            const otherModels = modelNames.filter(model => 
                !fallbackPriority.includes(model) && 
                model.startsWith('atlas-')
            );
            
            return [...availableFallbacks, ...otherModels.slice(0, 3)];
            
        } catch (error) {
            this.logger.warn('[API-OPTIMIZER] ⚠️ Could not get fallback models:', error.message);
            return ['atlas-gpt-4o-mini', 'atlas-mistral-small-2503']; // Hardcoded fallback
        }
    }

    /**
     * PUBLIC API METHODS
     */
    
    /**
     * Get optimization statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            activeRequests: this.activeRequests.size,
            pendingRequests: this.pendingRequests.size,
            efficiencyRatio: this.stats.totalRequests > 0 
                ? (this.stats.cacheHits + this.stats.requestsSaved) / this.stats.totalRequests 
                : 0
        };
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        this.modelCache.models = null;
        this.modelCache.lastUpdated = null;
        this.logger.info('[API-OPTIMIZER] 🧹 Cache cleared');
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const models = await this.getAvailableModels();
            return {
                status: 'healthy',
                apiEndpoint: this.apiEndpoint,
                modelsAvailable: models.length,
                cacheSize: this.cache.size,
                activeRequests: this.activeRequests.size
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                apiEndpoint: this.apiEndpoint
            };
        }
    }
}

// Singleton instance
export const apiOptimizer = new APIRequestOptimizer();
export default apiOptimizer;
