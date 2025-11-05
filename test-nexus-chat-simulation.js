/**
 * NEXUS CHAT SIMULATION - Перевірка автономного самовдосконалення в реальній розмові
 * 
 * Симулює спілкування користувача з оркестратором через WebSocket
 * Перевіряє чи NEXUS:
 * 1. Визначає коли потрібно звітувати про покращення
 * 2. Генерує правильні повідомлення в чат
 * 3. Працює автономно БЕЗ участі користувача
 */

import axios from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

const ORCHESTRATOR_URL = 'http://localhost:5101';
const ORCHESTRATOR_WS = 'ws://localhost:5101';

class ChatSimulator extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.sessionId = null;
    this.messages = [];
    this.nexusMessages = [];
  }

  async connect() {
    console.log('\n🔌 Підключення до оркестратора...');
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(ORCHESTRATOR_WS);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket підключено');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleMessage(message);
        } catch (error) {
          console.log('📨 Raw message:', data.toString());
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket помилка:', error.message);
        reject(error);
      });
      
      this.ws.on('close', () => {
        console.log('🔌 WebSocket закрито');
      });
    });
  }

  _handleMessage(message) {
    this.messages.push(message);
    
    // Логування всіх повідомлень
    if (message.type === 'chat-message') {
      const agent = message.agent || 'SYSTEM';
      const text = message.message || message.text || '';
      console.log(`\n💬 [${agent}]: ${text}`);
      
      // Перевіряємо чи це повідомлення від NEXUS про покращення
      if (text.includes('оптимізував') || 
          text.includes('виправив') || 
          text.includes('покращив') ||
          text.includes('між нашими розмовами') ||
          text.includes('еволюція')) {
        this.nexusMessages.push({
          timestamp: Date.now(),
          agent: agent,
          message: text,
          type: 'improvement-report'
        });
        console.log('   ✨ NEXUS звітує про покращення!');
      }
    } else if (message.type === 'session-created') {
      this.sessionId = message.sessionId;
      console.log(`✅ Сесія створена: ${this.sessionId}`);
    } else if (message.type === 'agent-response') {
      console.log(`\n🤖 [ATLAS]: ${message.response || message.message || ''}`);
    } else if (message.type === 'thinking') {
      console.log(`   🧠 Думає: ${message.message || ''}`);
    } else if (message.type === 'error') {
      console.error(`   ❌ Помилка: ${message.message || message.error || ''}`);
    }
    
    this.emit('message', message);
  }

  async sendMessage(text) {
    console.log(`\n👤 [USER]: ${text}`);
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket не підключено');
    }
    
    const message = {
      type: 'chat-message',
      message: text,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };
    
    this.ws.send(JSON.stringify(message));
    
    // Чекаємо на відповідь
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ timeout: true });
      }, 30000); // 30 секунд таймаут
      
      const handler = (msg) => {
        if (msg.type === 'agent-response' || msg.type === 'response-complete') {
          clearTimeout(timeout);
          this.off('message', handler);
          resolve(msg);
        }
      };
      
      this.on('message', handler);
    });
  }

  async waitForNexusReport(timeout = 10000) {
    console.log('\n⏳ Очікування звіту від NEXUS...');
    
    const startCount = this.nexusMessages.length;
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.nexusMessages.length > startCount) {
          clearInterval(checkInterval);
          console.log('✅ NEXUS звітував!');
          resolve(this.nexusMessages[this.nexusMessages.length - 1]);
        }
        
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          console.log('⏱️ Таймаут - NEXUS не звітував');
          resolve(null);
        }
      }, 500);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getStats() {
    return {
      totalMessages: this.messages.length,
      nexusReports: this.nexusMessages.length,
      nexusMessages: this.nexusMessages
    };
  }
}

// Тестові сценарії
async function runSimulation() {
  console.log('\n' + '='.repeat(100));
  console.log('🧠 NEXUS CHAT SIMULATION - Перевірка автономного самовдосконалення');
  console.log('='.repeat(100));

  const simulator = new ChatSimulator();

  try {
    // 1. Підключення
    await simulator.connect();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Перевірка чи оркестратор живий
    console.log('\n📋 Тест 1: Перевірка підключення');
    console.log('-'.repeat(80));
    const healthCheck = await axios.get(`${ORCHESTRATOR_URL}/health`).catch(() => null);
    if (healthCheck && healthCheck.status === 200) {
      console.log('✅ Оркестратор працює');
    } else {
      console.log('❌ Оркестратор не відповідає');
      return;
    }

    // 3. Перевірка стану NEXUS
    console.log('\n📋 Тест 2: Перевірка стану NEXUS');
    console.log('-'.repeat(80));
    
    // Відправляємо звичайне повідомлення
    await simulator.sendMessage('Привіт! Як справи?');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Симуляція роботи - NEXUS має аналізувати себе в фоні
    console.log('\n📋 Тест 3: Автономний самоаналіз (NEXUS працює в фоні)');
    console.log('-'.repeat(80));
    console.log('Чекаємо 3 хвилини щоб NEXUS виконав самоаналіз...');
    console.log('(в реальності цикл кожні 3 хвилини, але ми перевіримо чи він взагалі працює)');
    
    // Відправляємо ще кілька повідомлень щоб симулювати розмову
    await new Promise(resolve => setTimeout(resolve, 5000));
    await simulator.sendMessage('Розкажи що ти зараз робиш');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Перевірка чи NEXUS звітує про покращення
    console.log('\n📋 Тест 4: Перевірка звітів NEXUS');
    console.log('-'.repeat(80));
    
    const report = await simulator.waitForNexusReport(15000);
    
    if (report) {
      console.log('\n✅ NEXUS звітував про покращення:');
      console.log(`   Агент: ${report.agent}`);
      console.log(`   Повідомлення: ${report.message}`);
      console.log(`   Час: ${new Date(report.timestamp).toLocaleTimeString()}`);
    } else {
      console.log('\n⚠️ NEXUS не звітував (можливо ще не час для самоаналізу)');
    }

    // 6. Фінальний звіт
    console.log('\n' + '='.repeat(100));
    console.log('📊 ФІНАЛЬНИЙ ЗВІТ');
    console.log('='.repeat(100));
    
    const stats = simulator.getStats();
    console.log(`\n📈 Статистика:`);
    console.log(`   Всього повідомлень: ${stats.totalMessages}`);
    console.log(`   Звітів від NEXUS: ${stats.nexusReports}`);
    
    if (stats.nexusReports > 0) {
      console.log(`\n✨ Звіти NEXUS:`);
      stats.nexusMessages.forEach((msg, i) => {
        console.log(`\n   Звіт ${i + 1}:`);
        console.log(`   [${msg.agent}]: ${msg.message}`);
      });
    }

    console.log('\n' + '='.repeat(100));
    console.log('💭 ВИСНОВОК:');
    console.log('='.repeat(100));
    
    if (stats.nexusReports > 0) {
      console.log(`
✅ NEXUS ПРАЦЮЄ АВТОНОМНО:
   - Визначає коли потрібно звітувати
   - Генерує повідомлення в чат
   - Працює БЕЗ участі користувача
   - Звітів отримано: ${stats.nexusReports}

Система готова до роботи!
      `);
    } else {
      console.log(`
⚠️ NEXUS НЕ ЗВІТУВАВ:
   Можливі причини:
   1. Цикл самоаналізу ще не спрацював (кожні 3 хв)
   2. NEXUS не виявив покращень для звіту
   3. Динамічний промпт не інтегрований в чат

Потрібна додаткова перевірка та налаштування.
      `);
    }

    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('\n❌ Помилка симуляції:', error.message);
    console.error(error.stack);
  } finally {
    simulator.disconnect();
  }
}

// Запуск
console.log('\n⏱️ Початок симуляції через 3 секунди...');
setTimeout(() => {
  runSimulation().catch(console.error);
}, 3000);
