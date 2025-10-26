/**
 * @fileoverview Chat Memory Eligibility Processor
 * Інтелектуально визначає чи потрібно використовувати довготривалу пам'ять в Chat режимі
 * 
 * BEST PRACTICES:
 * - Semantic analysis для виявлення memory triggers
 * - Context-aware decision making
 * - Minimal latency (fast LLM або rule-based)
 * - Smart caching для уникнення повторних викликів
 * 
 * @version 1.0.0
 * @date 2025-10-26
 */

import logger from '../../utils/logger.js';
import axios from 'axios';
import GlobalConfig from '../../../config/atlas-config.js';

/**
 * Chat Memory Eligibility Processor
 * Визначає чи потрібно завантажувати довготривалу пам'ять для відповіді в Chat режимі
 */
export class ChatMemoryEligibilityProcessor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.mcpManager - MCP Manager для доступу до Memory Server
     */
    constructor({ logger: loggerInstance, mcpManager }) {
        this.logger = loggerInstance || logger;
        this.mcpManager = mcpManager;
        
        // Cache для уникнення повторних LLM викликів
        this.decisionCache = new Map();
        this.cacheTimeout = 60000; // 1 хвилина
        
        // Statistics для моніторингу
        this.stats = {
            totalRequests: 0,
            memoryUsed: 0,
            memorySkipped: 0,
            cacheHits: 0,
            averageDecisionTime: 0
        };
    }

    /**
     * Виконати аналіз чи потрібна довготривала пам'ять
     * 
     * @param {Object} context - Context
     * @param {string} context.userMessage - User message
     * @param {Object} context.session - Session context
     * @param {Array} context.recentMessages - Recent conversation history
     * @returns {Promise<Object>} Decision result
     */
    async execute(context) {
        const startTime = Date.now();
        this.stats.totalRequests++;

        const { userMessage, session, recentMessages = [] } = context;

        this.logger.system('chat-memory', '[MEMORY-ELIGIBILITY] 🧠 Analyzing if long-term memory is needed...');

        try {
            // LAYER 1: Rule-based fast checks (0-1ms)
            const ruleBasedDecision = this._ruleBasedAnalysis(userMessage, recentMessages);
            
            if (ruleBasedDecision.confidence >= 0.9) {
                // High confidence rule-based decision - skip LLM
                this.logger.system('chat-memory', `[MEMORY-ELIGIBILITY] ✅ Rule-based decision: ${ruleBasedDecision.needsMemory ? 'USE' : 'SKIP'} memory (confidence: ${ruleBasedDecision.confidence})`);
                
                this._updateStats(startTime, ruleBasedDecision.needsMemory);
                
                return {
                    success: true,
                    needsMemory: ruleBasedDecision.needsMemory,
                    confidence: ruleBasedDecision.confidence,
                    reasoning: ruleBasedDecision.reasoning,
                    method: 'rule-based',
                    triggers: ruleBasedDecision.triggers,
                    decisionTime: Date.now() - startTime
                };
            }

            // LAYER 2: Cache check (1-2ms)
            const cacheKey = this._generateCacheKey(userMessage, recentMessages);
            const cachedDecision = this._getCachedDecision(cacheKey);
            
            if (cachedDecision) {
                this.stats.cacheHits++;
                this.logger.system('chat-memory', `[MEMORY-ELIGIBILITY] 💾 Cache hit - using cached decision`);
                
                this._updateStats(startTime, cachedDecision.needsMemory);
                
                return {
                    ...cachedDecision,
                    method: 'cached',
                    decisionTime: Date.now() - startTime
                };
            }

            // LAYER 3: LLM-based intelligent analysis (100-500ms)
            const llmDecision = await this._llmBasedAnalysis(userMessage, recentMessages, ruleBasedDecision);
            
            // Cache the decision
            this._cacheDecision(cacheKey, llmDecision);
            
            this._updateStats(startTime, llmDecision.needsMemory);
            
            this.logger.system('chat-memory', `[MEMORY-ELIGIBILITY] 🤖 LLM decision: ${llmDecision.needsMemory ? 'USE' : 'SKIP'} memory (confidence: ${llmDecision.confidence})`);
            
            return {
                success: true,
                ...llmDecision,
                method: 'llm',
                decisionTime: Date.now() - startTime
            };

        } catch (error) {
            this.logger.error(`[MEMORY-ELIGIBILITY] ❌ Analysis failed: ${error.message}`);
            
            // Fallback: skip memory on error (safer)
            return {
                success: true,
                needsMemory: false,
                confidence: 0.5,
                reasoning: 'Error in analysis, defaulting to skip memory',
                method: 'fallback',
                error: error.message,
                decisionTime: Date.now() - startTime
            };
        }
    }

    /**
     * LAYER 1: Rule-based analysis (швидкий, без LLM)
     * @private
     */
    _ruleBasedAnalysis(userMessage, recentMessages) {
        const messageLower = userMessage.toLowerCase();
        const triggers = [];
        let score = 0;

        // EXPLICIT MEMORY TRIGGERS (confidence 95%)
        const explicitTriggers = [
            { pattern: /пам'ятаєш|памятаєш|remember|recall/i, weight: 0.95, name: 'explicit_remember' },
            { pattern: /минулого разу|last time|previously|раніше/i, weight: 0.9, name: 'reference_past' },
            { pattern: /ти казав|ти говорив|you said|you told/i, weight: 0.9, name: 'reference_previous_statement' },
            { pattern: /наша розмова|our conversation|ми обговорювали|we discussed/i, weight: 0.85, name: 'reference_conversation' }
        ];

        for (const trigger of explicitTriggers) {
            if (trigger.pattern.test(messageLower)) {
                triggers.push(trigger.name);
                score = Math.max(score, trigger.weight);
            }
        }

        // IMPLICIT MEMORY TRIGGERS (confidence 70-80%)
        const implicitTriggers = [
            { pattern: /проєкт|project|система|system|архітектура|architecture/i, weight: 0.75, name: 'project_context' },
            { pattern: /налаштування|settings|preferences|вподобання/i, weight: 0.7, name: 'preferences' },
            { pattern: /як завжди|as usual|звичайно|typically/i, weight: 0.7, name: 'habitual_reference' },
            { pattern: /продовжуй|continue|далі|next/i, weight: 0.65, name: 'continuation' }
        ];

        for (const trigger of implicitTriggers) {
            if (trigger.pattern.test(messageLower)) {
                triggers.push(trigger.name);
                score = Math.max(score, trigger.weight);
            }
        }

        // SKIP MEMORY TRIGGERS (confidence 95%)
        const skipTriggers = [
            { pattern: /^(привіт|hi|hello|hey|добрий день)/i, weight: -0.95, name: 'greeting' },
            { pattern: /^(дякую|thanks|thank you|спасибі)/i, weight: -0.9, name: 'gratitude' },
            { pattern: /^(так|yes|ні|no|ok|okay|добре)/i, weight: -0.85, name: 'simple_affirmation' },
            { pattern: /що таке|what is|хто такий|who is|як працює|how does/i, weight: -0.7, name: 'general_question' }
        ];

        for (const trigger of skipTriggers) {
            if (trigger.pattern.test(messageLower)) {
                triggers.push(trigger.name);
                score = Math.min(score, trigger.weight);
            }
        }

        // CONTEXT ANALYSIS: Check recent messages
        if (recentMessages.length > 2) {
            const hasOngoingConversation = recentMessages.slice(-3).some(msg => 
                msg.content && msg.content.length > 50
            );
            
            if (hasOngoingConversation && score > 0) {
                score += 0.1; // Boost if ongoing conversation
                triggers.push('ongoing_conversation');
            }
        }

        // Normalize score to confidence
        const confidence = Math.abs(score);
        const needsMemory = score > 0;

        return {
            needsMemory,
            confidence,
            triggers,
            reasoning: needsMemory 
                ? `Detected memory triggers: ${triggers.join(', ')}`
                : `No memory needed - simple ${triggers[0] || 'chat'}`
        };
    }

    /**
     * LAYER 3: LLM-based intelligent analysis
     * @private
     */
    async _llmBasedAnalysis(userMessage, recentMessages, ruleBasedHint) {
        const prompt = this._buildMemoryEligibilityPrompt(userMessage, recentMessages, ruleBasedHint);
        
        // Use chat_memory_eligibility model (ultra fast AI21 Jamba 1.5 Mini)
        const modelConfig = GlobalConfig.MCP_MODEL_CONFIG?.getStageConfig('chat_memory_eligibility') || {
            model: 'atlas-ai21-jamba-1.5-mini',
            temperature: 0.1,
            max_tokens: 150
        };

        const apiEndpoint = GlobalConfig.MCP_MODEL_CONFIG?.apiEndpoint?.primary || 
                           'http://localhost:4000/v1/chat/completions';

        try {
            const response = await axios.post(apiEndpoint, {
                model: modelConfig.model,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user }
                ],
                temperature: modelConfig.temperature,
                max_tokens: modelConfig.max_tokens
            }, {
                timeout: 5000 // 5 second timeout for fast decision
            });

            const rawResponse = response.data.choices[0].message.content;
            return this._parseMemoryDecision(rawResponse);

        } catch (error) {
            this.logger.warn('chat-memory', `[MEMORY-ELIGIBILITY] LLM analysis failed: ${error.message}`);
            
            // Fallback to rule-based decision
            return {
                needsMemory: ruleBasedHint.needsMemory,
                confidence: Math.max(ruleBasedHint.confidence, 0.6),
                reasoning: `LLM failed, using rule-based decision: ${ruleBasedHint.reasoning}`,
                triggers: ruleBasedHint.triggers
            };
        }
    }

    /**
     * Build prompt for memory eligibility LLM
     * @private
     */
    _buildMemoryEligibilityPrompt(userMessage, recentMessages, ruleBasedHint) {
        const conversationContext = recentMessages.slice(-3).map(msg => 
            `${msg.role}: ${msg.content.substring(0, 100)}`
        ).join('\n');

        const system = `You are a memory eligibility analyzer. Determine if long-term memory is needed to answer the user's message.

RESPOND ONLY WITH JSON:
{"needs_memory": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}

USE MEMORY when:
- User references past conversations ("remember", "last time", "you said")
- User asks about preferences, settings, or project context
- User continues previous topic requiring context
- User asks "who am I" or personal questions

SKIP MEMORY when:
- Simple greetings (hi, hello, thanks)
- General knowledge questions (what is X, how does Y work)
- Simple affirmations (yes, no, ok)
- New unrelated topics

Rule-based hint: ${ruleBasedHint.reasoning}`;

        const user = `Recent conversation:
${conversationContext}

Current message: "${userMessage}"

Does this require long-term memory? Respond with JSON only.`;

        return { system, user };
    }

    /**
     * Parse LLM memory decision
     * @private
     */
    _parseMemoryDecision(rawResponse) {
        try {
            // Clean markdown
            let clean = rawResponse.trim()
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

            const parsed = JSON.parse(clean);

            return {
                needsMemory: !!parsed.needs_memory,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
                reasoning: parsed.reasoning || 'LLM decision',
                triggers: parsed.triggers || []
            };

        } catch (error) {
            this.logger.warn('chat-memory', `Failed to parse LLM response: ${error.message}`);
            
            // Fallback parsing
            const needsMemory = rawResponse.toLowerCase().includes('true') || 
                               rawResponse.toLowerCase().includes('needs_memory');
            
            return {
                needsMemory,
                confidence: 0.6,
                reasoning: 'Fallback parsing',
                triggers: []
            };
        }
    }

    /**
     * Generate cache key
     * @private
     */
    _generateCacheKey(userMessage, recentMessages) {
        // Simple hash based on message content and recent context
        const contextHash = recentMessages.slice(-2).map(m => m.content?.substring(0, 20)).join('|');
        return `${userMessage.substring(0, 50)}:${contextHash}`;
    }

    /**
     * Get cached decision
     * @private
     */
    _getCachedDecision(cacheKey) {
        const cached = this.decisionCache.get(cacheKey);
        
        if (!cached) return null;
        
        // Check if expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.decisionCache.delete(cacheKey);
            return null;
        }
        
        return cached.decision;
    }

    /**
     * Cache decision
     * @private
     */
    _cacheDecision(cacheKey, decision) {
        this.decisionCache.set(cacheKey, {
            decision,
            timestamp: Date.now()
        });

        // Cleanup old cache entries (keep last 50)
        if (this.decisionCache.size > 50) {
            const firstKey = this.decisionCache.keys().next().value;
            this.decisionCache.delete(firstKey);
        }
    }

    /**
     * Update statistics
     * @private
     */
    _updateStats(startTime, needsMemory) {
        const decisionTime = Date.now() - startTime;
        
        if (needsMemory) {
            this.stats.memoryUsed++;
        } else {
            this.stats.memorySkipped++;
        }

        // Update average decision time
        this.stats.averageDecisionTime = 
            (this.stats.averageDecisionTime * (this.stats.totalRequests - 1) + decisionTime) / 
            this.stats.totalRequests;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.decisionCache.size,
            cacheHitRate: this.stats.totalRequests > 0 
                ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            memoryUsageRate: this.stats.totalRequests > 0
                ? (this.stats.memoryUsed / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

export default ChatMemoryEligibilityProcessor;
