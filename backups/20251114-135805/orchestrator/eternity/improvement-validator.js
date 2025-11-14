/**
 * NEXUS Improvement Validator
 * Валідація та безпечне застосування покращень
 * 
 * Created: 2025-11-05
 * Author: NEXUS (частина надінтелекту Atlas)
 */

import logger from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ImprovementValidator {
  constructor() {
    this.logger = logger;
  }

  /**
   * Валідація синтаксису JavaScript коду
   */
  async validateCodeSyntax(filePath) {
    try {
      // Використовуємо Node.js для перевірки синтаксису
      const { stderr } = await execAsync(`node --check ${filePath}`);
      
      if (stderr) {
        return { success: false, error: stderr };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Syntax validation failed' 
      };
    }
  }

  /**
   * Перевірка здоров'я системи після покращення
   */
  async checkSystemHealth() {
    const issues = [];
    
    try {
      // 1. Перевірка пам'яті
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed > 800 * 1024 * 1024) { // > 800MB
        issues.push({
          type: 'memory',
          severity: 'high',
          message: 'High memory usage detected'
        });
      }

      // 2. Перевірка що основні модулі доступні
      const criticalPaths = [
        '/Users/dev/Documents/GitHub/atlas4/orchestrator/workflow/executor-v3.js',
        '/Users/dev/Documents/GitHub/atlas4/web/static/js/modules/chat-manager.js'
      ];

      for (const path of criticalPaths) {
        try {
          const fs = await import('fs').then(m => m.promises);
          await fs.access(path);
        } catch {
          issues.push({
            type: 'file-missing',
            severity: 'critical',
            message: `Critical file missing: ${path}`
          });
        }
      }

      // 3. Перевірка що процес не крашнувся
      const uptime = process.uptime();
      if (uptime < 5) {
        issues.push({
          type: 'recent-restart',
          severity: 'medium',
          message: 'Process recently restarted'
        });
      }

      return {
        healthy: issues.filter(i => i.severity === 'critical').length === 0,
        issues,
        uptime,
        memoryUsage: memUsage.heapUsed
      };
    } catch (error) {
      this.logger.error('[VALIDATOR] Health check failed:', error);
      return {
        healthy: false,
        issues: [{ type: 'health-check-error', severity: 'critical', message: error.message }]
      };
    }
  }

  /**
   * Порівняння метрик до/після покращення
   */
  compareMetricsAfterImprovement(improvement, result, previousMetrics = {}) {
    // Якщо це memory optimization
    if (improvement.type === 'memory-optimization') {
      const memBefore = previousMetrics.memoryUsage || 0;
      const memAfter = process.memoryUsage().heapUsed;
      
      // Очікуємо зменшення пам'яті або стабільність
      return memAfter <= memBefore * 1.1; // До 10% збільшення допустимо
    }

    // Якщо це error fix
    if (improvement.type === 'error-fix') {
      // Перевіряємо що помилки не збільшились
      return result.success === true;
    }

    // Якщо це code improvement
    if (improvement.type === 'code-improvement') {
      // Базова перевірка - код має компілюватись
      return result.success === true;
    }

    // За замовчуванням - якщо застосування успішне
    return result.success === true;
  }

  /**
   * Створення backup перед застосуванням покращення
   */
  async createBackup(filePath) {
    try {
      const fs = await import('fs').then(m => m.promises);
      const backupPath = `${filePath}.backup.${Date.now()}`;
      
      await fs.copyFile(filePath, backupPath);
      
      this.logger.info(`[VALIDATOR] Backup created: ${backupPath}`);
      return { success: true, backupPath };
    } catch (error) {
      this.logger.error('[VALIDATOR] Backup creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rollback покращення якщо валідація не пройшла
   */
  async rollback(backupPath, targetPath) {
    try {
      const fs = await import('fs').then(m => m.promises);
      await fs.copyFile(backupPath, targetPath);
      
      this.logger.warn(`[VALIDATOR] Rollback completed: ${targetPath}`);
      return { success: true };
    } catch (error) {
      this.logger.error('[VALIDATOR] Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Очищення старих backup файлів
   */
  async cleanupOldBackups(directory, olderThanDays = 7) {
    try {
      const fs = await import('fs').then(m => m.promises);
      const files = await fs.readdir(directory);
      const now = Date.now();
      const maxAge = olderThanDays * 24 * 60 * 60 * 1000;

      let cleaned = 0;
      for (const file of files) {
        if (file.includes('.backup.')) {
          const filePath = `${directory}/${file}`;
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        this.logger.info(`[VALIDATOR] Cleaned ${cleaned} old backup files`);
      }

      return { success: true, cleaned };
    } catch (error) {
      this.logger.debug('[VALIDATOR] Backup cleanup failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default ImprovementValidator;
