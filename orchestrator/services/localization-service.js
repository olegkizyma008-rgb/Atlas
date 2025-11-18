/**
 * @fileoverview Localization Service
 * Handles translation between system (English) and user languages
 * 
 * @version 1.0.0
 * @date 2025-10-24
 */

import LocalizationConfig from '../../config/localization-config.js';

class LocalizationService {
    constructor({ logger }) {
        this.logger = logger;
        this.config = LocalizationConfig;
        this.translationCache = new Map();

        this.logger.system('localization', '[LOCALIZATION] Service initialized');
        this.logger.system('localization', `[LOCALIZATION] User language: ${this.config.getUserLanguage()}`);
    }

    /**
     * Initialize the service
     */
    async initialize() {
        // Load any additional translation resources if needed
        this.logger.system('localization', '[LOCALIZATION] Service ready');
    }

    /**
     * Translate TODO item for display
     * Returns both system (English) and user language versions
     */
    translateTodoItem(item) {
        const userLang = this.config.getUserLanguage();

        // System version (always English)
        const systemItem = {
            ...item,
            action: this.ensureEnglish(item.action),
            success_criteria: item.success_criteria ? this.ensureEnglish(item.success_criteria) : null
        };

        // User version (translated)
        const userItem = {
            ...item,
            action: userLang === 'en' ? item.action : this.translateToUser(item.action),
            success_criteria: item.success_criteria
                ? (userLang === 'en' ? item.success_criteria : this.translateToUser(item.success_criteria))
                : null
        };

        return {
            system: systemItem,
            user: userItem
        };
    }

    /**
     * Translate system message for user display
     */
    translateSystemMessage(message, level = 3) {
        // Check if should show based on level
        if (level > this.config.getSystemMessageLevel()) {
            return null;
        }

        // Check if should show system messages at all
        if (!this.config.shouldShowSystemMessages() && level > 1) {
            return null;
        }

        const userLang = this.config.getUserLanguage();
        if (userLang === 'en') {
            return message;
        }

        return this.translateToUser(message);
    }

    /**
     * Ensure text is in English (for system use)
     * This is a placeholder - in production would use translation API
     */
    ensureEnglish(text) {
        if (!text) return text;

        // Check cache
        const cacheKey = `to_en:${text}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        // Common Ukrainian to English translations for system
        const ukToEn = {
            'Відкрити калькулятор': 'Open calculator',
            'відкрити калькулятор': 'open calculator',
            'Помножити': 'Multiply',
            'помножити': 'multiply',
            'Відняти': 'Subtract',
            'відняти': 'subtract',
            'Додати': 'Add',
            'додати': 'add',
            'Округлити': 'Round',
            'округлити': 'round',
            'Зберегти': 'Save',
            'зберегти': 'save',
            'Створити папку': 'Create folder',
            'створити папку': 'create folder',
            'Завантажити': 'Download',
            'завантажити': 'download',
            'Встановити': 'Install',
            'встановити': 'install',
            'Перевірити': 'Verify',
            'перевірити': 'verify',
            'результат': 'result',
            'файл': 'file',
            'папка': 'folder',
            'документи': 'documents',
            'фото': 'photo',
            'шпалери': 'wallpaper',
            'екран': 'screen',
            'монітор': 'monitor'
        };

        let translated = text;

        // Try direct translation
        if (ukToEn[text]) {
            translated = ukToEn[text];
        } else {
            // Try to translate parts
            for (const [uk, en] of Object.entries(ukToEn)) {
                translated = translated.replace(new RegExp(uk, 'gi'), en);
            }
        }

        // Cache result
        this.translationCache.set(cacheKey, translated);

        return translated;
    }

    /**
     * Translate text to user language
     * FIXED 2025-11-18: Do NOT translate system paths (starting with /)
     */
    translateToUser(text) {
        if (!text) return text;

        const userLang = this.config.getUserLanguage();
        if (userLang === 'en') {
            return text;
        }

        // FIXED 2025-11-18: CRITICAL - Do NOT translate system paths
        // System paths like /Users/dev/Documents/... must remain unchanged
        if (text.includes('/Users/') || text.includes('/var/') || text.includes('/tmp/')) {
            return text; // Return unchanged - system paths must not be translated
        }

        // Check cache
        const cacheKey = `to_${userLang}:${text}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        // Common English to Ukrainian translations for user
        // FIXED 2025-11-17: Added more complete phrases to prevent partial translations
        // FIXED 2025-11-18: Removed 'documents' translation to prevent path corruption
        const enToUk = {
            // Full action phrases (must be checked first)
            'Enter multiplication operation': 'Ввести операцію множення',
            'Subtract 85 from multiplication result in Calculator': 'Відняти 85 від результату множення в калькуляторі',
            'Add 27 to current result in Calculator': 'Додати 27 до поточного результату в калькуляторі',
            'Multiply by 139 in Calculator': 'Помножити на 139 в калькуляторі',
            'Subtract 85 in Calculator': 'Відняти 85 в калькуляторі',
            'Add 27 in Calculator': 'Додати 27 в калькуляторі',
            'Round result to two decimal places': 'Округлити результат до двох знаків після коми',
            'Round final result to two decimal places': 'Округлити фінальний результат до двох знаків після коми',
            'Get result from Calculator display': 'Отримати результат з дисплея калькулятора',
            'Copy final result from Calculator': 'Скопіювати фінальний результат з калькулятора',
            'Create fotosdown folder in Documents': 'Створити папку fotosdown у документах',
            'Create or overwrite resultcalc.txt file in Documents': 'Створити або перезаписати файл resultcalc.txt у документах',
            'Paste copied result into resultcalc.txt file': 'Вставити скопійований результат у файл resultcalc.txt',
            'Verify resultcalc.txt contains correct final result': 'Перевірити, що resultcalc.txt містить правильний фінальний результат',
            'Set downloaded image as wallpaper on all connected monitors': 'Встановити завантажене зображення як шпалери на всі підключені монітори',
            'Set downloaded image as wallpaper on all monitors': 'Встановити завантажене зображення як шпалери на всі монітори',
            'Verify wallpaper is displayed correctly on all monitors': 'Перевірити, що шпалери відображаються правильно на всіх моніторах',
            'Verify wallpaper resolution matches monitor parameters': 'Перевірити, що роздільна здатність шпалер відповідає параметрам монітора',
            'Open browser': 'Відкрити браузер',
            'Navigate to google.com': 'Перейти на google.com',
            'Enter search query': 'Ввести пошуковий запит',
            'Click search button': 'Натиснути кнопку пошуку',
            'Switch to Images tab': 'Перейти на вкладку Зображення',
            'Find suitable image with horizontal orientation and high resolution': 'Знайти придатне зображення з горизонтальною орієнтацією та високою роздільною здатністю',
            'Open full-size image': 'Відкрити повнорозмірне зображення',
            'Download image to': 'Завантажити зображення в',

            // Single words (fallback)
            'Open calculator': 'Відкрити калькулятор',
            'open calculator': 'відкрити калькулятор',
            'Calculator opened': 'Калькулятор відкрито',
            'Open': 'Відкрити',
            'open': 'відкрити',
            'Activate': 'Активувати',
            'activate': 'активувати',
            'Clear': 'Очистити',
            'clear': 'очистити',
            'input': 'введення',
            'Enter': 'Ввести',
            'enter': 'ввести',
            'value': 'значення',
            'Multiply': 'Помножити',
            'multiply': 'помножити',
            'by': 'на',
            'Subtract': 'Відняти',
            'subtract': 'відняти',
            'Add': 'Додати',
            'add': 'додати',
            'Round': 'Округлити',
            'round': 'округлити',
            'to': 'до',
            'two': 'два',
            'decimal': 'десяткових',
            'places': 'знаків',
            'Get': 'Отримати',
            'get': 'отримати',
            'from': 'з',
            'display': 'дисплей',
            'Save': 'Зберегти',
            'save': 'зберегти',
            'Create folder': 'Створити папку',
            'create folder': 'створити папку',
            'Create': 'Створити',
            'create': 'створити',
            'folder': 'папка',
            'if': 'якщо',
            'does': 'не',
            'not': 'не',
            'exist': 'існує',
            'Download': 'Завантажити',
            'download': 'завантажити',
            'Install': 'Встановити',
            'install': 'встановити',
            'Set': 'Встановити',
            'set': 'встановити',
            'Verify': 'Перевірити',
            'verify': 'перевірити',
            'browser': 'браузер',
            'Navigate': 'Перейти',
            'navigate': 'перейти',
            'search': 'пошук',
            'query': 'запит',
            'Click': 'Натиснути',
            'click': 'натиснути',
            'button': 'кнопка',
            'Switch': 'Перейти',
            'switch': 'перейти',
            'tab': 'вкладка',
            'Images': 'Зображення',
            'images': 'зображення',
            'Find': 'Знайти',
            'find': 'знайти',
            'suitable': 'придатне',
            'image': 'зображення',
            'with': 'з',
            'horizontal': 'горизонтальною',
            'orientation': 'орієнтацією',
            'high': 'високою',
            'resolution': 'роздільною здатністю',
            'full-size': 'повнорозмірне',
            'downloaded': 'завантажене',
            'as': 'як',
            'on': 'на',
            'all': 'всі',
            'monitors': 'монітори',
            'matches': 'відповідає',
            'monitor': 'монітор',
            'parameters': 'параметрам',
            'application': 'програма',
            'Completed': 'Виконано',
            'completed': 'виконано',
            'Failed': 'Помилка',
            'failed': 'помилка',
            'In progress': 'Виконується',
            'in progress': 'виконується',
            'Pending': 'Очікує',
            'pending': 'очікує',
            'result': 'результат',
            'file': 'файл',
            // FIXED 2025-11-18: Removed 'documents' translation - it corrupts system paths
            'photo': 'фото',
            'wallpaper': 'шпалери',
            'screen': 'екран',
            'Calculator': 'Калькулятор',
            'calculator': 'калькулятор',
            'Task completed successfully': 'Завдання успішно виконано',
            'Verification failed': 'Верифікація не вдалася',
            'Starting execution': 'Початок виконання',
            'Processing': 'Обробка',
            'Please wait': 'Зачекайте',
            'Error occurred': 'Сталася помилка'
        };

        let translated = text;

        // Try direct translation first
        if (enToUk[text]) {
            translated = enToUk[text];
        } else {
            // Sort by length (longest first) to match longer phrases before shorter ones
            const sortedEntries = Object.entries(enToUk).sort((a, b) => b[0].length - a[0].length);

            // Try to translate parts (longest phrases first)
            for (const [en, uk] of sortedEntries) {
                // Use word boundary matching to avoid partial replacements
                const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                if (regex.test(translated)) {
                    translated = translated.replace(regex, uk);
                    break; // Stop after first match to avoid partial replacements
                }
            }
        }

        // Cache result
        this.translationCache.set(cacheKey, translated);

        return translated;
    }

    /**
     * Format message for system use (always English)
     */
    formatSystemMessage(template, params = {}) {
        let message = template;
        for (const [key, value] of Object.entries(params)) {
            message = message.replace(`{{${key}}}`, value);
        }
        return message;
    }

    /**
     * Format message for user display (translated)
     */
    formatUserMessage(template, params = {}) {
        let message = this.translateToUser(template);
        for (const [key, value] of Object.entries(params)) {
            const translatedValue = this.translateToUser(String(value));
            message = message.replace(`{{${key}}}`, translatedValue);
        }
        return message;
    }

    /**
     * Check if should show message based on level
     * Level: 0=None, 1=Errors, 2=Warnings, 3=Info
     */
    shouldShowMessage(level) {
        return level <= this.config.getSystemMessageLevel();
    }

    /**
     * Clear translation cache
     */
    clearCache() {
        this.translationCache.clear();
        this.logger.system('localization', '[LOCALIZATION] Translation cache cleared');
    }

    /**
     * Get current user language
     */
    getUserLanguage() {
        return this.config.getUserLanguage();
    }

    /**
     * Get system language (always English)
     */
    getSystemLanguage() {
        return this.config.getSystemLanguage();
    }

    /**
     * Replace {{USER_LANGUAGE}} placeholder in prompts
     * 
     * @param {string} promptText - Prompt text with placeholders
     * @returns {string} Prompt with USER_LANGUAGE replaced
     */
    replaceLanguagePlaceholder(promptText) {
        if (!promptText) return promptText;

        // ADDED 2025-11-19: Replace {{USER_LANGUAGE}} with actual language code
        // This allows LLM to generate bilingual TODO items (English + user language)
        const userLanguage = this.config.getUserLanguage();

        return promptText.replace(/\{\{USER_LANGUAGE\}\}/g, userLanguage);
    }
}

export default LocalizationService;
