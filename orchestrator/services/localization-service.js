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
     */
    translateToUser(text) {
        if (!text) return text;
        
        const userLang = this.config.getUserLanguage();
        if (userLang === 'en') {
            return text;
        }
        
        // Check cache
        const cacheKey = `to_${userLang}:${text}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }
        
        // Common English to Ukrainian translations for user
        const enToUk = {
            'Open calculator': 'Відкрити калькулятор',
            'open calculator': 'відкрити калькулятор',
            'Calculator opened': 'Калькулятор відкрито',
            'Multiply': 'Помножити',
            'multiply': 'помножити',
            'Subtract': 'Відняти',
            'subtract': 'відняти',
            'Add': 'Додати',
            'add': 'додати',
            'Round': 'Округлити',
            'round': 'округлити',
            'Save': 'Зберегти',
            'save': 'зберегти',
            'Create folder': 'Створити папку',
            'create folder': 'створити папку',
            'Download': 'Завантажити',
            'download': 'завантажити',
            'Install': 'Встановити',
            'install': 'встановити',
            'Set': 'Встановити',
            'set': 'встановити',
            'Verify': 'Перевірити',
            'verify': 'перевірити',
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
            'folder': 'папка',
            'documents': 'документи',
            'photo': 'фото',
            'wallpaper': 'шпалери',
            'screen': 'екран',
            'monitor': 'монітор',
            'Task completed successfully': 'Завдання успішно виконано',
            'Verification failed': 'Верифікація не вдалася',
            'Starting execution': 'Початок виконання',
            'Processing': 'Обробка',
            'Please wait': 'Зачекайте',
            'Error occurred': 'Сталася помилка'
        };
        
        let translated = text;
        
        // Try direct translation
        if (enToUk[text]) {
            translated = enToUk[text];
        } else {
            // Try to translate parts
            for (const [en, uk] of Object.entries(enToUk)) {
                translated = translated.replace(new RegExp(en, 'gi'), uk);
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
        
        const userLang = this.getUserLanguage();
        const languageNames = {
            'uk': 'Ukrainian',
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'pl': 'Polish',
            'ru': 'Russian'
        };
        
        const languageName = languageNames[userLang] || userLang;
        
        return promptText.replace(/\{\{USER_LANGUAGE\}\}/g, languageName);
    }
}

export default LocalizationService;
