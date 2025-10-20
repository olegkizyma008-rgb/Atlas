#!/usr/bin/env node

/**
 * Тестовий скрипт для перевірки Playwright MCP сервера через Тетяну
 *
 * Запуск: node tests/run-playwright-test.js
 *
 * @version 1.0.0
 * @date 2025-10-20
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Імпорт необхідних компонентів
import MCPManager from '../orchestrator/ai/mcp-manager.js';
import MCPTodoManager from '../orchestrator/workflow/mcp-todo-manager.js';
import logger from '../orchestrator/utils/logger.js';

async function runPlaywrightTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 PLAYWRIGHT MCP SERVER TEST');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Завантажити тестовий TODO
    const todoPath = path.join(__dirname, 'playwright-test-todo.json');
    const testData = JSON.parse(fs.readFileSync(todoPath, 'utf-8'));
    
    console.log('📋 Завантажено тестовий TODO:');
    console.log(`   Session: ${testData.session_id}`);
    console.log(`   Request: ${testData.user_request}`);
    console.log(`   TODOs: ${testData.todos.length} items\n`);

    // 2. Ініціалізувати MCP Manager
    console.log('🔧 Ініціалізація MCP Manager...');
    const mcpManager = new MCPManager();
    
    // Конфігурація Playwright MCP сервера
    console.log('🚀 Запуск Playwright MCP сервера...');
    const playwrightConfig = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-playwright'],
      env: {}
    };

    await mcpManager.startServer('playwright', playwrightConfig);
    console.log('   ✅ Playwright сервер запущено\n');

    // Почекати на готовність
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Перевірити доступні інструменти
    console.log('🔍 Перевірка доступних інструментів...');
    const status = mcpManager.getStatus();
    console.log(`   Playwright: ${status.playwright.ready ? '✅' : '❌'} Ready`);
    console.log(`   Tools: ${status.playwright.tools} інструментів\n`);

    if (status.playwright.tools === 0) {
      throw new Error('Playwright server has no tools loaded');
    }

    // Отримати детальну інформацію про інструменти
    const toolsSummary = mcpManager.getDetailedToolsSummary(['playwright']);
    console.log('📚 Доступні Playwright інструменти:');
    console.log(toolsSummary);
    console.log('\n');

    // 4. Ініціалізувати TODO Manager
    console.log('📝 Ініціалізація TODO Manager...');
    const todoManager = new MCPTodoManager(mcpManager, logger);
    console.log('   ✅ TODO Manager готовий\n');

    // 5. Завантажити TODO items
    console.log('📥 Завантаження TODO items...');
    for (const todo of testData.todos) {
      await todoManager.addTodo(todo);
      console.log(`   ✅ Додано: ${todo.id} - ${todo.action}`);
    }
    console.log('\n');

    // 6. Виконати TODO items послідовно
    console.log('⚙️  ВИКОНАННЯ TODO ITEMS:');
    console.log('='.repeat(80) + '\n');

    const results = [];
    for (const todo of testData.todos) {
      console.log(`\n🔹 TODO: ${todo.id}`);
      console.log(`   Action: ${todo.action}`);
      console.log(`   Success Criteria: ${todo.success_criteria}\n`);

      try {
        // Виконати TODO через TODO Manager
        const result = await todoManager.executeTodoItem(todo.id, testData.session_id);
        
        results.push({
          id: todo.id,
          action: todo.action,
          status: result.status,
          success: result.status === 'completed',
          tool_calls: result.tool_calls || [],
          execution_time: result.execution_time || 0,
          error: result.error || null
        });

        if (result.status === 'completed') {
          console.log(`   ✅ SUCCESS: ${todo.id}`);
        } else {
          console.log(`   ❌ FAILED: ${todo.id}`);
          console.log(`   Error: ${result.error || 'Unknown error'}`);
        }

      } catch (error) {
        console.error(`   ❌ EXCEPTION: ${error.message}`);
        results.push({
          id: todo.id,
          action: todo.action,
          status: 'failed',
          success: false,
          error: error.message
        });
      }

      // Пауза між TODO items
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 7. Підсумок результатів
    console.log('\n' + '='.repeat(80));
    console.log('📊 РЕЗУЛЬТАТИ ТЕСТУВАННЯ');
    console.log('='.repeat(80) + '\n');

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`✅ Успішно: ${successCount}/${results.length}`);
    console.log(`❌ Помилки: ${failCount}/${results.length}\n`);

    // Детальні результати
    console.log('Деталі:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.id}: ${result.action}`);
      console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (result.tool_calls && result.tool_calls.length > 0) {
        console.log(`   Tools used: ${result.tool_calls.map(t => t.tool).join(', ')}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    // 8. Зберегти результати
    const resultsPath = path.join(__dirname, 'playwright-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      test_id: testData.session_id,
      timestamp: new Date().toISOString(),
      results: results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
        success_rate: `${Math.round((successCount / results.length) * 100)}%`
      }
    }, null, 2));

    console.log(`\n💾 Результати збережено: ${resultsPath}`);

    // 9. Зупинити MCP сервери
    console.log('\n🛑 Зупинка MCP серверів...');
    await mcpManager.stopAllServers();
    console.log('   ✅ Сервери зупинено\n');

    console.log('='.repeat(80));
    console.log('🎉 ТЕСТ ЗАВЕРШЕНО');
    console.log('='.repeat(80) + '\n');

    process.exit(successCount === results.length ? 0 : 1);

  } catch (error) {
    console.error('\n❌ КРИТИЧНА ПОМИЛКА:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Запустити тест
runPlaywrightTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
