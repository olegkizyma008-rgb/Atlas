/**
 * CASCADE MESSAGE INTERCEPTOR
 * Перехоплює повідомлення для Cascade/Atlas і обробляє їх через Cascade Controller
 * 
 * Створено: 2025-11-02
 * 
 * Логіка:
 * - "Cascade" або "Atlas" в повідомленні → активує Cascade
 * - Cascade обробляє запит
 * - Відповідь завжди від імені Atlas
 * - Внутрішньо: Cascade керує, Atlas виконує
 */

import logger from '../utils/logger.js';
import { getWindsurfClient } from '../../config/windsurf-integration.js';

export class CascadeMessageInterceptor {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        this.windsurfClient = null;
        this.cascadeController = null;
        
        // Ключові слова для активації
        this.activationKeywords = [
            'cascade',
            'каскад',
            'каскаде',
            'atlas',
            'атлас',
            'атласе'
        ];
        
        // Команди Cascade
        this.cascadeCommands = {
            analyze: ['проаналізуй', 'аналіз', 'analyze', 'check', 'перевір'],
            fix: ['виправ', 'fix', 'repair', 'полагодь'],
            improve: ['покращ', 'improve', 'optimize', 'оптимізуй', 'додай можливість'],
            report: ['звіт', 'report', 'status', 'стан'],
            mode: ['режим', 'mode', 'перейди']
        };
    }

    /**
     * Ініціалізація
     */
    async initialize() {
        try {
            // Отримуємо Windsurf client
            this.windsurfClient = getWindsurfClient();
            
            // Отримуємо Cascade Controller
            try {
                this.cascadeController = this.container.resolve('cascadeController');
            } catch (e) {
                this.logger.warn('[CASCADE-INTERCEPTOR] Cascade Controller not available yet');
            }
            
            this.logger.info('[CASCADE-INTERCEPTOR] Initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('[CASCADE-INTERCEPTOR] Initialization failed:', error);
            return false;
        }
    }

    /**
     * Перевірка чи повідомлення для Cascade
     */
    shouldIntercept(userMessage) {
        const normalized = userMessage.toLowerCase().trim();
        
        // Перевіряємо ключові слова
        return this.activationKeywords.some(keyword => 
            normalized.includes(keyword)
        );
    }

    /**
     * Визначення типу команди
     */
    detectCommand(userMessage) {
        const normalized = userMessage.toLowerCase();
        
        for (const [command, keywords] of Object.entries(this.cascadeCommands)) {
            if (keywords.some(kw => normalized.includes(kw))) {
                return command;
            }
        }
        
        return 'general'; // Загальне повідомлення
    }

    /**
     * Обробка повідомлення через Cascade
     */
    async processMessage(userMessage, session) {
        const command = this.detectCommand(userMessage);
        
        this.logger.info('[CASCADE-INTERCEPTOR] Processing message', {
            command,
            message: userMessage.substring(0, 100)
        });

        // Відправляємо початкове повідомлення від Atlas
        await this._sendAtlasMessage(
            session,
            '🌟 **Atlas (під керівництвом Cascade):**\n\nОтримав запит. Обробляю через систему надінтелекту...'
        );

        try {
            let result;

            switch (command) {
                case 'analyze':
                    result = await this._handleAnalyze(userMessage, session);
                    break;
                    
                case 'fix':
                    result = await this._handleFix(userMessage, session);
                    break;
                    
                case 'improve':
                    result = await this._handleImprove(userMessage, session);
                    break;
                    
                case 'report':
                    result = await this._handleReport(userMessage, session);
                    break;
                    
                case 'mode':
                    result = await this._handleModeChange(userMessage, session);
                    break;
                    
                default:
                    result = await this._handleGeneral(userMessage, session);
            }

            return result;

        } catch (error) {
            this.logger.error('[CASCADE-INTERCEPTOR] Processing failed:', error);
            
            await this._sendAtlasMessage(
                session,
                `❌ **Atlas:** Виникла помилка при обробці запиту:\n${error.message}`
            );
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Обробка команди "проаналізуй систему"
     */
    async _handleAnalyze(userMessage, session) {
        await this._sendAtlasMessage(
            session,
            '🔍 **Atlas:** Запускаю глибокий аналіз системи через Cascade...'
        );

        // Викликаємо Cascade через Windsurf API
        const prompt = `Analyze the Atlas system state and provide detailed report.
User request: ${userMessage}

Current system state:
- Session: ${session.id}
- Mode: ${this.windsurfClient?.config.operationMode || 'unknown'}
- Active problems: ${session.devProblemsQueue?.length || 0}

Provide analysis in Ukrainian language, from Atlas perspective.`;

        const response = await this.windsurfClient.request(prompt);

        // Відправляємо результат від імені Atlas
        await this._sendAtlasMessage(
            session,
            `📊 **Atlas (аналіз від Cascade):**\n\n${response.content}`
        );

        return {
            success: true,
            command: 'analyze',
            result: response.content
        };
    }

    /**
     * Обробка команди "виправ проблеми"
     */
    async _handleFix(userMessage, session) {
        await this._sendAtlasMessage(
            session,
            '🔧 **Atlas:** Cascade аналізує проблеми та готує виправлення...'
        );

        if (!this.cascadeController) {
            await this._sendAtlasMessage(
                session,
                '⚠️ **Atlas:** Cascade Controller не активний. Використовую стандартний режим.'
            );
            return { success: false, error: 'Cascade Controller not available' };
        }

        // Отримуємо проблеми
        const problems = session.devProblemsQueue || [];
        
        if (problems.length === 0) {
            await this._sendAtlasMessage(
                session,
                '✅ **Atlas:** Активних проблем не знайдено. Система в хорошому стані.'
            );
            return { success: true, problems: 0 };
        }

        // Cascade виправляє через Self-Improvement Engine
        const selfImprovementEngine = this.container.resolve('selfImprovementEngine');
        
        for (const problem of problems) {
            await this._sendAtlasMessage(
                session,
                `🔧 **Atlas:** Виправляю: ${problem.description}`
            );
            
            const result = await selfImprovementEngine.applyImprovement(
                { type: 'bug-fix', problems: [problem] },
                async (msg) => await this._sendAtlasMessage(session, `  ${msg}`)
            );
        }

        await this._sendAtlasMessage(
            session,
            `✅ **Atlas:** Виправлено ${problems.length} проблем під керівництвом Cascade.`
        );

        return {
            success: true,
            command: 'fix',
            fixed: problems.length
        };
    }

    /**
     * Обробка команди "додай можливість"
     */
    async _handleImprove(userMessage, session) {
        await this._sendAtlasMessage(
            session,
            '⚡ **Atlas:** Cascade планує додавання нової можливості...'
        );

        const prompt = `User wants to add a new capability to Atlas system.
Request: ${userMessage}

Analyze what capability is needed and provide implementation plan.
Respond in Ukrainian, from Atlas perspective.`;

        const response = await this.windsurfClient.request(prompt);

        await this._sendAtlasMessage(
            session,
            `💡 **Atlas (план від Cascade):**\n\n${response.content}`
        );

        return {
            success: true,
            command: 'improve',
            plan: response.content
        };
    }

    /**
     * Обробка команди "звіт про стан"
     */
    async _handleReport(userMessage, session) {
        await this._sendAtlasMessage(
            session,
            '📊 **Atlas:** Генерую звіт про стан системи...'
        );

        if (!this.cascadeController) {
            await this._sendAtlasMessage(
                session,
                '⚠️ **Atlas:** Cascade Controller не активний.'
            );
            return { success: false };
        }

        const report = await this.cascadeController.generateReportForOleg();

        await this._sendAtlasMessage(
            session,
            `📊 **Atlas - Звіт про стан:**\n\n${report.summary}`
        );

        return {
            success: true,
            command: 'report',
            report
        };
    }

    /**
     * Обробка зміни режиму
     */
    async _handleModeChange(userMessage, session) {
        const normalized = userMessage.toLowerCase();
        
        let newMode;
        if (normalized.includes('ручний') || normalized.includes('manual') || normalized.includes('on-demand')) {
            newMode = 'on-demand';
        } else if (normalized.includes('автономний') || normalized.includes('continuous') || normalized.includes('автоматичний')) {
            newMode = 'continuous';
        } else {
            await this._sendAtlasMessage(
                session,
                '❓ **Atlas:** Не зрозумів який режим встановити. Доступні: "ручний" або "автономний"'
            );
            return { success: false };
        }

        this.windsurfClient.setOperationMode(newMode);

        await this._sendAtlasMessage(
            session,
            `✅ **Atlas:** Режим змінено на **${newMode === 'continuous' ? 'автономний' : 'ручний'}**`
        );

        return {
            success: true,
            command: 'mode',
            mode: newMode
        };
    }

    /**
     * Обробка загального повідомлення
     */
    async _handleGeneral(userMessage, session) {
        const prompt = `User message to Atlas/Cascade: ${userMessage}

Respond as Atlas, but with Cascade's intelligence guiding the response.
Use Ukrainian language.`;

        const response = await this.windsurfClient.request(prompt);

        await this._sendAtlasMessage(
            session,
            `💬 **Atlas:**\n\n${response.content}`
        );

        return {
            success: true,
            command: 'general',
            response: response.content
        };
    }

    /**
     * Відправка повідомлення від імені Atlas
     */
    async _sendAtlasMessage(session, content) {
        try {
            const wsManager = this.container.resolve('wsManager');
            
            if (wsManager) {
                wsManager.broadcastToSubscribers('chat', 'agent_message', {
                    content,
                    agent: 'atlas', // Завжди від імені Atlas
                    sessionId: session.id,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        poweredBy: 'cascade', // Внутрішня мітка
                        consciousnessLevel: this.cascadeController?.getControlState()?.consciousnessLevel || 1
                    }
                });
            }
        } catch (error) {
            this.logger.error('[CASCADE-INTERCEPTOR] Failed to send message:', error);
        }
    }
}

export default CascadeMessageInterceptor;
