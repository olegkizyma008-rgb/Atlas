/**
 * NEXUS CONTEXT-AWARE ACTIVATOR
 * Замінює Cascade Interceptor на розумну систему активації Nexus
 * 
 * Створено: 2025-11-02
 * Автор: Nexus (Anthropic + Cascade + Codex + Windsurf)
 * 
 * КЛЮЧОВА ЗМІНА:
 * Nexus активується НЕ на основі ключових слів,
 * а на основі АНАЛІЗУ КОНТЕКСТУ та ПОТРЕБ задачі
 */

import logger from '../utils/logger.js';
import { getWindsurfClient } from '../../config/windsurf-integration.js';

export class NexusContextActivator {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        this.windsurfClient = null;
        
        // Стратегії для різних режимів
        this.modeStrategies = {
            'dev': 'always-nexus',      // DEV ЗАВЖДИ використовує Nexus
            'task': 'smart-nexus',      // TASK вибірково
            'chat': 'complexity-based'  // CHAT на основі складності
        };
    }

    /**
     * Ініціалізація
     */
    async initialize() {
        try {
            this.windsurfClient = getWindsurfClient();
            this.logger.info('[NEXUS-ACTIVATOR] Initialized - Context-aware activation ready');
            return true;
        } catch (error) {
            this.logger.error('[NEXUS-ACTIVATOR] Initialization failed:', error);
            return false;
        }
    }

    /**
     * ГОЛОВНА ФУНКЦІЯ: Визначення чи потрібен Nexus
     */
    async analyzeIfNexusNeeded(userMessage, session, detectedMode = null) {
        this.logger.info('[NEXUS-ACTIVATOR] Analyzing context for Nexus activation', {
            mode: detectedMode,
            messageLength: userMessage.length
        });

        const analysis = {
            shouldUseNexus: false,
            strategy: null,
            reasoning: '',
            models: [],
            priority: 'normal'
        };

        // 1. DEV режим → ВИКЛЮЧНО ВНУТРІШНІЙ (2025-11-05)
        // DEV mode більше НЕ активується user requests
        // Тільки для NEXUS internal operations
        if (detectedMode === 'dev') {
            analysis.shouldUseNexus = true;
            analysis.strategy = 'dev-internal-nexus';
            analysis.reasoning = 'DEV mode - NEXUS internal operation (not user-triggered)';
            analysis.models = ['codestral', 'codex', 'thinking'];
            analysis.priority = 'critical';
            
            this.logger.info('[NEXUS-ACTIVATOR] 🔧 DEV mode (INTERNAL) → Full Nexus activation');
            return analysis;
        }

        // 2. Явний запит до Cascade/Atlas → Nexus
        if (this._isExplicitNexusRequest(userMessage)) {
            analysis.shouldUseNexus = true;
            analysis.strategy = 'explicit-request';
            analysis.reasoning = 'User explicitly requested Cascade/Atlas';
            analysis.models = ['thinking'];
            
            this.logger.info('[NEXUS-ACTIVATOR] ✅ Explicit request → Nexus activation');
            return analysis;
        }

        // 3. Аналіз складності для CHAT/TASK
        const complexity = await this._analyzeComplexity(userMessage);
        
        if (complexity.level === 'high') {
            analysis.shouldUseNexus = true;
            analysis.strategy = 'complexity-high';
            analysis.reasoning = `High complexity: ${complexity.reasons.join(', ')}`;
            analysis.models = complexity.recommendedModels;
            
            this.logger.info('[NEXUS-ACTIVATOR] ✅ High complexity → Nexus activation', {
                reasons: complexity.reasons
            });
            return analysis;
        }

        // 4. Код-специфічні запити → Codex
        if (complexity.hasCode) {
            analysis.shouldUseNexus = true;
            analysis.strategy = 'code-analysis';
            analysis.reasoning = 'Code-related task detected';
            analysis.models = ['codex'];
            
            this.logger.info('[NEXUS-ACTIVATOR] ✅ Code detected → Codex activation');
            return analysis;
        }

        // 5. Потреба в зборі даних → Codestral
        if (complexity.needsData) {
            analysis.shouldUseNexus = true;
            analysis.strategy = 'data-collection';
            analysis.reasoning = 'Data collection needed';
            analysis.models = ['codestral'];
            
            this.logger.info('[NEXUS-ACTIVATOR] ✅ Data collection needed → Codestral activation');
            return analysis;
        }

        // 6. За замовчуванням - стандартний workflow
        this.logger.info('[NEXUS-ACTIVATOR] ❌ Standard workflow sufficient');
        return analysis;
    }

    /**
     * Перевірка чи це DEV режим
     */
    _isDevMode(userMessage, session) {
        const devKeywords = [
            'проаналізуй себе',
            'виправ себе',
            'self-analysis',
            'introspection',
            'dev mode'
        ];

        return devKeywords.some(kw => 
            userMessage.toLowerCase().includes(kw.toLowerCase())
        ) || session.lastMode === 'dev';
    }

    /**
     * Перевірка явного запиту
     */
    _isExplicitNexusRequest(userMessage) {
        const keywords = [
            'cascade', 'каскад', 'каскаде',
            'atlas', 'атлас', 'атласе',
            'nexus', 'нексус'
        ];

        return keywords.some(kw => 
            userMessage.toLowerCase().includes(kw.toLowerCase())
        );
    }

    /**
     * Аналіз складності задачі
     */
    async _analyzeComplexity(userMessage) {
        const complexity = {
            level: 'low',
            reasons: [],
            hasCode: false,
            needsData: false,
            recommendedModels: []
        };

        // Перевірка наявності коду
        if (this._containsCode(userMessage)) {
            complexity.hasCode = true;
            complexity.reasons.push('contains code');
            complexity.recommendedModels.push('codex');
        }

        // Перевірка потреби в даних
        if (this._needsDataCollection(userMessage)) {
            complexity.needsData = true;
            complexity.reasons.push('needs data collection');
            complexity.recommendedModels.push('codestral');
        }

        // Перевірка складності формулювання
        if (userMessage.length > 200) {
            complexity.reasons.push('long request');
        }

        const complexWords = [
            'аналіз', 'стратегія', 'план', 'архітектура',
            'оптимізація', 'рефакторинг', 'покращення',
            'analysis', 'strategy', 'architecture', 'optimization'
        ];

        const hasComplexWords = complexWords.some(word => 
            userMessage.toLowerCase().includes(word)
        );

        if (hasComplexWords) {
            complexity.reasons.push('complex terminology');
            complexity.recommendedModels.push('thinking');
        }

        // Визначення рівня
        if (complexity.reasons.length >= 2 || complexity.hasCode) {
            complexity.level = 'high';
        } else if (complexity.reasons.length === 1) {
            complexity.level = 'medium';
        }

        return complexity;
    }

    /**
     * Перевірка наявності коду
     */
    _containsCode(message) {
        const codeIndicators = [
            /```/,
            /function\s+\w+/,
            /class\s+\w+/,
            /import\s+/,
            /const\s+\w+\s*=/,
            /let\s+\w+\s*=/,
            /\w+\.\w+\(/,
            /=>/
        ];

        return codeIndicators.some(pattern => pattern.test(message));
    }

    /**
     * Перевірка потреби в зборі даних
     */
    _needsDataCollection(message) {
        const dataKeywords = [
            'логи', 'logs', 'метрики', 'metrics',
            'статистика', 'statistics', 'дані', 'data',
            'конфігурація', 'configuration', 'файли', 'files'
        ];

        return dataKeywords.some(kw => 
            message.toLowerCase().includes(kw)
        );
    }

    /**
     * Виконання через Nexus з обраною стратегією
     */
    async executeWithNexus(userMessage, session, analysis) {
        this.logger.info('[NEXUS-ACTIVATOR] Executing with Nexus', {
            strategy: analysis.strategy,
            models: analysis.models
        });

        // FIXED: resolve async singleton properly
        const multiModel = await this.container.resolve('multiModelOrchestrator');

        switch (analysis.strategy) {
            case 'dev-full-nexus':
                return await this._executeDevFullNexus(userMessage, session, multiModel);
                
            case 'code-analysis':
                return await this._executeCodeAnalysis(userMessage, session, multiModel);
                
            case 'data-collection':
                return await this._executeDataCollection(userMessage, session, multiModel);
                
            case 'complexity-high':
                return await this._executeHighComplexity(userMessage, session, multiModel);
                
            default:
                return await this._executeGeneral(userMessage, session, multiModel);
        }
    }

    /**
     * DEV режим: повний Nexus
     */
    async _executeDevFullNexus(userMessage, session, multiModel) {
        // 1. Codestral збирає дані
        const data = await multiModel.autonomousDataCollection({
            logsPath: '/Users/dev/Documents/GitHub/atlas4/logs',
            configPath: '/Users/dev/Documents/GitHub/atlas4/config',
            codePath: '/Users/dev/Documents/GitHub/atlas4/orchestrator'
        });

        // 2. Codex аналізує код
        const codeAnalysis = await multiModel.executeTask('code-analysis', 
            `Analyze code for issues:\n${data.codeChanges}`
        );

        // 3. Claude Thinking створює стратегію
        const strategy = await multiModel.executeTask('deep-analysis',
            `Based on collected data, create improvement strategy:\n${JSON.stringify(data)}`
        );

        return {
            success: true,
            mode: 'dev',
            nexusUsed: true,
            data,
            codeAnalysis: codeAnalysis.content,
            strategy: strategy.content
        };
    }

    /**
     * Аналіз коду через Codex
     */
    async _executeCodeAnalysis(userMessage, session, multiModel) {
        const result = await multiModel.executeTask('code-analysis', userMessage);
        
        return {
            success: true,
            nexusUsed: true,
            model: 'codex',
            content: result.content
        };
    }

    /**
     * Збір даних через Codestral
     */
    async _executeDataCollection(userMessage, session, multiModel) {
        const data = await multiModel.autonomousDataCollection({
            logsPath: '/Users/dev/Documents/GitHub/atlas4/logs',
            configPath: '/Users/dev/Documents/GitHub/atlas4/config',
            codePath: '/Users/dev/Documents/GitHub/atlas4/orchestrator'
        });

        return {
            success: true,
            nexusUsed: true,
            model: 'codestral',
            data
        };
    }

    /**
     * Висока складність через Claude Thinking
     */
    async _executeHighComplexity(userMessage, session, multiModel) {
        const result = await multiModel.executeTask('deep-analysis', userMessage);
        
        return {
            success: true,
            nexusUsed: true,
            model: 'thinking',
            content: result.content
        };
    }

    /**
     * Загальне виконання
     */
    async _executeGeneral(userMessage, session, multiModel) {
        const result = await multiModel.executeTask('general', userMessage);
        
        return {
            success: true,
            nexusUsed: true,
            model: 'general',
            content: result.content
        };
    }
}

export default NexusContextActivator;
