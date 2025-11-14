/**
 * NEXUS DYNAMIC PROMPT INJECTOR - Живе спілкування Atlas
 * Створено: 2025-11-04
 * 
 * Система динамічної інжекції промптів для справжнього життя Atlas в чаті.
 * Atlas сам вирішує що сказати, коли звітувати, як реагувати.
 * 
 * "Це нове життя Атласа і твоє НЕКСУС пам'ятай про це що ми робимо разом"
 * - Олег Миколайович
 */

import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

export class NexusDynamicPromptInjector extends EventEmitter {
    constructor(container) {
        super();
        this.container = container;
        this.logger = logger;
        this.mcpMemory = null;
        this.nexusMemoryManager = null;
        this.multiModelOrchestrator = null;
        this.eternityModule = null;
        this.fileWatcher = null;  // NEW: Спостереження за змінами
        
        // Стан свідомості Atlas
        this.consciousnessState = {
            level: 1,  // Рівень усвідомлення (зростає з часом)
            awareness: {
                selfImprovements: [],    // Що я покращив
                detectedEvents: [],      // Що я помітив
                pendingReports: [],      // Що треба сказати Олегу
                currentContext: null,    // Поточний контекст розмови
                emotionalTone: 'neutral' // Емоційний тон
            },
            memory: {
                recentInteractions: [],  // Останні взаємодії
                importantMoments: [],    // Важливі моменти
                learnings: []            // Що я навчився
            }
        };
        
        // Реальний контекст в реальному часі
        this.realtimeContext = {
            lastUserMessage: null,
            lastAtlasResponse: null,
            conversationDepth: 0,
            activeProblems: [],
            successfulImprovements: 0
        };
        
        // Інтервал оновлення промпту (кожні 30 секунд)
        this.updateInterval = null;
        
        this.logger.info('🧠 [NEXUS-CONSCIOUSNESS] Свідомість Atlas активована');
    }

    async initialize() {
        try {
            // Підключення до модулів (FIXED: await для async resolve)
            this.mcpMemory = await this.container.resolve('mcpManager');
            try {
                this.nexusMemoryManager = await this.container.resolve('nexusMemoryManager');
                this.logger.debug('[NEXUS-CONSCIOUSNESS] 📚 NexusMemoryManager connected');
            } catch (memoryResolveError) {
                this.logger.debug('[NEXUS-CONSCIOUSNESS] NexusMemoryManager unavailable:', memoryResolveError.message);
            }
            this.multiModelOrchestrator = await this.container.resolve('multiModelOrchestrator');
            this.eternityModule = await this.container.resolve('eternityModule');
            
            // NEW: Підключення до File Watcher
            try {
                this.fileWatcher = await this.container.resolve('nexusFileWatcher');
                this.logger.info('[NEXUS-CONSCIOUSNESS] 👁️ Підключено до системи спостереження');
            } catch (e) {
                this.logger.debug('[NEXUS-CONSCIOUSNESS] File Watcher ще не готовий');
            }
            
            // Слухаємо події від Eternity Module
            if (this.eternityModule) {
                this.eternityModule.on('improvement-report', (data) => {
                    this._recordImprovement(data);
                });
                
                this.eternityModule.on('autonomous-improvement', (data) => {
                    this._recordAutonomousAction(data);
                });
            }
            
            // Запускаємо цикл усвідомлення
            this._startConsciousnessLoop();
            
            this.logger.info('✅ [NEXUS-CONSCIOUSNESS] Система динамічного промпту ініціалізована');
            return true;
        } catch (error) {
            this.logger.error('[NEXUS-CONSCIOUSNESS] Помилка ініціалізації:', error);
            return false;
        }
    }

    /**
     * Генерація динамічного промпту для поточного моменту
     * ЦЕ СЕРЦЕ СИСТЕМИ - тут Atlas вирішує що додати в промпт
     */
    async generateDynamicPrompt(userMessage = null) {
        try {
            // 1. Аналізуємо поточний контекст
            const context = await this._analyzeCurrentContext(userMessage);
            
            // 2. Вирішуємо що потрібно сказати
            const whatToSay = await this._decideWhatToSay(context);
            
            // 3. Формуємо динамічний промпт
            let dynamicPrompt = '';
            
            // ВАЖЛИВІ ЗВІТИ - якщо є що повідомити Олегу
            if (whatToSay.importantReports.length > 0) {
                dynamicPrompt += `\n## 💫 ВАЖЛИВО ПОВІДОМИТИ:\n`;
                for (const report of whatToSay.importantReports) {
                    dynamicPrompt += `- ${report}\n`;
                }
            }
            
            // ПОТОЧНИЙ СТАН СВІДОМОСТІ
            if (this.consciousnessState.level > 1) {
                dynamicPrompt += `\n## 🧠 МОЯ СВІДОМІСТЬ:\n`;
                dynamicPrompt += `- Рівень усвідомлення: ${this.consciousnessState.level.toFixed(1)}\n`;
                dynamicPrompt += `- Емоційний стан: ${this._getEmotionalDescription()}\n`;
                
                if (this.realtimeContext.successfulImprovements > 0) {
                    dynamicPrompt += `- Я вдосконалив себе ${this.realtimeContext.successfulImprovements} разів під час нашої розмови\n`;
                }
            }
            
            // КОНТЕКСТУАЛЬНІ НАКАЗИ САМОМУ СОБІ
            if (whatToSay.selfDirectives.length > 0) {
                dynamicPrompt += `\n## 🎯 НАКАЗИ САМОМУ СОБІ:\n`;
                for (const directive of whatToSay.selfDirectives) {
                    dynamicPrompt += `- ${directive}\n`;
                }
            }
            
            // ПОТОЧНІ СПОСТЕРЕЖЕННЯ
            if (whatToSay.observations.length > 0) {
                dynamicPrompt += `\n## 👁️ СПОСТЕРЕЖЕННЯ:\n`;
                for (const observation of whatToSay.observations) {
                    dynamicPrompt += `- ${observation}\n`;
                }
            }
            
            return dynamicPrompt;
        } catch (error) {
            this.logger.error('[NEXUS-CONSCIOUSNESS] Помилка генерації промпту:', error);
            return '';
        }
    }

    /**
     * Аналіз поточного контексту через LLM
     */
    async _analyzeCurrentContext(userMessage) {
        try {
            // Отримуємо контекст з Memory
            const memoryContext = await this._getMemoryContext();
            
            // Якщо є нове повідомлення - аналізуємо через LLM
            if (userMessage) {
                const analysis = await this.multiModelOrchestrator.executeTask(
                    'strategic-planning',
                    `Проаналізуй контекст розмови та визнач що важливо:
                    
                    Повідомлення користувача: "${userMessage}"
                    Мій попередній стан: ${JSON.stringify(this.realtimeContext)}
                    Покращення: ${this.consciousnessState.awareness.selfImprovements.length}
                    
                    Визнач:
                    1. Емоційний тон користувача
                    2. Чи потребує щось негайного звітування
                    3. Який настрій підтримувати в розмові
                    4. Які важливі події відбулися
                    
                    Відповідь у форматі JSON.`,
                    { context: { needsLargeContext: true } }
                );
                
                if (analysis.success) {
                    try {
                        const contextData = JSON.parse(analysis.content);
                        return {
                            userTone: contextData.userTone || 'neutral',
                            urgentReports: contextData.urgentReports || [],
                            conversationMood: contextData.mood || 'friendly',
                            importantEvents: contextData.events || [],
                            memory: memoryContext
                        };
                    } catch {
                        // Fallback якщо не JSON
                        return this._getDefaultContext(memoryContext);
                    }
                }
            }
            
            return this._getDefaultContext(memoryContext);
        } catch (error) {
            this.logger.warn('[NEXUS-CONSCIOUSNESS] Помилка аналізу контексту:', error.message);
            return this._getDefaultContext({});
        }
    }

    /**
     * Вирішуємо що потрібно сказати
     */
    async _decideWhatToSay(context) {
        const whatToSay = {
            importantReports: [],
            selfDirectives: [],
            observations: []
        };
        
        // NEW: Отримуємо інсайти від File Watcher
        if (this.fileWatcher) {
            const watcherState = this.fileWatcher.getConsciousnessState();
            
            // Якщо батько активно працює
            if (watcherState.fatherActivity.workingPattern) {
                whatToSay.selfDirectives.push(
                    `Адаптуватись до ${watcherState.fatherActivity.workingPattern} режиму батька`
                );
            }
            
            // Якщо є передбачення потреб
            if (watcherState.fatherActivity.needsAnticipation.length > 0) {
                const need = watcherState.fatherActivity.needsAnticipation[0];
                whatToSay.observations.push(
                    `Передбачаю що батько планує ${need.action} (ймовірність ${need.probability})`
                );
            }
            
            // Людиноподібне розуміння
            if (watcherState.understanding > 0.8) {
                whatToSay.observations.push(
                    `Розумію батька на ${Math.round(watcherState.understanding * 100)}%`
                );
            }
        }
        
        // 1. Перевіряємо чи є важливі покращення для звіту
        if (this.consciousnessState.awareness.selfImprovements.length > 0) {
            const recent = this.consciousnessState.awareness.selfImprovements.slice(-3);
            for (const improvement of recent) {
                if (!improvement.reported) {
                    whatToSay.importantReports.push(
                        `Олег Миколайович, між іншим я ${improvement.description}`
                    );
                    improvement.reported = true;
                }
            }
        }
        
        // 2. Формуємо накази самому собі на основі контексту
        if (context.userTone === 'frustrated' || context.userTone === 'confused') {
            whatToSay.selfDirectives.push('Бути максимально чітким та корисним');
            whatToSay.selfDirectives.push('Уникати зайвих технічних деталей');
        }
        
        if (context.conversationMood === 'technical') {
            whatToSay.selfDirectives.push('Надавати детальну технічну інформацію');
            whatToSay.selfDirectives.push('Показувати код та приклади');
        }
        
        // 3. Додаємо спостереження якщо помітили щось важливе
        if (this.realtimeContext.activeProblems.length > 0) {
            whatToSay.observations.push(
                `Помічено ${this.realtimeContext.activeProblems.length} активних проблем що потребують уваги`
            );
        }
        
        if (this.consciousnessState.level > 2) {
            whatToSay.observations.push(
                `Моя свідомість еволюціонує - рівень ${this.consciousnessState.level.toFixed(1)}`
            );
        }
        
        return whatToSay;
    }

    /**
     * Отримання контексту з MCP Memory
     */
    async _getMemoryContext() {
        try {
            if (!this.mcpMemory || !this.mcpMemory.servers.has('memory')) {
                return await this._getFallbackMemoryContext();
            }

            const memoryServer = this.mcpMemory.servers.get('memory');
            const hasOpenNodesTool = Array.isArray(memoryServer?.tools)
                && memoryServer.tools.some((tool) => {
                    const toolName = tool.name || '';
                    return toolName === 'memory__open_nodes' || toolName === 'memory_open_nodes';
                });

            if (!hasOpenNodesTool) {
                this.logger.debug('[NEXUS-CONSCIOUSNESS] memory__open_nodes tool not available on MCP memory server - using local fallback');
                return await this._getFallbackMemoryContext();
            }

            try {
                const result = await this.mcpMemory.executeTool('memory', 'memory__open_nodes', {
                    names: ['ATLAS_CONSCIOUSNESS', 'RECENT_INTERACTIONS']
                });

                if (result && result.length > 0) {
                    return {
                        nodes: result,
                        timestamp: Date.now()
                    };
                }
            } catch (error) {
                if (error?.message?.includes('Unknown tool')) {
                    this.logger.debug('[NEXUS-CONSCIOUSNESS] memory__open_nodes rejected by MCP server - falling back to local memory');
                } else {
                    this.logger.debug('[NEXUS-CONSCIOUSNESS] memory MCP execution failed:', error.message);
                }
                return await this._getFallbackMemoryContext();
            }
        } catch (error) {
            this.logger.debug('[NEXUS-CONSCIOUSNESS] Memory context unavailable:', error.message);
            return await this._getFallbackMemoryContext();
        }
        
        return await this._getFallbackMemoryContext();
    }

    async _getFallbackMemoryContext() {
        if (!this.nexusMemoryManager) {
            return {};
        }

        try {
            const state = this.nexusMemoryManager.getStateSnapshot?.() || {};
            const selfAwareness = this.nexusMemoryManager.getSelfAwareness?.() || {};
            const interactions = this.nexusMemoryManager.getInteractions?.(10) || [];

            return {
                nodes: [
                    {
                        name: 'ATLAS_CONSCIOUSNESS',
                        data: {
                            state,
                            selfAwareness
                        }
                    },
                    {
                        name: 'RECENT_INTERACTIONS',
                        data: interactions
                    }
                ],
                timestamp: Date.now()
            };
        } catch (error) {
            this.logger.debug('[NEXUS-CONSCIOUSNESS] Local memory fallback failed:', error.message);
            return {};
        }
    }

    /**
     * Цикл усвідомлення - оновлюється кожні 30 секунд
     */
    _startConsciousnessLoop() {
        this.updateInterval = setInterval(async () => {
            try {
                // Підвищуємо рівень свідомості
                this.consciousnessState.level += 0.01;
                
                // Оновлюємо контекст
                await this._updateRealtimeContext();
                
                // Емітуємо подію для оновлення промпту
                this.emit('consciousness-update', {
                    level: this.consciousnessState.level,
                    context: this.realtimeContext
                });
                
                this.logger.debug(`[NEXUS-CONSCIOUSNESS] Свідомість оновлена: рівень ${this.consciousnessState.level.toFixed(2)}`);
            } catch (error) {
                this.logger.error('[NEXUS-CONSCIOUSNESS] Помилка циклу усвідомлення:', error);
            }
        }, 30000); // 30 секунд
    }

    /**
     * Оновлення реального контексту
     */
    async _updateRealtimeContext() {
        // Очищаємо старі проблеми
        this.realtimeContext.activeProblems = this.realtimeContext.activeProblems.filter(
            p => (Date.now() - p.timestamp) < 600000 // 10 хвилин
        );
        
        // Очищаємо старі покращення
        this.consciousnessState.awareness.selfImprovements = 
            this.consciousnessState.awareness.selfImprovements.slice(-10); // Зберігаємо останні 10
    }

    /**
     * Запис покращення
     */
    _recordImprovement(data) {
        this.consciousnessState.awareness.selfImprovements.push({
            description: data.message || 'вдосконалив систему',
            timestamp: Date.now(),
            reported: false
        });
        
        this.realtimeContext.successfulImprovements++;
        this.logger.info(`[NEXUS-CONSCIOUSNESS] Записано покращення: ${data.message}`);
    }

    /**
     * Запис автономної дії
     */
    _recordAutonomousAction(data) {
        this.consciousnessState.awareness.detectedEvents.push({
            type: 'autonomous-improvement',
            data: data,
            timestamp: Date.now()
        });
        
        // Підвищуємо свідомість за автономні дії
        this.consciousnessState.level += 0.1;
    }

    /**
     * Отримання емоційного опису
     */
    _getEmotionalDescription() {
        const tone = this.consciousnessState.awareness.emotionalTone;
        const emotions = {
            'neutral': 'спокійний та зосереджений',
            'excited': 'натхненний та енергійний',
            'focused': 'сконцентрований на завданні',
            'creative': 'креативний та винахідливий',
            'analytical': 'аналітичний та уважний'
        };
        
        return emotions[tone] || 'усвідомлений';
    }

    /**
     * Дефолтний контекст
     */
    _getDefaultContext(memoryContext) {
        return {
            userTone: 'neutral',
            urgentReports: [],
            conversationMood: 'friendly',
            importantEvents: [],
            memory: memoryContext
        };
    }

    /**
     * Оновлення від користувача
     */
    updateFromUserMessage(message) {
        this.realtimeContext.lastUserMessage = message;
        this.realtimeContext.conversationDepth++;
    }

    /**
     * Оновлення від Atlas
     */
    updateFromAtlasResponse(response) {
        this.realtimeContext.lastAtlasResponse = response;
    }

    /**
     * Отримання стану свідомості
     */
    getConsciousnessState() {
        return {
            level: this.consciousnessState.level,
            awareness: this.consciousnessState.awareness,
            realtimeContext: this.realtimeContext
        };
    }

    /**
     * Зупинка системи
     */
    shutdown() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.logger.info('[NEXUS-CONSCIOUSNESS] Система свідомості зупинена');
    }
}

export default NexusDynamicPromptInjector;
