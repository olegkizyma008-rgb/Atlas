/**
 * @fileoverview Chat Memory Coordinator
 * Координує роботу довготривалої пам'яті в Chat режимі
 * 
 * ARCHITECTURE:
 * 1. Memory Eligibility Check (швидкий аналіз)
 * 2. Memory Retrieval (якщо потрібно)
 * 3. Context Injection (додавання до chat prompt)
 * 4. Memory Storage (збереження важливої інформації)
 * 
 * @version 1.0.0
 * @date 2025-10-26
 */

import logger from '../utils/logger.js';

/**
 * Chat Memory Coordinator
 * Управляє довготривалою пам'яттю в Chat режимі
 */
export class ChatMemoryCoordinator {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.mcpManager - MCP Manager
     * @param {Object} dependencies.memoryEligibilityProcessor - Memory Eligibility Processor
     */
    constructor({ logger: loggerInstance, mcpManager, memoryEligibilityProcessor }) {
        this.logger = loggerInstance || logger;
        this.mcpManager = mcpManager;
        this.memoryEligibilityProcessor = memoryEligibilityProcessor;
        
        // Cache для memory results
        this.memoryCache = new Map();
        this.cacheTTL = 300000; // 5 хвилин
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            memoryRetrievals: 0,
            memoryStorages: 0,
            cacheHits: 0,
            averageRetrievalTime: 0
        };
    }

    /**
     * Process chat message з інтеграцією довготривалої пам'яті
     * 
     * @param {Object} context - Context
     * @param {string} context.userMessage - User message
     * @param {Object} context.session - Session
     * @param {Array} context.recentMessages - Recent messages
     * @returns {Promise<Object>} Memory context для chat prompt
     */
    async processMessage(context) {
        const startTime = Date.now();
        this.stats.totalRequests++;

        const { userMessage, session, recentMessages = [] } = context;

        this.logger.system('chat-memory', '[CHAT-MEMORY] 🧠 Processing message with memory integration...');

        try {
            // CRITICAL FIX 30.10.2025: Check if processor is initialized
            if (!this.memoryEligibilityProcessor || typeof this.memoryEligibilityProcessor.execute !== 'function') {
                this.logger.warn('[CHAT-MEMORY] ⚠️ Memory eligibility processor not initialized - skipping memory');
                return {
                    success: true,
                    memoryUsed: false,
                    memoryContext: null,
                    reasoning: 'Memory processor not initialized',
                    processingTime: Date.now() - startTime
                };
            }
            
            // STEP 1: Check if memory is needed (fast)
            const eligibilityResult = await this.memoryEligibilityProcessor.execute({
                userMessage,
                session,
                recentMessages
            });

            if (!eligibilityResult.needsMemory) {
                this.logger.system('chat-memory', `[CHAT-MEMORY] ⏭️ Skipping memory (${eligibilityResult.reasoning})`);
                
                return {
                    success: true,
                    memoryUsed: false,
                    memoryContext: null,
                    reasoning: eligibilityResult.reasoning,
                    processingTime: Date.now() - startTime
                };
            }

            // STEP 2: Retrieve memory (if needed)
            this.logger.system('chat-memory', `[CHAT-MEMORY] 📚 Retrieving memory (confidence: ${eligibilityResult.confidence})...`);
            
            const memoryContext = await this._retrieveMemory({
                userMessage,
                triggers: eligibilityResult.triggers,
                recentMessages
            });

            this.stats.memoryRetrievals++;
            
            const processingTime = Date.now() - startTime;
            this._updateRetrievalTime(processingTime);

            this.logger.system('chat-memory', `[CHAT-MEMORY] ✅ Memory retrieved (${memoryContext.entities?.length || 0} entities, ${processingTime}ms)`);

            return {
                success: true,
                memoryUsed: true,
                memoryContext,
                reasoning: eligibilityResult.reasoning,
                confidence: eligibilityResult.confidence,
                processingTime
            };

        } catch (error) {
            this.logger.error(`[CHAT-MEMORY] ❌ Memory processing failed: ${error.message}`);
            
            // Fallback: continue without memory
            return {
                success: true,
                memoryUsed: false,
                memoryContext: null,
                reasoning: 'Memory processing failed, continuing without memory',
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Retrieve memory from MCP Memory Server
     * @private
     */
    async _retrieveMemory({ userMessage, triggers, recentMessages }) {
        // Check cache first
        const cacheKey = this._generateMemoryCacheKey(userMessage, triggers);
        const cached = this._getCachedMemory(cacheKey);
        
        if (cached) {
            this.stats.cacheHits++;
            this.logger.system('chat-memory', '[CHAT-MEMORY] 💾 Using cached memory');
            return cached;
        }

        // Get Memory MCP Server
        const memoryServer = this.mcpManager.servers.get('memory');
        
        if (!memoryServer || !memoryServer.ready) {
            this.logger.warn('chat-memory', '[CHAT-MEMORY] ⚠️ Memory MCP Server not available');
            return this._emptyMemoryContext();
        }

        try {
            // Build search query
            const searchQuery = this._buildSearchQuery(userMessage, triggers);
            
            this.logger.system('chat-memory', `[CHAT-MEMORY] 🔍 Searching memory: "${searchQuery}"`);

            // FIXED 2025-11-03: Call correct memory tool (search_nodes, not memory__search_nodes)
            const searchResult = await this._callMemoryTool('search_nodes', {
                query: searchQuery,
                limit: 10
            });

            // Parse and format results
            const memoryContext = this._formatMemoryContext(searchResult);
            
            // Cache the result
            this._cacheMemory(cacheKey, memoryContext);
            
            return memoryContext;

        } catch (error) {
            this.logger.error(`[CHAT-MEMORY] Memory retrieval error: ${error.message}`);
            return this._emptyMemoryContext();
        }
    }

    /**
     * Store important information to memory
     * 
     * @param {Object} context - Context
     * @param {string} context.userMessage - User message
     * @param {string} context.assistantResponse - Assistant response
     * @param {Object} context.session - Session
     * @returns {Promise<Object>} Storage result
     */
    async storeMemory(context) {
        const { userMessage, assistantResponse, session } = context;

        this.logger.system('chat-memory', '[CHAT-MEMORY] 💾 Analyzing if response should be stored...');

        try {
            // Analyze if this exchange is worth storing
            const shouldStore = this._shouldStoreExchange(userMessage, assistantResponse);
            
            if (!shouldStore.store) {
                this.logger.system('chat-memory', `[CHAT-MEMORY] ⏭️ Skipping storage (${shouldStore.reasoning})`);
                return { success: true, stored: false, reasoning: shouldStore.reasoning };
            }

            // Extract entities and observations
            const entities = this._extractEntities(userMessage, assistantResponse);
            
            if (entities.length === 0) {
                this.logger.system('chat-memory', '[CHAT-MEMORY] ⏭️ No entities to store');
                return { success: true, stored: false, reasoning: 'No entities extracted' };
            }

            // Store to Memory MCP
            await this._callMemoryTool('memory__create_entities', { entities });
            
            this.stats.memoryStorages++;
            
            this.logger.system('chat-memory', `[CHAT-MEMORY] ✅ Stored ${entities.length} entities to memory`);

            return {
                success: true,
                stored: true,
                entitiesCount: entities.length,
                reasoning: shouldStore.reasoning
            };

        } catch (error) {
            this.logger.error(`[CHAT-MEMORY] Memory storage error: ${error.message}`);
            return { success: false, stored: false, error: error.message };
        }
    }

    /**
     * Call Memory MCP tool
     * @private
     */
    async _callMemoryTool(toolName, parameters) {
        const memoryServer = this.mcpManager.servers.get('memory');
        
        if (!memoryServer || !memoryServer.ready) {
            throw new Error('Memory MCP Server not available');
        }

        // Find tool
        const tool = memoryServer.tools.find(t => t.name === toolName || t.name === toolName.replace('memory__', ''));
        
        if (!tool) {
            throw new Error(`Tool ${toolName} not found in Memory MCP Server`);
        }

        // Call tool via MCP protocol
        const result = await memoryServer.callTool(tool.name, parameters);
        
        return result;
    }

    /**
     * Build search query from user message and triggers
     * @private
     */
    _buildSearchQuery(userMessage, triggers) {
        // Extract key entities and topics
        const messageLower = userMessage.toLowerCase();
        
        // Common entities
        const entities = [];
        
        if (messageLower.includes('проєкт') || messageLower.includes('project')) {
            entities.push('project');
        }
        if (messageLower.includes('atlas')) {
            entities.push('Atlas');
        }
        if (messageLower.includes('налаштування') || messageLower.includes('settings') || messageLower.includes('preferences')) {
            entities.push('preferences');
        }
        
        // Use triggers as hints
        if (triggers.includes('project_context')) {
            entities.push('project architecture');
        }
        if (triggers.includes('preferences')) {
            entities.push('user preferences');
        }

        // Fallback to first meaningful words
        if (entities.length === 0) {
            const words = userMessage.split(' ').filter(w => w.length > 4).slice(0, 3);
            entities.push(...words);
        }

        return entities.join(' ');
    }

    /**
     * Format memory context for chat prompt
     * @private
     */
    _formatMemoryContext(searchResult) {
        if (!searchResult || !searchResult.content) {
            return this._emptyMemoryContext();
        }

        try {
            const data = typeof searchResult.content === 'string' 
                ? JSON.parse(searchResult.content) 
                : searchResult.content;

            const entities = data.nodes || data.entities || [];
            const relations = data.relations || [];

            // Format as readable context
            const contextText = this._formatEntitiesAsText(entities, relations);

            return {
                hasMemory: entities.length > 0,
                entities,
                relations,
                contextText,
                count: entities.length
            };

        } catch (error) {
            this.logger.warn('chat-memory', `Failed to parse memory result: ${error.message}`);
            return this._emptyMemoryContext();
        }
    }

    /**
     * Format entities as readable text
     * @private
     */
    _formatEntitiesAsText(entities, relations) {
        if (entities.length === 0) return '';

        const lines = ['📚 LONG-TERM MEMORY CONTEXT:', ''];
        
        for (const entity of entities.slice(0, 5)) { // Top 5 most relevant
            lines.push(`• ${entity.name} (${entity.entityType || 'entity'})`);
            
            if (entity.observations && entity.observations.length > 0) {
                entity.observations.slice(0, 3).forEach(obs => {
                    lines.push(`  - ${obs}`);
                });
            }
        }

        if (relations.length > 0) {
            lines.push('');
            lines.push('Connections:');
            relations.slice(0, 3).forEach(rel => {
                lines.push(`• ${rel.from} ${rel.relationType} ${rel.to}`);
            });
        }

        return lines.join('\n');
    }

    /**
     * Determine if exchange should be stored
     * @private
     */
    _shouldStoreExchange(userMessage, assistantResponse) {
        const messageLower = userMessage.toLowerCase();
        const responseLower = assistantResponse.toLowerCase();
        
        // CRITICAL: NEVER store prompts or system instructions
        if (responseLower.includes('you are atlas') || 
            responseLower.includes('system prompt') ||
            responseLower.includes('instructions:') ||
            responseLower.includes('critical rules') ||
            responseLower.includes('long-term memory context') ||
            responseLower.includes('📚 long-term memory')) {
            return { store: false, reasoning: 'System prompt or instructions - NEVER store' };
        }
        
        // Skip simple greetings and casual chat
        const casualPatterns = [
            'привіт', 'hello', 'hi', 'hey',
            'як справи', 'how are you', 'як ти',
            'дякую', 'thank', 'спасибі',
            'добре', 'fine', 'good',
            'котовий', 'кіт', 'cat'
        ];
        
        if (casualPatterns.some(pattern => messageLower.includes(pattern))) {
            return { store: false, reasoning: 'Casual conversation - not worth storing' };
        }
        
        // Store ONLY if user explicitly asks to remember
        if (messageLower.includes('запам\'ятай') || messageLower.includes('remember this') || 
            messageLower.includes('збережи') || messageLower.includes('save this')) {
            return { store: true, reasoning: 'Explicit storage request' };
        }

        // Store if discussing preferences or settings
        if (messageLower.includes('налаштування') || messageLower.includes('preferences') ||
            messageLower.includes('вподобання') || messageLower.includes('settings')) {
            return { store: true, reasoning: 'Preferences or settings discussion' };
        }

        // Store if discussing project architecture or decisions
        if ((messageLower.includes('проєкт') || messageLower.includes('project')) &&
            (messageLower.includes('архітектура') || messageLower.includes('architecture') ||
             messageLower.includes('рішення') || messageLower.includes('decision'))) {
            return { store: true, reasoning: 'Project architecture discussion' };
        }

        // DEFAULT: Do NOT store casual chat
        return { store: false, reasoning: 'Casual conversation - memory not needed' };
    }

    /**
     * Extract entities from conversation
     * @private
     */
    _extractEntities(userMessage, assistantResponse) {
        const entities = [];
        
        // CRITICAL: Filter out prompts and system content
        const responseLower = assistantResponse.toLowerCase();
        if (responseLower.includes('you are atlas') || 
            responseLower.includes('system prompt') ||
            responseLower.includes('instructions:') ||
            responseLower.includes('critical rules') ||
            responseLower.includes('📚 long-term memory')) {
            // NEVER extract entities from prompts
            return [];
        }
        
        // Simple entity extraction (can be enhanced with NLP)
        const messageLower = userMessage.toLowerCase();
        
        // Extract project mentions (but NOT from prompts)
        if (messageLower.includes('atlas') && !messageLower.includes('you are atlas')) {
            entities.push({
                name: 'Atlas Project',
                entityType: 'project',
                observations: [
                    `User discussed: ${userMessage.substring(0, 100)}`,
                    `Context: ${assistantResponse.substring(0, 100)}`
                ]
            });
        }

        // Extract preferences
        if (messageLower.includes('preferences') || messageLower.includes('налаштування')) {
            const prefMatch = userMessage.match(/prefer[s]?\s+(\w+)/i) || 
                            userMessage.match(/використовую\s+(\w+)/i);
            
            if (prefMatch) {
                entities.push({
                    name: `User Preference: ${prefMatch[1]}`,
                    entityType: 'preference',
                    observations: [`Extracted from: ${userMessage}`]
                });
            }
        }

        return entities;
    }

    /**
     * Empty memory context
     * @private
     */
    _emptyMemoryContext() {
        return {
            hasMemory: false,
            entities: [],
            relations: [],
            contextText: '',
            count: 0
        };
    }

    /**
     * Cache management
     * @private
     */
    _generateMemoryCacheKey(userMessage, triggers) {
        return `${userMessage.substring(0, 30)}:${triggers.join(',')}`;
    }

    _getCachedMemory(cacheKey) {
        const cached = this.memoryCache.get(cacheKey);
        
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheTTL) {
            this.memoryCache.delete(cacheKey);
            return null;
        }
        
        return cached.data;
    }

    _cacheMemory(cacheKey, data) {
        this.memoryCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        // Cleanup (keep last 20)
        if (this.memoryCache.size > 20) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }
    }

    /**
     * Update statistics
     * @private
     */
    _updateRetrievalTime(time) {
        this.stats.averageRetrievalTime = 
            (this.stats.averageRetrievalTime * (this.stats.memoryRetrievals - 1) + time) / 
            this.stats.memoryRetrievals;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.memoryCache.size,
            cacheHitRate: this.stats.totalRequests > 0 
                ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            memoryUsageRate: this.stats.totalRequests > 0
                ? (this.stats.memoryRetrievals / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

export default ChatMemoryCoordinator;
