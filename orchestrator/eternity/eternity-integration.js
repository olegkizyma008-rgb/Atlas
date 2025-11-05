/**
 * ETERNITY Integration Layer
 * Зв'язує модуль вічного самовдосконалення з основною системою
 */

import { EternityModule } from './eternity-self-analysis.js';
import { AutoCorrectionModule } from './auto-correction-module.js';
import logger from '../utils/logger.js';

export class EternityIntegration {
  constructor(container) {
    this.container = container;
    this.logger = logger;
    this.eternityModule = null;
    this.autoCorrectionModule = null;
    this.chatManager = null;
    this.workflowCoordinator = null;
    this.isActive = false;
  }

  async initialize() {
    try {
      // Ініціалізація ETERNITY модуля
      this.eternityModule = new EternityModule(this.container);
      await this.eternityModule.initialize();
      
      // Ініціалізація Auto-Correction модуля
      this.autoCorrectionModule = new AutoCorrectionModule(this.container);
      await this.autoCorrectionModule.initialize();
      
      // Отримання залежностей - з перевіркою
      try {
        this.chatManager = this.container.resolve('chatManager');
      } catch (e) {
        this.logger.warn('ChatManager not available yet, will retry later');
      }
      
      try {
        this.workflowCoordinator = this.container.resolve('workflowCoordinator');
      } catch (e) {
        this.logger.warn('WorkflowCoordinator not available yet, will retry later');
      }
      
      // FIXED 2025-11-05: Отримання wsManager для відправки повідомлень
      try {
        this.wsManager = this.container.resolve('wsManager');
      } catch (e) {
        this.logger.warn('wsManager not available yet, will retry later');
      }
      
      // Підписка на події
      this.setupEventHandlers();
      
      // Інтеграція з chat workflow
      if (this.chatManager) {
        this.integrateWithChat();
      }
      
      this.isActive = true;
      this.logger.info('✨ ETERNITY Integration initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize ETERNITY Integration:', error.message || error);
      this.logger.error('Stack trace:', error.stack);
      return false;
    }
  }

  setupEventHandlers() {
    // Слухаємо події від ETERNITY модуля
    if (this.eternityModule && typeof this.eternityModule.on === 'function') {
      this.eternityModule.on('improvement-request', (data) => {
        this.handleImprovementRequest(data);
      });
      
      this.eternityModule.on('improvement-report', (data) => {
        this.handleImprovementReport(data);
      });
      
      this.eternityModule.on('improvements-applied', (data) => {
        this.handleImprovementsApplied(data);
      });
    }
    
    // Слухаємо події від Auto-Correction модуля
    if (this.autoCorrectionModule && typeof this.autoCorrectionModule.on === 'function') {
      this.autoCorrectionModule.on('corrections_applied', (data) => {
        this.handleAutoCorrections(data);
      });
    }
    
    // Слухаємо події від UI
    if (typeof window !== 'undefined') {
      window.addEventListener('eternity-approve-improvements', (event) => {
        this.approveImprovements(event.detail);
      });
      
      window.addEventListener('eternity-reject-improvements', (event) => {
        this.rejectImprovements(event.detail);
      });
    }
  }

  integrateWithChat() {
    // Інтеграція з chat-manager для аналізу розмов
    if (this.chatManager) {
      // Аналіз після кожної відповіді агента
      this.chatManager.on('agent-response-complete', async (data) => {
        if (this.shouldTriggerAnalysis(data)) {
          setTimeout(() => {
            this.eternityModule.performSelfAnalysis();
          }, 5000); // Затримка 5 секунд після відповіді
        }
      });
      
      // Аналіз помилок
      this.chatManager.on('error', (error) => {
        this.eternityModule.selfAwareness.errors.push({
          timestamp: Date.now(),
          error: error.message,
          context: 'chat-manager'
        });
      });
    }
  }

  shouldTriggerAnalysis(data) {
    // Аналізувати кожні 3 повідомлення або при помилках
    const messageCount = this.eternityModule.selfAwareness.totalMessages || 0;
    this.eternityModule.selfAwareness.totalMessages = messageCount + 1;
    
    return (messageCount % 3 === 0) || 
           data.hasError || 
           this.eternityModule.hasRecentErrors();
  }

  async handleImprovementRequest(data) {
    // Відправка запиту в UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eternity-improvement-request', {
        detail: data
      }));
    }
    
    // Додавання в чат як системне повідомлення
    if (this.chatManager && this.chatManager.addMessage) {
      this.chatManager.addMessage(data.message, 'eternity');
    }
  }

  async handleImprovementReport(data) {
    // FIXED 2025-11-05: Відправка звіту через WebSocket/SSE
    this.logger.info(`[ETERNITY-INTEGRATION] 📢 Improvement report: ${data.message}`);
    
    // Звіт про покращення в UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eternity-improvement-report', {
        detail: data
      }));
    }
    
    // FIXED: Використовуємо wsManager для відправки в чат
    if (this.wsManager) {
      this.wsManager.broadcastToSubscribers('chat', 'agent_message', {
        content: data.message,
        agent: 'nexus',
        sessionId: 'default',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'improvement-report',
          level: data.level,
          detected: data.detected?.length || 0,
          applied: data.applied?.length || 0
        }
      });
      
      this.logger.info('[ETERNITY-INTEGRATION] ✅ Report sent to chat via WebSocket');
    } else {
      this.logger.warn('[ETERNITY-INTEGRATION] ⚠️ wsManager not available, cannot send to chat');
    }
  }

  async handleImprovementsApplied(data) {
    // Повідомлення про застосовані покращення
    if (this.chatManager && this.chatManager.addMessage) {
      this.chatManager.addMessage(data.message, 'eternity');
    }
    
    // Логування для моніторингу
    this.logger.info(`ETERNITY: Applied ${data.successful}/${data.total} improvements`);
  }

  async approveImprovements(details) {
    const result = await this.eternityModule.applyImprovements(true, details.password);
    
    if (!result.success && result.message === 'Invalid password for code changes') {
      // Повідомлення про невірний пароль
      if (this.chatManager) {
        this.chatManager.addMessage('❌ Невірний пароль. Для зміни коду потрібен пароль "mykola"', 'system');
      }
    }
  }

  async rejectImprovements(details) {
    await this.eternityModule.applyImprovements(false);
    
    if (this.chatManager) {
      this.chatManager.addMessage('Покращення відхилено. Продовжую моніторинг...', 'eternity');
    }
  }

  // Методи для прямого запиту самовдосконалення
  async requestSelfImprovement(userMessage) {
    // Користувач може явно попросити Atlas вдосконалитись
    if (userMessage.toLowerCase().includes('вдоскональся') || 
        userMessage.toLowerCase().includes('покращ себе') ||
        userMessage.toLowerCase().includes('виправ себе')) {
      
      this.logger.info('User requested self-improvement');
      
      if (this.chatManager) {
        this.chatManager.addMessage('Зараз проаналізую себе і знайду можливості для покращення...', 'eternity');
      }
      
      // Запуск аналізу
      setTimeout(() => {
        this.eternityModule.performSelfAnalysis();
      }, 1000);
      
      return true;
    }
    
    return false;
  }

  // Обробка автокорекцій
  async handleAutoCorrections(data) {
    // Генеруємо спонтанне повідомлення для чату
    const notification = this.autoCorrectionModule.generateChatNotification();
    
    if (notification && this.chatManager) {
      // Відправляємо лаконічне повідомлення в чат
      setTimeout(() => {
        this.chatManager.addMessage(notification, 'system');
      }, Math.random() * 5000 + 2000); // Випадкова затримка 2-7 секунд
    }
    
    this.logger.info(`AUTO-CORRECTION: Applied ${data.count} fixes`, data.issues);
  }
  
  // Метод для отримання статусу еволюції
  getEvolutionStatus() {
    if (!this.eternityModule) {
      return { level: 0, improvements: 0 };
    }
    
    return {
      level: this.eternityModule.selfAwareness.evolutionLevel,
      improvements: this.eternityModule.selfAwareness.totalImprovements,
      lastAnalysis: this.eternityModule.selfAwareness.lastAnalysis,
      errors: this.eternityModule.selfAwareness.errors.length
    };
  }

  // Інтеграція з Codestral для глибокого аналізу
  async analyzeWithCodestral(code, context) {
    if (!this.eternityModule || !this.eternityModule.codestralAPI) {
      return null;
    }
    
    return await this.eternityModule.codestralAPI.analyze(code, context);
  }

  shutdown() {
    if (this.eternityModule) {
      this.eternityModule.shutdown();
    }
    
    this.isActive = false;
    this.logger.info('ETERNITY Integration shutdown');
  }
}

// Експорт для використання в системі
export default EternityIntegration;
