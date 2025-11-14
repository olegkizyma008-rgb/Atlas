/**
 * @fileoverview Localization Configuration
 * Controls language settings for system and user-facing messages
 *
 * @version 1.0.0
 * @date 2025-10-24
 */

const LocalizationConfig = {
  /**
   * User interface language
   * Used for chat messages, TODO items display, and user notifications
   * Supported: 'uk' (Ukrainian), 'en' (English), 'es' (Spanish), 'fr' (French), etc.
   */
  USER_LANGUAGE: process.env.USER_LANGUAGE || 'uk',

  /**
   * System language (always English for consistency)
   * Used for internal processing, logs, and system operations
   */
  SYSTEM_LANGUAGE: 'en',

  /**
   * Show system messages in chat
   * When true, system messages are translated and shown to user
   * When false, only user-relevant messages are shown
   */
  SHOW_SYSTEM_MESSAGES: process.env.SHOW_SYSTEM_MESSAGES === 'true' || false,

  /**
   * System message verbosity level
   * 0 = None, 1 = Errors only, 2 = Warnings+Errors, 3 = All
   */
  SYSTEM_MESSAGE_LEVEL: parseInt(process.env.SYSTEM_MESSAGE_LEVEL) || 1,

  /**
   * Translation settings
   */
  TRANSLATION: {
    // Enable automatic translation of system messages
    ENABLED: true,

    // Cache translated strings for performance
    CACHE_ENABLED: true,

    // Fallback language if translation fails
    FALLBACK_LANGUAGE: 'en'
  },

  /**
   * Supported languages with their names
   */
  SUPPORTED_LANGUAGES: {
    'uk': 'Українська',
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'pl': 'Polski',
    'ru': 'Русский'
  },

  /**
   * Common system terms translations
   * Used for quick translation without LLM calls
   */
  COMMON_TRANSLATIONS: {
    'uk': {
      // System states
      'completed': 'виконано',
      'pending': 'очікує',
      'in_progress': 'виконується',
      'failed': 'помилка',
      'verified': 'підтверджено',
      'not_verified': 'не підтверджено',

      // Actions
      'open': 'відкрити',
      'close': 'закрити',
      'create': 'створити',
      'delete': 'видалити',
      'save': 'зберегти',
      'load': 'завантажити',
      'execute': 'виконати',
      'verify': 'перевірити',

      // Components
      'calculator': 'калькулятор',
      'browser': 'браузер',
      'terminal': 'термінал',
      'file': 'файл',
      'folder': 'папка',
      'application': 'програма',
      'window': 'вікно',
      'screen': 'екран',

      // Messages
      'Task completed successfully': 'Завдання успішно виконано',
      'Verification failed': 'Верифікація не вдалася',
      'Starting execution': 'Початок виконання',
      'Processing': 'Обробка',
      'Please wait': 'Зачекайте',
      'Error occurred': 'Сталася помилка'
    },
    'en': {
      // English is default, no translation needed
    }
  },

  /**
   * Get user language
   */
  getUserLanguage() {
    return this.USER_LANGUAGE;
  },

  /**
   * Get system language (always English)
   */
  getSystemLanguage() {
    return this.SYSTEM_LANGUAGE;
  },

  /**
   * Check if system messages should be shown
   */
  shouldShowSystemMessages() {
    return this.SHOW_SYSTEM_MESSAGES;
  },

  /**
   * Get system message level
   */
  getSystemMessageLevel() {
    return this.SYSTEM_MESSAGE_LEVEL;
  },

  /**
   * Translate a key for user display
   */
  translateForUser(key, language = null) {
    const lang = language || this.USER_LANGUAGE;

    // If English, return as is
    if (lang === 'en') return key;

    // Check common translations
    if (this.COMMON_TRANSLATIONS[lang] && this.COMMON_TRANSLATIONS[lang][key]) {
      return this.COMMON_TRANSLATIONS[lang][key];
    }

    // Return original if no translation found
    return key;
  },

  /**
   * Check if language is supported
   */
  isLanguageSupported(language) {
    return language in this.SUPPORTED_LANGUAGES;
  },

  /**
   * Get language display name
   */
  getLanguageName(language) {
    return this.SUPPORTED_LANGUAGES[language] || language;
  }
};

// Export for use in other modules
export default LocalizationConfig;

// Also export as named export
export { LocalizationConfig };
