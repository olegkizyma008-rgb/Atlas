/**
 * NEXUS HTTP SIMULATION - Перевірка автономного самовдосконалення через HTTP API
 */

import axios from 'axios';

const ORCHESTRATOR_URL = 'http://localhost:5101';

async function sendChatMessage(message) {
  console.log(`\n👤 [USER]: ${message}`);
  
  const messages = [];
  
  try {
    const response = await axios.post(`${ORCHESTRATOR_URL}/chat/stream`, {
      message: message,
      timestamp: Date.now()
    }, {
      timeout: 30000,
      responseType: 'stream'
    });
    
    return new Promise((resolve, reject) => {
      let buffer = '';
      
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'agent_message' || data.type === 'chat_message') {
                const agent = data.data?.agent || data.agent || 'SYSTEM';
                const content = data.data?.content || data.content || data.message || '';
                console.log(`\n💬 [${agent.toUpperCase()}]: ${content}`);
                messages.push({ agent, content, type: data.type });
                
                // Перевірка чи це звіт NEXUS
                if (content.includes('оптимізував') || 
                    content.includes('виправив') || 
                    content.includes('покращив') ||
                    content.includes('між нашими розмовами') ||
                    content.includes('еволюція')) {
                  console.log('   ✨ NEXUS звітує про покращення!');
                }
              } else if (data.type === 'thinking') {
                console.log(`   🧠 ${data.data?.message || data.message || ''}`);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
      
      response.data.on('end', () => {
        resolve(messages);
      });
      
      response.data.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error(`❌ Помилка: ${error.message}`);
    return [];
  }
}

async function checkHealth() {
  try {
    const response = await axios.get(`${ORCHESTRATOR_URL}/health`);
    return response.status === 200;
  } catch {
    return false;
  }
}

async function runSimulation() {
  console.log('\n' + '='.repeat(100));
  console.log('🧠 NEXUS HTTP SIMULATION');
  console.log('='.repeat(100));

  // 1. Health check
  console.log('\n📋 Перевірка оркестратора...');
  const isHealthy = await checkHealth();
  console.log(isHealthy ? '✅ Оркестратор працює' : '❌ Оркестратор не відповідає');
  
  if (!isHealthy) return;

  // 2. Тестові повідомлення
  await sendChatMessage('Привіт! Як справи?');
  await new Promise(r => setTimeout(r, 3000));
  
  await sendChatMessage('Розкажи про свою систему самовдосконалення');
  await new Promise(r => setTimeout(r, 3000));
  
  await sendChatMessage('Що ти зараз робиш?');
  
  console.log('\n' + '='.repeat(100));
  console.log('✅ Симуляція завершена');
  console.log('='.repeat(100) + '\n');
}

runSimulation().catch(console.error);
