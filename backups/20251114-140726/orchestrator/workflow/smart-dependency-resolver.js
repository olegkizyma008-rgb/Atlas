/**
 * Smart Dependency Resolver
 * Інтелектуальна система вирішення залежностей з графовим аналізом
 * 
 * @version 1.0.0
 * @date 2025-10-24
 */

import logger from '../utils/logger.js';
import configManager from '../../config/dynamic-config.js';

/**
 * Граф залежностей
 */
class DependencyGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.reverseEdges = new Map();
  }
  
  /**
   * Додати вузол (item)
   */
  addNode(id, data) {
    this.nodes.set(String(id), data);
    if (!this.edges.has(String(id))) {
      this.edges.set(String(id), new Set());
    }
    if (!this.reverseEdges.has(String(id))) {
      this.reverseEdges.set(String(id), new Set());
    }
  }
  
  /**
   * Додати ребро (залежність)
   */
  addEdge(from, to) {
    const fromId = String(from);
    const toId = String(to);
    
    if (!this.edges.has(fromId)) {
      this.edges.set(fromId, new Set());
    }
    if (!this.reverseEdges.has(toId)) {
      this.reverseEdges.set(toId, new Set());
    }
    
    this.edges.get(fromId).add(toId);
    this.reverseEdges.get(toId).add(fromId);
  }
  
  /**
   * Отримати всі залежності вузла
   */
  getDependencies(id) {
    return Array.from(this.edges.get(String(id)) || []);
  }
  
  /**
   * Отримати всі вузли, що залежать від даного
   */
  getDependents(id) {
    return Array.from(this.reverseEdges.get(String(id)) || []);
  }
  
  /**
   * Перевірити на цикли
   */
  hasCycle() {
    const visited = new Set();
    const recursionStack = new Set();
    
    for (const node of this.nodes.keys()) {
      if (this._hasCycleDFS(node, visited, recursionStack)) {
        return true;
      }
    }
    
    return false;
  }
  
  _hasCycleDFS(node, visited, recursionStack) {
    visited.add(node);
    recursionStack.add(node);
    
    const neighbors = this.edges.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this._hasCycleDFS(neighbor, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  /**
   * Топологічне сортування
   */
  topologicalSort() {
    const visited = new Set();
    const stack = [];
    
    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        this._topologicalSortDFS(node, visited, stack);
      }
    }
    
    return stack.reverse();
  }
  
  _topologicalSortDFS(node, visited, stack) {
    visited.add(node);
    
    const neighbors = this.edges.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this._topologicalSortDFS(neighbor, visited, stack);
      }
    }
    
    stack.push(node);
  }
  
  /**
   * Знайти всі шляхи між двома вузлами
   */
  findAllPaths(start, end) {
    const paths = [];
    const visited = new Set();
    
    this._findAllPathsDFS(String(start), String(end), visited, [String(start)], paths);
    
    return paths;
  }
  
  _findAllPathsDFS(current, end, visited, path, paths) {
    if (current === end) {
      paths.push([...path]);
      return;
    }
    
    visited.add(current);
    
    const neighbors = this.edges.get(current) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        path.push(neighbor);
        this._findAllPathsDFS(neighbor, end, visited, path, paths);
        path.pop();
      }
    }
    
    visited.delete(current);
  }
}

/**
 * Smart Dependency Resolver
 */
export class SmartDependencyResolver {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 10;
    this.learningEnabled = options.learningEnabled !== false;
    
    // Історія вирішених проблем
    this.resolutionHistory = new Map();
    
    // Метрики
    this.metrics = {
      totalResolutions: 0,
      successfulResolutions: 0,
      cyclesDetected: 0,
      replansExecuted: 0,
      autoResolved: 0
    };
  }
  
  /**
   * Інтелектуальне вирішення залежностей
   */
  async resolveDependencies(item, todo, context = {}) {
    this.metrics.totalResolutions++;
    
    logger.system('dependency-resolver', 
      `🔍 Resolving dependencies for item ${item.id}: ${item.content}`);
    
    // Побудувати граф залежностей
    const graph = this.buildDependencyGraph(todo);
    
    // Перевірити на цикли
    if (graph.hasCycle()) {
      this.metrics.cyclesDetected++;
      logger.warn('dependency-resolver', '⚠️ Cycle detected in dependencies');
      return this.resolveCycle(item, todo, graph);
    }
    
    // Аналіз проблем з залежностями
    const analysis = this.analyzeDependencyIssues(item, todo, graph);
    
    // Спробувати автоматичне вирішення
    if (analysis.canAutoResolve) {
      return await this.autoResolve(item, todo, analysis);
    }
    
    // Якщо не можна автоматично вирішити, запропонувати альтернативи
    return this.suggestAlternatives(item, todo, analysis);
  }
  
  /**
   * Побудувати граф залежностей
   */
  buildDependencyGraph(todo) {
    const graph = new DependencyGraph();
    
    // Додати всі items як вузли
    for (const item of todo.items) {
      graph.addNode(item.id, item);
    }
    
    // Додати залежності як ребра
    for (const item of todo.items) {
      if (item.dependencies && Array.isArray(item.dependencies)) {
        for (const depId of item.dependencies) {
          graph.addEdge(item.id, depId);
        }
      }
    }
    
    return graph;
  }
  
  /**
   * Аналіз проблем з залежностями
   */
  analyzeDependencyIssues(item, todo, graph) {
    const analysis = {
      blockedBy: [],
      failedDependencies: [],
      replanedDependencies: [],
      optionalDependencies: [],
      canAutoResolve: false,
      suggestedActions: []
    };
    
    // Перевірити кожну залежність
    for (const depId of (item.dependencies || [])) {
      const depItem = todo.items.find(i => String(i.id) === String(depId));
      
      if (!depItem) {
        analysis.suggestedActions.push({
          type: 'remove_dependency',
          dependency: depId,
          reason: 'Dependency not found in todo list'
        });
        continue;
      }
      
      // Класифікувати залежність
      switch (depItem.status) {
        case 'failed':
          analysis.failedDependencies.push(depId);
          analysis.suggestedActions.push({
            type: 'skip_or_retry',
            dependency: depId,
            reason: 'Dependency failed'
          });
          break;
          
        case 'replanned':
          analysis.replanedDependencies.push(depId);
          const children = this.findChildren(depId, todo);
          if (children.length > 0) {
            analysis.suggestedActions.push({
              type: 'replace_with_children',
              dependency: depId,
              children: children.map(c => c.id),
              reason: 'Parent was replanned'
            });
          }
          break;
          
        case 'skipped':
          if (this.isOptional(depItem)) {
            analysis.optionalDependencies.push(depId);
            analysis.suggestedActions.push({
              type: 'remove_optional',
              dependency: depId,
              reason: 'Optional dependency was skipped'
            });
          }
          break;
          
        case 'pending':
        case 'in_progress':
          analysis.blockedBy.push(depId);
          break;
      }
    }
    
    // Визначити чи можна автоматично вирішити
    analysis.canAutoResolve = 
      analysis.failedDependencies.length === 0 &&
      (analysis.replanedDependencies.length > 0 || 
       analysis.optionalDependencies.length > 0);
    
    return analysis;
  }
  
  /**
   * Автоматичне вирішення
   */
  async autoResolve(item, todo, analysis) {
    logger.system('dependency-resolver', 
      `🔧 Auto-resolving dependencies for item ${item.id}`);
    
    const newDependencies = [...(item.dependencies || [])];
    let modified = false;
    
    // Обробити suggested actions
    for (const action of analysis.suggestedActions) {
      switch (action.type) {
        case 'replace_with_children':
          // Замінити replanned parent на його дітей
          const index = newDependencies.indexOf(action.dependency);
          if (index !== -1) {
            newDependencies.splice(index, 1, ...action.children);
            modified = true;
            logger.system('dependency-resolver', 
              `✅ Replaced ${action.dependency} with children: ${action.children.join(', ')}`);
          }
          break;
          
        case 'remove_optional':
          // Видалити опціональну залежність
          const optIndex = newDependencies.indexOf(action.dependency);
          if (optIndex !== -1) {
            newDependencies.splice(optIndex, 1);
            modified = true;
            logger.system('dependency-resolver', 
              `✅ Removed optional dependency: ${action.dependency}`);
          }
          break;
          
        case 'remove_dependency':
          // Видалити неіснуючу залежність
          const missingIndex = newDependencies.indexOf(action.dependency);
          if (missingIndex !== -1) {
            newDependencies.splice(missingIndex, 1);
            modified = true;
            logger.system('dependency-resolver', 
              `✅ Removed missing dependency: ${action.dependency}`);
          }
          break;
      }
    }
    
    if (modified) {
      item.dependencies = newDependencies;
      this.metrics.autoResolved++;
      this.metrics.successfulResolutions++;
      
      // Зберегти в історію для навчання
      if (this.learningEnabled) {
        this.saveResolution(item, analysis, 'auto_resolve', true);
      }
      
      return {
        success: true,
        action: 'dependencies_updated',
        newDependencies,
        changes: analysis.suggestedActions
      };
    }
    
    return {
      success: false,
      reason: 'No automatic resolution available'
    };
  }
  
  /**
   * Вирішити цикл в залежностях
   */
  resolveCycle(item, todo, graph) {
    logger.warn('dependency-resolver', 
      `🔄 Resolving cycle for item ${item.id}`);
    
    // Знайти всі цикли
    const cycles = this.findCycles(graph);
    
    // Знайти найкоротший цикл, що включає поточний item
    const relevantCycle = cycles.find(cycle => cycle.includes(String(item.id)));
    
    if (relevantCycle) {
      // Розірвати цикл видаленням найслабшої залежності
      const weakestLink = this.findWeakestLink(relevantCycle, todo);
      
      if (weakestLink) {
        const index = item.dependencies.indexOf(weakestLink);
        if (index !== -1) {
          item.dependencies.splice(index, 1);
          logger.system('dependency-resolver', 
            `✅ Broke cycle by removing dependency: ${weakestLink}`);
          
          return {
            success: true,
            action: 'cycle_resolved',
            removedDependency: weakestLink,
            cycle: relevantCycle
          };
        }
      }
    }
    
    return {
      success: false,
      reason: 'Could not resolve cycle',
      cycles
    };
  }
  
  /**
   * Знайти всі цикли в графі
   */
  findCycles(graph) {
    const cycles = [];
    const visited = new Set();
    const recursionStack = [];
    
    const dfs = (node, path) => {
      visited.add(node);
      recursionStack.push(node);
      path.push(node);
      
      const neighbors = graph.edges.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.includes(neighbor)) {
          // Знайдено цикл
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          }
        }
      }
      
      recursionStack.pop();
    };
    
    for (const node of graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
    
    return cycles;
  }
  
  /**
   * Знайти найслабшу ланку в циклі
   */
  findWeakestLink(cycle, todo) {
    let weakestLink = null;
    let minImportance = Infinity;
    
    for (const nodeId of cycle) {
      const item = todo.items.find(i => String(i.id) === nodeId);
      if (item && item.dependencies) {
        for (const depId of item.dependencies) {
          if (cycle.includes(String(depId))) {
            const importance = this.calculateImportance(depId, todo);
            if (importance < minImportance) {
              minImportance = importance;
              weakestLink = depId;
            }
          }
        }
      }
    }
    
    return weakestLink;
  }
  
  /**
   * Розрахувати важливість item
   */
  calculateImportance(itemId, todo) {
    const item = todo.items.find(i => String(i.id) === String(itemId));
    if (!item) return 0;
    
    let importance = 1;
    
    // Враховувати статус
    if (item.status === 'completed') importance += 10;
    if (item.status === 'failed') importance -= 5;
    if (item.status === 'skipped') importance -= 3;
    
    // Враховувати кількість залежних items
    const dependents = todo.items.filter(i => 
      i.dependencies && i.dependencies.includes(String(itemId))
    );
    importance += dependents.length * 2;
    
    // Враховувати пріоритет (якщо є)
    if (item.priority === 'high') importance += 5;
    if (item.priority === 'low') importance -= 2;
    
    return importance;
  }
  
  /**
   * Запропонувати альтернативи
   */
  suggestAlternatives(item, todo, analysis) {
    const suggestions = [];
    
    // Якщо є failed dependencies
    if (analysis.failedDependencies.length > 0) {
      suggestions.push({
        type: 'skip_failed',
        description: 'Skip item due to failed dependencies',
        dependencies: analysis.failedDependencies
      });
      
      suggestions.push({
        type: 'retry_dependencies',
        description: 'Retry failed dependencies first',
        dependencies: analysis.failedDependencies
      });
    }
    
    // Якщо заблоковано
    if (analysis.blockedBy.length > 0) {
      suggestions.push({
        type: 'wait',
        description: 'Wait for dependencies to complete',
        dependencies: analysis.blockedBy
      });
      
      // Знайти альтернативний шлях
      const alternativePath = this.findAlternativePath(item, todo);
      if (alternativePath) {
        suggestions.push({
          type: 'alternative_path',
          description: 'Use alternative execution path',
          path: alternativePath
        });
      }
    }
    
    // Replan як останній варіант
    suggestions.push({
      type: 'replan',
      description: 'Replan the entire task',
      reason: 'Complex dependency issues'
    });
    
    return {
      success: false,
      suggestions,
      analysis
    };
  }
  
  /**
   * Знайти альтернативний шлях виконання
   */
  findAlternativePath(item, todo) {
    // Знайти items без залежностей або з виконаними залежностями
    const available = todo.items.filter(i => {
      if (i.status === 'completed' || i.status === 'skipped') return false;
      if (i.id === item.id) return false;
      
      if (!i.dependencies || i.dependencies.length === 0) return true;
      
      return i.dependencies.every(depId => {
        const dep = todo.items.find(d => String(d.id) === String(depId));
        return dep && dep.status === 'completed';
      });
    });
    
    if (available.length > 0) {
      return available.map(i => ({
        id: i.id,
        content: i.content
      }));
    }
    
    return null;
  }
  
  /**
   * Знайти дітей replanned item
   */
  findChildren(parentId, todo) {
    return todo.items.filter(item => {
      const idStr = String(item.id);
      const parentStr = String(parentId);
      
      // Перевірити ієрархічні ID (наприклад, 3.1, 3.2 для parent 3)
      return idStr.startsWith(parentStr + '.');
    });
  }
  
  /**
   * Перевірити чи залежність опціональна
   */
  isOptional(item) {
    // Логіка визначення опціональності
    return item.optional === true || 
           item.priority === 'low' ||
           (item.content && item.content.toLowerCase().includes('optional'));
  }
  
  /**
   * Зберегти рішення для навчання
   */
  saveResolution(item, analysis, method, success) {
    const key = this.getResolutionKey(analysis);
    
    if (!this.resolutionHistory.has(key)) {
      this.resolutionHistory.set(key, []);
    }
    
    this.resolutionHistory.get(key).push({
      timestamp: Date.now(),
      itemId: item.id,
      method,
      success,
      analysis
    });
  }
  
  /**
   * Отримати ключ для резолюції
   */
  getResolutionKey(analysis) {
    const parts = [];
    
    if (analysis.failedDependencies.length > 0) parts.push('failed');
    if (analysis.replanedDependencies.length > 0) parts.push('replanned');
    if (analysis.optionalDependencies.length > 0) parts.push('optional');
    if (analysis.blockedBy.length > 0) parts.push('blocked');
    
    return parts.join(':') || 'unknown';
  }
  
  /**
   * Отримати метрики
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalResolutions > 0
        ? (this.metrics.successfulResolutions / this.metrics.totalResolutions * 100).toFixed(2) + '%'
        : '0%',
      autoResolveRate: this.metrics.successfulResolutions > 0
        ? (this.metrics.autoResolved / this.metrics.successfulResolutions * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

export default SmartDependencyResolver;
