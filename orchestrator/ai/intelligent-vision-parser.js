/**
 * Intelligent Vision Parser
 * Інтелектуальний парсер для обробки неструктурованих відповідей від Vision моделей
 * 
 * @version 1.0.0
 * @date 2025-10-24
 */

import logger from '../utils/logger.js';
import configManager from '../../config/dynamic-config.js';

/**
 * Ключові слова та їх семантичні значення
 */
const SEMANTIC_PATTERNS = {
  VERIFICATION_SUCCESS: {
    patterns: [
      /success|successful|succeeded|completed|done|finished/i,
      /verified|confirmed|validated|correct|accurate/i,
      /match|matches|matching|corresponds|consistent/i,
      /found|detected|observed|visible|present/i
    ],
    weight: 1.0,
    category: 'positive'
  },
  
  VERIFICATION_FAILURE: {
    patterns: [
      /fail|failed|failure|unsuccessful|error/i,
      /not found|missing|absent|invisible|cannot see/i,
      /incorrect|wrong|inaccurate|mismatch/i,
      /unable|cannot|could not|impossible/i
    ],
    weight: -1.0,
    category: 'negative'
  },
  
  PARTIAL_SUCCESS: {
    patterns: [
      /partial|partially|some|mostly|almost/i,
      /nearly|close to|approximately|roughly/i,
      /incomplete|not fully|not completely/i
    ],
    weight: 0.5,
    category: 'partial'
  },
  
  CONFIDENCE_HIGH: {
    patterns: [
      /definitely|certainly|absolutely|clearly/i,
      /obvious|evident|apparent|unmistakable/i,
      /100%|high confidence|very sure|confident/i
    ],
    weight: 0.3,
    category: 'confidence'
  },
  
  CONFIDENCE_LOW: {
    patterns: [
      /maybe|perhaps|possibly|might be/i,
      /uncertain|unsure|not sure|unclear/i,
      /hard to tell|difficult to determine/i
    ],
    weight: -0.3,
    category: 'confidence'
  },
  
  VISUAL_ELEMENTS: {
    patterns: [
      /window|screen|display|interface/i,
      /button|icon|menu|toolbar/i,
      /text|number|digit|character/i,
      /image|picture|graphic|logo/i
    ],
    weight: 0.1,
    category: 'visual'
  },
  
  NUMERICAL_VALUES: {
    patterns: [
      /\d+\.?\d*/,
      /zero|one|two|three|four|five|six|seven|eight|nine/i,
      /first|second|third|fourth|fifth/i
    ],
    weight: 0.2,
    category: 'numeric'
  }
};

/**
 * Context-aware parsing strategies
 */
const PARSING_STRATEGIES = {
  CALCULATOR: {
    keywords: ['calculator', 'calculation', 'result', 'equals', 'sum', 'product'],
    extractors: [
      { pattern: /result\s*[:=]\s*(\d+\.?\d*)/i, type: 'result' },
      { pattern: /displays?\s*[:=]?\s*(\d+\.?\d*)/i, type: 'display' },
      { pattern: /shows?\s*[:=]?\s*(\d+\.?\d*)/i, type: 'display' },
      { pattern: /(\d+\.?\d*)\s*(?:is|was|are)\s*(?:the\s*)?(?:result|answer)/i, type: 'result' }
    ]
  },
  
  FILE_SYSTEM: {
    keywords: ['file', 'folder', 'directory', 'created', 'exists', 'saved'],
    extractors: [
      { pattern: /(?:file|folder|directory)\s*"([^"]+)"/i, type: 'name' },
      { pattern: /created\s+(?:a\s+)?(?:file|folder|directory)\s+(?:named\s+)?([^\s,\.]+)/i, type: 'name' },
      { pattern: /saved\s+(?:to|as|in)\s+([^\s,\.]+)/i, type: 'path' }
    ]
  },
  
  APPLICATION: {
    keywords: ['application', 'app', 'program', 'software', 'window', 'open'],
    extractors: [
      { pattern: /(?:application|app|program)\s*"([^"]+)"/i, type: 'app_name' },
      { pattern: /(\w+)\s+(?:is|was)\s+(?:opened|launched|running)/i, type: 'app_name' },
      { pattern: /window\s+(?:titled?|named?)\s*"([^"]+)"/i, type: 'window_title' }
    ]
  },
  
  WEB_PAGE: {
    keywords: ['website', 'webpage', 'browser', 'url', 'loaded', 'navigated'],
    extractors: [
      { pattern: /(?:url|address)\s*[:=]?\s*([^\s]+)/i, type: 'url' },
      { pattern: /(?:page|site)\s+(?:titled?|named?)\s*"([^"]+)"/i, type: 'title' },
      { pattern: /navigated?\s+to\s+([^\s]+)/i, type: 'url' }
    ]
  }
};

/**
 * Intelligent Vision Parser
 */
export class IntelligentVisionParser {
  constructor(options = {}) {
    this.contextHistory = [];
    this.maxHistorySize = options.maxHistorySize || 10;
    this.learningEnabled = options.learningEnabled !== false;
    
    // Навчені патерни
    this.learnedPatterns = new Map();
    
    // Метрики
    this.metrics = {
      totalParsed: 0,
      successfulParsed: 0,
      contextMatches: 0,
      learnedPatternUsed: 0
    };
  }
  
  /**
   * Парсити текстову відповідь від Vision моделі
   */
  parseTextResponse(text, context = {}) {
    this.metrics.totalParsed++;
    
    logger.system('vision-parser', `🔍 Parsing text response (${text.length} chars)`);
    
    // Спробувати знайти JSON в тексті
    const jsonResult = this.extractJSON(text);
    if (jsonResult) {
      this.metrics.successfulParsed++;
      return jsonResult;
    }
    
    // Використати навчені патерни
    if (this.learningEnabled) {
      const learnedResult = this.applyLearnedPatterns(text, context);
      if (learnedResult) {
        this.metrics.learnedPatternUsed++;
        return learnedResult;
      }
    }
    
    // Семантичний аналіз
    const semanticResult = this.semanticAnalysis(text, context);
    
    // Контекстний аналіз
    const contextResult = this.contextualExtraction(text, context);
    
    // Об'єднати результати
    const result = this.mergeResults(semanticResult, contextResult);
    
    // Додати в історію для навчання
    this.addToHistory(text, result, context);
    
    if (result.confidence > 50) {
      this.metrics.successfulParsed++;
    }
    
    return result;
  }
  
  /**
   * Спробувати витягнути JSON з тексту
   */
  extractJSON(text) {
    // Пряме парсування
    try {
      return JSON.parse(text);
    } catch {}
    
    // Знайти JSON об'єкт в тексті
    const jsonMatches = [
      /\{[\s\S]*\}/,           // Стандартний JSON
      /```json\s*([\s\S]*?)```/,  // Markdown code block
      /```\s*([\s\S]*?)```/       // Generic code block
    ];
    
    for (const pattern of jsonMatches) {
      const match = text.match(pattern);
      if (match) {
        try {
          const jsonStr = match[1] || match[0];
          return JSON.parse(jsonStr);
        } catch {
          // Спробувати виправити синтаксис
          const fixed = this.fixJSONSyntax(jsonStr);
          try {
            return JSON.parse(fixed);
          } catch {}
        }
      }
    }
    
    return null;
  }
  
  /**
   * Виправити синтаксичні помилки в JSON
   */
  fixJSONSyntax(jsonStr) {
    return jsonStr
      // Виправити незакриті лапки
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      // Виправити значення без лапок
      .replace(/:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}])/g, ': "$1"$2')
      // Зберегти булеві значення та null
      .replace(/:\s*"(true|false|null)"\s*([,}])/g, ': $1$2')
      // Виправити числа в лапках
      .replace(/:\s*"(\d+\.?\d*)"\s*([,}])/g, ': $1$2')
      // Видалити trailing commas
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
  }
  
  /**
   * Семантичний аналіз тексту
   */
  semanticAnalysis(text, context) {
    const result = {
      verified: false,
      confidence: 0,
      reason: '',
      semantic_scores: {}
    };
    
    let totalScore = 0;
    let matchCount = 0;
    
    // Аналіз по всіх семантичних патернах
    for (const [name, config] of Object.entries(SEMANTIC_PATTERNS)) {
      let score = 0;
      let matches = 0;
      
      for (const pattern of config.patterns) {
        const patternMatches = text.match(new RegExp(pattern, 'gi'));
        if (patternMatches) {
          matches += patternMatches.length;
          score += config.weight * patternMatches.length;
        }
      }
      
      if (matches > 0) {
        result.semantic_scores[name] = {
          matches,
          score,
          category: config.category
        };
        
        totalScore += score;
        matchCount += matches;
      }
    }
    
    // Визначити загальний результат
    if (totalScore > 0) {
      result.verified = true;
      result.confidence = Math.min(100, Math.round(50 + totalScore * 10));
    } else if (totalScore < 0) {
      result.verified = false;
      result.confidence = Math.max(0, Math.round(50 + totalScore * 10));
    } else {
      result.verified = false;
      result.confidence = 25;
    }
    
    // Створити reason на основі аналізу
    const positiveScores = Object.entries(result.semantic_scores)
      .filter(([_, s]) => s.category === 'positive')
      .sort((a, b) => b[1].score - a[1].score);
    
    const negativeScores = Object.entries(result.semantic_scores)
      .filter(([_, s]) => s.category === 'negative')
      .sort((a, b) => Math.abs(b[1].score) - Math.abs(a[1].score));
    
    if (positiveScores.length > 0) {
      result.reason = `Detected positive indicators: ${positiveScores[0][0].toLowerCase().replace(/_/g, ' ')}`;
    } else if (negativeScores.length > 0) {
      result.reason = `Detected negative indicators: ${negativeScores[0][0].toLowerCase().replace(/_/g, ' ')}`;
    } else {
      result.reason = 'No clear verification indicators found in text';
    }
    
    return result;
  }
  
  /**
   * Контекстна екстракція даних
   */
  contextualExtraction(text, context) {
    const result = {
      extracted_data: {},
      context_match: null
    };
    
    // Визначити контекст
    const detectedContext = this.detectContext(text, context);
    
    if (detectedContext) {
      result.context_match = detectedContext.name;
      this.metrics.contextMatches++;
      
      // Застосувати екстрактори для контексту
      const strategy = PARSING_STRATEGIES[detectedContext.name];
      
      for (const extractor of strategy.extractors) {
        const match = text.match(extractor.pattern);
        if (match) {
          result.extracted_data[extractor.type] = match[1];
        }
      }
    }
    
    // Загальна екстракція чисел
    const numbers = text.match(/\d+\.?\d*/g);
    if (numbers && numbers.length > 0) {
      result.extracted_data.numbers = numbers;
    }
    
    // Екстракція шляхів
    const paths = text.match(/(?:\/[\w\-\.]+)+/g);
    if (paths && paths.length > 0) {
      result.extracted_data.paths = paths;
    }
    
    // Екстракція URL
    const urls = text.match(/https?:\/\/[^\s]+/g);
    if (urls && urls.length > 0) {
      result.extracted_data.urls = urls;
    }
    
    return result;
  }
  
  /**
   * Визначити контекст
   */
  detectContext(text, providedContext) {
    // Використати наданий контекст
    if (providedContext.type) {
      return { name: providedContext.type };
    }
    
    // Автоматичне визначення
    let bestMatch = null;
    let maxScore = 0;
    
    for (const [name, strategy] of Object.entries(PARSING_STRATEGIES)) {
      let score = 0;
      
      for (const keyword of strategy.keywords) {
        if (text.toLowerCase().includes(keyword)) {
          score++;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = name;
      }
    }
    
    return bestMatch ? { name: bestMatch } : null;
  }
  
  /**
   * Об'єднати результати різних аналізів
   */
  mergeResults(semantic, contextual) {
    const result = {
      verified: semantic.verified,
      confidence: semantic.confidence,
      reason: semantic.reason,
      visual_evidence: {
        observed: 'Parsed from text response',
        matches_criteria: semantic.verified,
        details: {}
      },
      metadata: {
        parsing_method: 'intelligent_text_parsing',
        semantic_scores: semantic.semantic_scores,
        context_match: contextual.context_match,
        extracted_data: contextual.extracted_data
      }
    };
    
    // Додати витягнені дані в details
    if (contextual.extracted_data) {
      result.visual_evidence.details = contextual.extracted_data;
    }
    
    // Підвищити confidence якщо є контекстне співпадіння
    if (contextual.context_match) {
      result.confidence = Math.min(100, result.confidence + 10);
    }
    
    return result;
  }
  
  /**
   * Застосувати навчені патерни
   */
  applyLearnedPatterns(text, context) {
    const contextKey = this.getContextKey(context);
    const learnedPattern = this.learnedPatterns.get(contextKey);
    
    if (!learnedPattern) return null;
    
    // Перевірити схожість з навченим патерном
    const similarity = this.calculateSimilarity(text, learnedPattern.text);
    
    if (similarity > 0.7) {
      logger.system('vision-parser', 
        `📚 Using learned pattern (similarity: ${(similarity * 100).toFixed(1)}%)`);
      
      return {
        ...learnedPattern.result,
        confidence: Math.round(learnedPattern.result.confidence * similarity),
        metadata: {
          ...learnedPattern.result.metadata,
          learned_pattern: true,
          similarity
        }
      };
    }
    
    return null;
  }
  
  /**
   * Розрахувати схожість текстів
   */
  calculateSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Додати в історію для навчання
   */
  addToHistory(text, result, context) {
    if (!this.learningEnabled) return;
    
    this.contextHistory.push({
      text,
      result,
      context,
      timestamp: Date.now()
    });
    
    // Обмежити розмір історії
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory.shift();
    }
    
    // Навчитися на успішних результатах
    if (result.confidence > 80) {
      const contextKey = this.getContextKey(context);
      this.learnedPatterns.set(contextKey, {
        text,
        result,
        context,
        useCount: 0
      });
    }
  }
  
  /**
   * Отримати ключ контексту
   */
  getContextKey(context) {
    return `${context.type || 'unknown'}:${context.criteria || 'general'}`;
  }
  
  /**
   * Аналіз з використанням контекстної історії
   */
  analyzeWithContext(text, history) {
    // Використати історію для покращення аналізу
    const relevantHistory = history.slice(-3); // Останні 3 результати
    
    // Знайти патерни в історії
    const patterns = this.findHistoryPatterns(relevantHistory);
    
    // Адаптувати парсинг на основі патернів
    const result = this.parseTextResponse(text, {
      history: relevantHistory,
      patterns
    });
    
    // Коригувати confidence на основі історії
    if (patterns.consistent) {
      result.confidence = Math.min(100, result.confidence + 15);
    }
    
    return result;
  }
  
  /**
   * Знайти патерни в історії
   */
  findHistoryPatterns(history) {
    const patterns = {
      consistent: true,
      trend: null,
      common_elements: []
    };
    
    if (history.length < 2) return patterns;
    
    // Перевірити консистентність
    const results = history.map(h => h.verified);
    patterns.consistent = results.every(r => r === results[0]);
    
    // Визначити тренд
    if (results.length >= 3) {
      const recent = results.slice(-3);
      if (recent.every(r => r === true)) {
        patterns.trend = 'success';
      } else if (recent.every(r => r === false)) {
        patterns.trend = 'failure';
      } else {
        patterns.trend = 'mixed';
      }
    }
    
    return patterns;
  }
  
  /**
   * Отримати метрики
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalParsed > 0
        ? (this.metrics.successfulParsed / this.metrics.totalParsed * 100).toFixed(2) + '%'
        : '0%',
      contextMatchRate: this.metrics.totalParsed > 0
        ? (this.metrics.contextMatches / this.metrics.totalParsed * 100).toFixed(2) + '%'
        : '0%',
      learningEffectiveness: this.metrics.learnedPatternUsed > 0
        ? `${this.metrics.learnedPatternUsed} patterns applied`
        : 'No patterns applied yet'
    };
  }
}

export default IntelligentVisionParser;
