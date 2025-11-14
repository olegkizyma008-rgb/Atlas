/**
 * Helper methods for ETERNITY self-analysis
 * Додаткові утиліти для глибокого аналізу системи
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EternityHelpers {
  constructor(logger) {
    this.logger = logger;
    this.projectRoot = path.join(__dirname, '../..');
  }

  /**
   * Читання реальних логів з файлу
   */
  async getRecentLogsFromFile(lineCount = 50) {
    try {
      const logPath = path.join(this.projectRoot, 'logs/error.log');
      const content = await fs.readFile(logPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      return lines.slice(-lineCount);
    } catch (error) {
      this.logger.warn('[ETERNITY-HELPERS] Could not read error logs:', error.message);
      return [];
    }
  }

  /**
   * Витягування повідомлення про помилку з лог-рядка
   */
  extractErrorMessage(logLine) {
    // Формат: 2025-11-06 20:20:44 [ERROR] Message here
    const match = logLine.match(/\[ERROR\]\s+(.+?)(?:\s+\{|$)/);
    if (match) {
      return match[1].trim();
    }
    
    // Альтернативний формат
    const altMatch = logLine.match(/ERROR.*?:\s*(.+?)(?:\s+\{|$)/);
    if (altMatch) {
      return altMatch[1].trim();
    }
    
    return null;
  }

  /**
   * Перевірка здоров'я системних компонентів
   */
  async checkSystemHealth() {
    const health = {
      filesystem: true,
      memory: true,
      cpu: true,
      logs: true
    };

    // Перевірка доступу до файлової системи
    try {
      await fs.access(this.projectRoot);
    } catch {
      health.filesystem = false;
    }

    // Перевірка використання пам'яті
    const memUsage = process.memoryUsage();
    health.memory = (memUsage.heapUsed / memUsage.heapTotal) < 0.9;

    // Перевірка логів
    try {
      const logPath = path.join(this.projectRoot, 'logs/error.log');
      await fs.access(logPath);
    } catch {
      health.logs = false;
    }

    return health;
  }

  /**
   * Аналіз якості коду проекту
   */
  async analyzeCodeQuality() {
    const metrics = {
      totalFiles: 0,
      totalLines: 0,
      avgComplexity: 0,
      issuesFound: []
    };

    try {
      const orchestratorPath = path.join(this.projectRoot, 'orchestrator');
      const files = await this._scanDirectory(orchestratorPath, '.js');
      
      metrics.totalFiles = files.length;
      
      for (const file of files.slice(0, 10)) { // Аналізуємо перші 10
        try {
          const content = await fs.readFile(file, 'utf8');
          metrics.totalLines += content.split('\n').length;
          
          // Простий аналіз складності
          const complexity = this._calculateComplexity(content);
          metrics.avgComplexity += complexity;
          
          if (complexity > 50) {
            metrics.issuesFound.push({
              file: path.relative(this.projectRoot, file),
              issue: 'high-complexity',
              value: complexity
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
      
      metrics.avgComplexity = Math.round(metrics.avgComplexity / Math.max(files.length, 1));
      
    } catch (error) {
      this.logger.warn('[ETERNITY-HELPERS] Code quality analysis failed:', error.message);
    }

    return metrics;
  }

  async _scanDirectory(dir, ext) {
    const files = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        
        if (entry.isDirectory()) {
          const subFiles = await this._scanDirectory(fullPath, ext);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't access
    }
    
    return files;
  }

  _calculateComplexity(code) {
    return (
      (code.match(/if\s*\(/g) || []).length +
      (code.match(/for\s*\(/g) || []).length +
      (code.match(/while\s*\(/g) || []).length +
      (code.match(/case\s+/g) || []).length +
      (code.match(/\?\s*.*:/g) || []).length
    );
  }
}

export default EternityHelpers;
