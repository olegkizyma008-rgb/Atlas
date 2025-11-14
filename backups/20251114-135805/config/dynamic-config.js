/**
 * Dynamic Configuration System
 * Система динамічної конфігурації без хардкодів
 * 
 * @version 1.0.0
 * @date 2025-10-24
 */

import logger from '../utils/logger.js';

/**
 * Динамічні значення за замовчуванням
 * Адаптуються до контексту та навантаження системи
 */
export class DynamicDefaults {
  constructor() {
    this.systemLoad = 0;
    this.errorRate = 0;
    this.avgResponseTime = 0;
    this.contextComplexity = 0;
    
    // Кеш для оптимізації
    this.cache = new Map();
    this.cacheTimeout = 5000; // 5 секунд
  }
  
  /**
   * Отримати динамічний timeout на основі системного стану
   */
  getTimeout(operation = 'default') {
    const cacheKey = `timeout:${operation}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;
    
    // Базові значення для різних операцій
    const baseTimeouts = {
      llm: 60000,
      vision: 120000,
      mcp_tool: 30000,
      validation: 5000,
      default: 30000
    };
    
    const base = baseTimeouts[operation] || baseTimeouts.default;
    
    // Адаптація на основі системного навантаження
    let multiplier = 1;
    
    if (this.systemLoad > 0.8) {
      multiplier *= 2; // Подвоїти timeout при високому навантаженні
    } else if (this.systemLoad > 0.5) {
      multiplier *= 1.5;
    }
    
    // Адаптація на основі частоти помилок
    if (this.errorRate > 0.3) {
      multiplier *= 1.5; // Збільшити timeout при високій частоті помилок
    }
    
    // Адаптація на основі середнього часу відповіді
    if (this.avgResponseTime > base * 0.8) {
      multiplier *= 1.3; // Збільшити якщо наближаємося до ліміту
    }
    
    const timeout = Math.round(base * multiplier);
    this.setCache(cacheKey, timeout);
    
    logger.debug('dynamic-config', 
      `Dynamic timeout for ${operation}: ${timeout}ms (base: ${base}ms, multiplier: ${multiplier}x)`);
    
    return timeout;
  }
  
  /**
   * Отримати оптимальну модель на основі контексту
   */
  getModel(purpose = 'general') {
    const cacheKey = `model:${purpose}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;
    
    // Моделі за призначенням та складністю
    const models = {
      planning: {
        simple: 'atlas-mistral-nemo',
        medium: 'atlas-mistral-medium-2505',
        complex: 'atlas-mistral-large'
      },
      verification: {
        simple: 'atlas-mistral-3b',
        medium: 'atlas-mistral-nemo',
        complex: 'atlas-mistral-medium-2505'
      },
      vision: {
        simple: 'llava-v1.5-7b',
        medium: 'llava-v1.6-mistral-7b',
        complex: 'gpt-4-vision-preview'
      },
      general: {
        simple: 'atlas-mistral-nemo',
        medium: 'atlas-mistral-medium-2505',
        complex: 'atlas-mistral-large'
      }
    };
    
    const modelSet = models[purpose] || models.general;
    
    // Визначити складність
    let complexity = 'medium';
    
    if (this.contextComplexity > 0.7) {
      complexity = 'complex';
    } else if (this.contextComplexity < 0.3) {
      complexity = 'simple';
    }
    
    // Адаптація на основі частоти помилок
    if (this.errorRate > 0.4 && complexity !== 'complex') {
      // Підвищити рівень моделі при високій частоті помилок
      complexity = complexity === 'simple' ? 'medium' : 'complex';
    }
    
    const model = modelSet[complexity];
    this.setCache(cacheKey, model);
    
    logger.debug('dynamic-config', 
      `Selected model for ${purpose}: ${model} (complexity: ${complexity})`);
    
    return model;
  }
  
  /**
   * Отримати кількість retry спроб
   */
  getRetryAttempts(operation = 'default') {
    const cacheKey = `retry:${operation}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;
    
    // Базові значення
    const baseRetries = {
      llm: 3,
      network: 5,
      validation: 2,
      default: 3
    };
    
    let retries = baseRetries[operation] || baseRetries.default;
    
    // Зменшити retries при високому навантаженні
    if (this.systemLoad > 0.8) {
      retries = Math.max(1, retries - 1);
    }
    
    // Збільшити retries при високій частоті помилок
    if (this.errorRate > 0.3) {
      retries = Math.min(10, retries + 1);
    }
    
    this.setCache(cacheKey, retries);
    
    return retries;
  }
  
  /**
   * Отримати backoff стратегію
   */
  getBackoffStrategy() {
    // Експоненційний backoff при низькому навантаженні
    // Лінійний при високому (щоб не затримувати надто довго)
    return this.systemLoad > 0.7 ? 'linear' : 'exponential';
  }
  
  /**
   * Отримати розмір батчу для операцій
   */
  getBatchSize(operation = 'default') {
    const baseSizes = {
      tool_execution: 5,
      validation: 10,
      processing: 20,
      default: 10
    };
    
    let size = baseSizes[operation] || baseSizes.default;
    
    // Зменшити batch size при високому навантаженні
    if (this.systemLoad > 0.7) {
      size = Math.max(1, Math.floor(size * 0.5));
    }
    
    return size;
  }
  
  /**
   * Отримати температуру для LLM
   */
  getTemperature(purpose = 'general') {
    const temperatures = {
      planning: 0.1,      // Низька для точного планування
      creative: 0.8,      // Висока для креативних завдань
      verification: 0.0,  // Нульова для детермінованої верифікації
      general: 0.3        // Середня для загальних завдань
    };
    
    let temp = temperatures[purpose] || temperatures.general;
    
    // Знизити температуру при високій частоті помилок
    if (this.errorRate > 0.3) {
      temp = Math.max(0, temp - 0.1);
    }
    
    return temp;
  }
  
  /**
   * Оновити системні метрики
   */
  updateMetrics(metrics) {
    if (metrics.systemLoad !== undefined) {
      this.systemLoad = metrics.systemLoad;
    }
    if (metrics.errorRate !== undefined) {
      this.errorRate = metrics.errorRate;
    }
    if (metrics.avgResponseTime !== undefined) {
      this.avgResponseTime = metrics.avgResponseTime;
    }
    if (metrics.contextComplexity !== undefined) {
      this.contextComplexity = metrics.contextComplexity;
    }
    
    // Очистити кеш при оновленні метрик
    this.clearCache();
  }
  
  /**
   * Кеш helpers
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value;
    }
    return null;
  }
  
  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Configuration Manager
 * Централізоване управління конфігурацією
 */
export class ConfigurationManager {
  constructor() {
    this.dynamicDefaults = new DynamicDefaults();
    this.overrides = new Map();
    this.features = new Map();
    
    // Ініціалізація feature flags
    this.initFeatureFlags();
  }
  
  /**
   * Ініціалізація feature flags
   */
  initFeatureFlags() {
    // Feature flags для поступового впровадження
    this.features.set('intelligent_error_handling', true);
    this.features.set('dynamic_timeouts', true);
    this.features.set('adaptive_models', true);
    this.features.set('learning_system', true);
    this.features.set('auto_retry', true);
    this.features.set('smart_caching', true);
    this.features.set('dependency_resolution', true);
    this.features.set('vision_nlp_parsing', false); // Експериментальна функція
  }
  
  /**
   * Отримати значення конфігурації
   */
  get(key, defaultValue = null) {
    // Перевірити overrides
    if (this.overrides.has(key)) {
      return this.overrides.get(key);
    }
    
    // Перевірити environment variables
    const envKey = `ATLAS_${key.toUpperCase()}`;
    if (process.env[envKey]) {
      return this.parseEnvValue(process.env[envKey]);
    }
    
    // Використати динамічні defaults
    const dynamicValue = this.getDynamicValue(key);
    if (dynamicValue !== null) {
      return dynamicValue;
    }
    
    return defaultValue;
  }
  
  /**
   * Встановити override
   */
  set(key, value) {
    this.overrides.set(key, value);
    logger.debug('config-manager', `Override set: ${key} = ${value}`);
  }
  
  /**
   * Отримати динамічне значення
   */
  getDynamicValue(key) {
    switch (key) {
      case 'timeout':
        return this.dynamicDefaults.getTimeout();
      case 'model':
        return this.dynamicDefaults.getModel();
      case 'retry_attempts':
        return this.dynamicDefaults.getRetryAttempts();
      case 'backoff_strategy':
        return this.dynamicDefaults.getBackoffStrategy();
      case 'batch_size':
        return this.dynamicDefaults.getBatchSize();
      case 'temperature':
        return this.dynamicDefaults.getTemperature();
      default:
        return null;
    }
  }
  
  /**
   * Перевірити чи функція увімкнена
   */
  isFeatureEnabled(feature) {
    return this.features.get(feature) === true;
  }
  
  /**
   * Увімкнути/вимкнути функцію
   */
  setFeature(feature, enabled) {
    this.features.set(feature, enabled);
    logger.system('config-manager', `Feature ${feature}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
  
  /**
   * Parse environment variable value
   */
  parseEnvValue(value) {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Try to parse as number
      const num = Number(value);
      if (!isNaN(num)) return num;
      
      // Parse as boolean
      if (value === 'true') return true;
      if (value === 'false') return false;
      
      // Return as string
      return value;
    }
  }
  
  /**
   * Отримати всю конфігурацію
   */
  getAll() {
    const config = {};
    
    // Динамічні значення
    config.dynamic = {
      timeout: this.dynamicDefaults.getTimeout(),
      model: this.dynamicDefaults.getModel(),
      retryAttempts: this.dynamicDefaults.getRetryAttempts(),
      backoffStrategy: this.dynamicDefaults.getBackoffStrategy(),
      batchSize: this.dynamicDefaults.getBatchSize(),
      temperature: this.dynamicDefaults.getTemperature()
    };
    
    // Overrides
    config.overrides = Object.fromEntries(this.overrides);
    
    // Features
    config.features = Object.fromEntries(this.features);
    
    // System metrics
    config.metrics = {
      systemLoad: this.dynamicDefaults.systemLoad,
      errorRate: this.dynamicDefaults.errorRate,
      avgResponseTime: this.dynamicDefaults.avgResponseTime,
      contextComplexity: this.dynamicDefaults.contextComplexity
    };
    
    return config;
  }
  
  /**
   * Оновити системні метрики
   */
  updateMetrics(metrics) {
    this.dynamicDefaults.updateMetrics(metrics);
  }
}

// Singleton instance
const configManager = new ConfigurationManager();

export default configManager;
