/**
 * INTELLIGENT INTENT DETECTOR
 * Розуміє що користувач хоче, не тільки по ключових словах
 * 
 * Created: 2025-11-03
 * Purpose: Замінити примітивний pattern matching на справжнє розуміння
 */

import axios from 'axios';
import logger from '../../utils/logger.js';
import GlobalConfig from '../../../config/index.js';
import modelChecker from '../../ai/model-availability-checker.js';

export class IntentDetector {
    constructor() {
        this.logger = logger;
        this.apiEndpoint = null;
        this.modelConfig = null;
        this._ensureConfig();
    }
    
    /**
     * Ensure configuration is loaded
     */
    _ensureConfig() {
        if (!this.modelConfig) {
            const apiConfig = GlobalConfig.MCP_MODEL_CONFIG?.apiEndpoint;
            
            if (!apiConfig || typeof apiConfig !== 'object') {
                this.logger.warn('[INTENT-DETECTOR] API config not found, using fallback');
                this.apiEndpoint = 'http://localhost:4000/v1/chat/completions';
            } else {
                this.apiEndpoint = (apiConfig.useFallback && apiConfig.fallback)
                    ? apiConfig.fallback
                    : (apiConfig.primary || 'http://localhost:4000/v1/chat/completions');
            }
            
            // Get model config from MCP_MODEL_CONFIG
            this.modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('intent_detection');
            
            // Fallback if config not found
            if (!this.modelConfig) {
                this.logger.warn('[INTENT-DETECTOR] Stage config not found, using default');
                this.modelConfig = {
                    model: 'atlas-ministral-3b',
                    temperature: 0.1,
                    max_tokens: 150
                };
            }
            
            this.logger.info('[INTENT-DETECTOR] Initialized with model: ' + this.modelConfig.model, {
                temperature: this.modelConfig.temperature,
                max_tokens: this.modelConfig.max_tokens
            });
        }
    }
    
    /**
     * ДВОХРІВНЕВА ДЕТЕКЦІЯ INTENT
     * Level 1: Швидкий keyword matching (0.1ms)
     * Level 2: LLM розуміння контексту (200-500ms)
     */
    async detectInterventionIntent(userMessage, analysisContext = {}) {
        const startTime = Date.now();
        
        // LEVEL 1: Швидкий keyword matching
        const keywordResult = this._detectKeywords(userMessage);
        if (keywordResult.detected) {
            this.logger.info('[INTENT-DETECTOR] ⚡ Detected via keywords', {
                confidence: keywordResult.confidence,
                duration: Date.now() - startTime
            });
            return keywordResult;
        }
        
        // LEVEL 2: LLM intent analysis (тільки якщо є проблеми)
        const hasCriticalIssues = (analysisContext.criticalIssues || 0) > 0;
        const hasPerformanceIssues = (analysisContext.performanceIssues || 0) > 0;
        
        if (hasCriticalIssues || hasPerformanceIssues) {
            this.logger.info('[INTENT-DETECTOR] 🧠 Using LLM for semantic understanding');
            
            const llmResult = await this._detectLLMIntent(userMessage, analysisContext);
            
            this.logger.info('[INTENT-DETECTOR] LLM result', {
                detected: llmResult.detected,
                confidence: llmResult.confidence,
                reasoning: llmResult.reasoning,
                duration: Date.now() - startTime
            });
            
            // FIXED 03.11.2025: Якщо LLM fallback, повертаємо keyword результат
            if (llmResult.method === 'llm-fallback' && keywordResult.detected) {
                this.logger.info('[INTENT-DETECTOR] ✅ LLM failed, using keyword result as fallback', {
                    keyword: keywordResult.matchedPattern,
                    confidence: keywordResult.confidence
                });
                return keywordResult;
            }
            
            return llmResult;
        }
        
        // No intervention needed
        return {
            detected: false,
            method: 'none',
            confidence: 0,
            reasoning: 'No intervention keywords and no critical issues'
        };
    }
    
    /**
     * LEVEL 1: Швидка детекція по ключових словах
     */
    _detectKeywords(userMessage) {
        const msg = userMessage.toLowerCase();
        
        const interventionPatterns = [
            // Пряме виправлення
            { pattern: /\b(виправ|fix|repair|полагодь)\b/i, confidence: 0.95 },
            { pattern: /\b(виправ себе|fix yourself|repair yourself)\b/i, confidence: 0.99 },
            
            // FIXED 2025-11-03: Додано "приступай до виправлення" (без \b після групи)
            { pattern: /(приступ|proceed|розпочин|start|почн).*(виправ|fix|ліку|heal)/i, confidence: 0.97 },
            { pattern: /(приступай|починай)/i, confidence: 0.92 },
            
            // Зміни коду
            { pattern: /\b(зміни|change|модифік|modify|оновити|update)\b.*\b(код|code|себе|yourself)\b/i, confidence: 0.90 },
            
            // Само-лікування
            { pattern: /\b(вилікуй|heal|самолікування|self-heal)\b/i, confidence: 0.92 },
            { pattern: /\b(само виправ|self-repair|само-виправлення)\b/i, confidence: 0.95 },
            
            // Покращення
            { pattern: /\b(вдосконал|improve|покращ|enhance)\b.*\b(себе|yourself)\b/i, confidence: 0.88 },
            
            // Застосування змін
            { pattern: /\b(внести зміни|apply changes|apply fixes|застосуй)\b/i, confidence: 0.93 },
            
            // Рефакторинг
            { pattern: /\b(рефактор|refactor)\b.*\b(себе|yourself|свій код|your code)\b/i, confidence: 0.85 }
        ];
        
        for (const { pattern, confidence } of interventionPatterns) {
            if (pattern.test(msg)) {
                const match = msg.match(pattern);
                return {
                    detected: true,
                    method: 'keyword',
                    confidence: confidence,
                    matchedPattern: match[0],
                    reasoning: `Matched keyword pattern: "${match[0]}"`
                };
            }
        }
        
        return { detected: false, method: 'keyword', confidence: 0 };
    }
    
    /**
     * LEVEL 2: LLM семантичне розуміння
     */
    async _detectLLMIntent(userMessage, analysisContext) {
        try {
            const prompt = this._buildIntentPrompt(userMessage, analysisContext);
            
            // ADDED 2025-11-08: Use axios with fallback on any error
            let response;
            let usedModel = this.modelConfig.model;
            
            try {
                response = await axios.post(this.apiEndpoint, {
                    model: usedModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: this.modelConfig.temperature,
                    max_tokens: this.modelConfig.max_tokens,
                    response_format: { type: 'json_object' }
                }, {
                    timeout: 10000
                });
            } catch (primaryError) {
                this.logger.warn('[INTENT-DETECTOR] Primary model failed, trying alternatives');
                
                // FIXED 2025-11-10: Use cached fetchAvailableModels instead of direct GET /v1/models
                const apiModels = await modelChecker.fetchAvailableModels();
                
                if (!apiModels || apiModels.length === 0) {
                    throw new Error('No models available from API');
                }
                
                // CRITICAL 2025-11-10: Limit to first 5 models to prevent burst
                const modelsToTry = apiModels.slice(0, 5).map(m => m.id);
                this.logger.info(`[INTENT-DETECTOR] Checking ${modelsToTry.length} models (limited from ${apiModels.length})`);
                
                for (const altModel of modelsToTry) {
                    if (altModel === usedModel) continue;
                    
                    const modelResult = await modelChecker.getAvailableModel(altModel, null, 'intent');
                    if (modelResult.available) {
                        usedModel = altModel;
                        response = await axios.post(this.apiEndpoint, {
                            model: usedModel,
                            messages: [{ role: 'user', content: prompt }],
                            temperature: this.modelConfig.temperature,
                            max_tokens: this.modelConfig.max_tokens,
                            response_format: { type: 'json_object' }
                        }, {
                            timeout: 10000
                        });
                        break;
                    }
                }
                
                if (!response) throw primaryError;
            }
            
            const data = response.data;
            const content = data.choices?.[0]?.message?.content;
            
            if (!content) {
                throw new Error('Empty LLM response');
            }
            
            const intent = JSON.parse(content);
            
            return {
                detected: intent.wants_intervention && intent.confidence >= 70,
                method: 'llm',
                confidence: intent.confidence / 100,
                reasoning: intent.reasoning,
                semanticUnderstanding: intent.semantic_understanding
            };
            
        } catch (error) {
            this.logger.warn('[INTENT-DETECTOR] LLM detection failed, fallback to false', {
                error: error.message
            });
            return {
                detected: false,
                method: 'llm-fallback',
                confidence: 0,
                reasoning: `LLM error: ${error.message}`
            };
        }
    }
    
    /**
     * Build prompt for LLM intent detection
     */
    _buildIntentPrompt(userMessage, analysisContext) {
        return `Аналізуй чи користувач просить Atlas виправити себе (code intervention).

USER MESSAGE: "${userMessage}"

CONTEXT:
- Знайдено ${analysisContext.criticalIssues || 0} критичних проблем
- Знайдено ${analysisContext.performanceIssues || 0} проблем продуктивності
- Система має ${analysisContext.suggestions || 0} рекомендацій для покращення

ТВОЄ ЗАВДАННЯ:
Визнач чи користувач просить Atlas виправити себе (внести зміни в код).

ПРИКЛАДИ "wants_intervention = true":
- "Виправ себе"
- "Зроби себе кращим"
- "Усунь ці баги"
- "Протестуй і виправ проблеми"
- "Покращ свою роботу"
- "Оптимізуй себе"

ПРИКЛАДИ "wants_intervention = false":
- "Як ти працюєш?"
- "Покажи мені статистику"
- "Проаналізуй себе" (тільки аналіз, без виправлення)
- "Який у тебе стан?"

Відповідь ТІЛЬКИ valid JSON:
{
  "wants_intervention": true/false,
  "confidence": 0-100,
  "reasoning": "чому так вирішив (1-2 речення)",
  "semantic_understanding": "що користувач насправді хоче"
}`;
    }
}

export default IntentDetector;
