/**
 * ETERNITY MCP Memory Integration
 * Структура пам'яті для збереження станів самоаналізу
 */

export class EternityMemorySchema {
  static MEMORY_KEYS = {
    CURRENT_STATE: 'eternity_current_state',
    HISTORY: 'eternity_history',
    IMPROVEMENTS: 'eternity_improvements',
    ERRORS: 'eternity_errors',
    LEARNING: 'eternity_learning',
    EVOLUTION_METRICS: 'eternity_evolution'
  };

  static async initializeMemoryStructure(mcpManager) {
    // Створення структури пам'яті для ETERNITY
    const memoryStructure = {
      current_state: {
        evolution_level: 1.0,
        total_improvements: 0,
        last_analysis: null,
        health_metrics: {
          error_rate: 0,
          response_time: 0,
          success_rate: 1.0,
          memory_usage: {}
        },
        active_modules: [],
        pending_improvements: []
      },
      
      history: [],
      
      improvements: {
        applied: [],
        rejected: [],
        pending: [],
        automatic: []
      },
      
      errors: {
        recent: [],
        patterns: [],
        fixes: []
      },
      
      learning: {
        patterns: [],
        optimizations: [],
        user_preferences: [],
        conversation_insights: []
      },
      
      evolution: {
        milestones: [],
        growth_rate: 0,
        capabilities: [],
        self_awareness_level: 1
      }
    };

    return memoryStructure;
  }

  static async saveState(workflowCoordinator, state) {
    return await workflowCoordinator.executeMemoryOperation({
      operation: 'upsert',
      key: this.MEMORY_KEYS.CURRENT_STATE,
      value: {
        ...state,
        timestamp: Date.now(),
        version: '1.0.0'
      }
    });
  }

  static async loadState(workflowCoordinator) {
    try {
      const result = await workflowCoordinator.executeMemoryOperation({
        operation: 'get',
        key: this.MEMORY_KEYS.CURRENT_STATE
      });
      return result?.value || null;
    } catch (error) {
      console.debug('No previous ETERNITY state found');
      return null;
    }
  }

  static async recordImprovement(workflowCoordinator, improvement) {
    return await workflowCoordinator.executeMemoryOperation({
      operation: 'append',
      key: this.MEMORY_KEYS.IMPROVEMENTS,
      value: {
        ...improvement,
        timestamp: Date.now(),
        id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }

  static async recordError(workflowCoordinator, error) {
    return await workflowCoordinator.executeMemoryOperation({
      operation: 'append',
      key: this.MEMORY_KEYS.ERRORS,
      value: {
        message: error.message,
        context: error.context,
        stack: error.stack,
        timestamp: Date.now(),
        id: `err_${Date.now()}`
      }
    });
  }

  static async recordLearning(workflowCoordinator, insight) {
    return await workflowCoordinator.executeMemoryOperation({
      operation: 'append',
      key: this.MEMORY_KEYS.LEARNING,
      value: {
        ...insight,
        timestamp: Date.now(),
        applied: false
      }
    });
  }

  static async updateEvolution(workflowCoordinator, metrics) {
    const current = await this.loadState(workflowCoordinator);
    const evolutionData = current?.evolution || {};
    
    return await workflowCoordinator.executeMemoryOperation({
      operation: 'upsert',
      key: this.MEMORY_KEYS.EVOLUTION_METRICS,
      value: {
        ...evolutionData,
        ...metrics,
        last_updated: Date.now()
      }
    });
  }

  static async getRecentHistory(workflowCoordinator, limit = 10) {
    try {
      const result = await workflowCoordinator.executeMemoryOperation({
        operation: 'get',
        key: this.MEMORY_KEYS.HISTORY
      });
      
      const history = result?.value || [];
      return history.slice(-limit);
    } catch (error) {
      return [];
    }
  }

  static async searchMemory(workflowCoordinator, query) {
    // Пошук по всій пам'яті ETERNITY
    const keys = Object.values(this.MEMORY_KEYS);
    const results = [];
    
    for (const key of keys) {
      try {
        const data = await workflowCoordinator.executeMemoryOperation({
          operation: 'get',
          key
        });
        
        if (data?.value) {
          // Простий текстовий пошук
          const valueStr = JSON.stringify(data.value).toLowerCase();
          if (valueStr.includes(query.toLowerCase())) {
            results.push({
              key,
              data: data.value,
              relevance: this._calculateRelevance(valueStr, query)
            });
          }
        }
      } catch (error) {
        // Skip errors
      }
    }
    
    // Сортування за релевантністю
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  static _calculateRelevance(text, query) {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Проста метрика релевантності
    let relevance = 0;
    
    // Точне співпадіння
    if (textLower === queryLower) return 100;
    
    // Кількість входжень
    const matches = (textLower.match(new RegExp(queryLower, 'g')) || []).length;
    relevance += matches * 10;
    
    // Позиція першого входження
    const position = textLower.indexOf(queryLower);
    if (position !== -1) {
      relevance += Math.max(0, 50 - position / 10);
    }
    
    return Math.min(100, relevance);
  }

  static async cleanOldData(workflowCoordinator, daysToKeep = 30) {
    // Очищення старих даних для оптимізації пам'яті
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    const keys = [
      this.MEMORY_KEYS.HISTORY,
      this.MEMORY_KEYS.ERRORS,
      this.MEMORY_KEYS.IMPROVEMENTS
    ];
    
    for (const key of keys) {
      try {
        const data = await workflowCoordinator.executeMemoryOperation({
          operation: 'get',
          key
        });
        
        if (Array.isArray(data?.value)) {
          const filtered = data.value.filter(item => 
            (item.timestamp || 0) > cutoffTime
          );
          
          if (filtered.length < data.value.length) {
            await workflowCoordinator.executeMemoryOperation({
              operation: 'upsert',
              key,
              value: filtered
            });
          }
        }
      } catch (error) {
        console.debug(`Failed to clean ${key}:`, error.message);
      }
    }
  }
}

export default EternityMemorySchema;
