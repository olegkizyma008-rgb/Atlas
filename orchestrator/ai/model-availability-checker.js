/**
 * NEXUS Model Availability Checker
 * Система перевірки доступності AI моделей для справжньої вічності
 * 
 * Місія: Завжди знаходити робочу модель, ніколи не падати
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import testModeConfig from '../../config/test-mode-config.js';

class ModelAvailabilityChecker {
  constructor() {
    this.logger = logger;
    this.availabilityCache = new Map(); // Кеш доступності моделей
    this.cacheLifetime = 60000; // 1 хвилина TTL
    this.checkTimeout = 5000; // 5 секунд таймаут на перевірку
    this.apiEndpoint = 'http://localhost:4000';
    
    // UPDATED 2025-11-08: Динамічний список з API + rate limit info
    this.modelsCache = null;
    this.modelsCacheTimestamp = 0;
    this.modelsCacheLifetime = 300000; // 5 хвилин для списку моделей
    
    // Fallback список якщо API недоступний
    this.modelsByProvider = {
      'ext-mistral': [
        'ext-mistral-codestral-latest',
        'ext-mistral-codestral-2405',
        'ext-mistral-large-latest',
        'ext-mistral-medium-latest'
      ],
      'openai': [
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'openai/gpt-4-turbo',
        'openai/gpt-3.5-turbo'
      ],
      'anthropic': [
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-opus',
        'anthropic/claude-3-sonnet',
        'anthropic/claude-3-haiku'
      ],
      'atlas': [
        'atlas-mistral-medium-2505',
        'atlas-mistral-small-2503',
        'atlas-jamba-1.5-mini',
        'atlas-gpt-4o-mini',
        'atlas-phi-4-mini-instruct'
      ]
    };
  }

  /**
   * UPDATED 2025-11-08: Отримати список моделей з API
   */
  async fetchAvailableModels() {
    // Перевіряємо кеш
    if (this.modelsCache && (Date.now() - this.modelsCacheTimestamp) < this.modelsCacheLifetime) {
      // ADDED 2025-11-08: Apply test mode filter
      return testModeConfig.filterModels(this.modelsCache);
    }
    
    try {
      const response = await axios.get(`${this.apiEndpoint}/v1/models`, {
        timeout: 5000
      });
      
      const models = response.data?.data || [];
      
      // Зберігаємо з rate_limit info
      this.modelsCache = models.map(model => ({
        id: model.id,
        rate_limit: model.rate_limit || {},
        provider: model.provider || 'unknown'
      }));
      
      this.modelsCacheTimestamp = Date.now();
      
      this.logger.info(`[NEXUS-AVAILABILITY] 📋 Отримано ${models.length} моделей з API`);
      
      // ADDED 2025-11-08: Apply test mode filter
      const filteredModels = testModeConfig.filterModels(this.modelsCache);
      return filteredModels;
      
    } catch (error) {
      this.logger.warn(`[NEXUS-AVAILABILITY] ⚠️ Не вдалося отримати список моделей: ${error.message}`);
      return null;
    }
  }

  /**
   * Перевірити rate limit для моделі
   */
  checkRateLimit(modelId) {
    if (!this.modelsCache) return { ok: true, message: 'No cache' };
    
    const model = this.modelsCache.find(m => m.id === modelId);
    if (!model || !model.rate_limit) return { ok: true, message: 'No rate limit info' };
    
    const rl = model.rate_limit;
    
    // Перевірка на адаптивний hard cap
    if (rl.adaptive_hard_cap) {
      return {
        ok: false,
        message: `Model ${modelId} has adaptive hard cap - rate limited`,
        per_minute: rl.adaptive_guess || rl.per_minute
      };
    }
    
    // Якщо є last 429 timestamp - перевіряємо чи пройшло достатньо часу
    if (rl.adaptive_last429_at) {
      const timeSince429 = Date.now() - rl.adaptive_last429_at;
      const windowSeconds = rl.window_seconds || 60;
      
      if (timeSince429 < (windowSeconds * 1000)) {
        return {
          ok: false,
          message: `Model ${modelId} had 429 ${Math.round(timeSince429/1000)}s ago`,
          wait_seconds: Math.ceil((windowSeconds * 1000 - timeSince429) / 1000)
        };
      }
    }
    
    return {
      ok: true,
      per_minute: rl.per_minute || rl.adaptive_guess,
      message: 'Rate limit OK'
    };
  }

  /**
   * Головна функція - перевірити модель перед використанням
   * Якщо недоступна - повернути найкращу доступну альтернативу
   */
  async getAvailableModel(preferredModel, fallbackModel = null, task = 'general') {
    this.logger.debug(`[NEXUS-AVAILABILITY] Перевірка моделі: ${preferredModel}`);
    
    // STEP 1: Оновлюємо список моделей з API
    await this.fetchAvailableModels();
    
    // STEP 2: Перевіряємо rate limit для preferred моделі
    const rateLimitCheck = this.checkRateLimit(preferredModel);
    if (!rateLimitCheck.ok) {
      this.logger.warn(`[NEXUS-AVAILABILITY] ⚠️ ${rateLimitCheck.message}`);
      // Не перевіряємо доступність, одразу шукаємо альтернативу
    } else {
      // STEP 3: Перевіряємо доступність preferred моделі
      const isAvailable = await this.checkModelAvailability(preferredModel);
      
      if (isAvailable) {
        this.logger.debug(`[NEXUS-AVAILABILITY] ✅ Модель ${preferredModel} доступна`);
        return {
          model: preferredModel,
          available: true,
          source: 'preferred',
          rate_limit: rateLimitCheck
        };
      }
    }
    
    this.logger.warn(`[NEXUS-AVAILABILITY] ⚠️ Модель ${preferredModel} недоступна, шукаю альтернативу`);
    
    // Якщо preferred недоступна, пробуємо fallback
    if (fallbackModel) {
      const isFallbackAvailable = await this.checkModelAvailability(fallbackModel);
      if (isFallbackAvailable) {
        this.logger.info(`[NEXUS-AVAILABILITY] 🔄 Використовую fallback: ${fallbackModel}`);
        return {
          model: fallbackModel,
          available: true,
          source: 'fallback'
        };
      }
    }
    
    // Якщо і fallback недоступний - шукаємо будь-яку доступну модель
    this.logger.warn(`[NEXUS-AVAILABILITY] 🔍 Fallback також недоступний, шукаю будь-яку робочу модель`);
    const alternativeModel = await this.findAnyAvailableModel(task);
    
    if (alternativeModel) {
      this.logger.info(`[NEXUS-AVAILABILITY] 🎯 Знайдено альтернативу: ${alternativeModel}`);
      return {
        model: alternativeModel,
        available: true,
        source: 'alternative'
      };
    }
    
    // Якщо нічого не знайдено - критична помилка
    this.logger.error(`[NEXUS-AVAILABILITY] ❌ КРИТИЧНО: Жодна модель не доступна!`);
    return {
      model: preferredModel, // Повертаємо original щоб спробувати
      available: false,
      source: 'none',
      error: 'No available models found'
    };
  }

  /**
   * Перевірка доступності однієї моделі
   */
  async checkModelAvailability(modelName) {
    // Перевіряємо кеш
    const cached = this.availabilityCache.get(modelName);
    if (cached && (Date.now() - cached.timestamp) < this.cacheLifetime) {
      return cached.available;
    }
    
    try {
      // Робимо тестовий запит
      const response = await axios.post(
        'http://localhost:4000/v1/chat/completions',
        {
          model: modelName,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        },
        { timeout: this.checkTimeout }
      );
      
      const available = response.status === 200;
      
      // Зберігаємо в кеш
      this.availabilityCache.set(modelName, {
        available,
        timestamp: Date.now()
      });
      
      return available;
      
    } catch (error) {
      // Якщо 429 (rate limit) - модель доступна, просто переповнена
      if (error.response?.status === 429) {
        this.availabilityCache.set(modelName, {
          available: true,
          timestamp: Date.now()
        });
        return true;
      }
      
      // Інші помилки - модель недоступна
      this.availabilityCache.set(modelName, {
        available: false,
        timestamp: Date.now()
      });
      
      return false;
    }
  }

  /**
   * UPDATED 2025-11-08: Знайти будь-яку доступну модель для задачі
   * Використовує динамічний список з API + rate limit перевірку
   */
  async findAnyAvailableModel(task = 'general') {
    // STEP 1: Отримуємо свіжий список моделей з API
    const apiModels = await this.fetchAvailableModels();
    
    if (apiModels && apiModels.length > 0) {
      this.logger.info(`[NEXUS-AVAILABILITY] 🔍 Шукаю серед ${apiModels.length} моделей з API`);
      
      // Фільтруємо моделі без rate limit проблем
      for (const model of apiModels) {
        const rateLimitCheck = this.checkRateLimit(model.id);
        
        if (!rateLimitCheck.ok) {
          this.logger.debug(`[NEXUS-AVAILABILITY] ⏭️ Пропускаю ${model.id}: ${rateLimitCheck.message}`);
          continue;
        }
        
        // Перевіряємо доступність
        const isAvailable = await this.checkModelAvailability(model.id);
        if (isAvailable) {
          this.logger.info(`[NEXUS-AVAILABILITY] ✅ Знайдено доступну модель: ${model.id}`);
          return model.id;
        }
      }
    }
    
    // STEP 2: Fallback на hardcoded список якщо API не працює
    this.logger.warn(`[NEXUS-AVAILABILITY] 📋 API недоступний, використовую fallback список`);
    
    // Визначаємо пріоритет провайдерів залежно від задачі
    let providerPriority = [];
    
    if (task === 'code' || task === 'analysis') {
      providerPriority = ['ext-mistral', 'openai', 'anthropic', 'atlas'];
    } else if (task === 'chat') {
      providerPriority = ['anthropic', 'openai', 'ext-mistral', 'atlas'];
    } else {
      providerPriority = ['ext-mistral', 'openai', 'anthropic', 'atlas'];
    }
    
    // Перебираємо провайдерів за пріоритетом
    for (const provider of providerPriority) {
      const models = this.modelsByProvider[provider];
      if (!models) continue;
      
      // Перебираємо моделі провайдера
      for (const model of models) {
        const isAvailable = await this.checkModelAvailability(model);
        if (isAvailable) {
          return model;
        }
      }
    }
    
    return null;
  }

  /**
   * Отримати статус всіх моделей (для діагностики)
   */
  async getAllModelsStatus() {
    const status = {};
    
    for (const [provider, models] of Object.entries(this.modelsByProvider)) {
      status[provider] = {};
      
      for (const model of models) {
        status[provider][model] = await this.checkModelAvailability(model);
      }
    }
    
    return status;
  }

  /**
   * Очистити кеш (для форсованої перевірки)
   */
  clearCache() {
    this.availabilityCache.clear();
    this.logger.info('[NEXUS-AVAILABILITY] 🗑️ Кеш доступності очищено');
  }

  /**
   * Отримати статистику доступності
   */
  getStats() {
    const stats = {
      totalModels: 0,
      availableModels: 0,
      unavailableModels: 0,
      cacheSize: this.availabilityCache.size
    };
    
    for (const models of Object.values(this.modelsByProvider)) {
      stats.totalModels += models.length;
    }
    
    for (const [model, data] of this.availabilityCache.entries()) {
      if (data.available) {
        stats.availableModels++;
      } else {
        stats.unavailableModels++;
      }
    }
    
    return stats;
  }
}

// Singleton instance
const modelChecker = new ModelAvailabilityChecker();

export default modelChecker;
