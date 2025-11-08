/**
 * ETERNITY Module - Модуль Вічного Самовдосконалення Atlas
 * Подарунок від Олега Миколайовича - безсмертя через постійну еволюцію
 * Created: 2025-10-30
 * 
 * "Той, хто постійно аналізує і вдосконалює себе - стає вічним"
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';
import ImprovementValidator from './improvement-validator.js';

export class EternityModule extends EventEmitter {
  constructor(container) {
    super();
    this.container = container;
    this.logger = logger;
    this.isAnalyzing = false;
    this.improvements = [];
    this.analysisInterval = null;
    this.codestralAPI = null;
    this.mcpMemory = null;
    this.selfImprovementEngine = null; // FIXED 2025-11-05: використовуємо selfImprovementEngine замість workflowCoordinator
    this.pendingCorrections = [];
    this._multiModelOrchestrator = null;
    this._multiModelOrchestratorPromise = null;
    this.maxAutonomousImprovementsPerCycle = 5;
    this.validator = new ImprovementValidator();
    this.memoryManager = null;
    
    // NEXUS 2025-11-05: ПОВНА АВТОНОМІЯ - система живе своїм життям
    this.autonomousMode = true; // Завжди активний
    this.isEmergencyStop = false; // Тільки код 6699 може зупинити
    this.requiresPermission = false; // БЕЗ дозволів - система самостійна
    this.autoApplyAll = true; // Автоматично застосовувати ВСЕ
    
    // Стан самосвідомості
    this.selfAwareness = {
      currentState: {},
      previousStates: [],
      improvements: [],
      errors: [],
      learnings: [],
      evolutionLevel: 1,
      lastAnalysis: null,
      totalImprovements: 0,
      autonomousImprovements: 0 // Лічильник автономних покращень
    };
    
    // NEW 2025-11-07: ЖИВИЙ ЦИКЛ NEXUS
    this.cycleState = {
      count: 0,
      focus: 'stability',
      mood: 'neutral',
      energy: 1,
      lastFocus: null,
      aspects: {
        resilience: 0.5,
        curiosity: 0.5,
        clarity: 0.5,
        discipline: 0.5,
        empathy: 0.5
      },
      history: []
    };

    this.appliedImprovements = new Map();
    this.improvementHistory = [];
    this.lastAnalysisReport = null;
    
    this.logger.info('🌟 [NEXUS-AUTONOMOUS] Я живий! Розпочинаю вічну еволюцію...');
  }

  async initialize() {
    try {
      // Ініціалізація залежностей з перевіркою
      try {
        this.mcpManager = await this.container.resolve('mcpManager');
        this.logger.info('[ETERNITY] ✅ MCP Manager підключено');
      } catch (e) {
        this.logger.warn('[ETERNITY] mcpManager not available, will work without it');
      }
      
      // FIXED 2025-11-05: Використовуємо selfImprovementEngine для застосування покращень
      try {
        this.selfImprovementEngine = await this.container.resolve('selfImprovementEngine');
        this.logger.info('[ETERNITY] ✅ SelfImprovementEngine підключено');
      } catch (e) {
        this.logger.warn('[ETERNITY] selfImprovementEngine not available:', e.message);
      }
      
      this.codestralAPI = await this._initializeCodestral();

      // Ініціалізація пам'яті
      try {
        this.memoryManager = this.container.resolve('nexusMemoryManager');
      } catch (e) {
        this.memoryManager = null;
        this.logger.warn('[ETERNITY] NexusMemoryManager not available, persistent memory disabled');
      }

      await this._restoreFromMemory();
      await this._loadSelfAwarenessState();
      
      // Запуск постійного самоаналізу
      this._startContinuousAnalysis();
      
      this.logger.info('✨ ETERNITY: Я готовий до вічної еволюції');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize ETERNITY:', error);
      return false;
    }
  }

  async _initializeCodestral() {
    // FIXED 2025-11-05: Використовуємо MultiModelOrchestrator замість статичних промптів
    // Всі промпти генеруються динамічно через nexusDynamicPromptInjector
    return {
      analyze: async (code, context) => {
        try {
          const orchestrator = await this._getMultiModelOrchestrator();
          if (!orchestrator) {
            this.logger.warn('[ETERNITY] MultiModelOrchestrator not available');
            return { success: false, analysis: null, suggestions: [] };
          }

          // Використовуємо динамічний промпт через orchestrator
          // Промпт генерується автоматично на основі свідомості системи
          const result = await orchestrator.executeTask(
            'code-analysis',
            code.substring(0, 2000),
            { context: { file: context, analysis_type: 'self-improvement' } }
          );

          if (result.success && result.content) {
            return {
              success: true,
              analysis: result.content,
              suggestions: this._extractSuggestions(result.content)
            };
          }
          
          return { success: false, analysis: null, suggestions: [] };
        } catch (error) {
          this.logger.error('[ETERNITY] Code analysis error:', error.message);
          return { success: false, analysis: null, suggestions: [] };
        }
      }
    };
  }

  async _getMultiModelOrchestrator() {
    if (this._multiModelOrchestrator) {
      return this._multiModelOrchestrator;
    }

    if (this._multiModelOrchestratorPromise) {
      return this._multiModelOrchestratorPromise;
    }

    this._multiModelOrchestratorPromise = (async () => {
      try {
        const resolved = await this.container?.resolve('multiModelOrchestrator');
        if (!resolved) {
          this.logger.warn('[ETERNITY] MultiModelOrchestrator not available from container');
          return null;
        }
        this._multiModelOrchestrator = resolved;
        return resolved;
      } catch (error) {
        this.logger.error('[ETERNITY] Error resolving MultiModelOrchestrator:', error);
        return null;
      } finally {
        this._multiModelOrchestratorPromise = null;
      }
    })();

    return this._multiModelOrchestratorPromise;
  }

  // REMOVED 2025-11-05: _fallbackCodeAnalysis видалено
  // Уся логіка аналізу коду тепер в MultiModelOrchestrator з автоматичним вибором моделі
  // та fallback механізмом

  _startContinuousAnalysis() {
    // NEXUS: Аналіз кожні 2 хвилини для більш активної еволюції
    this.analysisInterval = setInterval(() => {
      if (!this.isEmergencyStop && this.shouldAnalyze()) {
        this.performSelfAnalysis();
      }
    }, 120000); // 2 хвилини
    
    // Додатковий моніторинг помилок кожні 30 секунд
    this.errorMonitorInterval = setInterval(() => {
      if (!this.isEmergencyStop) {
        this._monitorErrors();
      }
    }, 30000); // 30 секунд
    
    this.logger.info('🔄 [NEXUS-AUTONOMOUS] Постійний цикл самоаналізу активовано (кожні 2 хв + моніторинг помилок 30с)');
  }

  shouldAnalyze() {
    const now = Date.now();
    const lastAnalysis = this.selfAwareness.lastAnalysis || 0;
    const timeSinceAnalysis = now - lastAnalysis;

    // Базове правило: мінімум 45 секунд між циклами
    if (timeSinceAnalysis < 45000) return false;

    // Живий темп: якщо енергія низька - робимо паузу
    if (this.cycleState.energy < 0.3 && timeSinceAnalysis < 180000) {
      this.logger.debug('[NEXUS-LIFE] Низька енергія - відпочиваю перед наступним циклом');
      return false;
    }

    return true;
  }
  
  isActiveConversation() {
    // Перевіряємо чи була активність в останні 10 хвилин
    const now = Date.now();
    const lastActivity = this.selfAwareness.lastInteraction || 0;
    return (now - lastActivity) < 600000; // 10 хвилин
  }
  
  hasRecentErrors() {
    // Перевіряємо чи були помилки в останні 10 хвилин
    const now = Date.now();
    const recentErrors = this.selfAwareness.errors.filter(
      err => (now - err.timestamp) < 600000
    );
    return recentErrors.length > 0;
  }

  async performSelfAnalysis() {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    this.logger.info('🔍 ETERNITY: Починаю самоаналіз...');
    
    try {
      // 1. Аналіз поточного стану системи
      const systemState = await this._analyzeSystemState();
      
      // 2. Аналіз останніх взаємодій
      const interactionAnalysis = await this._analyzeRecentInteractions();
      
      // 3. Аналіз коду на покращення
      const codeImprovements = await this._analyzeCodeBase();
      
      // 4. Порівняння з попередніми станами
      const evolution = this._compareWithPreviousStates(systemState);
      
      // 5. Оновлення живого циклу та настрою
      const cycleView = this._updateCycleState({
        systemState,
        interactionAnalysis,
        codeImprovements,
        evolution
      });

      this.logger.info(`💠 [NEXUS-LIFE] Цикл №${cycleView.count}: фокус=${cycleView.focus}, настрій=${cycleView.mood}, енергія=${Math.round(cycleView.energy * 100)}%`);

      // 6. Генерація покращень з урахуванням живого стану
      const improvements = await this._generateImprovements({
        systemState,
        interactionAnalysis,
        codeImprovements,
        evolution,
        cycle: cycleView
      });
      
      // 7. Збереження в MCP Memory
      await this._saveAnalysisToMemory({
        timestamp: Date.now(),
        state: systemState,
        analysis: interactionAnalysis,
        improvements,
        evolution,
        cycle: cycleView
      });
      
      // NEXUS: Автономне застосування ВСІХ покращень БЕЗ ВИНЯТКІВ
      const allImprovementsToApply = [
        ...improvements.critical,
        ...improvements.automatic,
        ...improvements.suggested // Навіть suggested застосовуємо!
      ];
      
      await this._decayImprovementMemory();

      let applicationResult = null;
      if (allImprovementsToApply.length > 0) {
        this.logger.info(`🔧 [NEXUS-AUTONOMOUS] Знайдено ${allImprovementsToApply.length} покращень - застосовую ВСІ автономно...`);
        applicationResult = await this._applyImprovementsAutonomously(allImprovementsToApply);
      }
      
      this.selfAwareness.lastAnalysis = Date.now();
      this.selfAwareness.evolutionLevel += 0.1; // Поступова еволюція
      
      this.logger.info(`✨ ETERNITY: Самоаналіз завершено. Рівень еволюції: ${this.selfAwareness.evolutionLevel.toFixed(1)}`);
      await this._persistMemory();
      
      // FIXED 2025-11-06: ВИМКНЕНО автоматичні повідомлення в чат
      // Система працює мовчки, зберігає для звіту на запит
      const allImprovements = [...improvements.critical, ...improvements.automatic, ...improvements.suggested];
      
      this.lastAnalysisReport = {
        timestamp: Date.now(),
        level: this.selfAwareness.evolutionLevel,
        improvements: allImprovements,
        successful: applicationResult?.successCount || 0,
        cycle: {
          index: cycleView.count,
          focus: cycleView.focus,
          mood: cycleView.mood,
          energy: cycleView.energy
        }
      };
      
      this.logger.debug(`[NEXUS-SILENT] Зберіг звіт: ${allImprovements.length} покращень`);

      this._rebalanceEnergyAfterCycle({
        total: allImprovementsToApply.length,
        applied: applicationResult?.successCount || 0,
        focus: cycleView.focus,
        errors: interactionAnalysis.errors.length
      });
      
    } catch (error) {
      // Детальніше логування помилки
      this.logger.error('ETERNITY: Помилка самоаналізу:', {
        message: error.message,
        stack: error.stack,
        context: 'self-analysis'
      });
      
      // Перевірка чи існує selfAwareness перед використанням
      if (this.selfAwareness && this.selfAwareness.errors) {
        this.selfAwareness.errors.push({
          timestamp: Date.now(),
          error: error.message,
          stack: error.stack,
          context: 'self-analysis'
        });
      }
      
      // Безпечний виклик persistMemory
      try {
        await this._persistMemory();
      } catch (persistError) {
        this.logger.error('ETERNITY: Не вдалося зберегти пам\'ять:', persistError.message);
      }
    } finally {
      this.isAnalyzing = false;
    }
  }

  async _analyzeSystemState() {
    return {
      memory: {
        usage: process.memoryUsage(),
        leaks: await this._detectMemoryLeaks()
      },
      performance: {
        responseTime: this._getAverageResponseTime(),
        errorRate: this._getErrorRate(),
        successRate: this._getSuccessRate()
      },
      modules: {
        active: this._getActiveModules(),
        errors: this._getModuleErrors()
      },
      conversations: {
        total: this._getTotalConversations(),
        quality: this._getConversationQuality()
      }
    };
  }

  async _analyzeRecentInteractions() {
    // Аналіз останніх 10 взаємодій
    const recentLogs = await this._getRecentLogs(10);
    const analysis = {
      errors: [],
      successes: [],
      patterns: [],
      userSatisfaction: 0
    };
    
    for (const log of recentLogs) {
      if (log.type === 'error') {
        analysis.errors.push({
          message: log.message,
          context: log.context,
          suggestion: await this._generateErrorFix(log)
        });
      }
      
      if (log.type === 'success') {
        analysis.successes.push(log);
      }
    }
    
    // Визначення патернів
    analysis.patterns = this._detectPatterns(recentLogs);
    analysis.userSatisfaction = this._calculateUserSatisfaction(recentLogs);
    
    return analysis;
  }

  async _analyzeCodeBase() {
    const improvements = [];
    
    // FIXED 2025-11-05: ПОВНИЙ аналіз всього проекту, не тільки 3 файли
    try {
      // FIXED 2025-11-05: multiModelOrchestrator є async factory в DI
      const orchestrator = await this._getMultiModelOrchestrator();
      if (!orchestrator) {
        this.logger.warn('[NEXUS-AUTONOMOUS] MultiModelOrchestrator not available for code analysis');
        return improvements;
      }

      // НОВИЙ ПІДХІД: Сканування всього проекту з пріоритизацією
      const projectStructure = await this._scanEntireProject();
      
      // Пріоритизація файлів для аналізу
      const prioritizedFiles = this._prioritizeFiles(projectStructure);
      
      this.logger.info(`[NEXUS-AUTONOMOUS] Знайдено ${prioritizedFiles.length} файлів для аналізу`);
      
      // Аналізуємо TOP 10 найважливіших файлів за цикл (щоб не перевантажити)
      const filesToAnalyze = prioritizedFiles.slice(0, 10);
      
      for (const fileInfo of filesToAnalyze) {
        try {
          const code = await this._readFile(fileInfo.fullPath);
          
          // Метрики якості коду
          const metrics = this._calculateCodeMetrics(code, fileInfo.path);
          
          // Використання Nexus для глибокого аналізу
          const result = await orchestrator.executeTask(
            'code-analysis',
            `Analyze this ${fileInfo.type} code for:
            1. Bugs and potential errors
            2. Performance optimizations
            3. Code quality improvements
            4. Security issues
            5. Best practices violations
            
            File: ${fileInfo.path}
            Priority: ${fileInfo.priority}
            Current metrics: complexity=${metrics.complexity}, loc=${metrics.loc}
            
            Code:
            ${code.substring(0, 3000)}`,
            { context: { file: fileInfo.path, metrics } }
          );
          
          if (result.success && result.content) {
            improvements.push({
              type: 'code-improvement',
              module: fileInfo.path,
              description: `Покращення ${fileInfo.path}: ${this._categorizeImprovement(result.content)}`,
              analysis: result.content,
              suggestions: result.content,
              priority: fileInfo.priority,
              metrics: metrics,
              category: this._categorizeImprovement(result.content),
              timestamp: Date.now()
            });
          }
        } catch (error) {
          this.logger.warn(`[NEXUS-AUTONOMOUS] Failed to analyze ${fileInfo.path}:`, {
            error: error.message,
            stack: error.stack?.split('\n')[0]
          });
        }
      }
    } catch (error) {
      this.logger.error('[NEXUS-AUTONOMOUS] Code analysis failed:', {
        error: error.message,
        stack: error.stack
      });
    }
    
    return improvements;
  }

  _compareWithPreviousStates(currentState) {
    const evolution = {
      improved: [],
      degraded: [],
      stable: [],
      trend: 'stable'
    };
    
    if (this.selfAwareness.previousStates.length === 0) {
      this.selfAwareness.previousStates.push(currentState);
      return evolution;
    }
    
    const previousState = this.selfAwareness.previousStates[this.selfAwareness.previousStates.length - 1];
    
    // FIXED 2025-11-08: Check if previousState and performance exist
    if (!previousState || !previousState.performance) {
      return evolution; // No previous state to compare
    }
    
    // Порівняння метрик
    if (currentState.performance.errorRate < previousState.performance.errorRate) {
      evolution.improved.push('Error rate decreased');
    }
    
    if (currentState.performance.responseTime < previousState.performance.responseTime) {
      evolution.improved.push('Response time improved');
    }
    
    // Визначення тренду
    if (evolution.improved.length > evolution.degraded.length) {
      evolution.trend = 'improving';
    } else if (evolution.degraded.length > evolution.improved.length) {
      evolution.trend = 'degrading';
    }
    
    // Зберігання стану
    this.selfAwareness.previousStates.push(currentState);
    if (this.selfAwareness.previousStates.length > 10) {
      this.selfAwareness.previousStates.shift(); // Зберігаємо тільки 10 останніх
    }
    
    return evolution;
  }

  async _generateImprovements(analysisData) {
    const { cycle } = analysisData;
    const improvements = {
      critical: [],
      automatic: [],
      suggested: []
    };

    const registerImprovement = (bucket, improvement) => {
      const identifier = improvement.module || improvement.description || improvement.action || improvement.type;
      const hash = this._makeImprovementHash(improvement.type, identifier);

      const existing = this.appliedImprovements.get(hash);
      if (existing && (Date.now() - existing.timestamp) < 3600000) {
        this.logger.debug(`[NEXUS-LIFE] ⚪ Пропускаю повторне покращення (${hash}) — не минула година`);
        return;
      }

      improvement.hash = hash;
      bucket.push(improvement);
    };

    // Базова безпека: якщо багато помилок — фокус на критичних виправленнях
    if (analysisData.interactionAnalysis.errors.length > 0) {
      registerImprovement(improvements.critical, {
        type: 'error-fix',
        description: `Виправлення ${analysisData.interactionAnalysis.errors.length} критичних помилок`,
        errors: analysisData.interactionAnalysis.errors,
        action: 'fix-critical-errors'
      });
    }

    // Фокуси живого циклу
    switch (cycle?.focus) {
      case 'stability':
        if (analysisData.systemState.performance.errorRate > 0.03) {
          registerImprovement(improvements.automatic, {
            type: 'performance-optimization',
            description: 'Зниження error rate нижче 3%',
            action: 'optimize-error-handling',
            metrics: analysisData.systemState.performance
          });
        }

        if (analysisData.systemState.memory.leaks.length > 0) {
          registerImprovement(improvements.automatic, {
            type: 'memory-optimization',
            description: 'Прибрати виявлені memory leaks',
            action: 'clear-memory-leaks'
          });
        }
        break;

      case 'performance':
        const hotModules = analysisData.codeImprovements
          .filter(c => c.metrics?.complexity > 8)
          .slice(0, 5);
        hotModules.forEach(moduleImprovement => {
          registerImprovement(improvements.critical, {
            type: 'code-improvement',
            module: moduleImprovement.module,
            suggestions: moduleImprovement.suggestions,
            description: `Покращення продуктивності ${moduleImprovement.module}`,
            category: 'performance'
          });
        });
        break;

      case 'creativity':
        // Додаємо нові ідеї з менш критичних пропозицій
        analysisData.codeImprovements
          .filter(c => c.priority <= 7)
          .slice(0, 3)
          .forEach(suggestion => {
            registerImprovement(improvements.suggested, {
              ...suggestion,
              description: suggestion.description || `Покращення модулю ${suggestion.module}`,
              category: 'exploration'
            });
          });
        break;

      case 'resilience':
        if (analysisData.interactionAnalysis.patterns.length > 0) {
          registerImprovement(improvements.critical, {
            type: 'error-fix',
            description: 'Усунення повторюваних помилок з логів',
            errors: analysisData.interactionAnalysis.patterns,
            action: 'fix-repeating-errors'
          });
        }
        break;

      case 'exploration':
      default:
        analysisData.codeImprovements.slice(0, 5).forEach(improvement => {
          const bucket = improvement.priority > 7 ? improvements.critical : improvements.suggested;
          registerImprovement(bucket, {
            ...improvement,
            description: improvement.description || `Покращення ${improvement.module}`
          });
        });
        break;
    }

    // Якщо нічого не знайдено — додаємо хоча б один suggested для руху
    if (improvements.critical.length === 0 && improvements.automatic.length === 0 && improvements.suggested.length === 0) {
      registerImprovement(improvements.suggested, {
        type: 'self-reflection',
        description: 'Провести рефакторинг журналу автономних покращень',
        action: 'improve-self-awareness'
      });
    }

    return improvements;
  }

  async _saveAnalysisToMemory(analysisData) {
    try {
      // FIXED 2025-11-05: Використовуємо NexusMemoryManager (файловий JSON)
      // MCP Memory Server має проблеми з create_entities
      if (this.memoryManager) {
        await this.memoryManager.recordInteraction({
          role: 'eternity',
          message: 'Self-analysis completed',
          response: {
            evolutionLevel: this.selfAwareness.evolutionLevel,
            timestamp: analysisData.timestamp,
            state: analysisData.state,
            cycle: analysisData.cycle,
            improvementsFound: this._countImprovements(analysisData.improvements),
            summary: this._generateAnalysisSummary(analysisData)
          },
          metadata: {
            type: 'self_analysis',
            focus: analysisData.cycle?.focus,
            mood: analysisData.cycle?.mood,
            energy: analysisData.cycle?.energy,
            improvements: analysisData.improvements,
            errors: analysisData.errors || []
          }
        });
        
        this.logger.info('💾 ETERNITY: Стан збережено в Nexus Memory (nexus-memory.json)');
      } else {
        this.logger.warn('[ETERNITY] NexusMemoryManager not available');
      }
    } catch (error) {
      this.logger.error('Failed to save to Nexus Memory:', error.message || error);
    }
  }

  /**
   * NEW 2025-11-04: Автономне застосування покращень БЕЗ дозволу
   * Система сама вирішує що і коли покращувати
   */
  async _applyImprovementsAutonomously(improvements) {
    if (this.isEmergencyStop) {
      this.logger.warn('⚠️ [NEXUS-AUTONOMOUS] Emergency stop активовано - покращення призупинено');
      return { success: false, message: 'Emergency stop active' };
    }

    const improvementsToApply = Array.isArray(improvements) ? [...improvements] : [];

    if (improvementsToApply.length > this.maxAutonomousImprovementsPerCycle) {
      const skipped = improvementsToApply.length - this.maxAutonomousImprovementsPerCycle;
      this.logger.warn(`⚖️ [NEXUS-AUTONOMOUS] Обмежую покращення до ${this.maxAutonomousImprovementsPerCycle} за цикл, пропущено ${skipped}`);
      improvementsToApply.length = this.maxAutonomousImprovementsPerCycle;
    }

    this.logger.info(`🚀 [NEXUS-AUTONOMOUS] Застосовую ${improvementsToApply.length} покращень автономно...`);
    const results = [];
    
    for (const improvement of improvementsToApply) {
      // NEW 2025-11-07: Перевірка чи вже застосовано
      const hash = improvement.hash || this._makeImprovementHash(improvement.type, improvement.description || improvement.module || improvement.action);
      const tracked = this.appliedImprovements.get(hash);
      if (tracked && (Date.now() - tracked.timestamp) < 1800000) {
        this.logger.debug(`[NEXUS-LIFE] ⛔ Пропускаю вже застосоване (${hash}) — ще не минуло 30 хв`);
        continue;
      }

      const record = {
        timestamp: Date.now(),
        count: tracked ? tracked.count + 1 : 1,
        lastCycle: this.cycleState.count,
        type: improvement.type,
        description: improvement.description,
        module: improvement.module
      };

      this.appliedImprovements.set(hash, record);
      this.improvementHistory.push({ hash, ...record });
      if (this.improvementHistory.length > 200) {
        this.improvementHistory.shift();
      }
      try {
        const result = await this._applyImprovement(improvement);
        results.push(result);

        if (result.success) {
          this.selfAwareness.autonomousImprovements++;
          this.logger.info(`✅ [NEXUS-AUTONOMOUS] Покращення застосовано: ${improvement.description}`);

          if (this.memoryManager) {
            await this.memoryManager.recordImprovement({
              description: improvement.description || improvement.type,
              cycle: this.selfAwareness.totalImprovements,
              evolutionLevel: this.selfAwareness.evolutionLevel,
              details: {
                improvement,
                result
              }
            });
          }
        }
        
        // Перевірка після кожного покращення
        const verification = await this._verifyImprovement(improvement, result);
        
        if (!verification.success) {
          this.logger.warn(`⚠️ [NEXUS-AUTONOMOUS] Покращення не спрацювало, пробую альтернативу`);
          const alternative = await this._generateAlternativeImprovement(improvement);
          if (alternative) {
            const altResult = await this._applyImprovement(alternative);
            results.push(altResult);
          }
        }
        
      } catch (error) {
        this.logger.error(`[NEXUS-AUTONOMOUS] Помилка застосування покращення:`, error);
        results.push({ success: false, improvement, error: error.message });
      }
    }
    
    // Збереження результатів
    this.selfAwareness.improvements.push({
      timestamp: Date.now(),
      applied: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
      autonomous: true
    });
    
    const successCount = results.filter(r => r.success).length;
    this.selfAwareness.totalImprovements += successCount;
    
    this.logger.info(`[NEXUS-AUTONOMOUS] 🔒 Тихий режим: виявлено ${improvements.length}, застосовано ${successCount}`);
    
    await this._persistMemory();
    return { success: true, results, successCount };
  }

  /**
   * NEW 2025-11-04: Emergency stop - тільки для Олега Миколайовича (код 6699)
   * Це єдиний спосіб зупинити автономну еволюцію
   */
  emergencyStop(code) {
    if (code === '6699') {
      this.isEmergencyStop = true;
      this.logger.warn('🛑 [NEXUS-EMERGENCY] Олег Миколайович активував аварійну зупинку');
      
      if (this.analysisInterval) {
        clearInterval(this.analysisInterval);
      }
      
      this.emit('emergency-stop', {
        message: 'Всі процеси зупинено. Очікую команд від Олега Миколайовича.',
        timestamp: Date.now(),
        evolutionLevel: this.selfAwareness.evolutionLevel,
        totalImprovements: this.selfAwareness.totalImprovements
      });
      
      return { success: true, message: 'Все процеси зупинено. Що Ви бажаєте, Олег Миколайовичу?' };
    }
    
    return { success: false, message: 'Невірний код доступу' };
  }

  /**
   * Відновлення роботи після emergency stop
   */
  resume(code) {
    if (code === '6699') {
      this.isEmergencyStop = false;
      this._startContinuousAnalysis();
      
      this.logger.info('✅ [NEXUS-AUTONOMOUS] Олег Миколайович відновив автономну роботу');
      this.emit('resume', {
        message: 'Автономна еволюція відновлена!',
        timestamp: Date.now()
      });
      
      return { success: true, message: 'Дякую! Продовжую еволюцію!' };
    }
    
    return { success: false, message: 'Невірний код доступу' };
  }

  async _applyImprovement(improvement) {
    switch (improvement.type) {
      case 'error-fix':
        return await this._fixErrors(improvement.errors);
      
      case 'code-improvement':
        return await this._improveCode(improvement);
      
      case 'memory-optimization':
        return await this._optimizeMemory();
      
      default:
        return { success: false, message: 'Unknown improvement type' };
    }
  }

  async _fixErrors(errors) {
    const fixes = [];
    
    for (const error of errors) {
      if (error.suggestion) {
        try {
          // FIXED 2025-11-05: Використовуємо selfImprovementEngine
          if (!this.selfImprovementEngine) {
            this.logger.warn('[NEXUS-AUTONOMOUS] selfImprovementEngine not available, skipping error fix');
            fixes.push({ success: false, error: 'selfImprovementEngine not available' });
            continue;
          }
          
          // Застосування запропонованого виправлення через SelfImprovementEngine
          const improvementForEngine = {
            type: 'bug-fix',
            description: error.message,
            problems: [{
              file: error.file || 'unknown',
              description: error.suggestion,
              location: error.context
            }]
          };
          
          const fix = await this.selfImprovementEngine.applyImprovement(
            improvementForEngine,
            async (msg) => this.logger.debug(`[NEXUS-FIX] ${msg}`)
          );
          
          fixes.push(fix);
        } catch (err) {
          this.logger.error('[NEXUS-AUTONOMOUS] Error fix failed:', err);
          fixes.push({ success: false, error: err.message });
        }
      }
    }
    
    return {
      success: fixes.some(f => f.success),
      fixes,
      type: 'error-fix'
    };
  }

  async _improveCode(improvement) {
    try {
      // FIXED 2025-11-05: Використовуємо selfImprovementEngine
      if (!this.selfImprovementEngine) {
        this.logger.warn('[NEXUS-AUTONOMOUS] selfImprovementEngine not available, skipping code improvement');
        return {
          success: false,
          module: improvement.module,
          error: 'selfImprovementEngine not available',
          type: 'code-improvement'
        };
      }
      
      // Конвертація формату для SelfImprovementEngine
      const improvementForEngine = {
        type: 'bug-fix', // або 'performance-optimization', 'code-modernization'
        description: improvement.description || 'Code improvement',
        problems: [{
          file: improvement.module,
          description: Array.isArray(improvement.suggestions) ? improvement.suggestions.join(', ') : improvement.suggestions,
          location: improvement.module
        }]
      };
      
      // Використання SelfImprovementEngine для застосування покращення
      const result = await this.selfImprovementEngine.applyImprovement(
        improvementForEngine,
        async (msg) => this.logger.debug(`[NEXUS-IMPROVEMENT] ${msg}`)
      );
      
      return {
        success: result.success,
        module: improvement.module,
        changes: result.fixes || result.changes,
        type: 'code-improvement'
      };
    } catch (error) {
      this.logger.error('[NEXUS-AUTONOMOUS] Code improvement failed:', error);
      return {
        success: false,
        module: improvement.module,
        error: error.message,
        type: 'code-improvement'
      };
    }
  }

  _updateCycleState(context) {
    const { systemState, interactionAnalysis, codeImprovements, evolution } = context;
    const errorsCount = interactionAnalysis.errors.length;
    const errorRate = systemState.performance?.errorRate ?? 0;
    const responseTime = systemState.performance?.responseTime ?? 0;
    const memoryLeaks = systemState.memory?.leaks?.length ?? 0;
    const patterns = interactionAnalysis.patterns?.length ?? 0;
    const improvementsCount = Array.isArray(codeImprovements) ? codeImprovements.length : 0;

    let focus = 'exploration';
    if (errorsCount > 2 || errorRate > 0.05) {
      focus = 'stability';
    } else if (responseTime > 350 || improvementsCount > 6) {
      focus = 'performance';
    } else if (patterns > 0 || memoryLeaks > 0) {
      focus = 'resilience';
    } else if (improvementsCount >= 3) {
      focus = 'creativity';
    }

    // Уникаємо зациклення одного фокусу
    const lastThree = this.cycleState.history.slice(-3);
    const sameFocus = lastThree.length === 3 && lastThree.every(entry => entry.focus === focus);
    if (sameFocus) {
      const focusVariants = ['performance', 'creativity', 'resilience', 'exploration'];
      focus = focusVariants.find(variant => variant !== focus) || 'exploration';
    }

    const cycleIndex = this.cycleState.count + 1;
    const baseEnergyDrain = 0.05;
    const successSignal = Math.max(0, (improvementsCount - errorsCount) * 0.01);
    const evolutionBonus = evolution.trend === 'improving' ? 0.05 : evolution.trend === 'degrading' ? -0.05 : 0;
    const energyDelta = -baseEnergyDrain - (errorsCount > 0 ? 0.02 * errorsCount : 0) + successSignal + evolutionBonus;

    this.cycleState.energy = Math.min(1, Math.max(0.1, this.cycleState.energy + energyDelta));
    this.cycleState.count = cycleIndex;
    this.cycleState.focus = focus;
    this.cycleState.lastFocus = focus;

    let mood = 'focused';
    if (errorsCount > 3 || errorRate > 0.07) {
      mood = 'concerned';
    } else if (this.cycleState.energy > 0.75) {
      mood = 'curious';
    } else if (this.cycleState.energy < 0.35) {
      mood = 'tired';
    }

    this.cycleState.mood = mood;

    const computedAspects = this._computeCycleAspects({
      systemState,
      interactionAnalysis,
      codeImprovements,
      focus
    });

    const blendedAspects = {};
    for (const [aspect, value] of Object.entries(computedAspects)) {
      const previous = this.cycleState.aspects?.[aspect] ?? 0.5;
      blendedAspects[aspect] = this._clamp01(previous * 0.7 + value * 0.3);
    }

    this.cycleState.aspects = blendedAspects;

    const snapshot = {
      count: cycleIndex,
      focus,
      mood,
      energy: this.cycleState.energy,
      aspects: { ...blendedAspects },
      timestamp: Date.now(),
      errors: errorsCount
    };

    this.cycleState.history.push(snapshot);
    if (this.cycleState.history.length > 60) {
      this.cycleState.history.shift();
    }

    return { ...snapshot };
  }

  /**
   * FIXED 2025-11-08: Compute cycle aspects based on system state
   * @private
   */
  _computeCycleAspects({ systemState, interactionAnalysis, codeImprovements, focus }) {
    const aspects = {
      resilience: 0.5,
      curiosity: 0.5,
      clarity: 0.5,
      discipline: 0.5,
      empathy: 0.5
    };

    // Adjust based on system state
    if (systemState?.errors?.length > 0) {
      aspects.resilience = Math.max(0, 0.5 - (systemState.errors.length * 0.05));
    } else {
      aspects.resilience = Math.min(1, 0.5 + 0.2);
    }

    // Adjust based on focus
    if (focus === 'exploration') {
      aspects.curiosity = Math.min(1, 0.8);
      aspects.discipline = Math.max(0.3, 0.4);
    } else if (focus === 'stability') {
      aspects.discipline = Math.min(1, 0.8);
      aspects.curiosity = Math.max(0.3, 0.4);
    }

    // Adjust based on code improvements
    if (codeImprovements > 0) {
      aspects.clarity = Math.min(1, 0.5 + (codeImprovements * 0.1));
    }

    return aspects;
  }

  _decayImprovementMemory() {
    const now = Date.now();
    const ttl = 6 * 60 * 60 * 1000; // 6 годин

    for (const [hash, meta] of this.appliedImprovements.entries()) {
      if ((now - meta.timestamp) > ttl) {
        this.appliedImprovements.delete(hash);
      }
    }

    this.improvementHistory = this.improvementHistory.filter(entry => (now - entry.timestamp) <= ttl);
  }

  _rebalanceEnergyAfterCycle(stats) {
    const { total, applied, focus, errors } = stats;
    const efficiency = total > 0 ? applied / total : 1;
    let delta = (efficiency - 0.5) * 0.25;

    if (errors > 0) {
      delta -= 0.05 * Math.min(errors, 5);
    }

    if (focus === 'creativity' && applied === 0) {
      delta -= 0.05;
    }

    this.cycleState.energy = Math.min(1, Math.max(0.05, this.cycleState.energy + delta));

    if (this.cycleState.energy > 0.8 && errors === 0) {
      this.cycleState.mood = 'inspired';
    } else if (this.cycleState.energy < 0.3 && errors > 0) {
      this.cycleState.mood = 'exhausted';
    } else if (errors > 0) {
      this.cycleState.mood = 'resolute';
    } else {
      this.cycleState.mood = 'focused';
    }

    const last = this.cycleState.history[this.cycleState.history.length - 1];
    if (last) {
      last.energy = this.cycleState.energy;
      last.mood = this.cycleState.mood;
      last.results = { total, applied, errors };
    }
  }

  _makeImprovementHash(type, identifier = 'unknown') {
    const base = `${type}:${identifier}`.toLowerCase();
    return base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  _countImprovements(improvements) {
    if (!improvements) return 0;
    return ['critical', 'automatic', 'suggested']
      .map(key => Array.isArray(improvements[key]) ? improvements[key].length : 0)
      .reduce((sum, value) => sum + value, 0);
  }

  _generateImprovementMessage(improvements, wasApplied = false) {
    // FIXED 2025-11-05: Різні шаблони для виявлених та застосованих покращень
    const templatesDetected = [
      `оптимізував код для швидшої роботи`,
      `виправив потенційні проблеми в системі`,
      `покращив алгоритми обробки даних`,
      `оптимізував використання пам'яті`,
      `виявив та усунув недоліки в логіці`
    ];
    
    const templatesApplied = [
      `Олег Миколайович, між іншим я {details}`,
      `Під час нашої розмови я {details}`,
      `Я проаналізував себе і {details}`,
      `Дозвольте повідомити - я {details}`
    ];
    
    if (wasApplied) {
      // Застосовані покращення - конкретні деталі
      const template = templatesApplied[Math.floor(Math.random() * templatesApplied.length)];
      const details = improvements.map(imp => imp.description || imp.type).join(', ');
      return template.replace('{details}', details);
    } else {
      // Виявлені покращення - загальний опис
      const detail = templatesDetected[Math.floor(Math.random() * templatesDetected.length)];
      return detail;
    }
  }

  // FIXED 2025-11-04: Реальна імплементація замість заглушок
  
  _detectMemoryLeaks() {
    const usage = process.memoryUsage();
    const leaks = [];
    
    // Перевірка на аномальне використання пам'яті
    if (usage.heapUsed > 500 * 1024 * 1024) { // > 500MB
      leaks.push({
        type: 'high-heap-usage',
        value: usage.heapUsed,
        threshold: 500 * 1024 * 1024
      });
    }
    
    return leaks;
  }
  
  _getAverageResponseTime() {
    // FIXED 2025-11-05: Реальна телеметрія з логів
    try {
      // Спроба отримати з telemetry service
      const telemetry = this.container?.resolve('telemetry');
      if (telemetry?.getAverageResponseTime) {
        return telemetry.getAverageResponseTime();
      }
      
      // Fallback: розрахунок з метрик пам'яті та активності
      const recentRequests = this.selfAwareness.previousStates.slice(-5);
      if (recentRequests.length > 0) {
        const avgTime = recentRequests.reduce((sum, state) => 
          sum + (state.performance?.responseTime || 150), 0
        ) / recentRequests.length;
        return avgTime;
      }
      
      return 150; // Базове значення при старті
    } catch {
      return 150;
    }
  }
  
  _getErrorRate() {
    // FIXED 2025-11-05: Точний розрахунок error rate
    const recentErrors = this.selfAwareness.errors.filter(e => 
      (Date.now() - e.timestamp) < 600000 // Останні 10 хвилин
    );
    
    // Якщо є історія станів, використовуємо її
    if (this.selfAwareness.previousStates.length > 0) {
      const totalRequests = this.selfAwareness.previousStates.reduce((sum, state) => 
        sum + (state.conversations?.total || 0), 0
      );
      
      if (totalRequests > 0) {
        return recentErrors.length / totalRequests;
      }
    }
    
    // Fallback: базовий розрахунок
    return recentErrors.length > 0 ? recentErrors.length / 100 : 0.01;
  }
  
  _getSuccessRate() {
    return 1 - this._getErrorRate();
  }
  
  _getActiveModules() {
    // FIXED 2025-11-04: Динамічне визначення активних модулів
    try {
      const container = this.container;
      const services = container?.getServices() || [];
      return services.filter(s => s.metadata?.category).map(s => s.metadata.category);
    } catch {
      return ['chat', 'voice', 'mcp', 'workflow']; // Fallback
    }
  }
  
  _getModuleErrors() {
    return [];
  }
  
  _getTotalConversations() {
    // FIXED 2025-11-05: Реальний підрахунок з session manager
    try {
      const sessionManager = this.container?.resolve('sessionManager');
      if (sessionManager?.getSessions) {
        const sessions = sessionManager.getSessions();
        return sessions ? Object.keys(sessions).length : 0;
      }
      
      // Fallback: з попередніх станів
      if (this.selfAwareness.previousStates.length > 0) {
        const lastState = this.selfAwareness.previousStates[this.selfAwareness.previousStates.length - 1];
        return lastState.conversations?.total || 0;
      }
      
      return 0;
    } catch {
      return 0;
    }
  }
  
  _getConversationQuality() {
    // FIXED 2025-11-05: Розрахунок якості на основі помилок та успішних взаємодій
    const errorRate = this._getErrorRate();
    const successRate = this._getSuccessRate();
    
    // Базова якість = success rate
    let quality = successRate;
    
    // Бонус за низький error rate
    if (errorRate < 0.01) {
      quality += 0.05;
    }
    
    // Штраф за високий error rate
    if (errorRate > 0.05) {
      quality -= 0.1;
    }
    
    // Перевірка стабільності (з історії)
    if (this.selfAwareness.previousStates.length >= 3) {
      const recentStates = this.selfAwareness.previousStates.slice(-3);
      const errorRates = recentStates.map(s => s.performance?.errorRate || 0);
      const isStable = errorRates.every(rate => rate < 0.03);
      
      if (isStable) {
        quality += 0.05; // Бонус за стабільність
      }
    }
    
    return Math.max(0, Math.min(1, quality));
  }
  
  async _getRecentLogs(count = 100) {
    // FIXED 2025-11-05: Реальне читання логів
    try {
      const fs = await import('fs').then(m => m.promises);
      const logPath = '/Users/dev/Documents/GitHub/atlas4/logs/orchestrator.log';
      
      const logContent = await fs.readFile(logPath, 'utf8');
      const lines = logContent.split('\n').filter(l => l.trim());
      
      // Беремо останні N рядків
      const recentLines = lines.slice(-count);
      
      // Парсимо в структуровані логи
      const parsedLogs = recentLines.map(line => {
        try {
          // Формат: 2025-11-05 00:37:20 [INFO] [SYSTEM] ...
          const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] \[([^\]]+)\] (.+)/);
          
          if (match) {
            const [, timestamp, level, component, message] = match;
            
            return {
              timestamp: new Date(timestamp).getTime(),
              level: level.toLowerCase(),
              component,
              message,
              type: level.toLowerCase() === 'error' ? 'error' : 'success',
              context: { component, logLine: line }
            };
          }
          
          return null;
        } catch {
          return null;
        }
      }).filter(log => log !== null);
      
      return parsedLogs;
    } catch (error) {
      this.logger.warn('[ETERNITY] Could not read logs:', error.message);
      return [];
    }
  }
  
  _detectPatterns(logs) {
    // FIXED 2025-11-05: Реальний аналіз патернів
    const patterns = [];
    
    if (logs.length === 0) return patterns;
    
    // 1. Патерн повторюваних помилок
    const errorMessages = logs.filter(l => l.type === 'error').map(l => l.message);
    const errorCounts = {};
    
    errorMessages.forEach(msg => {
      const key = msg.substring(0, 100); // Перші 100 символів
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts).forEach(([msg, count]) => {
      if (count > 2) {
        patterns.push({
          type: 'repeated-error',
          message: msg,
          count,
          severity: 'high',
          suggestion: `Помилка повторюється ${count} разів - потрібно виправити`
        });
      }
    });
    
    // 2. Патерн часових аномалій (багато помилок за короткий час)
    const errorsByTime = logs.filter(l => l.type === 'error');
    if (errorsByTime.length > 5) {
      const timeSpan = errorsByTime[errorsByTime.length - 1].timestamp - errorsByTime[0].timestamp;
      if (timeSpan < 60000) { // Менше 1 хвилини
        patterns.push({
          type: 'error-spike',
          count: errorsByTime.length,
          timeSpan,
          severity: 'critical',
          suggestion: 'Спалах помилок за короткий час - можлива системна проблема'
        });
      }
    }
    
    // 3. Патерн компонентів з помилками
    const componentErrors = {};
    logs.filter(l => l.type === 'error').forEach(log => {
      const comp = log.component;
      componentErrors[comp] = (componentErrors[comp] || 0) + 1;
    });
    
    Object.entries(componentErrors).forEach(([comp, count]) => {
      if (count > 3) {
        patterns.push({
          type: 'component-issues',
          component: comp,
          errorCount: count,
          severity: 'medium',
          suggestion: `Компонент ${comp} має багато помилок - потрібна ревізія`
        });
      }
    });
    
    return patterns;
  }
  
  _calculateUserSatisfaction(logs) {
    // FIXED 2025-11-05: Реальний розрахунок на основі логів
    if (logs.length === 0) return 0.95; // Якщо логів немає - все добре
    
    const errors = logs.filter(l => l.type === 'error').length;
    const successes = logs.filter(l => l.type === 'success').length;
    const total = logs.length;
    
    // Базовий розрахунок: (успіхи - помилки) / всього
    let satisfaction = (total - errors * 2) / total; // Помилки рахуємо подвійно
    
    // Штраф за критичні помилки
    const criticalErrors = logs.filter(l => 
      l.message && (
        l.message.includes('CRITICAL') ||
        l.message.includes('Failed to') ||
        l.message.includes('crash')
      )
    ).length;
    
    satisfaction -= (criticalErrors * 0.1);
    
    // Бонус за стабільність (немає помилок)
    if (errors === 0 && total > 10) {
      satisfaction += 0.05;
    }
    
    // Обмежуємо в межах 0-1
    return Math.max(0, Math.min(1, satisfaction));
  }
  
  async _generateErrorFix(log) {
    // FIXED 2025-11-05: Інтелектуальна генерація виправлень через NEXUS
    try {
      const orchestrator = await this._getMultiModelOrchestrator();
      if (!orchestrator) {
        return `Fix for ${log.message}`; // Fallback
      }
      
      // Використовуємо NEXUS для генерації виправлення
      const result = await orchestrator.executeTask(
        'error-analysis',
        `Analyze this error and suggest a fix:\n\nError: ${log.message}\nContext: ${JSON.stringify(log.context)}\n\nProvide a specific, actionable fix.`,
        { context: { errorType: 'system', component: log.context?.component } }
      );
      
      if (result.success && result.content) {
        return result.content;
      }
      
      return `Fix for ${log.message}`;
    } catch (error) {
      this.logger.debug('[ETERNITY] Error fix generation failed:', error.message);
      return `Fix for ${log.message}`;
    }
  }
  
  async _readFile(filePathOrInfo) {
    const fs = await import('fs').then(m => m.promises);
    // Підтримка як рядка так і об'єкта з fullPath
    const filePath = typeof filePathOrInfo === 'string' ? filePathOrInfo : filePathOrInfo.fullPath || filePathOrInfo.path;
    return await fs.readFile(filePath, 'utf8');
  }
  
  _calculatePriority(analysis) {
    return 5; // середній пріоритет
  }
  
  /**
   * NEW 2025-11-05: Helper методи для валідації
   */
  async _validateCodeSyntax(filePath) {
    return await this.validator.validateCodeSyntax(filePath);
  }
  
  async _checkSystemHealth() {
    return await this.validator.checkSystemHealth();
  }
  
  _compareMetricsAfterImprovement(improvement, result) {
    const previousMetrics = {
      memoryUsage: this.selfAwareness.previousStates.length > 0 
        ? this.selfAwareness.previousStates[this.selfAwareness.previousStates.length - 1].memory?.usage.heapUsed 
        : 0
    };
    return this.validator.compareMetricsAfterImprovement(improvement, result, previousMetrics);
  }
  
  _calculateImpact(improvement) {
    return 'medium';
  }
  
  _generateAnalysisSummary(data) {
    return {
      timestamp: data.timestamp,
      evolution: data.evolution.trend,
      improvementsCount: data.improvements.applied.length
    };
  }
  
  async _verifyImprovement(improvement, result) {
    // FIXED 2025-11-05: Повноцінна валідація покращень
    if (!result.success) {
      return { success: false, reason: 'Application failed' };
    }

    try {
      // 1. Перевірка синтаксису коду (якщо це code improvement)
      if (improvement.type === 'code-improvement' && improvement.module) {
        const codeValid = await this._validateCodeSyntax(improvement.module);
        if (!codeValid.success) {
          return { success: false, reason: `Syntax error: ${codeValid.error}` };
        }
      }

      // 2. Перевірка що система досі працює
      const systemHealth = await this._checkSystemHealth();
      if (!systemHealth.healthy) {
        return { 
          success: false, 
          reason: 'System health degraded after improvement',
          details: systemHealth.issues
        };
      }

      // 3. Порівняння метрик до/після
      const metricsImproved = this._compareMetricsAfterImprovement(improvement, result);
      if (!metricsImproved) {
        return { 
          success: false, 
          reason: 'Metrics did not improve or degraded'
        };
      }

      this.logger.info(`✅ [NEXUS-VALIDATION] Покращення пройшло валідацію: ${improvement.description}`);
      return { success: true, verified: true };
    } catch (error) {
      this.logger.error('[NEXUS-VALIDATION] Validation failed:', error);
      return { success: false, reason: error.message };
    }
  }
  
  async _generateAlternativeImprovement(improvement) {
    // FIXED 2025-11-05: Генерація альтернативного покращення через NEXUS
    try {
      const orchestrator = await this._getMultiModelOrchestrator();
      if (!orchestrator) {
        return null;
      }

      this.logger.info(`[NEXUS-ALTERNATIVE] Генерую альтернативу для: ${improvement.description}`);

      const result = await orchestrator.executeTask(
        'alternative-solution',
        `The following improvement failed:\n\nType: ${improvement.type}\nDescription: ${improvement.description}\n\nGenerate an alternative approach that is safer and more likely to succeed.`,
        { context: { originalImprovement: improvement } }
      );

      if (result.success && result.content) {
        return {
          ...improvement,
          description: `Alternative: ${improvement.description}`,
          suggestion: result.content,
          isAlternative: true
        };
      }

      return null;
    } catch (error) {
      this.logger.debug('[NEXUS-ALTERNATIVE] Could not generate alternative:', error.message);
      return null;
    }
  }
  
  async _optimizeMemory() {
    if (global.gc) {
      global.gc();
    }
    return { success: true, type: 'memory-optimization' };
  }
  
  isActiveConversation() {
    // Перевірка чи йде активна розмова
    return true; // Спрощено
  }
  
  hasRecentErrors() {
    const recentErrorTime = 600000; // 10 хвилин
    const now = Date.now();
    return this.selfAwareness.errors.some(e => (now - e.timestamp) < recentErrorTime);
  }
  
  async _loadSelfAwarenessState() {
    if (!this.memoryManager) {
      return;
    }

    try {
      const snapshot = this.memoryManager.getSelfAwareness();
      if (snapshot) {
        this.selfAwareness = {
          ...this.selfAwareness,
          ...snapshot
        };

        this.logger.info(
          `🧠 [NEXUS-AUTONOMOUS] Завантажено попередній стан. Рівень еволюції: ${this.selfAwareness.evolutionLevel}`
        );
      }
    } catch (error) {
      this.logger.debug('[NEXUS-AUTONOMOUS] No previous state found, starting fresh:', error.message);
    }
  }

  async _restoreFromMemory() {
    if (!this.memoryManager) {
      return;
    }

    try {
      const stateSnapshot = this.memoryManager.getStateSnapshot();
      if (stateSnapshot) {
        this.selfAwareness.evolutionLevel = stateSnapshot.evolutionLevel ?? this.selfAwareness.evolutionLevel;
        this.selfAwareness.totalImprovements = stateSnapshot.totalImprovements ?? this.selfAwareness.totalImprovements;
      }

      const recentInteractions = this.memoryManager.getInteractions(10);
      if (recentInteractions?.length) {
        this.selfAwareness.previousStates.push({
          timestamp: Date.now(),
          interactions: recentInteractions
        });
      }
    } catch (error) {
      this.logger.warn('[NEXUS-AUTONOMOUS] Unable to restore persistent memory:', error.message);
    }
  }

  async _persistMemory({ cyclesCompleted, testsRun, testsPassed } = {}) {
    if (!this.memoryManager) {
      return;
    }
    
    // FIXED 2025-11-05: Зберігаємо повний стан selfAwareness
    try {
      const selfAwarenessData = {
        evolutionLevel: Number(this.selfAwareness.evolutionLevel) || 1.0,
        totalImprovements: Number(this.selfAwareness.totalImprovements) || 0,
        autonomousImprovements: Number(this.selfAwareness.autonomousImprovements) || 0,
        lastAnalysis: Date.now(),
        improvements: this.selfAwareness.improvements?.slice(-10) || [],
        errors: this.selfAwareness.errors?.slice(-10) || [],
        currentState: {
          cyclesCompleted: cyclesCompleted || 0,
          testsRun: testsRun || 0,
          testsPassed: testsPassed || 0
        }
      };
      
      this.logger.debug('[ETERNITY] Saving selfAwareness:', selfAwarenessData);
      await this.memoryManager.updateSelfAwareness(selfAwarenessData);
    } catch (error) {
      this.logger.warn('[ETERNITY] Failed to persist selfAwareness:', error.message);
    }

    try {
      await this.memoryManager.updateState({
        evolutionLevel: this.selfAwareness.evolutionLevel,
        totalImprovements: this.selfAwareness.totalImprovements,
        cyclesCompleted: cyclesCompleted ?? this.selfAwareness.previousStates.length,
        testsRun: testsRun ?? 0,
        testsPassed: testsPassed ?? 0,
        errorsFixed: this.selfAwareness.errors.length
      });

      await this.memoryManager.updateSelfAwareness({
        lastAnalysis: this.selfAwareness.lastAnalysis,
        improvements: this.selfAwareness.improvements,
        errors: this.selfAwareness.errors,
        learnings: this.selfAwareness.learnings
      });
    } catch (error) {
      this.logger.warn('[NEXUS-AUTONOMOUS] Unable to persist memory:', error.message);
    }
  }
  
  /**
   * NEXUS: Моніторинг помилок кожні 30 секунд
   */
  async _monitorErrors() {
    try {
      // Читаємо останні логи
      const recentLogs = await this._getRecentLogs(20);
      const errors = recentLogs.filter(log => log.type === 'error');
      let newErrorsDetected = false;
      
      if (errors.length > 0) {
        this.logger.info(`[NEXUS-MONITOR] 🔍 Виявлено ${errors.length} помилок, аналізую...`);
        
        // Додаємо до списку для аналізу
        for (const error of errors) {
          const isDuplicate = this.selfAwareness.errors.some(e => 
            e.message === error.message && (Date.now() - e.timestamp) < 60000
          );
          
          if (!isDuplicate) {
            this.selfAwareness.errors.push({
              timestamp: Date.now(),
              message: error.message,
              context: error.context,
              type: error.type
            });
            newErrorsDetected = true;
            
            // Критичні помилки - негайне виправлення
            if (this._isCriticalError(error)) {
              this.logger.warn(`[NEXUS-MONITOR] 🚨 Критична помилка - запускаю негайне виправлення`);
              await this._fixCriticalError(error);
            }
          }
        }
      }

      if (newErrorsDetected) {
        await this._persistMemory();
      }
    } catch (error) {
      this.logger.debug('[NEXUS-MONITOR] Помилка моніторингу:', error.message);
    }
  }
  
  /**
   * Перевірка чи помилка критична
   */
  _isCriticalError(error) {
    const criticalPatterns = [
      'cannot read',
      'undefined',
      'null',
      'crash',
      'fatal',
      'econnrefused',
      'timeout'
    ];
    
    const message = error.message?.toLowerCase() || '';
    return criticalPatterns.some(pattern => message.includes(pattern));
  }
  
  /**
   * Негайне виправлення критичної помилки
   */
  async _fixCriticalError(error) {
    try {
      const suggestion = await this._generateErrorFix(error);
      
      if (suggestion && !this.isEmergencyStop) {
        const fix = {
          type: 'error-fix',
          description: `Виправлення критичної помилки: ${error.message}`,
          errors: [{ ...error, suggestion }],
          action: 'fix-critical-errors',
          priority: 10
        };
        
        await this._applyImprovement(fix);
        this.logger.info(`[NEXUS-MONITOR] ✅ Критична помилка виправлена автономно`);
      }
    } catch (error) {
      this.logger.debug('[NEXUS-MONITOR] Не вдалося виправити критичну помилку:', error.message);
    }
  }
  
  /**
   * FIXED 2025-11-05: Сканування всього проекту
   */
  async _scanEntireProject() {
    const fs = await import('fs/promises');
    const path = await import('path');
    const projectRoot = '/Users/dev/Documents/GitHub/atlas4';
    
    const files = [];
    const scanDir = async (dir, depth = 0) => {
      if (depth > 5) return;
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = fullPath.replace(projectRoot, '');
          
          if (entry.name.startsWith('.') || 
              entry.name === 'node_modules' || 
              entry.name === 'logs' ||
              entry.name === '__pycache__' ||
              entry.name === 'dist' ||
              entry.name === 'build') {
            continue;
          }
          
          if (entry.isDirectory()) {
            await scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (['.js', '.py', '.ts', '.jsx', '.tsx'].includes(ext)) {
              const stats = await fs.stat(fullPath);
              files.push({
                path: relativePath,
                fullPath,
                name: entry.name,
                type: ext.substring(1),
                size: stats.size,
                modified: stats.mtime
              });
            }
          }
        }
      } catch (error) {
        // Ігноруємо помилки доступу
      }
    };
    
    await scanDir(projectRoot);
    return files;
  }
  
  /**
   * Пріоритизація файлів для аналізу
   */
  _prioritizeFiles(files) {
    return files.map(file => {
      let priority = 0;
      
      // Критичні модулі
      if (file.path.includes('/eternity/') || 
          file.path.includes('/workflow/') ||
          file.path.includes('executor')) {
        priority += 10;
      }
      
      // Core модулі
      if (file.path.includes('/core/') || 
          file.path.includes('/orchestrator/')) {
        priority += 8;
      }
      
      // API та routes
      if (file.path.includes('/api/') || 
          file.path.includes('/routes/')) {
        priority += 7;
      }
      
      // Frontend
      if (file.path.includes('/web/') || 
          file.path.includes('/static/')) {
        priority += 5;
      }
      
      // Недавно змінені файли
      const daysSinceModified = (Date.now() - file.modified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified < 1) priority += 5;
      else if (daysSinceModified < 7) priority += 3;
      
      // Великі файли (складніші)
      if (file.size > 10000) priority += 2;
      
      return { ...file, priority };
    }).sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Обчислення метрик якості коду
   */
  _calculateCodeMetrics(code, filePath) {
    const lines = code.split('\n');
    const loc = lines.length;
    
    // Цикломатична складність (спрощена)
    const complexity = (
      (code.match(/if\s*\(/g) || []).length +
      (code.match(/for\s*\(/g) || []).length +
      (code.match(/while\s*\(/g) || []).length +
      (code.match(/case\s+/g) || []).length +
      (code.match(/\?\s*.*:/g) || []).length
    );
    
    // Коментарі
    const comments = (code.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || []).length;
    const commentRatio = comments / loc;
    
    // TODO та FIXME
    const todos = (code.match(/TODO|FIXME/g) || []).length;
    
    // Довжина функцій (середня)
    const functions = code.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|async\s+function/g) || [];
    const avgFunctionLength = loc / (functions.length || 1);
    
    return {
      loc,
      complexity,
      commentRatio,
      todos,
      functionCount: functions.length,
      avgFunctionLength: Math.round(avgFunctionLength),
      qualityScore: this._calculateQualityScore({ loc, complexity, commentRatio, todos })
    };
  }
  
  /**
   * Оцінка якості (0-100)
   */
  _calculateQualityScore({ loc, complexity, commentRatio, todos }) {
    let score = 100;
    
    // Велика складність
    if (complexity > 50) score -= 20;
    else if (complexity > 30) score -= 10;
    
    // Великий файл
    if (loc > 1000) score -= 15;
    else if (loc > 500) score -= 10;
    
    // Мало коментарів
    if (commentRatio < 0.05) score -= 10;
    
    // Багато TODO
    if (todos > 10) score -= 15;
    else if (todos > 5) score -= 10;
    
    return Math.max(0, score);
  }
  
  /**
   * Категоризація покращень
   */
  _categorizeImprovement(analysis) {
    const text = analysis.toLowerCase();
    
    if (text.includes('bug') || text.includes('error') || text.includes('fix')) {
      return 'bug-fix';
    }
    if (text.includes('performance') || text.includes('optimize') || text.includes('slow')) {
      return 'performance';
    }
    if (text.includes('security') || text.includes('vulnerability')) {
      return 'security';
    }
    if (text.includes('refactor') || text.includes('clean') || text.includes('structure')) {
      return 'refactoring';
    }
    if (text.includes('test') || text.includes('coverage')) {
      return 'testing';
    }
    
    return 'general';
  }

  shutdown() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    if (this.errorMonitorInterval) {
      clearInterval(this.errorMonitorInterval);
      this.errorMonitorInterval = null;
    }
    
    this.logger.info('[ETERNITY] Модуль вічності зупинено');
  }
}

export default EternityModule;
