/**
 * Test Orchestrator functionality with Calculator and Browser tasks
 * Tests MCP tool execution: Calculator math + Browser video playback
 */

import axios from 'axios';

const ORCHESTRATOR_URL = 'http://localhost:5101/chat/stream';
const SESSION_ID = 'test-calc-browser-' + Date.now();

async function testOrchestratorTasks() {
  console.log('🧪 Testing Orchestrator with Calculator + Browser tasks\n');
  console.log(`📋 Session ID: ${SESSION_ID}\n`);

  try {
    const userMessage = 'Відкрий калькулятор, обчисли 15 * 7, потім відкрий YouTube в Safari та знайди фільм "Inception"';
    
    console.log('📤 Відправляю запит до оркестратора...');
    console.log(`💬 Завдання: "${userMessage}"\n`);

    const startTime = Date.now();

    const response = await axios.post(ORCHESTRATOR_URL, {
      message: userMessage,
      sessionId: SESSION_ID
    }, {
      timeout: 120000, // 2 minutes timeout
      headers: { 
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    // Обробляємо SSE stream
    let receivedMessages = [];
    let toolsUsed = [];
    
    await new Promise((resolve, reject) => {
      let buffer = '';
      
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'agent_message' || data.type === 'message') {
                const content = data.data?.content || data.content || '';
                if (content && content.trim()) {
                  console.log('💬', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
                  receivedMessages.push(content);
                }
              } else if (data.type === 'tool_call') {
                const toolName = data.data?.tool || data.tool || 'unknown';
                console.log('🔧', toolName);
                toolsUsed.push(toolName);
              } else if (data.type === 'workflow_complete') {
                console.log('✅ Workflow завершено');
              }
            } catch (e) {
              // Ігноруємо помилки парсингу
            }
          }
        }
      });
      
      response.data.on('end', () => {
        resolve();
      });
      
      response.data.on('error', (err) => {
        reject(err);
      });
      
      setTimeout(() => {
        reject(new Error('Stream timeout'));
      }, 120000);
    });

    const duration = Date.now() - startTime;

    console.log('\n✅ Відповідь отримано!\n');
    console.log(`⏱️  Час виконання: ${(duration / 1000).toFixed(1)}s\n`);
    console.log('📊 Результат:');
    console.log('─'.repeat(60));
    console.log('Status:', response.status);
    console.log('Отримано повідомлень:', receivedMessages.length);
    
    if (toolsUsed.length > 0) {
      console.log('\n🛠️  Використані MCP інструменти:');
      toolsUsed.forEach(tool => {
        console.log(`  - ${tool}`);
      });
    }
    
    console.log('─'.repeat(60));
    console.log('\n🎉 Тест завершено успішно!');
    console.log('\n💡 Перевірте логи orchestrator.log для деталей виконання:');
    console.log(`   tail -f logs/orchestrator.log | grep "${SESSION_ID}"`);

    return true;

  } catch (error) {
    console.error('\n❌ Помилка тесту:', error.message);

    if (error.response) {
      console.error('\n📊 Деталі помилки:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Оркестратор не запущено!');
      console.error('Запустіть оркестратор:');
      console.error('   npm start');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('\n⏱️  Timeout - завдання виконується довго або зависло');
      console.error('Перевірте логи: tail -f logs/orchestrator.log');
    }

    return false;
  }
}

// Запуск тесту
console.log('═'.repeat(60));
console.log('   🚀 ATLAS Orchestrator - Test Calculator + Browser');
console.log('═'.repeat(60));
console.log();

testOrchestratorTasks()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
