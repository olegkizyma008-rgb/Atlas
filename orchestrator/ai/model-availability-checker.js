/**
 * NEXUS Model Availability Checker
 * Система перевірки доступності AI моделей для справжньої вічності
 * 
 * Місія: Завжди знаходити робочу модель, ніколи не падати
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import testModeConfig from '../../config/test-mode-config.js';
import { getRateLimiter } from '../utils/api-rate-limiter.js';

class ModelAvailabilityChecker {
  constructor() {
    this.logger = logger;
    this.availabilityCache = new Map(); // Кеш доступності моделей
    this.cacheLifetime = 60000; // 1 хвилина TTL
    this.checkTimeout = 5000; // 5 секунд таймаут на перевірку
    this.apiEndpoint = 'http://localhost:4000';
    
    // ADDED 2025-11-10: Global cache for GET /v1/models to prevent burst requests
    this.modelsListCache = null;
    this.modelsListCacheTimestamp = 0;
    this.modelsListCacheTTL = 30000; // 30 seconds TTL for models list
    
    // ADDED 2025-11-10: Concurrency control
    this.activeChecks = 0;
    this.maxConcurrentChecks = 2; // Maximum 2 concurrent model checks
    this.checkQueue = [];
    
    // ADDED 2025-11-10: Delay between checks to prevent rate limit
    this.delayBetweenChecks = 500; // 500ms delay between model availability checks
    this.lastCheckTimestamp = 0;
    
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
   * UPDATED 2025-11-10: Отримати список моделей з API з глобальним кешуванням
   * CRITICAL: Prevents burst GET /v1/models requests
   */
  async fetchAvailableModels() {
    // STEP 1: Check global models list cache (30 seconds TTL)
    const now = Date.now();
    if (this.modelsListCache && (now - this.modelsListCacheTimestamp) < this.modelsListCacheTTL) {
      this.logger.debug(`[NEXUS-AVAILABILITY] 📋 Using cached models list (age: ${Math.round((now - this.modelsListCacheTimestamp)/1000)}s)`);
      return testModeConfig.filterModels(this.modelsListCache);
    }
    
    // STEP 2: Перевіряємо старий кеш (5 хвилин)
    if (this.modelsCache && (now - this.modelsCacheTimestamp) < this.modelsCacheLifetime) {
      this.logger.debug(`[NEXUS-AVAILABILITY] 📋 Using legacy cache`);
      return testModeConfig.filterModels(this.modelsCache);
    }
    
    try {
      this.logger.info(`[NEXUS-AVAILABILITY] 🌐 Fetching fresh models list from API...`);
      const response = await axios.get(`${this.apiEndpoint}/v1/models`, {
        timeout: 5000
      });
      
      const models = response.data?.data || [];
      
      // Зберігаємо з rate_limit info
      const modelsList = models.map(model => ({
        id: model.id,
        rate_limit: model.rate_limit || {},
        provider: model.provider || 'unknown'
      }));
      
      // UPDATED 2025-11-10: Update BOTH caches
      this.modelsListCache = modelsList; // Global cache (30s TTL)
      this.modelsListCacheTimestamp = now;
      
      this.modelsCache = modelsList; // Legacy cache (5min TTL)
      this.modelsCacheTimestamp = now;
      
      this.logger.info(`[NEXUS-AVAILABILITY] 📋 Отримано ${models.length} моделей з API (cached for 30s)`);
      
      // ADDED 2025-11-08: Apply test mode filter
      const filteredModels = testModeConfig.filterModels(modelsList);
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
   * UPDATED 2025-11-10: Перевірка доступності однієї моделі з concurrency control та delays
   */
  async checkModelAvailability(modelName) {
    // STEP 1: Перевіряємо кеш
    const cached = this.availabilityCache.get(modelName);
    if (cached && (Date.now() - cached.timestamp) < this.cacheLifetime) {
      return cached.available;
    }
    
    // STEP 2: Wait for concurrency slot
    await this._waitForConcurrencySlot();
    
    // STEP 3: Enforce delay between checks (rate limiting)
    const timeSinceLastCheck = Date.now() - this.lastCheckTimestamp;
    if (timeSinceLastCheck < this.delayBetweenChecks) {
      const waitTime = this.delayBetweenChecks - timeSinceLastCheck;
      this.logger.debug(`[NEXUS-AVAILABILITY] ⏱️ Waiting ${waitTime}ms before checking ${modelName}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    try {
      // Робимо тестовий запит
      const rateLimiter = getRateLimiter();
      const response = await rateLimiter.call(
        async () => axios.post(
          'http://localhost:4000/v1/chat/completions',
          {
            model: modelName,
            messages: [
              { role: 'system', content: 'Test' },
              { role: 'user', content: 'Hi' }
            ],
            max_tokens: 10,
            temperature: 0.1
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: this.checkTimeout
          }
        ),
        { priority: 5, retryable: false, metadata: { type: 'model_check', model: modelName } }
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
  } finally {
    // ADDED 2025-11-10: Release concurrency slot
    this.activeChecks--;
    this._processQueue();
  }
}

/**
 * NEW 2025-11-10: Знайти робочу модель при помилці (500, 429 тощо)
 * Автоматично перебирає доступні моделі з API до знаходження робочої
 */
async findWorkingModelOnError(currentModel, errorStatus, task = 'general') {
  this.logger.warn(`[NEXUS-FALLBACK] 🔄 Model ${currentModel} failed with ${errorStatus}, searching for alternative...`);
  
  // Отримуємо список всіх доступних моделей
  const apiModels = await this.fetchAvailableModels();
  
  if (!apiModels || apiModels.length === 0) {
    this.logger.error(`[NEXUS-FALLBACK] ❌ No models available from API`);
    return null;
  }
  
  // Фільтруємо моделі (виключаємо поточну що не працює)
  const alternativeModels = apiModels
    .filter(m => m.id !== currentModel)
    .slice(0, 10); // Обмежуємо до 10 моделей
  
  this.logger.info(`[NEXUS-FALLBACK] 🔍 Testing ${alternativeModels.length} alternative models...`);
  
  // Пробуємо кожну модель
  for (const model of alternativeModels) {
    try {
      this.logger.debug(`[NEXUS-FALLBACK] 🧪 Testing model: ${model.id}`);
      
      const rateLimiter = getRateLimiter();
      const response = await rateLimiter.call(
        async () => axios.post(
          'http://localhost:4000/v1/chat/completions',
          {
            model: model.id,
            messages: [
              { role: 'system', content: 'Test' },
              { role: 'user', content: 'Hi' }
            ],
            max_tokens: 10,
            temperature: 0.1
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 2000
          }
        ),
        { priority: 3, retryable: false, metadata: { type: 'fallback_check', model: model.id } }
      );
      
      if (response.status === 200) {
        this.logger.info(`[NEXUS-FALLBACK] ✅ Found working alternative: ${model.id}`);
        return model.id;
      }
    } catch (testError) {
      this.logger.debug(`[NEXUS-FALLBACK] Model ${model.id} failed: ${testError.message}`);
      continue;
    }
  }
    
    this.logger.error(`[NEXUS-FALLBACK] ❌ No working model found among ${alternativeModels.length} alternatives`);
    return null;
  }

  /**
   * UPDATED 2025-11-10: Знайти будь-яку доступну модель для задачі
   * CRITICAL: Limits to first 5 models to prevent burst requests
   */
  async findAnyAvailableModel(task = 'general') {
    // STEP 1: Отримуємо свіжий список моделей з API (cached)
    const apiModels = await this.fetchAvailableModels();
    
    if (apiModels && apiModels.length > 0) {
      // CRITICAL 2025-11-10: Limit to first 5 models to prevent burst
      const modelsToCheck = apiModels.slice(0, 5);
      this.logger.info(`[NEXUS-AVAILABILITY] 🔍 Шукаю серед ${modelsToCheck.length} моделей (limited from ${apiModels.length})`);
      
      // Фільтруємо моделі без rate limit проблем
      for (const model of modelsToCheck) {
        const rateLimitCheck = this.checkRateLimit(model.id);
        
        if (!rateLimitCheck.ok) {
          this.logger.debug(`[NEXUS-AVAILABILITY] ⏭️ Пропускаю ${model.id}: ${rateLimitCheck.message}`);
          continue;
        }
        
        // Перевіряємо доступність (with concurrency control and delays)
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

  /**
   * NEW 2025-11-11: Очікування доступного слоту перевірки (concurrency control)
   */
  async _waitForConcurrencySlot() {
    if (this.activeChecks < this.maxConcurrentChecks) {
      this.activeChecks++;
      return;
    }

    return new Promise((resolve) => {
      this.checkQueue.push(resolve);
    }).then(() => {
      this.activeChecks++;
    });
  }

  /**
   * NEW 2025-11-11: Обробка черги очікування для перевірок доступності моделей
   */
  _processQueue() {
    if (this.checkQueue.length === 0) {
      return;
    }

    if (this.activeChecks >= this.maxConcurrentChecks) {
      return;
    }

    const nextResolve = this.checkQueue.shift();
    if (typeof nextResolve === 'function') {
      nextResolve();
    }
  }
}

// UPDATED 2025-11-10: Export both class and singleton for flexibility
export { ModelAvailabilityChecker };

// Singleton instance
const modelChecker = new ModelAvailabilityChecker();
export default modelChecker;
