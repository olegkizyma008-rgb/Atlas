/**
 * LOCAL LLM FALLBACK SERVICE
 * Простий локальний LLM fallback для режиму offline
 * Використовує heuristics та pattern matching замість реального LLM
 * 
 * FIXED 2025-11-16: Додано для обходу залежності від port 4000
 */

import logger from '../utils/logger.js';

export class LocalLLMFallback {
    constructor() {
        this.name = 'local-llm-fallback';
        this.enabled = true;
    }

    /**
     * Простий chat completion без зовнішнього API
     */
    async chatCompletion(messages, options = {}) {
        const {
            model = 'local-fallback',
            max_tokens = 400,
            temperature = 0.7
        } = options;

        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('Messages array is required');
        }

        const userMessage = messages[messages.length - 1]?.content || '';

        logger.debug('local-llm-fallback', `[LOCAL-LLM] Processing: ${userMessage.substring(0, 100)}`);

        // Генеруємо відповідь на основі heuristics
        const response = this._generateResponse(userMessage, messages);

        return {
            choices: [{
                message: {
                    content: response
                },
                finish_reason: 'stop'
            }],
            model,
            usage: {
                prompt_tokens: Math.ceil(userMessage.length / 4),
                completion_tokens: Math.ceil(response.length / 4),
                total_tokens: Math.ceil((userMessage.length + response.length) / 4)
            }
        };
    }

    /**
     * Генеруємо відповідь на основі контексту
     */
    _generateResponse(userMessage, messages) {
        const lower = userMessage.toLowerCase();

        // === MODE SELECTION ===
        if (this._isTaskMode(lower)) {
            return JSON.stringify({
                mode: 'task',
                confidence: 0.85,
                reasoning: 'Локальний fallback: виявлено дієслова дії',
                mood: 'neutral'
            });
        }

        if (this._isDevMode(lower)) {
            return JSON.stringify({
                mode: 'dev',
                confidence: 0.8,
                reasoning: 'Локальний fallback: виявлено dev ключові слова',
                mood: 'neutral'
            });
        }

        // === SERVER SELECTION ===
        if (this._isServerSelectionRequest(messages)) {
            const servers = this._selectServers(lower);
            return JSON.stringify({
                selected_servers: servers,
                confidence: 0.75,
                reasoning: `Локальний fallback: обрано ${servers.join(', ')}`,
                selected_prompts: {}
            });
        }

        // === CHAT MODE (DEFAULT) ===
        return this._generateChatResponse(lower);
    }

    /**
     * Перевіряємо, чи це task mode
     */
    _isTaskMode(lower) {
        const taskKeywords = [
            'виконай', 'зроби', 'відкрий', 'запусти', 'знайди',
            'створи', 'встанови', 'завантаж', 'збережи',
            'перейди', 'натисни', 'введи', 'напиши',
            'скачай', 'включи', 'виключи', 'закрий',
            'execute', 'open', 'launch', 'run', 'find',
            'create', 'install', 'download', 'save',
            'navigate', 'click', 'type', 'write'
        ];
        return taskKeywords.some(kw => lower.includes(kw));
    }

    /**
     * Перевіряємо, чи це dev mode
     */
    _isDevMode(lower) {
        const devKeywords = [
            'самоаналіз', 'само аналіз', 'режим дев', 'dev mode',
            'analyze yourself', 'self analysis', 'self-analysis',
            'внутрішній аналіз', 'зазирнути в себе', 'code intervention'
        ];
        return devKeywords.some(kw => lower.includes(kw));
    }

    /**
     * Перевіряємо, чи це запит на вибір серверів
     */
    _isServerSelectionRequest(messages) {
        const systemPrompt = messages[0]?.content || '';
        return systemPrompt.includes('server') || systemPrompt.includes('MCP');
    }

    /**
     * Вибираємо MCP сервери на основі контексту
     */
    _selectServers(lower) {
        const serverMap = {
            filesystem: ['файл', 'file', 'папка', 'folder', 'read', 'write', 'create', 'delete'],
            shell: ['команда', 'command', 'shell', 'bash', 'terminal', 'execute', 'run'],
            playwright: ['браузер', 'browser', 'веб', 'web', 'сайт', 'site', 'click', 'navigate'],
            applescript: ['macos', 'mac', 'finder', 'application', 'app', 'open', 'launch'],
            memory: ['пам', 'memory', 'store', 'save', 'remember', 'recall'],
            python_sdk: ['python', 'py', 'script', 'код', 'code'],
            java_sdk: ['java', 'compile', 'maven', 'gradle']
        };

        const scores = {};
        for (const [server, keywords] of Object.entries(serverMap)) {
            scores[server] = keywords.filter(kw => lower.includes(kw)).length;
        }

        // Повертаємо топ 1-2 сервери
        const sorted = Object.entries(scores)
            .filter(([_, score]) => score > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([server]) => server);

        return sorted.length > 0 ? sorted : ['filesystem'];
    }

    /**
     * Генеруємо chat response
     */
    _generateChatResponse(lower) {
        // Простий chat fallback
        const responses = {
            привіт: 'Привіт! Я ATLAS система. Як я можу вам допомогти?',
            привет: 'Привет! Я ATLAS система. Как я могу вам помочь?',
            hello: 'Hello! I\'m ATLAS system. How can I help you?',
            help: 'Я можу допомогти з: файловою системою, браузером, shell командами, macOS автоматизацією, пам\'яттю, Python та Java розробкою.',
            'як ти': 'Я ATLAS - інтелектуальна багатоагентна система з 7 MCP серверами. Готова виконувати будь-які завдання!',
            'що ти можеш': 'Я можу: читати/писати файли, відкривати браузер, виконувати команди, автоматизувати macOS, зберігати дані, писати Python/Java код.'
        };

        for (const [key, response] of Object.entries(responses)) {
            if (lower.includes(key)) {
                return response;
            }
        }

        // Default response
        return 'Я готова допомогти. Будь ласка, опишіть, що вам потрібно зробити.';
    }
}

// Singleton instance
let instance = null;

export function getLocalLLMFallback() {
    if (!instance) {
        instance = new LocalLLMFallback();
    }
    return instance;
}

export default new LocalLLMFallback();
