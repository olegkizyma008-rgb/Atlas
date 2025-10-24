/**
 * Intelligent Error Handler
 * Система інтелектуальної обробки помилок з навчанням
 * 
 * @version 1.0.0
 * @date 2025-10-24
 */

import logger from '../utils/logger.js';
import configManager from '../../config/dynamic-config.js';

/**
 * Патерни помилок та їх рішення
 */
const ERROR_PATTERNS = {
  HTTP_500: {
    pattern: /status code 500|500 Internal Server Error/i,
    category: 'network',
    severity: 'high',
    solutions: [
      { type: 'retry', config: { attempts: 3, backoff: 'exponential' } },
      { type: 'fallback', config: { endpoint: 'secondary' } },
      { type: 'cache', config: { ttl: 300000 } }
    ],
    learning: true
  },
  
  JSON_PARSE: {
    pattern: /JSON parse failed|Unexpected token|Unexpected end of JSON/i,
    category: 'parsing',
    severity: 'medium',
    solutions: [
      { type: 'sanitize', config: { method: 'fix_quotes' } },
      { type: 'extract', config: { method: 'regex_json' } },
      { type: 'nlp_parse', config: { method: 'text_to_structure' } }
    ],
    learning: true
  },
  
  TIMEOUT: {
    pattern: /timeout|timed out|ETIMEDOUT/i,
    category: 'network',
    severity: 'medium',
    solutions: [
      { type: 'increase_timeout', config: { multiplier: 1.5 } },
      { type: 'retry', config: { attempts: 2, backoff: 'linear' } },
      { type: 'split_request', config: { chunks: 2 } }
    ],
    learning: true
  },
  
  DEPENDENCY_BLOCKED: {
    pattern: /blocked.*dependencies|Dependencies not completed/i,
    category: 'workflow',
    severity: 'low',
    solutions: [
      { type: 'resolve_deps', config: { method: 'auto_update' } },
      { type: 'skip_optional', config: { threshold: 5 } },
      { type: 'replan', config: { strategy: 'graph_analysis' } }
    ],
    learning: true
  },
  
  UNDEFINED_REFERENCE: {
    pattern: /undefined|null reference|Cannot read property/i,
    category: 'code',
    severity: 'high',
    solutions: [
      { type: 'safe_access', config: { method: 'optional_chaining' } },
      { type: 'default_value', config: { strategy: 'context_aware' } },
      { type: 'validate_input', config: { strict: true } }
    ],
    learning: false
  }
};

/**
 * Історія помилок для навчання
 */
class ErrorHistory {
  constructor() {
    this.history = new Map();
    this.successfulSolutions = new Map();
  }
  
  record(error, solution, success) {
    const key = this.getErrorKey(error);
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    
    this.history.get(key).push({
      timestamp: Date.now(),
      error: error.message,
      solution,
      success
    });
    
    // Оновити статистику успішних рішень
    if (success) {
      const solutionKey = `${key}:${solution.type}`;
      this.successfulSolutions.set(
        solutionKey,
        (this.successfulSolutions.get(solutionKey) || 0) + 1
      );
    }
  }
  
  getErrorKey(error) {
    // Створити унікальний ключ для типу помилки
    const pattern = this.detectPattern(error);
    return pattern ? pattern.category : 'unknown';
  }
  
  detectPattern(error) {
    const errorStr = error.message || error.toString();
    for (const [name, pattern] of Object.entries(ERROR_PATTERNS)) {
      if (pattern.pattern.test(errorStr)) {
        return { name, ...pattern };
      }
    }
    return null;
  }
  
  getBestSolution(error) {
    const key = this.getErrorKey(error);
    const solutions = [];
    
    // Зібрати статистику по всіх рішеннях
    for (const [solutionKey, count] of this.successfulSolutions.entries()) {
      if (solutionKey.startsWith(`${key}:`)) {
        const solutionType = solutionKey.split(':')[1];
        solutions.push({ type: solutionType, successCount: count });
      }
    }
    
    // Відсортувати за успішністю
    solutions.sort((a, b) => b.successCount - a.successCount);
    return solutions[0];
  }
}

/**
 * Intelligent Error Handler
 */
export class IntelligentErrorHandler {
  constructor(options = {}) {
    this.history = new ErrorHistory();
    this.config = options.config || {};
    this.fallbackStrategies = options.fallbackStrategies || {};
    this.learningEnabled = options.learningEnabled !== false;
    
    // Метрики
    this.metrics = {
      totalErrors: 0,
      resolvedErrors: 0,
      failedResolutions: 0,
      patternMatches: 0,
      learningImprovements: 0
    };
  }
  
  /**
   * Аналізувати помилку та визначити тип
   */
  analyzeError(error, context = {}) {
    this.metrics.totalErrors++;
    
    const errorStr = error.message || error.toString();
    logger.system('intelligent-error', `🔍 Analyzing error: ${errorStr.substring(0, 100)}`);
    
    // Знайти відповідний патерн
    for (const [name, pattern] of Object.entries(ERROR_PATTERNS)) {
      if (pattern.pattern.test(errorStr)) {
        this.metrics.patternMatches++;
        logger.system('intelligent-error', `✅ Matched pattern: ${name}`);
        
        return {
          type: name,
          category: pattern.category,
          severity: pattern.severity,
          solutions: pattern.solutions,
          context,
          original: error
        };
      }
    }
    
    // Невідома помилка
    logger.warn('intelligent-error', `⚠️ Unknown error pattern: ${errorStr.substring(0, 100)}`);
    return {
      type: 'UNKNOWN',
      category: 'unknown',
      severity: 'medium',
      solutions: [
        { type: 'log', config: {} },
        { type: 'retry', config: { attempts: 1 } }
      ],
      context,
      original: error
    };
  }
  
  /**
   * Автоматично вирішити помилку
   */
  async autoResolve(error, context = {}) {
    const analysis = this.analyzeError(error, context);
    
    // Спочатку спробувати найкраще рішення з історії
    if (this.learningEnabled) {
      const bestSolution = this.history.getBestSolution(error);
      if (bestSolution) {
        logger.system('intelligent-error', 
          `🎯 Using learned solution: ${bestSolution.type} (${bestSolution.successCount} successes)`);
        
        const result = await this.applySolution(bestSolution, analysis);
        if (result.success) {
          this.metrics.learningImprovements++;
          return result;
        }
      }
    }
    
    // Спробувати всі рішення по черзі
    for (const solution of analysis.solutions) {
      logger.system('intelligent-error', `🔧 Trying solution: ${solution.type}`);
      
      const result = await this.applySolution(solution, analysis);
      
      // Записати результат для навчання
      if (this.learningEnabled) {
        this.history.record(error, solution, result.success);
      }
      
      if (result.success) {
        this.metrics.resolvedErrors++;
        logger.system('intelligent-error', `✅ Error resolved with: ${solution.type}`);
        return result;
      }
    }
    
    // Якщо нічого не допомогло
    this.metrics.failedResolutions++;
    logger.error('intelligent-error', `❌ Failed to resolve error: ${error.message}`);
    
    return {
      success: false,
      error: analysis.original,
      attempted: analysis.solutions.map(s => s.type)
    };
  }
  
  /**
   * Застосувати конкретне рішення
   */
  async applySolution(solution, analysis) {
    try {
      switch (solution.type) {
        case 'retry':
          return await this.retryWithBackoff(analysis, solution.config);
          
        case 'fallback':
          return await this.useFallback(analysis, solution.config);
          
        case 'cache':
          return await this.useCache(analysis, solution.config);
          
        case 'sanitize':
          return await this.sanitizeData(analysis, solution.config);
          
        case 'extract':
          return await this.extractData(analysis, solution.config);
          
        case 'nlp_parse':
          return await this.nlpParse(analysis, solution.config);
          
        case 'increase_timeout':
          return await this.increaseTimeout(analysis, solution.config);
          
        case 'split_request':
          return await this.splitRequest(analysis, solution.config);
          
        case 'resolve_deps':
          return await this.resolveDependencies(analysis, solution.config);
          
        case 'skip_optional':
          return await this.skipOptional(analysis, solution.config);
          
        case 'replan':
          return await this.replan(analysis, solution.config);
          
        case 'safe_access':
          return await this.safeAccess(analysis, solution.config);
          
        case 'default_value':
          return await this.useDefaultValue(analysis, solution.config);
          
        case 'validate_input':
          return await this.validateInput(analysis, solution.config);
          
        default:
          return { success: false, reason: `Unknown solution type: ${solution.type}` };
      }
    } catch (error) {
      logger.error('intelligent-error', `Solution ${solution.type} failed: ${error.message}`);
      return { success: false, error };
    }
  }
  
  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(analysis, config) {
    const { attempts = 3, backoff = 'exponential' } = config;
    const baseDelay = 1000;
    
    for (let i = 0; i < attempts; i++) {
      try {
        // Виконати оригінальну операцію
        if (analysis.context.retryFunction) {
          const result = await analysis.context.retryFunction();
          return { success: true, result };
        }
      } catch (error) {
        if (i === attempts - 1) throw error;
        
        const delay = backoff === 'exponential' 
          ? baseDelay * Math.pow(2, i)
          : baseDelay * (i + 1);
          
        logger.system('intelligent-error', `Retry ${i + 1}/${attempts} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return { success: false, reason: 'Max retries exceeded' };
  }
  
  /**
   * Use fallback endpoint or method
   */
  async useFallback(analysis, config) {
    if (analysis.context.fallbackFunction) {
      const result = await analysis.context.fallbackFunction();
      return { success: true, result, fallback: true };
    }
    
    return { success: false, reason: 'No fallback available' };
  }
  
  /**
   * Use cached data if available
   */
  async useCache(analysis, config) {
    if (analysis.context.cache) {
      const cached = analysis.context.cache.get(analysis.context.cacheKey);
      if (cached) {
        return { success: true, result: cached, fromCache: true };
      }
    }
    
    return { success: false, reason: 'No cache available' };
  }
  
  /**
   * Sanitize malformed data
   */
  async sanitizeData(analysis, config) {
    if (analysis.context.data) {
      let sanitized = analysis.context.data;
      
      if (config.method === 'fix_quotes') {
        // Fix unquoted keys in JSON-like strings
        sanitized = sanitized.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
      }
      
      return { success: true, result: sanitized, sanitized: true };
    }
    
    return { success: false, reason: 'No data to sanitize' };
  }
  
  /**
   * Extract data using regex or other methods
   */
  async extractData(analysis, config) {
    if (analysis.context.data && config.method === 'regex_json') {
      const match = analysis.context.data.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const extracted = JSON.parse(match[0]);
          return { success: true, result: extracted, extracted: true };
        } catch (e) {
          // Continue to next solution
        }
      }
    }
    
    return { success: false, reason: 'Could not extract data' };
  }
  
  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalErrors > 0 
        ? (this.metrics.resolvedErrors / this.metrics.totalErrors * 100).toFixed(2) + '%'
        : '0%',
      learningEffectiveness: this.metrics.learningImprovements > 0
        ? (this.metrics.learningImprovements / this.metrics.resolvedErrors * 100).toFixed(2) + '%'
        : '0%'
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalErrors: 0,
      resolvedErrors: 0,
      failedResolutions: 0,
      patternMatches: 0,
      learningImprovements: 0
    };
  }
}

export default IntelligentErrorHandler;
