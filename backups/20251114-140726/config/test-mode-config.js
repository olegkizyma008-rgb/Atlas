/**
 * TEST MODE Configuration - Ollama Only Mode
 * Режим тестування виключно на локальних Ollama моделях
 *
 * Активація: "Atlas, перейди в тестовий режим" або через змінну TEST_MODE=true
 */

import logger from '../orchestrator/utils/logger.js';

class TestModeConfig {
  constructor() {
    this.isTestMode = process.env.TEST_MODE === 'true' || false;
    this.logger = logger;

    // Ollama models configuration
    this.ollamaModels = {
      // Text generation models
      text: [
        'ext-ollama-qwen2.5:latest',       // 7B, найкраща якість для тексту
        'ext-ollama-qwen2.5:14b',          // 14B, ще краща якість
        'ext-ollama-mistral:latest',       // Mistral 7B
        'ext-ollama-llama3.1:8b',          // Llama 3.1
        'ext-ollama-llama3:latest'         // Llama 3
      ],

      // Code generation models
      code: [
        'ext-ollama-qwen2.5-coder:1.5b',   // Швидка для коду
        'ext-ollama-codellama:latest',     // CodeLlama
        'ext-ollama-gpt-oss:20b'           // GPT-OSS 20B для складних задач
      ],

      // Vision models
      vision: [
        'ext-ollama-llama3.2-vision:latest', // Llama 3.2 Vision
        'ext-ollama-qwen3-vl:235b-cloud'     // Qwen VL
      ],

      // Embeddings
      embeddings: [
        'ext-ollama-nomic-embed-text:latest'
      ]
    };

    // Recommended models to download if missing
    this.recommendedModels = [
      'qwen2.5:14b',           // Найкраща якість для тексту
      'qwen2.5-coder:7b',      // Для коду
      'llama3.2-vision:latest', // Для vision
      'mistral:latest'         // Для загальних задач
    ];

    if (this.isTestMode) {
      this.logger.info('🧪 [TEST-MODE] Activated - Using Ollama models only');
    }
  }

  /**
   * Увімкнути тестовий режим
   */
  enable() {
    this.isTestMode = true;
    process.env.TEST_MODE = 'true';
    this.logger.info('🧪 [TEST-MODE] ENABLED - Switching to Ollama models');
    return {
      enabled: true,
      models: this.getAllOllamaModels(),
      message: 'Test mode enabled. Atlas will now use only Ollama models.'
    };
  }

  /**
   * Вимкнути тестовий режим
   */
  disable() {
    this.isTestMode = false;
    process.env.TEST_MODE = 'false';
    this.logger.info('🧪 [TEST-MODE] DISABLED - Returning to normal mode');
    return {
      enabled: false,
      message: 'Test mode disabled. Atlas will use all available models.'
    };
  }

  /**
   * Перевірити чи активний тестовий режим
   */
  isEnabled() {
    return this.isTestMode;
  }

  /**
   * Отримати всі Ollama моделі
   */
  getAllOllamaModels() {
    return [
      ...this.ollamaModels.text,
      ...this.ollamaModels.code,
      ...this.ollamaModels.vision,
      ...this.ollamaModels.embeddings
    ];
  }

  /**
   * Отримати модель для задачі
   */
  getModelForTask(taskType) {
    if (!this.isTestMode) {
      return null; // Use default models
    }

    switch (taskType) {
    case 'code':
    case 'analysis':
      return this.ollamaModels.code[0]; // qwen2.5-coder

    case 'vision':
    case 'screenshot':
      return this.ollamaModels.vision[0]; // llama3.2-vision

    case 'chat':
    case 'general':
      return this.ollamaModels.text[0]; // qwen2.5

    case 'embeddings':
      return this.ollamaModels.embeddings[0];

    default:
      return this.ollamaModels.text[0]; // Default to qwen2.5
    }
  }

  /**
   * Фільтрувати моделі - тільки Ollama в test mode
   */
  filterModels(models) {
    if (!this.isTestMode) {
      return models; // Return all models in normal mode
    }

    // В test mode повертаємо тільки Ollama моделі
    const ollamaModels = models.filter(m =>
      m.id && m.id.startsWith('ext-ollama-')
    );

    this.logger.info(`🧪 [TEST-MODE] Filtered ${ollamaModels.length}/${models.length} Ollama models`);
    return ollamaModels;
  }

  /**
   * Перевірити які моделі встановлені
   */
  async checkInstalledModels() {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get('http://localhost:11434/api/tags', {
        timeout: 5000
      });

      const installedModels = response.data?.models || [];
      const installedNames = installedModels.map(m => m.name);

      const missing = this.recommendedModels.filter(rec => {
        // Check if any installed model starts with recommended name
        return !installedNames.some(installed => installed.startsWith(rec.split(':')[0]));
      });

      return {
        total: installedModels.length,
        installed: installedNames,
        recommended: this.recommendedModels,
        missing: missing,
        needsDownload: missing.length > 0
      };

    } catch (error) {
      this.logger.error(`[TEST-MODE] Failed to check installed models: ${error.message}`);
      return {
        total: 0,
        installed: [],
        recommended: this.recommendedModels,
        missing: this.recommendedModels,
        needsDownload: true,
        error: error.message
      };
    }
  }

  /**
   * Скачати рекомендовану модель
   */
  async downloadModel(modelName) {
    try {
      const axios = (await import('axios')).default;

      this.logger.info(`🧪 [TEST-MODE] Downloading model: ${modelName}`);

      // Start pull request
      const response = await axios.post(
        'http://localhost:11434/api/pull',
        { name: modelName },
        {
          timeout: 300000, // 5 minutes
          responseType: 'stream'
        }
      );

      return {
        success: true,
        model: modelName,
        message: `Model ${modelName} download started`
      };

    } catch (error) {
      this.logger.error(`[TEST-MODE] Failed to download ${modelName}: ${error.message}`);
      return {
        success: false,
        model: modelName,
        error: error.message
      };
    }
  }

  /**
   * Статус тестового режиму
   */
  getStatus() {
    return {
      enabled: this.isTestMode,
      ollama_models: {
        text: this.ollamaModels.text.length,
        code: this.ollamaModels.code.length,
        vision: this.ollamaModels.vision.length,
        total: this.getAllOllamaModels().length
      },
      recommended_models: this.recommendedModels
    };
  }
}

// Singleton instance
const testModeConfig = new TestModeConfig();

export default testModeConfig;
